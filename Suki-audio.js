class CyberAudio {
  constructor() {
    this.ctx = null;
  }

  async playBeep() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      if (!this.ctx) {
        this.ctx = new AudioContext();
      }

      // Call playBeep from a tap/click handler to satisfy iOS's audio gesture requirement.
      if (this.ctx.state !== 'running') {
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

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (error) {
      console.warn('Audio playback unavailable:', error);
    }
  }
}

const sound = new CyberAudio();
