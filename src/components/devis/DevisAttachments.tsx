import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import { Paperclip, Download, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  created_at: string;
}

interface Props {
  devisId: string;
  readOnly?: boolean;
}

export default function DevisAttachments({ devisId, readOnly }: Props) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('devis_attachments')
        .select('*')
        .eq('devis_id', devisId)
        .order('created_at', { ascending: true });
      if (data) setAttachments(data as any[]);
    }
    load();
  }, [devisId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const filePath = `${devisId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('devis-attachments')
        .upload(filePath, file);

      if (uploadError) {
        toast.error(`Erreur upload: ${file.name}`);
        continue;
      }

      const { data: record, error: insertError } = await supabase.from('devis_attachments').insert({
        devis_id: devisId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        content_type: file.type,
        uploaded_by: user.id,
      } as any).select().single();

      if (record && !insertError) {
        setAttachments(prev => [...prev, record as any]);
      }
    }
    toast.success('Fichier(s) ajouté(s).');
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleDelete(att: Attachment) {
    await supabase.storage.from('devis-attachments').remove([att.file_path]);
    await supabase.from('devis_attachments').delete().eq('id', att.id);
    setAttachments(prev => prev.filter(a => a.id !== att.id));
    toast.success('Fichier supprimé.');
  }

  function getPublicUrl(filePath: string) {
    return supabase.storage.from('devis-attachments').getPublicUrl(filePath).data.publicUrl;
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" /> Pièces jointes ({attachments.length})
        </h4>
        {!readOnly && (
          <>
            <input ref={inputRef} type="file" multiple className="hidden" onChange={handleUpload} />
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <Upload className="h-3.5 w-3.5 mr-1" />
              {uploading ? 'Envoi…' : 'Ajouter'}
            </Button>
          </>
        )}
      </div>

      {attachments.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">Aucune pièce jointe.</p>
      )}

      <div className="space-y-1">
        {attachments.map(att => (
          <div key={att.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-muted/30">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate flex-1 font-medium">{att.file_name}</span>
            <span className="text-xs text-muted-foreground shrink-0">{formatSize(att.file_size)}</span>
            <a href={getPublicUrl(att.file_path)} target="_blank" rel="noopener noreferrer">
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <Download className="h-3.5 w-3.5" />
              </Button>
            </a>
            {!readOnly && (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(att)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
