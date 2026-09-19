import React, { useState, useRef, useEffect } from 'react';
import { VoiceNoteService } from '../../services/voiceNoteService';

interface VoiceNotePlayerProps {
  url: string;
  durationSeconds?: number;
  waveform?: number[];
  isMine?: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  url,
  durationSeconds = 12,
  waveform = [],
  isMine = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bars = waveform.length > 0 ? waveform : VoiceNoteService.generateWaveform(28);

  // Sync playback rate when speed changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // If browser blocks autoplay or audio context fails, simulate playback timer
          simulatePlayback();
        });
    }
  };

  // Fallback timer simulation for environments where HTMLAudioElement cannot play synthesize data
  const simulatePlayback = () => {
    setIsPlaying(true);
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev + 1 >= durationSeconds) {
          clearInterval(interval);
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 1000 / playbackSpeed);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleScrub = (ratio: number) => {
    const target = ratio * durationSeconds;
    setCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
  };

  const cycleSpeed = () => {
    if (playbackSpeed === 1) setPlaybackSpeed(1.5);
    else if (playbackSpeed === 1.5) setPlaybackSpeed(2);
    else setPlaybackSpeed(1);
  };

  const progressRatio = durationSeconds > 0 ? Math.min(1, currentTime / durationSeconds) : 0;

  return (
    <div className={`voice-note-player-card ${isMine ? 'mine' : 'theirs'}`} role="region" aria-label="Voice Note Player">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="metadata"
      />

      <div className="voice-player-main">
        {/* Play/Pause Button */}
        <button
          type="button"
          className="btn-voice-play"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
        >
          <span className="play-icon">{isPlaying ? '⏸' : '▶'}</span>
        </button>

        {/* Waveform Visualization */}
        <div className="voice-waveform-track">
          {bars.map((height, idx) => {
            const barRatio = idx / bars.length;
            const isPlayed = barRatio <= progressRatio;
            return (
              <div
                key={idx}
                className={`waveform-bar ${isPlayed ? 'played' : ''}`}
                style={{ height: `${Math.round(height * 20) + 4}px` }}
                onClick={() => handleScrub(barRatio)}
                title={`Seek to ${VoiceNoteService.formatDuration(barRatio * durationSeconds)}`}
              />
            );
          })}
        </div>

        {/* Speed button */}
        <button
          type="button"
          className="btn-speed-toggle"
          onClick={cycleSpeed}
          title="Playback speed"
          aria-label={`Playback speed: ${playbackSpeed}x`}
        >
          {playbackSpeed}x
        </button>
      </div>

      <div className="voice-player-footer">
        <div className="voice-badge-tag">
          <span>🎙️ Voice Note</span>
        </div>
        <div className="voice-time-display">
          <span>{VoiceNoteService.formatDuration(currentTime)}</span>
          <span className="time-divider">/</span>
          <span>{VoiceNoteService.formatDuration(durationSeconds)}</span>
        </div>
      </div>
    </div>
  );
};
