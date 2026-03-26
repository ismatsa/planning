/**
 * Attachments Service — Storage-agnostic abstraction layer.
 *
 * Currently uses a placeholder implementation that stores file metadata
 * in Supabase (database only) and converts files to data URLs for preview.
 *
 * To connect a real backend, replace the methods in PlaceholderStorageProvider
 * with calls to your server endpoint (e.g. POST /api/attachments/upload).
 */

import { supabase } from '@/integrations/supabase/client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AttachmentMeta {
  id: string;
  devisId: string;
  fileName: string;
  originalName: string;
  mimeType: string | null;
  fileSize: number | null;
  storagePath: string;
  uploadedBy: string | null;
  createdAt: string;
  /** When using the placeholder provider, the file content as a data URL */
  dataUrl?: string;
}

export interface StorageProvider {
  /** Upload a file and return its storage path */
  upload(devisId: string, file: File): Promise<{ storagePath: string; dataUrl?: string }>;
  /** Get a downloadable/viewable URL for a stored file */
  getUrl(attachment: AttachmentMeta): string | null;
  /** Delete the stored file */
  delete(storagePath: string): Promise<void>;
}

// ── Placeholder Provider (data URL — no server needed) ─────────────────────

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const placeholderProvider: StorageProvider = {
  async upload(devisId: string, file: File) {
    const storagePath = `uploads/quotes/${devisId}/${Date.now()}_${file.name}`;
    const dataUrl = await fileToDataUrl(file);
    return { storagePath, dataUrl };
  },

  getUrl(attachment: AttachmentMeta) {
    // In placeholder mode, the data URL is stored in the DB column `file_path`
    // alongside the logical path. We use a convention: if file_path starts with
    // "data:" it's a data URL; otherwise it's a server path.
    return attachment.dataUrl || null;
  },

  async delete(_storagePath: string) {
    // No-op in placeholder mode — nothing to delete on disk
  },
};

// ── Active provider (swap this when backend is ready) ──────────────────────

let provider: StorageProvider = placeholderProvider;

export function setStorageProvider(p: StorageProvider) {
  provider = p;
}

// ── Service API ────────────────────────────────────────────────────────────

function mapRow(row: any): AttachmentMeta {
  return {
    id: row.id,
    devisId: row.devis_id,
    fileName: row.file_name,
    originalName: row.file_name,
    mimeType: row.content_type,
    fileSize: row.file_size,
    storagePath: row.file_path,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    dataUrl: row.data_url ?? undefined,
  };
}

export async function listAttachments(devisId: string): Promise<AttachmentMeta[]> {
  const { data } = await supabase
    .from('devis_attachments')
    .select('*')
    .eq('devis_id', devisId)
    .order('created_at', { ascending: true });
  return (data || []).map(mapRow);
}

export async function uploadAttachment(
  devisId: string,
  file: File,
  userId: string,
): Promise<AttachmentMeta | null> {
  const { storagePath, dataUrl } = await provider.upload(devisId, file);

  const { data, error } = await supabase
    .from('devis_attachments')
    .insert({
      devis_id: devisId,
      file_name: file.name,
      file_path: storagePath,
      file_size: file.size,
      content_type: file.type,
      uploaded_by: userId,
      data_url: dataUrl ?? null,
    } as any)
    .select()
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

export async function deleteAttachment(attachment: AttachmentMeta): Promise<void> {
  await provider.delete(attachment.storagePath);
  await supabase.from('devis_attachments').delete().eq('id', attachment.id);
}

export function getAttachmentUrl(attachment: AttachmentMeta): string | null {
  return provider.getUrl(attachment);
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
