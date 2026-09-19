import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaStorageService } from './mediaStorageService';
import * as supabaseClientModule from './supabaseClient';

describe('MediaStorageService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to local object URL when Supabase is not configured', async () => {
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(false);

    // Mock window.URL.createObjectURL
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test-blob');

    const fakeFile = new File(['image-bits'], 'photo.jpg', { type: 'image/jpeg' });
    const res = await MediaStorageService.uploadAttachment(fakeFile, 'image');

    expect(res.error).toBeNull();
    expect(res.attachment).toBeDefined();
    expect(res.attachment?.url).toBe('blob:http://localhost/test-blob');
    expect(res.attachment?.type).toBe('image');
  });

  it('uploads to attachments bucket and returns signed URL when configured', async () => {
    const mockUpload = vi.fn().mockResolvedValue({
      data: { path: 'user-1/12345_photo.jpg' },
      error: null,
    });
    const mockCreateSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://supabase.co/storage/v1/object/sign/attachments/user-1/12345_photo.jpg?token=abc' },
      error: null,
    });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
      storage: {
        from: vi.fn().mockReturnValue({
          upload: mockUpload,
          createSignedUrl: mockCreateSignedUrl,
        }),
      },
    } as any;

    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockSupabase);

    const fakeFile = new File(['dummy_content'], 'sunset.jpg', { type: 'image/jpeg' });
    const res = await MediaStorageService.uploadAttachment(fakeFile, 'image');

    expect(res.error).toBeNull();
    expect(res.attachment).toBeDefined();
    expect(res.attachment?.url).toContain('https://supabase.co/storage/v1/object/sign/attachments');
    expect(res.attachment?.filePath).toBe('user-1/12345_photo.jpg');
    expect(mockUpload).toHaveBeenCalled();
    expect(mockCreateSignedUrl).toHaveBeenCalled();
  });
});
