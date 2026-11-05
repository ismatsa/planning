import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, X, Loader2, Pencil, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Comment {
  id: string;
  content: string | null;
  user_id: number;
  user_name?: string;
  created_at: string;
}

interface Props {
  devisId: string;
}

export default function DevisCommentFeed({ devisId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  function startEdit(c: Comment) {
    setEditingId(c.id);
    setEditingContent(c.content || '');
  }
  function cancelEdit() {
    setEditingId(null);
    setEditingContent('');
  }
  async function saveEdit(c: Comment) {
    const next = editingContent.trim();
    if (!next) { cancelEdit(); return; }
    try {
      await api.patch(`/comments/${c.id}`, { content: next });
      setComments(prev => prev.map(x => x.id === c.id ? { ...x, content: next } : x));
      cancelEdit();
    } catch {
      toast.error('Erreur lors de la modification.');
    }
  }
  async function handleDelete(c: Comment) {
    if (!confirm('Supprimer ce message ?')) return;
    try {
      await api.del(`/comments/${c.id}`);
      setComments(prev => prev.filter(x => x.id !== c.id));
    } catch {
      toast.error('Erreur lors de la suppression.');
    }
  }

  async function loadAll() {
    try {
      const data = await api.get<Comment[]>(`/devis/${devisId}/comments`);
      setComments(data);
    } catch {
      // silencieux : le fil reste vide
    }
  }

  useEffect(() => { loadAll(); }, [devisId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  async function handleSend() {
    if (!newComment.trim() || !user) return;
    setSending(true);
    try {
      const data = await api.post<Comment>(`/devis/${devisId}/comments`, { content: newComment.trim() });
      setComments(prev => [...prev, data]);
      setNewComment('');
    } catch {
      toast.error('Erreur lors de l\'envoi.');
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
            const isMe = String(c.user_id) === user?.id;
            const isEditing = editingId === c.id;
            return (
              <div key={c.id} className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {isEditing ? (
                    <div className="flex flex-col gap-1.5 min-w-[220px]">
                      <Textarea
                        value={editingContent}
                        onChange={e => setEditingContent(e.target.value)}
                        rows={2}
                        className="resize-none text-sm text-foreground bg-background"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveEdit(c)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{c.content}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 px-1">
                  <span className="text-[10px] text-muted-foreground">
                    {c.user_name || 'Utilisateur'} · {format(new Date(c.created_at), 'd MMM HH:mm', { locale: fr })}
                  </span>
                  {isMe && !isEditing && (
                    <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                        title="Modifier"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="text-muted-foreground hover:text-destructive p-0.5"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
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
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
