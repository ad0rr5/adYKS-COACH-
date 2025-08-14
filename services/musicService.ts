export type MusicType = 'pads' | 'keys';

export interface MusicTrack {
  id: string;
  title: string;
  url: string;
  type: MusicType;
  duration?: number;
}

class MusicEngine {
  private audio: HTMLAudioElement | null = null;
  private currentTrack: MusicTrack | null = null;
  private isPlaying = false;
  private volume = 0.3;

  // Sample tracks - optional files to place under public/audio
  private tracks: MusicTrack[] = [
    {
      id: 'pads1',
      title: 'Rahatlatıcı Pad',
      url: '/audio/pads-sample.mp3',
      type: 'pads'
    },
    {
      id: 'keys1',
      title: 'Sakin Piyano',
      url: '/audio/keys-sample.mp3',
      type: 'keys'
    }
  ];

  constructor() {
    this.audio = new Audio();
    this.audio.loop = true;
    this.audio.volume = this.volume;
    
    this.audio.addEventListener('error', (e) => {
      console.warn('Music playback error:', e);
      this.isPlaying = false;
    });
  }

  async play(type: MusicType) {
    const track = this.tracks.find(t => t.type === type);
    if (!track) {
      console.warn(`No track found for type: ${type}`);
      return;
    }

    try {
      if (this.currentTrack?.id !== track.id) {
        this.currentTrack = track;
        if (this.audio) {
          this.audio.src = track.url;
        }
      }

      if (this.audio) {
        await this.audio.play();
        this.isPlaying = true;
      }
    } catch (error) {
      console.warn('Music play failed:', error);
      // Fallback: continue without music
      this.isPlaying = false;
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.isPlaying = false;
  }

  pause() {
    if (this.audio) {
      this.audio.pause();
    }
    this.isPlaying = false;
  }

  resume() {
    if (this.audio && this.currentTrack) {
      this.audio.play().catch(console.warn);
      this.isPlaying = true;
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  getVolume() {
    return this.volume;
  }

  getIsPlaying() {
    return this.isPlaying;
  }

  getCurrentTrack() {
    return this.currentTrack;
  }

  getAvailableTypes(): MusicType[] {
    return ['pads', 'keys'];
  }
}

let engine: MusicEngine | null = null;
let desiredType: MusicType = 'pads';
let desiredVolume = 0.25;

function ensureEngine() {
  if (!engine) engine = new MusicEngine();
  return engine;
}

export const Music = {
  async start() {
    const e = ensureEngine();
    await e.play(desiredType);
  },
  stop() {
    const e = ensureEngine();
    e.stop();
  },
  pause() {
    const e = ensureEngine();
    e.pause();
  },
  resume() {
    const e = ensureEngine();
    e.resume();
  },
  setType(type: MusicType) {
    desiredType = type;
    const e = ensureEngine();
    if (e.getIsPlaying()) {
      e.play(desiredType).catch(() => {});
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
  getCurrentTrack() {
    const e = ensureEngine();
    return e.getCurrentTrack();
  }
};