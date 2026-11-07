class SukiVoice {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedVoice = null;
    
    // Voices load asynchronously in most browsers
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
    this.loadVoices();
  }

  loadVoices() {
    this.voices = this.synth.getVoices();
    // Prioritize natural-sounding or female English voices if available
    this.selectedVoice = this.voices.find(v => 
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen')) && 
      v.lang.startsWith('en')
    ) || this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
  }

  speak(text, options = {}) {
    if (!this.synth) return;
    
    // Cancel any ongoing speech to prevent overlapping queues
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) utterance.voice = this.selectedVoice;
    
    // Cyberpunk tuning: slightly higher pitch and crisp rate
    utterance.pitch = options.pitch || 1.2; 
    utterance.rate = options.rate || 1.05; 
    utterance.volume = options.volume || 1.0;

    utterance.onstart = options.onStart || null;
    utterance.onend = options.onEnd || null;

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
  }
}

export const sukiVoice = new SukiVoice();
