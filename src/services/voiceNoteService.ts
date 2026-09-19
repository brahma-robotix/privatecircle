/**
 * Voice Note Service
 * Audio duration formatting, mock waveform generator, and fallback audio generator
 */

export interface VoiceNoteMeta {
  durationSeconds: number;
  waveform: number[];
  audioUrl: string;
}

export const VoiceNoteService = {
  /**
   * Formats seconds into MM:SS display
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  },

  /**
   * Generates sample normalized waveform bars between 0.2 and 1.0
   */
  generateWaveform(count = 32): number[] {
    const baseWave = [
      0.3, 0.5, 0.7, 0.4, 0.8, 0.9, 0.6, 0.4, 0.7, 0.85, 1.0, 0.65, 0.5, 0.8, 0.9,
      0.75, 0.6, 0.4, 0.6, 0.8, 0.95, 0.7, 0.5, 0.35, 0.5, 0.7, 0.85, 0.6, 0.4,
      0.5, 0.3, 0.2,
    ];
    if (count <= baseWave.length) {
      return baseWave.slice(0, count);
    }
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      result.push(baseWave[i % baseWave.length]);
    }
    return result;
  },

  /**
   * Generates a sample playable Web Audio WAV data URI
   * Synthesizes a gentle couple voice note chime tone
   */
  createSampleAudioUrl(durationSeconds = 10): string {
    try {
      // 8kHz mono 8-bit PCM WAV generator (fully offline, no network dependency)
      const sampleRate = 8000;
      const numSamples = Math.min(sampleRate * Math.max(1, durationSeconds), sampleRate * 10);
      const headerLength = 44;
      const buffer = new ArrayBuffer(headerLength + numSamples);
      const view = new DataView(buffer);

      // RIFF chunk descriptor
      this.writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + numSamples, true);
      this.writeString(view, 8, 'WAVE');

      // fmt sub-chunk
      this.writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
      view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
      view.setUint16(22, 1, true); // NumChannels (1 mono)
      view.setUint32(24, sampleRate, true); // SampleRate
      view.setUint32(28, sampleRate, true); // ByteRate
      view.setUint16(32, 1, true); // BlockAlign
      view.setUint16(34, 8, true); // BitsPerSample

      // data sub-chunk
      this.writeString(view, 36, 'data');
      view.setUint32(40, numSamples, true);

      // Write subtle pleasant acoustic sine harmonics
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const freq1 = 440; // A4 note
        const freq2 = 554.37; // C#5 note (warm major chord)
        const envelope = Math.max(0, 1 - (t % 2.5) / 2.5); // 2.5s decaying pulses
        const sample =
          Math.sin(2 * Math.PI * freq1 * t) * 0.5 +
          Math.sin(2 * Math.PI * freq2 * t) * 0.3;
        const byteVal = Math.floor((sample * envelope * 0.4 + 0.5) * 255);
        view.setUint8(headerLength + i, Math.max(0, Math.min(255, byteVal)));
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    } catch {
      // Fallback empty data URI
      return 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    }
  },

  writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  },
};
