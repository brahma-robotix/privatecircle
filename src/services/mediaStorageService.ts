import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { Attachment } from '../types';

export interface UploadAttachmentOptions {
  durationSeconds?: number;
  waveform?: number[];
  filename?: string;
  userId?: string;
}

export interface UploadAttachmentResult {
  attachment: (Attachment & { filePath?: string }) | null;
  error: string | null;
}

export const MediaStorageService = {
  /**
   * Upload an image, video, or voice note to the private "attachments" Supabase Storage bucket
   */
  async uploadAttachment(
    file: File | Blob,
    fileType: 'image' | 'video' | 'audio',
    options?: UploadAttachmentOptions
  ): Promise<UploadAttachmentResult> {
    const rawFilename =
      options?.filename ||
      (file instanceof File ? file.name : `attachment-${Date.now()}.${fileType === 'audio' ? 'wav' : 'bin'}`);
    const sanitizedFilename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_');

    const supabase = getSupabaseClient();

    // Local / Mock Mode fallback
    if (!isSupabaseConfigured() || !supabase) {
      const localUrl = URL.createObjectURL(file);
      const mockAttachment: Attachment & { filePath?: string } = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: fileType,
        url: localUrl,
        name: sanitizedFilename,
        sizeBytes: file.size,
        durationSeconds: options?.durationSeconds,
        waveform: options?.waveform,
      };
      return { attachment: mockAttachment, error: null };
    }

    try {
      // Resolve authenticated user ID
      let userId = options?.userId;
      if (!userId) {
        const { data: authData } = await supabase.auth.getUser();
        userId = authData?.user?.id;
      }

      if (!userId) {
        return { attachment: null, error: 'User must be authenticated to upload media.' };
      }

      const filePath = `${userId}/${Date.now()}_${sanitizedFilename}`;

      // Upload file to private 'attachments' bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        return { attachment: null, error: uploadError.message };
      }

      // Generate a 7-day secure signed URL
      const { data: signedData, error: signedError } = await supabase.storage
        .from('attachments')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);

      if (signedError || !signedData?.signedUrl) {
        return { attachment: null, error: signedError?.message || 'Failed to generate signed URL' };
      }

      const attachment: Attachment & { filePath?: string } = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: fileType,
        url: signedData.signedUrl,
        filePath: uploadData.path,
        name: sanitizedFilename,
        sizeBytes: file.size,
        durationSeconds: options?.durationSeconds,
        waveform: options?.waveform,
      };

      return { attachment, error: null };
    } catch (err: any) {
      return { attachment: null, error: err.message || 'Media upload failed' };
    }
  },

  /**
   * Refreshes a signed URL for an existing file path in the attachments bucket
   */
  async getSignedUrl(filePath: string, expiresIn = 60 * 60 * 24 * 7): Promise<string | null> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .createSignedUrl(filePath, expiresIn);

      if (error || !data?.signedUrl) {
        return null;
      }

      return data.signedUrl;
    } catch {
      return null;
    }
  },

  /**
   * Delete an attachment from Supabase Storage
   */
  async deleteAttachment(filePath: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured' };
    }

    try {
      const { error } = await supabase.storage
        .from('attachments')
        .remove([filePath]);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete attachment' };
    }
  },
};
