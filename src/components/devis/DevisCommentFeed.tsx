import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
}

interface Props {
  devisId: string;
}

export default function DevisCommentFeed({ devisId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const [commentsRes, profilesRes] = await Promise.all([
        supabase.from('devis_comments').select('*').eq('devis_id', devisId).order('created_at', { ascending: true }),
        supabase.from('profiles').select('id, email, company'),
      ]);
      if (commentsRes.data) setComments(commentsRes.data as any[]);
      if (profilesRes.data) {
        const map: Record<string, string> = {};
        for (const p of profilesRes.data as any[]) {
          map[p.id] = p.company || p.email;
        }
        setProfiles(map);
      }
    }
    load();
  }, [devisId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  async function handleSend() {
    if (!newComment.trim() || !user) return;
    setSending(true);
    const { data, error } = await supabase.from('devis_comments').insert({
      devis_id: devisId,
      user_id: user.id,
      content: newComment.trim(),
    } as any).select().single();
    if (data && !error) {
      setComments(prev => [...prev, data as any]);
      setNewComment('');
    }
    setSending(false);
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
            return (
              <div key={c.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p className="whitespace-pre-wrap break-words">{c.content}</p>
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

      <div className="flex gap-2 items-end border-t pt-3">
        <Textarea
          placeholder="Écrire un commentaire…"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="resize-none text-sm"
        />
        <Button size="icon" onClick={handleSend} disabled={sending || !newComment.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
