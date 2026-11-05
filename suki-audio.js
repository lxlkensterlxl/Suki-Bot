(() => {
  'use strict';

  if (typeof window === 'undefined') return;

  class CyberAudio {
    constructor() {
      this.ctx = null;
      this.resumePromise = null;
    }

    getContext() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;

      try {
        if (!this.ctx || this.ctx.state === 'closed') {
          this.ctx = new AudioContext();
        }
        return this.ctx;
      } catch (_) {
        // Audio may be unavailable or blocked by the browser or device.
        return null;
      }
    }

    async unlock() {
      const context = this.getContext();
      if (!context) return false;
      if (context.state === 'running') return true;
      if (context.state === 'closed') return false;
      if (this.resumePromise) return this.resumePromise;

      this.resumePromise = (async () => {
        try {
          await context.resume();
          return context.state === 'running';
        } catch (_) {
          return false;
        } finally {
          this.resumePromise = null;
        }
      })();

      return this.resumePromise;
    }

    async playBeep() {
      const isUnlocked = await this.unlock();
      const context = this.ctx;
      if (!isUnlocked || !context || context.state !== 'running') return;

      let oscillator;
      let gain;

      try {
        const now = context.currentTime;
        const duration = 0.09;
        oscillator = context.createOscillator();
        gain = context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1400, now);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + duration);

        // Use a short attack and exponential release to avoid clicks.
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.055, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };

        oscillator.start(now);
        oscillator.stop(now + duration);
      } catch (_) {
        // Fail silently when audio playback is unsupported or interrupted.
        try { oscillator?.disconnect(); } catch (_) {}
        try { gain?.disconnect(); } catch (_) {}
      }
    }
  }

  window.sound = new CyberAudio();
  window.addEventListener('pointerdown', () => {
    window.sound.unlock();
  }, { passive: true, once: true });
})();
