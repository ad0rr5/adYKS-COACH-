import { doc, setDoc, db, User } from '../firebase';

const PUBLIC_KEY = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || 'REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function ensurePushSubscribed(user: User) {
  try {
    if (!('serviceWorker' in navigator)) return;
    if (!('PushManager' in window)) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      if (!PUBLIC_KEY || PUBLIC_KEY.startsWith('REPLACE_')) {
        console.warn('VAPID public key missing. Set VITE_VAPID_PUBLIC_KEY in .env');
        return;
      }
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
      });
    }

  const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { pushSubscription: sub.toJSON() }, { merge: true });
  } catch (e) {
    console.error('Push subscribe error:', e);
  }
}
