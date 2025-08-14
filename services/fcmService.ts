import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { db, doc, setDoc, User } from '../firebase';

const VAPID_KEY = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY || 'REPLACE_WITH_FIREBASE_VAPID_PUBLIC_KEY';

let messaging: Messaging | null = null;

export function initMessaging() {
  try {
    messaging = getMessaging();
  } catch {
    messaging = null;
  }
  return messaging;
}

export async function ensureFcmToken(user: User) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (Notification.permission !== 'granted') return;

    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;

    const m = messaging || initMessaging();
    if (!m) return;

    if (!VAPID_KEY || VAPID_KEY.startsWith('REPLACE_')) {
      console.warn('Firebase VAPID public key is missing. Set VITE_FIREBASE_VAPID_KEY in .env');
      return;
    }

    const token = await getToken(m, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    if (!token) return;

    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { fcmToken: token }, { merge: true });
  } catch (e) {
    console.error('ensureFcmToken error:', e);
  }
}

export function listenForegroundMessages(cb: (payload: any) => void) {
  const m = messaging || initMessaging();
  if (!m) return () => {};
  const unsub = onMessage(m, (payload) => cb(payload));
  return unsub;
}
