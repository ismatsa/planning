/**
 * Attachments Service — Supabase Storage backend.
 *
 * Files are stored in the `devis-attachments` bucket under quotes/{quote_id}/{filename}.
 * Metadata lives in `devis_attachments`.
 */

import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'devis-attachments';

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
}

// ── Helpers ────────────────────────────────────────────────────────────────

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
  };
}

function uniqueName(file: File): string {
  const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
  const base = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${Date.now()}_${base}${ext}`;
}

// ── Service API ────────────────────────────────────────────────────────────

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
  const fileName = uniqueName(file);
  const storagePath = `quotes/${devisId}/${fileName}`;

  // 1. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return null;
  }

  // 2. Save metadata
  const { data, error } = await supabase
    .from('devis_attachments')
    .insert({
      devis_id: devisId,
      file_name: file.name,
      file_path: storagePath,
      file_size: file.size,
      content_type: file.type,
      uploaded_by: userId,
    } as any)
    .select()
    .single();

  if (error || !data) {
    // Rollback storage if DB insert failed
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return null;
  }
  return mapRow(data);
}

export async function deleteAttachment(attachment: AttachmentMeta): Promise<void> {
  await supabase.storage.from(BUCKET).remove([attachment.storagePath]);
  await supabase.from('devis_attachments').delete().eq('id', attachment.id);
}

export function getAttachmentUrl(attachment: AttachmentMeta): string | null {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(attachment.storagePath);
  return data?.publicUrl || null;
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
