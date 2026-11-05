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
        if (!this.ctx || this.ctx.state === 'closed') this.ctx = new AudioContext();
        return this.ctx;
      } catch (_) {
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
        try { oscillator?.disconnect(); } catch (_) {}
        try { gain?.disconnect(); } catch (_) {}
      }
    }
  }

  // Use an installed English voice with a gentle, bright feminine quality when
  // available. Browser voice inventories differ, so this is a preference, not
  // an imitation of any particular actor or character.
  function chooseSukiVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    const english = voices.filter((voice) => /^en([_-]|$)/i.test(voice.lang || ''));
    if (!english.length) return null;

    const feminineHint = /female|woman|girl|samantha|aria|jenny|zira|susan|victoria|karen|moira|tessa|serena|ava/i;
    return english.find((voice) => feminineHint.test(voice.name))
      || english.find((voice) => /en[-_]US/i.test(voice.lang))
      || english[0];
  }

  function configureSukiSpeech() {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', () => {
      // Trigger voice inventory refresh; selection happens when Speak is tapped.
      chooseSukiVoice();
    });

    const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = (utterance) => {
      if (utterance instanceof window.SpeechSynthesisUtterance) {
        const voice = chooseSukiVoice();
        if (voice) utterance.voice = voice;
        // Keep the existing settings sliders useful, with only a modest warm,
        // upbeat nudge; avoid extreme pitch/rate changes that sound artificial.
        utterance.pitch = Math.min(1.3, Math.max(0.8, (Number(utterance.pitch) || 1) * 1.04));
        utterance.rate = Math.min(1.05, Math.max(0.85, (Number(utterance.rate) || 1) * 0.96));
      }
      return originalSpeak(utterance);
    };
  }

  window.sound = new CyberAudio();
  configureSukiSpeech();
  window.addEventListener('pointerdown', () => {
    window.sound.unlock();
  }, { passive: true, once: true });
})();
