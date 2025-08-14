import React, { useEffect, useMemo, useRef, useState } from 'react';
import Button from './common/Button';
import { Play, Pause, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import useNotifications from '../hooks/useNotifications';
import { AmbientAudio, AmbientType } from '../services/ambientAudio';
import { Music, MusicType } from '../services/musicService';

interface PomodoroTimerProps {
  onSessionComplete?: (minutes: number) => void; // çalışma süresini loglamak için
  focusMinutes?: number;
  breakMinutes?: number;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onSessionComplete, focusMinutes = 25, breakMinutes = 5 }) => {
  const { sendNotification } = useNotifications();
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(focusMinutes * 60);
  const intervalRef = useRef<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ambientOn, setAmbientOn] = useState<boolean>(() => {
    try { return localStorage.getItem('yks-ambient-on') === '1'; } catch { return false; }
  });
  const [ambientType, setAmbientType] = useState<AmbientType>(() => {
    try { return (localStorage.getItem('yks-ambient-type') as AmbientType) || 'brown'; } catch { return 'brown'; }
  });
  const [ambientVol, setAmbientVol] = useState<number>(() => {
    try { const v = Number(localStorage.getItem('yks-ambient-vol')); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.2; } catch { return 0.2; }
  });
  // Music controls
  const [musicOn, setMusicOn] = useState<boolean>(() => {
    try { return localStorage.getItem('yks-music-on') === '1'; } catch { return false; }
  });
  const [musicType, setMusicType] = useState<MusicType>(() => {
    try {
      const saved = localStorage.getItem('yks-music-type') as MusicType | null;
      return saved === 'pads' || saved === 'keys' ? saved : 'pads';
    } catch { return 'pads'; }
  });
  const [musicVol, setMusicVol] = useState<number>(() => {
    try { const v = Number(localStorage.getItem('yks-music-vol')); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.25; } catch { return 0.25; }
  });

  useEffect(() => {
    setSecondsLeft(focusMinutes * 60);
  }, [focusMinutes]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalRef.current!);
          intervalRef.current = null;
          // Bildirim ve durum değişimi
          if (isBreak) {
            sendNotification({ title: 'Mola bitti', body: 'Bir odak oturumuna başlayalım!' });
            setIsBreak(false);
            setSecondsLeft(focusMinutes * 60);
            setIsRunning(false);
          } else {
            sendNotification({ title: 'Süre doldu', body: 'Harika! Kısa bir mola zamanı.' });
            setIsBreak(true);
            setSecondsLeft(breakMinutes * 60);
            setIsRunning(false);
            if (onSessionComplete) onSessionComplete(focusMinutes);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [isRunning, isBreak, focusMinutes, breakMinutes]);

  const toggle = () => setIsRunning((v) => !v);
  const reset = () => {
    setIsRunning(false);
    setIsBreak(false);
    setSecondsLeft(focusMinutes * 60);
  };

  // Ambient audio lifecycle
  useEffect(() => {
    AmbientAudio.setVolume(ambientVol);
  }, [ambientVol]);

  useEffect(() => {
    AmbientAudio.setType(ambientType);
    try { localStorage.setItem('yks-ambient-type', ambientType); } catch {}
  }, [ambientType]);

  useEffect(() => {
    try { localStorage.setItem('yks-ambient-on', ambientOn ? '1' : '0'); } catch {}
    // Only actually play when user has interacted (run/pause) to satisfy autoplay
    if (!ambientOn) {
      AmbientAudio.stop();
    } else if (isRunning) {
      AmbientAudio.start().catch(()=>{});
    }
  }, [ambientOn]);

  useEffect(() => {
    // Start/stop with timer state
    if (ambientOn) {
      if (isRunning) AmbientAudio.start().catch(()=>{}); else AmbientAudio.stop();
    }
  }, [isRunning, ambientOn]);

  useEffect(() => {
    try { localStorage.setItem('yks-ambient-vol', String(ambientVol)); } catch {}
  }, [ambientVol]);

  // Music lifecycle
  useEffect(() => {
    Music.setVolume(musicVol);
  }, [musicVol]);
  useEffect(() => {
    Music.setType(musicType);
    try { localStorage.setItem('yks-music-type', musicType); } catch {}
  }, [musicType]);
  useEffect(() => {
    try { localStorage.setItem('yks-music-on', musicOn ? '1' : '0'); } catch {}
    if (!musicOn) {
      Music.stop();
    } else if (isRunning) {
      Music.start().catch(()=>{});
    }
  }, [musicOn]);
  useEffect(() => {
    if (musicOn) {
      if (isRunning) Music.start().catch(()=>{}); else Music.stop();
    }
  }, [isRunning, musicOn]);
  useEffect(() => {
    try { localStorage.setItem('yks-music-vol', String(musicVol)); } catch {}
  }, [musicVol]);

  // Fullscreen handling
  const enterFullscreen = async () => {
    try {
      const el: any = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
    } catch (e) {
      // Fall back to overlay-only if fullscreen not permitted
    } finally {
      setIsFullscreen(true);
    }
  };
  const exitFullscreen = async () => {
    try {
      const doc: any = document as any;
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
      else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      else if (doc.msFullscreenElement && doc.msExitFullscreen) doc.msExitFullscreen();
    } finally {
      setIsFullscreen(false);
    }
  };
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!(document as any).fullscreenElement || !!(document as any).webkitFullscreenElement || !!(document as any).msFullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange as any);
    document.addEventListener('MSFullscreenChange', onFsChange as any);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange as any);
      document.removeEventListener('MSFullscreenChange', onFsChange as any);
    };
  }, []);

  // Keyboard shortcuts in fullscreen: Space toggle, R reset, Esc exit, F toggle
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.key.toLowerCase() === 'r') {
        reset();
      } else if (e.key === 'Escape') {
        exitFullscreen();
      } else if (e.key.toLowerCase() === 'f') {
        exitFullscreen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, toggle]);

  const mmss = useMemo(() => {
    const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
    const s = (secondsLeft % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [secondsLeft]);

  const totalSeconds = isBreak ? breakMinutes * 60 : focusMinutes * 60;
  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
  const circumference = 2 * Math.PI * 90; // r=90 for default ring; scaled in fullscreen

  return (
    <>
      {/* Compact card mode */}
      <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {isBreak ? 'Mola' : 'Odak'}
          </div>
          <button className="text-gray-500 hover:text-light-primary dark:hover:text-dark-primary" aria-label="Tam ekran" onClick={enterFullscreen}>
            <Maximize2 size={18} />
          </button>
        </div>
        {/* Ambient & Music controls */}
        <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <label className="flex items-center justify-between p-2 rounded border border-light-border dark:border-dark-border bg-white/50 dark:bg-white/5">
            <span>Ortam sesi</span>
            <input type="checkbox" checked={ambientOn} onChange={(e)=>setAmbientOn(e.target.checked)} />
          </label>
          <label className="p-2 rounded border border-light-border dark:border-dark-border bg-white/50 dark:bg-white/5 flex items-center space-x-2">
            <span>Tür</span>
            <select className="flex-1 bg-transparent" value={ambientType} onChange={(e)=>setAmbientType(e.target.value as AmbientType)}>
              <option value="brown">Brown (ılık)</option>
              <option value="pink">Pink (yumuşak)</option>
              <option value="white">White (parlak)</option>
            </select>
          </label>
          <label className="p-2 rounded border border-light-border dark:border-dark-border bg-white/50 dark:bg-white/5 flex items-center space-x-2">
            <span>Ses</span>
            <input className="flex-1" type="range" min={0} max={1} step={0.01} value={ambientVol} onChange={(e)=>setAmbientVol(Number(e.target.value))} />
          </label>
          <label className="flex items-center justify-between p-2 rounded border border-light-border dark:border-dark-border bg-white/50 dark:bg-white/5">
            <span>Müzik</span>
            <input type="checkbox" checked={musicOn} onChange={(e)=>setMusicOn(e.target.checked)} />
          </label>
          <label className="p-2 rounded border border-light-border dark:border-dark-border bg-white/50 dark:bg-white/5 flex items-center space-x-2">
            <span>Tarz</span>
            <select className="flex-1 bg-transparent" value={musicType} onChange={(e)=>setMusicType(e.target.value as MusicType)}>
              <option value="pads">Rahatlatıcı Pad</option>
              <option value="keys">Sakin Piyano</option>
            </select>
          </label>
          <label className="p-2 rounded border border-light-border dark:border-dark-border bg-white/50 dark:bg-white/5 flex items-center space-x-2">
            <span>Ses</span>
            <input className="flex-1" type="range" min={0} max={1} step={0.01} value={musicVol} onChange={(e)=>setMusicVol(Number(e.target.value))} />
          </label>
        </div>
        <div className="flex flex-col items-center">
          <div className="relative w-44 h-44 mb-3">
            <svg className="absolute inset-0 w-full h-full rotate-[-90deg]" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" stroke="rgba(0,0,0,0.1)" strokeWidth="12" fill="none" />
              <circle
                cx="100" cy="100" r="90" fill="none" stroke="url(#grad)" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
              />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-4xl font-extrabold tracking-widest tabular-nums">{mmss}</div>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Button onClick={toggle}>
              {isRunning ? <><Pause size={16} className="mr-1"/>Duraklat</> : <><Play size={16} className="mr-1"/>Başlat</>}
            </Button>
            <Button variant="secondary" onClick={reset}>
              <RotateCcw size={16} className="mr-1"/>Sıfırla
            </Button>
          </div>
        </div>
      </div>

      {/* Fullscreen Focus Mode */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50">
          {/* Ambient background */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(1200px 600px at 20% 30%, rgba(52,211,153,0.15), transparent), radial-gradient(1000px 600px at 80% 70%, rgba(96,165,250,0.18), transparent), linear-gradient(180deg, rgba(17,24,39,0.96), rgba(17,24,39,0.98))'
          }} />
          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 200px rgba(0,0,0,0.6)' }} />

          <div className="relative h-full w-full flex flex-col items-center justify-center select-none text-white">
            <div className="absolute top-4 left-4 text-xs opacity-70">Space: Başlat/Duraklat • R: Sıfırla • Esc: Çık</div>
            <button onClick={exitFullscreen} aria-label="Tam ekrandan çık" className="absolute top-4 right-4 text-gray-300 hover:text-white">
              <Minimize2 />
            </button>
            {/* Ambient controls in fullscreen */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/5 backdrop-blur rounded-full px-4 py-2 text-sm flex items-center space-x-3 border border-white/10">
              <label className="inline-flex items-center space-x-2">
                <span>Ortam</span>
                <input type="checkbox" checked={ambientOn} onChange={(e)=>setAmbientOn(e.target.checked)} />
              </label>
              <select className="bg-transparent" value={ambientType} onChange={(e)=>setAmbientType(e.target.value as AmbientType)}>
                <option value="brown">Brown</option>
                <option value="pink">Pink</option>
                <option value="white">White</option>
              </select>
              <input type="range" min={0} max={1} step={0.01} value={ambientVol} onChange={(e)=>setAmbientVol(Number(e.target.value))} />
              <div className="w-px h-5 bg-white/20 mx-1" />
              <label className="inline-flex items-center space-x-2">
                <span>Müzik</span>
                <input type="checkbox" checked={musicOn} onChange={(e)=>setMusicOn(e.target.checked)} />
              </label>
              <select className="bg-transparent" value={musicType} onChange={(e)=>setMusicType(e.target.value as MusicType)}>
                <option value="pads">Pad</option>
                <option value="keys">Piyano</option>
              </select>
              <input type="range" min={0} max={1} step={0.01} value={musicVol} onChange={(e)=>setMusicVol(Number(e.target.value))} />
            </div>

            <div className="flex flex-col items-center">
              <div className="relative w-[60vmin] h-[60vmin] max-w-[520px] max-h-[520px] min-w-[260px] min-h-[260px]">
                <svg className="absolute inset-0 w-full h-full rotate-[-90deg]" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="90" stroke="rgba(255,255,255,0.12)" strokeWidth="14" fill="none" />
                  <circle
                    cx="100" cy="100" r="90" fill="none" stroke="url(#gradFs)" strokeWidth="14" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                  />
                  <defs>
                    <linearGradient id="gradFs" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[14vmin] leading-none font-black tracking-widest tabular-nums drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]">{mmss}</div>
                  <div className="mt-4 text-[2.6vmin] uppercase tracking-[0.3em] text-gray-300">{isBreak ? 'Mola' : 'Odak'}</div>
                  <div className="mt-6 flex items-center space-x-3">
                    <button onClick={toggle} className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur text-white font-semibold transition">
                      {isRunning ? 'Duraklat' : 'Başlat'}
                    </button>
                    <button onClick={reset} className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur text-gray-200 transition">Sıfırla</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Invisible element to own fullscreen request when not yet open */}
  {/* no placeholder needed */}
    </>
  );
};

export default PomodoroTimer;
