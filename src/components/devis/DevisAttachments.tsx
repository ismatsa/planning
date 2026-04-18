import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import { Paperclip, Download, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  listAttachments,
  uploadAttachment,
  deleteAttachment,
  getAttachmentUrl,
  formatFileSize,
  type AttachmentMeta,
} from '@/services/attachmentsService';


interface Props {
  devisId: string;
  readOnly?: boolean;
}

export default function DevisAttachments({ devisId, readOnly }: Props) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listAttachments(devisId).then(setAttachments);
  }, [devisId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const result = await uploadAttachment(devisId, file, user.id);
      if (result) {
        setAttachments(prev => [...prev, result]);
      } else {
        toast.error(`Erreur upload: ${file.name}`);
      }
    }
    toast.success('Fichier(s) ajouté(s).');
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleDelete(att: AttachmentMeta) {
    await deleteAttachment(att);
    setAttachments(prev => prev.filter(a => a.id !== att.id));
    toast.success('Fichier supprimé.');
  }

  async function handleOpen(att: AttachmentMeta) {
    const url = await getAttachmentUrl(att);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.info('Le fichier sera disponible une fois le backend de stockage connecté.');
    }
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
