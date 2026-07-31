import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AssistantStatus =
  | 'queued'
  | 'processing'
  | 'needs_information'
  | 'confirmation_required'
  | 'completed'
  | 'failed';

export interface AssistantAttachment {
  path: string;
  name: string;
  type: string;
  size: number;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status: AssistantStatus | null;
  attachments: AssistantAttachment[];
  result: any | null;
  createdAt: string;
}

export const STATUS_LABELS: Record<AssistantStatus, string> = {
  queued: 'En attente',
  processing: 'Analyse en cours',
  needs_information: 'Information manquante',
  confirmation_required: 'Confirmation requise',
  completed: 'Action réalisée',
  failed: 'Erreur',
};

export const QUEUE_NOTICE =
  'Votre demande est enregistrée et sera traitée dès que possible. Merci de patienter.';

const BUCKET = 'hermes-temporary-files';
const ASSISTANT = 'powertech';

function mapMessage(row: any): AssistantMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content ?? '',
    status: row.status ?? null,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    result: row.result ?? null,
    createdAt: row.created_at,
  };
}

export function useAssistant(enabled: boolean) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [activeStatus, setActiveStatus] = useState<AssistantStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Conversation courante (une par utilisateur, réutilisée)
  useEffect(() => {
    if (!enabled || conversationId) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      userIdRef.current = uid;

      // Une seule conversation active par utilisateur (user_id + assistant)
      const findActive = async () => {
        const { data } = await supabase
          .from('assistant_conversations')
          .select('id')
          .eq('user_id', uid)
          .eq('assistant', ASSISTANT)
          .maybeSingle();
        return data?.id ?? null;
      };

      let id = await findActive();
      if (!id) {
        const { data: created } = await supabase
          .from('assistant_conversations')
          .insert({ user_id: uid, assistant: ASSISTANT, title: 'Assistant Powertech' })
          .select('id')
          .maybeSingle();
        id = created?.id ?? (await findActive());
      }
      if (!cancelled && id) setConversationId(id);
    })();
    return () => { cancelled = true; };
  }, [enabled, conversationId]);

  // Historique + Realtime
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('assistant_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (!cancelled) setMessages((data ?? []).map(mapMessage));
    })();

    const upsert = (row: any) => {
      const msg = mapMessage(row);
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === msg.id);
        if (idx === -1) return [...prev, msg];
        const next = [...prev];
        next[idx] = msg;
        return next;
      });
      if (msg.role === 'assistant' && msg.status) {
        setActiveStatus(msg.status as AssistantStatus);
      }
    };

    const channel = supabase
      .channel(`assistant-${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'assistant_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as any)?.id;
          if (id) setMessages(prev => prev.filter(m => m.id !== id));
          return;
        }
        upsert(payload.new);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [conversationId]);


  // Suivi du job de l'utilisateur (Realtime)
  useEffect(() => {
    const uid = userIdRef.current;
    if (!conversationId || !uid) return;
    const channel = supabase
      .channel(`hermes-jobs-${uid}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'hermes_jobs',
        filter: `user_id=eq.${uid}`,
      }, async (payload: any) => {
        if (payload.new?.conversation_id !== conversationId) return;
        const status = payload.new.status as AssistantStatus;
        setActiveStatus(status);
        // Filet de sécurité : on relit le message assistant lié au job
        if (status === 'completed' || status === 'failed' || status === 'needs_information' || status === 'confirmation_required') {
          const { data } = await supabase
            .from('assistant_messages')
            .select('*')
            .eq('job_id', payload.new.id)
            .eq('role', 'assistant')
            .maybeSingle();
          if (data) {
            const msg = mapMessage(data);
            setMessages(prev => {
              const idx = prev.findIndex(m => m.id === msg.id);
              if (idx === -1) return [...prev, msg];
              const next = [...prev];
              next[idx] = msg;
              return next;
            });
          }
        }
      })

      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const send = useCallback(async (text: string, files: File[], actionHint: string) => {
    if (!conversationId) return;
    const uid = userIdRef.current;
    if (!uid) return;
    setSending(true);
    setError(null);

    try {
      // 1. Fichiers privés temporaires
      const attachments: AssistantAttachment[] = [];
      const batch = crypto.randomUUID();
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${uid}/${batch}/${safeName}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        attachments.push({ path, name: file.name, type: file.type, size: file.size });
      }

      // 2. Message utilisateur
      const { data: inserted } = await supabase
        .from('assistant_messages')
        .insert({
          conversation_id: conversationId,
          user_id: uid,
          role: 'user',
          content: text,
          attachments: attachments as any,
        })
        .select()
        .single();
      if (inserted) {
        const msg = mapMessage(inserted);
        setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
      }

      // 3. Tâche Hermes
      const { data, error: fnError } = await supabase.functions.invoke('create-hermes-job', {
        body: {
          // conversation_id / hermes_session_id sont résolus côté serveur
          message: text,
          action_hint: actionHint,
          attachments,
          idempotency_key: batch,
        },
      });
      if (fnError) throw fnError;

      setActiveStatus(data?.queued ? 'queued' : 'processing');
    } catch (e: any) {
      console.error('assistant send error', e);
      setError("Impossible d'envoyer la demande. Réessayez.");
      setActiveStatus('failed');
    } finally {
      setSending(false);
    }
  }, [conversationId]);

  const clearHistory = useCallback(async () => {
    if (!conversationId) return;
    await supabase.from('assistant_messages').delete().eq('conversation_id', conversationId);
    setMessages([]);
    setActiveStatus(null);
  }, [conversationId]);

  return { conversationId, messages, send, sending, activeStatus, error, clearHistory };
}
