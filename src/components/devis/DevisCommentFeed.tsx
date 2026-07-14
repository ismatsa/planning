import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, Paperclip, X, Download, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  uploadAttachment,
  getAttachmentUrl,
  formatFileSize,
  type AttachmentMeta,
} from '@/services/attachmentsService';

interface AttachmentRow {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
}

interface Comment {
  id: string;
  content: string | null;
  user_id: string;
  created_at: string;
  attachment_id: string | null;
}

interface Props {
  devisId: string;
}

function isImage(mime: string | null | undefined) {
  return !!mime && mime.startsWith('image/');
}

function AttachmentPreview({ att, isMe }: { att: AttachmentRow; isMe: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const image = isImage(att.content_type);

  useEffect(() => {
    let cancelled = false;
    getAttachmentUrl({
      id: att.id,
      devisId: '',
      fileName: att.file_name,
      originalName: att.file_name,
      mimeType: att.content_type,
      fileSize: att.file_size,
      storagePath: att.file_path,
      uploadedBy: null,
      createdAt: '',
    }).then(u => {
      if (!cancelled) {
        setUrl(u);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [att.id]);

  if (image) {
    return (
      <div className="mt-1 rounded-md overflow-hidden border bg-background max-w-[280px]">
        {loading || !url ? (
          <div className="flex items-center justify-center h-40 w-64">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={att.file_name} className="block max-h-64 w-auto object-contain" />
          </a>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => url && window.open(url, '_blank')}
      disabled={!url}
      className={`mt-1 flex items-center gap-2 rounded-md border px-3 py-2 text-xs bg-background hover:bg-muted transition-colors ${isMe ? 'text-foreground' : ''}`}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate max-w-[180px] font-medium">{att.file_name}</span>
      {att.file_size && <span className="text-muted-foreground shrink-0">{formatFileSize(att.file_size)}</span>}
      <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </button>
  );
}

export default function DevisCommentFeed({ devisId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Record<string, AttachmentRow>>({});
  const [newComment, setNewComment] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadAll() {
    const [commentsRes, profilesRes, attsRes] = await Promise.all([
      supabase.from('devis_comments').select('*').eq('devis_id', devisId).order('created_at', { ascending: true }),
      supabase.from('profiles').select('id, email, company'),
      supabase.from('devis_attachments').select('id, file_name, file_path, file_size, content_type').eq('devis_id', devisId),
    ]);
    if (commentsRes.data) setComments(commentsRes.data as any[]);
    if (profilesRes.data) {
      const map: Record<string, string> = {};
      for (const p of profilesRes.data as any[]) map[p.id] = p.company || p.email;
      setProfiles(map);
    }
    if (attsRes.data) {
      const map: Record<string, AttachmentRow> = {};
      for (const a of attsRes.data as any[]) map[a.id] = a;
      setAttachments(map);
    }
  }

  useEffect(() => { loadAll(); }, [devisId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  useEffect(() => {
    if (!pendingFile) { setPendingPreview(null); return; }
    if (pendingFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(pendingFile);
      setPendingPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPendingPreview(null);
  }, [pendingFile]);

  function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setPendingFile(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function clearPending() {
    setPendingFile(null);
  }

  async function handleSend() {
    if ((!newComment.trim() && !pendingFile) || !user) return;
    setSending(true);
    try {
      let attachmentId: string | null = null;
      if (pendingFile) {
        const uploaded: AttachmentMeta | null = await uploadAttachment(devisId, pendingFile, user.id);
        if (!uploaded) {
          toast.error('Erreur lors de l\'envoi du fichier.');
          setSending(false);
          return;
        }
        attachmentId = uploaded.id;
        setAttachments(prev => ({
          ...prev,
          [uploaded.id]: {
            id: uploaded.id,
            file_name: uploaded.fileName,
            file_path: uploaded.storagePath,
            file_size: uploaded.fileSize,
            content_type: uploaded.mimeType,
          },
        }));
      }
      const { data, error } = await supabase.from('devis_comments').insert({
        devis_id: devisId,
        user_id: user.id,
        content: newComment.trim() || null,
        attachment_id: attachmentId,
      } as any).select().single();
      if (data && !error) {
        setComments(prev => [...prev, data as any]);
        setNewComment('');
        setPendingFile(null);
      } else if (error) {
        toast.error('Erreur lors de l\'envoi.');
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Discussion</h3>

      <ScrollArea className="flex-1 pr-2 mb-3">
        <div className="space-y-3">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun commentaire. Démarrez la discussion.
            </p>
          )}
          {comments.map(c => {
            const isMe = c.user_id === user?.id;
            const att = c.attachment_id ? attachments[c.attachment_id] : null;
            return (
              <div key={c.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {c.content && <p className="whitespace-pre-wrap break-words">{c.content}</p>}
                  {att && <AttachmentPreview att={att} isMe={isMe} />}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                  {profiles[c.user_id] || 'Utilisateur'} · {format(new Date(c.created_at), 'd MMM HH:mm', { locale: fr })}
                </span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {pendingFile && (
        <div className="flex items-center gap-2 border rounded-md px-2 py-1.5 mb-2 bg-muted/40">
          {pendingPreview ? (
            <img src={pendingPreview} alt="" className="h-10 w-10 object-cover rounded" />
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-xs truncate flex-1">{pendingFile.name}</span>
          <span className="text-[10px] text-muted-foreground">{formatFileSize(pendingFile.size)}</span>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={clearPending}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex gap-2 items-end border-t pt-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={handlePickFile}
        />
        <Button
          size="icon"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          title="Joindre un fichier ou une photo"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          placeholder="Écrire un commentaire…"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="resize-none text-sm"
        />
        <Button size="icon" onClick={handleSend} disabled={sending || (!newComment.trim() && !pendingFile)}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
