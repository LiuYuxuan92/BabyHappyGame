import { getSettings } from '../utils/storage';

const correctPhrases = ['真棒!', '答对了!', '好聪明!', '太厉害了!'];
const wrongPhrases = ['再试试!', '加油!', '没关系!'];

class VoiceFeedbackManager {
  private _muted = false;
  private supported = false;

  constructor() {
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  get muted(): boolean {
    return this._muted;
  }

  set muted(value: boolean) {
    this._muted = value;
    if (value && this.supported) {
      window.speechSynthesis.cancel();
    }
  }

  syncWithSettings(): void {
    this.muted = !getSettings().voiceEnabled;
  }

  speak(text: string, lang = 'zh-CN'): void {
    this.syncWithSettings();
    if (this._muted || !this.supported) return;

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.pitch = 1.2;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis failed, ignore gracefully
    }
  }

  speakCorrect(): void {
    const phrase = correctPhrases[Math.floor(Math.random() * correctPhrases.length)];
    this.speak(phrase);
  }

  speakWrong(): void {
    const phrase = wrongPhrases[Math.floor(Math.random() * wrongPhrases.length)];
    this.speak(phrase);
  }

  speakWelcome(): void {
    this.speak('欢迎来到宝宝乐园');
  }
}

export const VoiceFeedback = new VoiceFeedbackManager();
