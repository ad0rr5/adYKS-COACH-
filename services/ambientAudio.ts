export type AmbientType = 'brown' | 'white' | 'pink' | 'rain' | 'forest' | 'ocean';

// Internal engine implementing the actual audio logic
class AmbientEngine {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private oscillator: OscillatorNode | null = null;
  private isPlaying = false;
  private currentType: AmbientType = 'brown';

  constructor() {
    this.init();
  }

  private async init() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  async play(type: AmbientType, volume: number = 0.2) {
    if (!this.audioContext || !this.gainNode) return;

    this.stop();
    this.currentType = type;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.gainNode.gain.value = volume;

      switch (type) {
        case 'brown':
          this.playBrownNoise();
          break;
        case 'white':
          this.playWhiteNoise();
          break;
        case 'pink':
          this.playPinkNoise();
          break;
        case 'rain':
        case 'forest':
        case 'ocean':
          // For nature sounds, we would need audio files
          // For now, use brown noise as fallback
          this.playBrownNoise();
          break;
      }

      this.isPlaying = true;
    } catch (error) {
      console.error('Error playing ambient audio:', error);
    }
  }

  private playBrownNoise() {
    if (!this.audioContext || !this.gainNode) return;

    const bufferSize = 4096;
    const brownNoise = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    let lastOut = 0.0;

    brownNoise.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }
    };

    brownNoise.connect(this.gainNode);
    this.oscillator = brownNoise as any;
  }

  private playWhiteNoise() {
    if (!this.audioContext || !this.gainNode) return;

    const bufferSize = 4096;
    const whiteNoise = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    whiteNoise.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    };

    whiteNoise.connect(this.gainNode);
    this.oscillator = whiteNoise as any;
  }

  private playPinkNoise() {
    if (!this.audioContext || !this.gainNode) return;

    const bufferSize = 4096;
    const pinkNoise = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    const b = [0, 0, 0, 0, 0, 0, 0];

    pinkNoise.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b[0] = 0.99886 * b[0] + white * 0.0555179;
        b[1] = 0.99332 * b[1] + white * 0.0750759;
        b[2] = 0.96900 * b[2] + white * 0.1538520;
        b[3] = 0.86650 * b[3] + white * 0.3104856;
        b[4] = 0.55000 * b[4] + white * 0.5329522;
        b[5] = -0.7616 * b[5] - white * 0.0168980;
        output[i] = b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + white * 0.5362;
        output[i] *= 0.11;
        b[6] = white * 0.115926;
      }
    };

    pinkNoise.connect(this.gainNode);
    this.oscillator = pinkNoise as any;
  }

  stop() {
    if (this.oscillator) {
      try {
        this.oscillator.disconnect();
      } catch (error) {
        // Ignore disconnect errors
      }
      this.oscillator = null;
    }
    this.isPlaying = false;
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  getIsPlaying() {
    return this.isPlaying;
  }

  getCurrentType() {
    return this.currentType;
  }
}

// Public singleton-style API expected by components
let engine: AmbientEngine | null = null;
let desiredType: AmbientType = 'brown';
let desiredVolume = 0.2;

function ensureEngine() {
  if (!engine) engine = new AmbientEngine();
  return engine;
}

export const AmbientAudio = {
  async start() {
    const e = ensureEngine();
    await e.play(desiredType, desiredVolume);
  },
  stop() {
    const e = ensureEngine();
    e.stop();
  },
  setType(type: AmbientType) {
    desiredType = type;
    const e = ensureEngine();
    // If already playing, switch immediately
    if (e.getIsPlaying()) {
      e.play(desiredType, desiredVolume).catch(() => {});
    }
  },
  setVolume(volume: number) {
    desiredVolume = Math.max(0, Math.min(1, volume));
    const e = ensureEngine();
    e.setVolume(desiredVolume);
  },
  getIsPlaying() {
    const e = ensureEngine();
    return e.getIsPlaying();
  },
  getCurrentType() {
    return desiredType;
  }
};
