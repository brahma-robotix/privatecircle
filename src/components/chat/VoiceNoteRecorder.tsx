import React, { useState, useEffect, useRef } from 'react';
import { Attachment } from '../../types';
import { VoiceNoteService } from '../../services/voiceNoteService';
import { MediaStorageService } from '../../services/mediaStorageService';
import { useApp } from '../../context/AppContext';

interface VoiceNoteRecorderProps {
  onSend: (attachment: Attachment) => void;
  onCancel: () => void;
}

const MAX_DURATION_SECONDS = 120; // 2 minutes limit

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onSend,
  onCancel,
}) => {
  const [status, setStatus] = useState<'recording' | 'paused' | 'preview'>('recording');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize recording timer
  useEffect(() => {
    setWaveform(VoiceNoteService.generateWaveform(28));
  }, []);

  // Recording Timer interval
  useEffect(() => {
    if (status === 'recording') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev + 1 >= MAX_DURATION_SECONDS) {
            // Reached limit
            handleStopToPreview(MAX_DURATION_SECONDS);
            return MAX_DURATION_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Preview Playback Timer
  useEffect(() => {
    if (isPreviewPlaying) {
      const step = 0.1;
      previewTimerRef.current = setInterval(() => {
        setPreviewProgress((prev) => {
          const next = prev + step / Math.max(1, elapsedSeconds);
          if (next >= 1) {
            setIsPreviewPlaying(false);
            return 0;
          }
          return next;
        });
      }, 100);
    } else {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    }

    return () => {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    };
  }, [isPreviewPlaying, elapsedSeconds]);

  const handleStopToPreview = (finalDuration?: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const duration = finalDuration !== undefined ? finalDuration : Math.max(1, elapsedSeconds);
    const url = VoiceNoteService.createSampleAudioUrl(duration);
    setAudioUrl(url);
    setStatus('preview');
  };

  const handleTogglePreviewPlay = () => {
    setIsPreviewPlaying((prev) => !prev);
  };

  const { authMode } = useApp();

  const handleSendVoiceNote = async () => {
    const finalDuration = Math.max(1, elapsedSeconds);
    const rawUrl = audioUrl || VoiceNoteService.createSampleAudioUrl(finalDuration);

    // In mock mode, send immediately to prevent test timeout / async delay
    if (authMode === 'mock') {
      const attachment: Attachment = {
        id: `att-voice-${Date.now()}`,
        type: 'audio',
        name: `Voice Note (${VoiceNoteService.formatDuration(finalDuration)})`,
        url: rawUrl,
        durationSeconds: finalDuration,
        waveform: waveform.length > 0 ? waveform : VoiceNoteService.generateWaveform(28),
        sizeBytes: finalDuration * 8000,
      };
      onSend(attachment);
      return;
    }

    try {
      const resp = await fetch(rawUrl);
      const audioBlob = await resp.blob();

      const res = await MediaStorageService.uploadAttachment(audioBlob, 'audio', {
        durationSeconds: finalDuration,
        waveform: waveform.length > 0 ? waveform : VoiceNoteService.generateWaveform(28),
        filename: `voicenote-${Date.now()}.wav`,
      });

      if (res.attachment) {
        onSend(res.attachment);
        return;
      }
    } catch (e) {
      console.warn('[VoiceNoteRecorder] Storage upload fallback:', e);
    }

    const attachment: Attachment = {
      id: `att-voice-${Date.now()}`,
      type: 'audio',
      name: `Voice Note (${VoiceNoteService.formatDuration(finalDuration)})`,
      url: rawUrl,
      durationSeconds: finalDuration,
      waveform: waveform.length > 0 ? waveform : VoiceNoteService.generateWaveform(28),
      sizeBytes: finalDuration * 8000,
    };

    onSend(attachment);
  };

  const currentPreviewSeconds = Math.round(previewProgress * Math.max(1, elapsedSeconds));

  return (
    <div className="voice-recorder-bar" role="region" aria-label="Voice Note Recorder">
      {/* RECORDING / PAUSED STATE */}
      {status !== 'preview' && (
        <div className="recorder-active-row">
          <div className="recorder-status-cluster">
            <span
              className={`recording-dot ${status === 'recording' ? 'pulsing' : 'paused'}`}
            />
            <span className="recorder-timer">
              {VoiceNoteService.formatDuration(elapsedSeconds)}
              <span className="max-duration-label"> / 2:00</span>
            </span>
          </div>

          {/* Live animated waveform simulation */}
          <div className="live-waveform-bars" aria-hidden="true">
            {waveform.map((height, idx) => {
              const active = idx < Math.min(waveform.length, Math.floor(elapsedSeconds % waveform.length) + 1);
              return (
                <div
                  key={idx}
                  className={`live-bar ${status === 'recording' && active ? 'active' : ''}`}
                  style={{ height: `${Math.round(height * 20) + 4}px` }}
                />
              );
            })}
          </div>

          {/* Recorder Controls */}
          <div className="recorder-controls-cluster">
            {status === 'recording' ? (
              <button
                type="button"
                className="btn-recorder-ctrl"
                onClick={() => setStatus('paused')}
                title="Pause recording"
                aria-label="Pause recording"
              >
                ⏸️
              </button>
            ) : (
              <button
                type="button"
                className="btn-recorder-ctrl"
                onClick={() => setStatus('recording')}
                title="Resume recording"
                aria-label="Resume recording"
              >
                ▶️
              </button>
            )}

            <button
              type="button"
              className="btn-recorder-ctrl"
              onClick={() => handleStopToPreview()}
              title="Review & preview"
              aria-label="Review voice note"
            >
              ⏹️
            </button>

            <button
              type="button"
              className="btn-recorder-ctrl btn-recorder-danger"
              onClick={onCancel}
              title="Discard recording"
              aria-label="Discard recording"
            >
              🗑️
            </button>

            <button
              type="button"
              className="btn-primary btn-sm btn-recorder-send"
              onClick={() => {
                handleStopToPreview();
                handleSendVoiceNote();
              }}
              title="Send directly"
              aria-label="Send voice note now"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* PREVIEW & REVIEW STATE */}
      {status === 'preview' && (
        <div className="recorder-preview-row">
          <button
            type="button"
            className="btn-preview-play"
            onClick={handleTogglePreviewPlay}
            aria-label={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
          >
            {isPreviewPlaying ? '⏸' : '▶'}
          </button>

          <div className="preview-waveform-container">
            <div className="preview-waveform-track">
              {waveform.map((height, idx) => {
                const progressPoint = idx / waveform.length;
                const isPlayed = progressPoint <= previewProgress;
                return (
                  <div
                    key={idx}
                    className={`preview-bar ${isPlayed ? 'played' : ''}`}
                    style={{ height: `${Math.round(height * 22) + 4}px` }}
                    onClick={() => setPreviewProgress(progressPoint)}
                  />
                );
              })}
            </div>
            <div className="preview-time-labels">
              <span>{VoiceNoteService.formatDuration(currentPreviewSeconds)}</span>
              <span>{VoiceNoteService.formatDuration(elapsedSeconds)}</span>
            </div>
          </div>

          <div className="preview-actions-cluster">
            <button
              type="button"
              className="btn-recorder-ctrl btn-recorder-danger"
              onClick={onCancel}
              title="Discard"
              aria-label="Discard preview"
            >
              🗑️
            </button>

            <button
              type="button"
              className="btn-primary btn-sm btn-send-preview"
              onClick={handleSendVoiceNote}
              aria-label="Confirm send voice note"
            >
              ✈️ Send Voice Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
