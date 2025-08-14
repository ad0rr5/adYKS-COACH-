import { AppData } from '../types';

type ShowFn = (title: string, options?: NotificationOptions) => Promise<void> | void;

const MOTIVATION_KEY = 'notif:lastMotivationTs';

let intervalId: number | null = null;
let timeouts: number[] = [];

function clearAll() {
  if (intervalId) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  timeouts.forEach((t) => window.clearTimeout(t));
  timeouts = [];
}

function parsePlanDate(weekStartISO: string, dayName: string, timeHHmm: string): Date | null {
  try {
    const d = new Date(weekStartISO);
    // weekStart is Monday (00:00); map dayName to offset 0..6
    const DAYS = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
    const idx = DAYS.indexOf(dayName);
    if (idx < 0) return null;
    d.setDate(d.getDate() + idx);
    const [hh, mm] = timeHHmm.split(':').map((x) => parseInt(x, 10));
    d.setHours(hh || 0, mm || 0, 0, 0);
    return d;
  } catch {
    return null;
  }
}

function scheduleReminder(show: ShowFn, title: string, body: string, at: Date) {
  const now = Date.now();
  const delay = at.getTime() - now;
  if (delay <= 0) return; // past
  const id = window.setTimeout(() => {
    show(title, { body, icon: '/icons/icon-192x192.png', badge: '/icons/icon-72x72.png' });
  }, Math.min(delay, 2147000000)); // cap to ~24 days
  timeouts.push(id);
}

export function startNotificationScheduler(params: {
  data: AppData;
  showNotification: ShowFn; // uses SW registration if available
  getMotivation: () => Promise<string>;
}) {
  clearAll();
  const { data, showNotification, getMotivation } = params;

  const settings = data.settings || {} as any;
  const notif = settings.notifications || { enabled: true, motivationIntervalMinutes: 120, planReminders: [1440,60,30], maxDailyMotivations: 6 };
  const dnd = settings.doNotDisturb || { enabled: true, start: '21:00', end: '05:00' };
  if (!notif.enabled) return; // kapalıysa hiç kurma

  // DND saatinde mi?
  const isInDnd = () => {
    if (!dnd?.enabled) return false;
    const now = new Date();
  const [sh, sm] = (dnd.start || '21:00').split(':').map((n: string)=>parseInt(n,10));
  const [eh, em] = (dnd.end || '05:00').split(':').map((n: string)=>parseInt(n,10));
    const start = new Date(now); start.setHours(sh||0, sm||0, 0, 0);
    const end = new Date(now); end.setHours(eh||0, em||0, 0, 0);
    if (end <= start) {
      // gece yarısını aşıyor
      return (now >= start) || (now <= end);
    }
    return now >= start && now <= end;
  };

  // 1) motivasyon
  const tryMotivation = async () => {
    try {
      if (isInDnd()) return;
      const last = parseInt(localStorage.getItem(MOTIVATION_KEY) || '0', 10);
      const now = Date.now();
      const intervalMs = Math.max(15, notif.motivationIntervalMinutes || 120) * 60 * 1000;
      if (now - last < intervalMs) return; // kullanıcı ayarına göre
      // günlük limit
      const dayKey = 'notif:motivation:day';
      const countKey = 'notif:motivation:count';
      const dayStr = new Date().toISOString().slice(0,10);
      const lastDay = localStorage.getItem(dayKey);
      if (lastDay !== dayStr) localStorage.setItem(countKey, '0');
      localStorage.setItem(dayKey, dayStr);
      const count = parseInt(localStorage.getItem(countKey) || '0', 10);
      const cap = Math.max(1, notif.maxDailyMotivations || 6);
      if (count >= cap) return;
      const text = await getMotivation().catch(() => 'Devam! Küçük adımlar büyük fark yaratır. Hedefin için şimdi 25 dk odaklan.');
      await Promise.resolve(showNotification('Koçundan Mesaj', { body: text, icon: '/icons/icon-192x192.png' }));
      localStorage.setItem(MOTIVATION_KEY, String(now));
      localStorage.setItem(countKey, String(count + 1));
    } catch {
      // silent
    }
  };
  // first attempt shortly after load
  const firstKick = window.setTimeout(tryMotivation, 15000);
  timeouts.push(firstKick);
  intervalId = window.setInterval(tryMotivation, Math.max(15, notif.motivationIntervalMinutes || 120) * 60 * 1000);

  // 2) Plan hatırlatıcıları (1g/1s/30dk kala)
  const schedules = data.weeklySchedules || [];
  const currentWeek = schedules[schedules.length - 1];
  if (currentWeek) {
    for (const day of currentWeek.days) {
      for (const plan of day.plans) {
        const start = parsePlanDate(currentWeek.weekStart, day.day, plan.startTime);
        if (!start) continue;
        const title = `Plan: ${plan.title}`;
        const subject = plan.subject ? ` • ${plan.subject}` : '';
        const mins = Array.isArray(notif.planReminders) && notif.planReminders.length ? notif.planReminders : [1440,60,30];
  mins.forEach((m: number)=>{
          const when = new Date(start.getTime() - m * 60 * 1000);
          const label = m >= 60 ? `${Math.round(m/60)} saat` : `${m} dk`;
          scheduleReminder(showNotification, title, `${label} kaldı${subject}.`, when);
        });
      }
    }
  }
}

export function stopNotificationScheduler() {
  clearAll();
}
