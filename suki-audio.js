(function () {
  class CyberAudio {
    constructor() {
      this.ctx = null;
      this.unlocked = false;
    }

    async unlock() {
      if (typeof window === 'undefined') return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      if (!this.ctx) this.ctx = new AudioContext();

      if (this.ctx.state === 'suspended') {
        try {
          await this.ctx.resume();
          this.unlocked = true;
        } catch (_) {
          this.unlocked = false;
        }
      } else if (this.ctx.state === 'running') {
        this.unlocked = true;
      }
    }

    async playBeep() {
      if (typeof window === 'undefined') return;

      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        if (!this.ctx) this.ctx = new AudioContext();
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        if (this.ctx.state !== 'running') return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };

        osc.start(now);
        osc.stop(now + 0.08);
      } catch (_) {
        // Audio fails silently on iPhone when blocked by browser policy.
      }
    }
  }

  window.sound = new CyberAudio();
  window.addEventListener('pointerdown', () => {
    if (window.sound && typeof window.sound.unlock === 'function') {
      window.sound.unlock();
    }
  }, { passive: true, once: true });
})();
