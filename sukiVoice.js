export class SukiVoice {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.voices = [];
    this.selectedVoice = null;
    this.currentUtterance = null; // Fixes garbage collection bug in some browsers

    if (this.synth) {
      if (typeof this.synth.onvoiceschanged !== 'undefined') {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
      this.loadVoices();
    }
  }

  loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    
    // Prioritize natural/preferred English voices
    this.selectedVoice = this.voices.find(v => 
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Zira')) && 
      v.lang.startsWith('en')
    ) || this.voices.find(v => v.lang.startsWith('en')) || this.voices[0] || null;
  }

  speak(text, options = {}) {
    if (!this.synth) return;
    
    // Ensure voices are loaded if list was initially empty
    if (this.voices.length === 0) {
      this.loadVoices();
    }

    // Cancel any ongoing speech to prevent overlapping queues
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    
    // Cyberpunk tuning overrides
    utterance.pitch = options.pitch !== undefined ? options.pitch : 1.2; 
    utterance.rate = options.rate !== undefined ? options.rate : 1.05; 
    utterance.volume = options.volume !== undefined ? options.volume : 1.0;

    utterance.onstart = (e) => {
      if (typeof options.onStart === 'function') options.onStart(e);
    };

    utterance.onend = (e) => {
      this.currentUtterance = null;
      if (typeof options.onEnd === 'function') options.onEnd(e);
    };

    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis error encountered:", e);
      this.currentUtterance = null;
      if (typeof options.onError === 'function') options.onError(e);
    };

    // Store reference to prevent garbage collection mid-speech
    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      if (this.synth.speaking || this.synth.pending) {
        this.synth.cancel();
      }
      this.currentUtterance = null;
    }
  }
}

export const sukiVoice = new SukiVoice();
