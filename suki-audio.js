class CyberAudio {
  constructor() {
    this.ctx = null;
  }

  async playBeep() {
    if (typeof window === 'undefined') return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      if (!this.ctx) {
        this.ctx = new AudioContext();
      }

      // Resume context if suspended (crucial for iOS Safari)
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      if (this.ctx.state !== 'running') return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      // Connect nodes
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      // Clean up nodes from memory automatically when stopped
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (error) {
      console.warn('Audio playback unavailable:', error);
    }
  }
}

// Safely instantiate for client-side execution
export const sound = typeof window !== 'undefined' ? new CyberAudio() : null;
