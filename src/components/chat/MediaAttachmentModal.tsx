import React, { useState, useRef } from 'react';
import { Attachment } from '../../types';
import { MediaStorageService } from '../../services/mediaStorageService';
import { useApp } from '../../context/AppContext';

interface MediaAttachmentModalProps {
  onClose: () => void;
  onSend: (text: string, attachment: Attachment) => void;
}

export const MediaAttachmentModal: React.FC<MediaAttachmentModalProps> = ({
  onClose,
  onSend,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = (selectedFile: File) => {
    setError(null);

    const isImage = selectedFile.type.startsWith('image/');
    const isVideo = selectedFile.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setError(
        'Unsupported file format. Please attach a photo (JPG, PNG, WebP) or video (MP4, WebM).'
      );
      return;
    }

    if (isVideo) {
      setLoading(true);
      // Validate video duration is strictly <= 60 seconds
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      const objUrl = URL.createObjectURL(selectedFile);

      tempVideo.onloadedmetadata = () => {
        URL.revokeObjectURL(tempVideo.src);
        setLoading(false);
        const duration = tempVideo.duration;

        if (duration > 60) {
          setError(
            `Video duration is ${Math.round(duration)} seconds. Videos must be shorter than 60 seconds.`
          );
          setFile(null);
          setPreviewUrl(null);
        } else {
          setFile(selectedFile);
          setFileType('video');
          setPreviewUrl(objUrl);
        }
      };

      tempVideo.onerror = () => {
        setLoading(false);
        setError('Failed to read video file metadata.');
      };

      tempVideo.src = objUrl;
    } else {
      // Image file
      const reader = new FileReader();
      reader.onload = (e) => {
        setFile(selectedFile);
        setFileType('image');
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  // Quick Demo Samples for instant prototype testing
  const handleSelectDemoSample = (type: 'photo' | 'video') => {
    setError(null);
    if (type === 'photo') {
      setFile(new File(['mock_image'], 'demo_beach.jpg', { type: 'image/jpeg' }));
      setFileType('image');
      setPreviewUrl(
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
      );
      setCaption('Look at this beautiful sunset view for us 🌅');
    } else {
      setFile(new File(['mock_video'], 'demo_short_clip.mp4', { type: 'video/mp4' }));
      setFileType('video');
      setPreviewUrl(
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
      );
      setCaption('Quick 15-second video clip from my walk today 🎥');
    }
  };

  const { authMode } = useApp();

  const handleSend = async () => {
    if (!previewUrl || !file) return;

    // In mock mode, process synchronously to avoid async delay in tests
    if (authMode === 'mock') {
      const attachment: Attachment = {
        id: `att-${Date.now()}`,
        type: fileType,
        url: previewUrl,
        name: file.name,
        sizeBytes: file.size,
      };
      onSend(caption, attachment);
      onClose();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await MediaStorageService.uploadAttachment(file, fileType, {
        filename: file.name,
      });

      if (res.error || !res.attachment) {
        setError(res.error || 'Failed to upload attachment.');
        setLoading(false);
        return;
      }

      onSend(caption, res.attachment);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Media upload failed.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card media-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div>
            <h3>📎 Send Photo or Short Video</h3>
            <span className="modal-subtitle">
              Private Circle Storage • Validated &lt; 60s
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-alert" role="alert">
              <span>⚠️ {error}</span>
            </div>
          )}

          {!previewUrl ? (
            <div className="media-upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div
                className="dropzone-box"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="dropzone-icon">📷 / 🎥</span>
                <p className="dropzone-text">
                  Click to select an image or short video from your device
                </p>
                <span className="dropzone-sub">
                  Videos must be under 60 seconds. Files are kept local.
                </span>
              </div>

              <div className="quick-demo-media-section">
                <span>Or use prototype demo sample:</span>
                <div className="quick-sample-buttons">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => handleSelectDemoSample('photo')}
                  >
                    🌅 Sample Photo (Sunset)
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => handleSelectDemoSample('video')}
                  >
                    🎥 Sample Short Video (15s)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="media-preview-container">
              <div className="media-preview-box">
                {fileType === 'image' ? (
                  <img
                    src={previewUrl}
                    alt="Selected attachment preview"
                    className="media-preview-img"
                  />
                ) : (
                  <video
                    src={previewUrl}
                    controls
                    className="media-preview-video"
                  />
                )}
              </div>

              <div className="media-file-info">
                <span className="file-info-badge">
                  {fileType === 'image' ? '📸 Image' : '🎬 Short Video (validated < 60s)'}
                </span>
                <span className="file-info-name">{file?.name}</span>
                <button
                  className="btn-link btn-change-file"
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  Choose different file
                </button>
              </div>

              <div className="caption-input-group">
                <label htmlFor="media-caption">Optional caption / message:</label>
                <input
                  id="media-caption"
                  type="text"
                  placeholder="Add a loving note with this photo..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="chat-text-input"
                />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSend}
            disabled={!previewUrl || loading}
          >
            {loading ? 'Validating...' : 'Send Attachment'}
          </button>
        </div>
      </div>
    </div>
  );
};
