import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import { Paperclip, Download, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatFileSize } from '@/services/attachmentsService';

const BUCKET = 'devis-attachments';

interface RdvAttachmentMeta {
  id: string;
  rdvId: string;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  fileSize: number | null;
  uploadedBy: string | null;
  createdAt: string;
}

function mapRow(row: any): RdvAttachmentMeta {
  return {
    id: row.id,
    rdvId: row.rdv_id,
    fileName: row.file_name,
    filePath: row.file_path,
    mimeType: row.content_type,
    fileSize: row.file_size,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

interface Props {
  rdvId: string;
  readOnly?: boolean;
}

export default function RdvAttachments({ rdvId, readOnly }: Props) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<RdvAttachmentMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from('rdv_attachments')
      .select('*')
      .eq('rdv_id', rdvId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setAttachments(data.map(mapRow));
      });
  }, [rdvId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
      const base = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const storagePath = `events/${rdvId}/${Date.now()}_${base}${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        toast.error(`Erreur upload: ${file.name}`);
        continue;
      }

      const { data, error } = await supabase
        .from('rdv_attachments')
        .insert({
          rdv_id: rdvId,
          file_name: file.name,
          file_path: storagePath,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: user.id,
        } as any)
        .select()
        .single();

      if (error || !data) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
        toast.error(`Erreur upload: ${file.name}`);
      } else {
        setAttachments(prev => [...prev, mapRow(data)]);
      }
    }
    toast.success('Fichier(s) ajouté(s).');
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleDelete(att: RdvAttachmentMeta) {
    await supabase.storage.from(BUCKET).remove([att.filePath]);
    await supabase.from('rdv_attachments').delete().eq('id', att.id);
    setAttachments(prev => prev.filter(a => a.id !== att.id));
    toast.success('Fichier supprimé.');
  }

  async function handleOpen(att: RdvAttachmentMeta) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(att.filePath, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" /> Pièces jointes du rendez-vous ({attachments.length})
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
        <p className="text-xs text-muted-foreground py-1">Aucune pièce jointe.</p>
      )}

      <div className="space-y-1">
        {attachments.map(att => (
          <div key={att.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-muted/30">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate flex-1 font-medium">{att.fileName}</span>
            <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(att.fileSize)}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpen(att)}>
              <Download className="h-3.5 w-3.5" />
            </Button>
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
