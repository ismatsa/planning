import { useEffect, useRef, useState } from 'react';
import {
  Bot, Send, Paperclip, X, Loader2, AlertTriangle, CheckCircle2,
  HelpCircle, Clock, ShieldQuestion, FileText, Image as ImageIcon, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  useAssistant, STATUS_LABELS, QUEUE_NOTICE,
  type AssistantStatus, type AssistantMessage,
} from '@/hooks/useAssistant';

const QUICK_ACTIONS: { hint: string; label: string; prompt: string }[] = [
  { hint: 'devis', label: 'Devis', prompt: 'Crée un devis brouillon : ' },
  { hint: 'reference_piece', label: 'Référence pièce', prompt: 'Recherche la référence constructeur (PartsLink24) : VIN ' },
  { hint: 'client_vehicule', label: 'Client / Véhicule', prompt: 'Recherche ou crée le client et son véhicule : ' },
  { hint: 'creer_rdv', label: 'Créer RDV', prompt: 'Crée un rendez-vous : ' },
  { hint: 'modifier_rdv', label: 'Modifier RDV', prompt: 'Modifie / déplace le rendez-vous : ' },
];

const STATUS_STYLES: Record<AssistantStatus, { icon: any; className: string }> = {
  queued: { icon: Clock, className: 'bg-muted text-muted-foreground' },
  processing: { icon: Loader2, className: 'bg-primary/10 text-primary' },
  needs_information: { icon: HelpCircle, className: 'bg-amber-500/15 text-amber-600' },
  confirmation_required: { icon: ShieldQuestion, className: 'bg-amber-500/15 text-amber-600' },
  completed: { icon: CheckCircle2, className: 'bg-emerald-500/15 text-emerald-600' },
  failed: { icon: AlertTriangle, className: 'bg-destructive/10 text-destructive' },
};

function StatusPill({ status }: { status: AssistantStatus }) {
  const { icon: Icon, className } = STATUS_STYLES[status];
  return (
    <Badge variant="secondary" className={cn('gap-1 font-medium', className)}>
      <Icon className={cn('h-3 w-3', status === 'processing' && 'animate-spin')} />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function ResultSummary({ result }: { result: any }) {
  if (!result || typeof result !== 'object') return null;
  const changes: any[] = Array.isArray(result.changes) ? result.changes : [];
  const missing: any[] = Array.isArray(result.missing_fields) ? result.missing_fields : [];
  const warnings: any[] = Array.isArray(result.warnings) ? result.warnings : [];
  const conflicts: any[] = Array.isArray(result.conflicts) ? result.conflicts : [];
  const slots: any[] = Array.isArray(result.suggested_slots) ? result.suggested_slots : [];

  if (!changes.length && !missing.length && !warnings.length && !conflicts.length && !slots.length && !result.planning_impact) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/40 p-2 text-xs">
      {changes.map((c, i) => (
        <div key={i} className="space-y-0.5">
          <p className="font-semibold">{c.label ?? `${c.resource ?? ''} ${c.action ?? ''}`.trim()}</p>
          {c.old_value !== undefined && (
            <p className="text-muted-foreground">
              Ancienne valeur : <span className="line-through">{JSON.stringify(c.old_value)}</span>
            </p>
          )}
          {c.new_value !== undefined && (
            <p className="text-foreground">Nouvelle valeur : {JSON.stringify(c.new_value)}</p>
          )}
        </div>
      ))}
      {result.planning_impact && (
        <p><span className="font-semibold">Impact planning :</span> {String(result.planning_impact)}</p>
      )}
      {conflicts.length > 0 && (
        <div>
          <p className="font-semibold text-destructive">Conflit détecté</p>
          <ul className="list-disc pl-4">{conflicts.map((c, i) => <li key={i}>{typeof c === 'string' ? c : JSON.stringify(c)}</li>)}</ul>
        </div>
      )}
      {slots.length > 0 && (
        <div>
          <p className="font-semibold">Créneaux disponibles</p>
          <ul className="list-disc pl-4">{slots.map((s, i) => <li key={i}>{typeof s === 'string' ? s : JSON.stringify(s)}</li>)}</ul>
        </div>
      )}
      {missing.length > 0 && (
        <div>
          <p className="font-semibold">Informations manquantes</p>
          <ul className="list-disc pl-4">{missing.map((m, i) => <li key={i}>{typeof m === 'string' ? m : JSON.stringify(m)}</li>)}</ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div>
          <p className="font-semibold">Avertissements</p>
          <ul className="list-disc pl-4">{warnings.map((w, i) => <li key={i}>{typeof w === 'string' ? w : JSON.stringify(w)}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

const PLACEHOLDERS = ['Analyse en cours…', 'Analyse en cours...', 'Action réalisée.', 'Mise à jour'];

export function MessageBubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === 'user';
  if (message.role === 'system') {
    return (
      <p className="mx-auto max-w-[90%] rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
        {message.content}
      </p>
    );
  }

  const content = message.content?.trim() ?? '';
  const isPlaceholder = !isUser && PLACEHOLDERS.includes(content);
  const summary = !isUser && message.result?.summary ? String(message.result.summary) : null;

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      {!isUser && message.status && <StatusPill status={message.status} />}
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground',
          isPlaceholder && 'italic text-muted-foreground',
        )}
      >
        {content}
        {summary && content !== summary && (
          <p className="mt-1 text-xs text-muted-foreground">{summary}</p>
        )}
        {message.attachments.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.attachments.map((a) => (
              <span
                key={a.path}
                className={cn(
                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]',
                  isUser ? 'bg-primary-foreground/15' : 'bg-muted',
                )}
              >
                {a.type?.startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                {a.name}
              </span>
            ))}
          </div>
        )}
        {!isUser && <ResultSummary result={message.result} />}
      </div>
    </div>
  );
}


export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [hint, setHint] = useState('libre');
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, send, sending, activeStatus, error } = useAssistant(open);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeStatus]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open, sending]);

  const handleSend = async () => {
    if (sending || (!text.trim() && files.length === 0)) return;
    const payload = text;
    const payloadFiles = files;
    setText('');
    setFiles([]);
    await send(payload, payloadFiles, hint);
    setHint('libre');
    textareaRef.current?.focus();
  };

  const pickFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles(prev => [...prev, ...Array.from(list)].slice(0, 10));
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg transition hover:brightness-110"
          aria-label="Ouvrir l'Assistant Powertech"
        >
          <Bot className="h-5 w-5" />
          <span className="hidden text-sm font-semibold sm:inline">Assistant Powertech</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[min(640px,85vh)] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
          <header className="flex items-center justify-between border-b border-border bg-primary px-3 py-2 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="text-sm font-semibold">Assistant Powertech</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="mt-6 text-center text-sm text-muted-foreground">
                <Bot className="mx-auto mb-2 h-8 w-8 opacity-40" />
                Décrivez votre demande ou déposez une photo / capture / PDF.<br />
                Devis brouillon, référence pièce, client, véhicule ou rendez-vous.
              </div>
            )}
            {messages.map(m => <MessageBubble key={m.id} message={m} />)}
            {activeStatus === 'queued' && (
              <p className="mx-auto max-w-[90%] rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
                {QUEUE_NOTICE}
              </p>
            )}
            {activeStatus && activeStatus !== 'queued' && (
              <div className="flex justify-start"><StatusPill status={activeStatus} /></div>
            )}
            {error && <p className="text-center text-xs text-destructive">{error}</p>}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border p-2">
            <div className="mb-2 flex flex-wrap gap-1">
              {QUICK_ACTIONS.map(a => (
                <button
                  key={a.hint}
                  onClick={() => {
                    setHint(a.hint);
                    setText(a.prompt);
                    textareaRef.current?.focus();
                  }}
                  className={cn(
                    'rounded-full border px-2 py-1 text-[11px] transition',
                    hint === a.hint
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>

            {files.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {files.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px]">
                    {f.type.startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                    {f.name}
                    <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} aria-label="Retirer">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-end gap-1">
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => { pickFiles(e.target.files); e.target.value = ''; }}
              />
              <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()} aria-label="Ajouter un fichier">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Votre demande…"
                rows={2}
                className="min-h-[44px] resize-none text-sm"
              />
              <Button size="icon" onClick={handleSend} disabled={sending} aria-label="Envoyer">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
