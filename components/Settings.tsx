import React, { useMemo, useState, useCallback } from 'react';
import { auth, db, doc, getDoc } from '../firebase';
import { setDoc } from '../firebase';
import { UserSettings } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import { Settings as SettingsIcon, Key, Eye, EyeOff, Save, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';

interface SettingsProps {
  settings: UserSettings | undefined;
  updateSettings: (settings: Partial<UserSettings>) => void;
}

const ENV_DEFAULT_API_KEY = (process.env.GEMINI_API_KEY as any) || (process.env.API_KEY as any) || '';

const Settings: React.FC<SettingsProps> = ({ settings, updateSettings }) => {
  const initialApi = (() => {
    try {
      const saved = localStorage.getItem('yks-gemini-key');
      if (saved && saved.trim()) return saved;
    } catch {}
    return settings?.geminiApiKey || (ENV_DEFAULT_API_KEY as string) || '';
  })();
  const [apiKey, setApiKey] = useState(initialApi);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  

  // Notification settings state
  const initialNotif = useMemo(() => ({
    enabled: settings?.notifications?.enabled ?? true,
    motivationIntervalMinutes: settings?.notifications?.motivationIntervalMinutes ?? 120,
    planReminders: settings?.notifications?.planReminders ?? [1440, 60, 30],
    maxDailyMotivations: settings?.notifications?.maxDailyMotivations ?? 6,
  }), [settings]);
  const [notifEnabled, setNotifEnabled] = useState(initialNotif.enabled);
  const [motivationInterval, setMotivationInterval] = useState(initialNotif.motivationIntervalMinutes);
  const [planReminders, setPlanReminders] = useState<string>(initialNotif.planReminders.join(','));
  const [maxDaily, setMaxDaily] = useState(initialNotif.maxDailyMotivations);
  const [dndEnabled, setDndEnabled] = useState(settings?.doNotDisturb?.enabled ?? true);
  const [dndStart, setDndStart] = useState(settings?.doNotDisturb?.start ?? '21:00');
  const [dndEnd, setDndEnd] = useState(settings?.doNotDisturb?.end ?? '05:00');
  // AI Coach preferences state
  const [aiTone, setAiTone] = useState<"samimi" | "nötr" | "resmi" | "eğlenceli">(settings?.aiCoachPrefs?.tone || 'samimi');
  const [aiLength, setAiLength] = useState<"kısa" | "orta" | "uzun">(settings?.aiCoachPrefs?.length || 'kısa');
  const [aiAllowEmojis, setAiAllowEmojis] = useState<boolean>(settings?.aiCoachPrefs?.allowEmojis ?? false);
  const [aiInstructions, setAiInstructions] = useState<string>(settings?.aiCoachPrefs?.instructions || '');
  const [aiTargetRank, setAiTargetRank] = useState<number | ''>(settings?.aiCoachPrefs?.targets?.rank ?? '');
  const [aiTargetUni, setAiTargetUni] = useState<string>(settings?.aiCoachPrefs?.targets?.university || '');
  const [aiTargetDept, setAiTargetDept] = useState<string>(settings?.aiCoachPrefs?.targets?.department || '');
  const [aiTargetNets, setAiTargetNets] = useState<string>(settings?.aiCoachPrefs?.targets?.targetNetsText || '');

  const handleSaveSettings = useCallback(async () => {
    setIsSaving(true);
    try {
      const newSettings: Partial<UserSettings> = {
        geminiApiKey: apiKey.trim() || undefined,
        aiEnabled: !!apiKey.trim(),
        updatedAt: new Date().toISOString(),
        notifications: {
          enabled: notifEnabled,
          motivationIntervalMinutes: Math.max(15, Math.min(720, Number(motivationInterval) || 120)),
          planReminders: planReminders
            .split(',')
            .map((s) => Number(s.trim()))
            .filter((n) => !Number.isNaN(n) && n > 0 && n <= 7 * 24 * 60)
            .sort((a,b) => b - a),
          maxDailyMotivations: Math.max(1, Math.min(24, Number(maxDaily) || 6))
        },
        doNotDisturb: {
          enabled: dndEnabled,
          start: dndStart,
          end: dndEnd
        },
        aiCoachPrefs: {
          tone: aiTone,
          length: aiLength,
          allowEmojis: aiAllowEmojis,
          instructions: aiInstructions.trim() || undefined,
          targets: {
            rank: aiTargetRank === '' ? undefined : Number(aiTargetRank),
            university: aiTargetUni.trim() || undefined,
            department: aiTargetDept.trim() || undefined,
            targetNetsText: aiTargetNets.trim() || undefined
          }
        }
      };

  // Persist to Firestore (prune undefined)
  const cleaned = JSON.parse(JSON.stringify(newSettings));
  updateSettings(cleaned);
      // Also persist locally as fallback
      try {
        if (apiKey.trim()) localStorage.setItem('yks-gemini-key', apiKey.trim());
        else localStorage.removeItem('yks-gemini-key');
      } catch {}
      setTestResult('success');
      
      setTimeout(() => {
        setTestResult(null);
      }, 3000);
    } catch (error) {
      setTestResult('error');
    } finally {
      setIsSaving(false);
    }
  }, [apiKey, notifEnabled, motivationInterval, planReminders, maxDaily, dndEnabled, dndStart, dndEnd, aiTone, aiLength, aiAllowEmojis, aiInstructions, aiTargetRank, aiTargetUni, aiTargetDept, aiTargetNets, updateSettings]);

  const testApiKey = useCallback(async () => {
    if (!apiKey.trim()) {
      setTestResult('error');
      return;
    }

    setIsTestingApi(true);
    setTestResult(null);

    try {
      // Basit bir test isteği gönder
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      
      await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Test mesajı - sadece "OK" yanıtla',
        config: {
          temperature: 0.1,
        }
      });

      setTestResult('success');
    } catch (error) {
      console.error('API test hatası:', error);
      setTestResult('error');
    } finally {
      setIsTestingApi(false);
    }
  }, [apiKey]);

  const clearApiKey = () => {
    setApiKey('');
    setTestResult(null);
  };

  // Export user data as JSON
  const handleExportData = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Önce giriş yapmalısınız.');
        return;
      }
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[:]/g, '-');
      a.download = `yks-data-${ts}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Veri dışa aktarım hatası:', e);
      alert('Veri dışa aktarımı başarısız oldu.');
    }
  }, []);

  // Import user data from JSON and merge
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const handleImportFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const user = auth.currentUser;
      if (!user) {
        alert('Önce giriş yapmalısınız.');
        return;
      }
      // Sadece beklenen alanları güvenle al
      const allowedKeys = new Set([
        'studySessions','practiceExams','weeklySchedules','subjectStudyRecords','goals','completedTopics','settings','studyGuide'
      ]);
      const filtered: Record<string, any> = {};
      Object.keys(raw || {}).forEach((k) => {
        if (allowedKeys.has(k)) filtered[k] = raw[k];
      });
      // Undefined temizle
      const cleaned = JSON.parse(JSON.stringify(filtered));
      const ref = doc(db, 'users', user.uid);
      await setDoc(ref, cleaned, { merge: true });
      alert('Veriler başarıyla içe aktarıldı.');
      // input reset
      e.target.value = '';
    } catch (err) {
      console.error('İçe aktarma hatası:', err);
      alert('Geçersiz dosya ya da içe aktarma hatası.');
    }
  }, []);

  // Notification test via SW or Notification API
  const handleTestNotification = useCallback(async () => {
    try {
      if (!('Notification' in window)) {
        alert('Tarayıcınız bildirimleri desteklemiyor.');
        return;
      }
      let perm = Notification.permission;
      if (perm === 'default') perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        alert('Bildirim izni verilmedi.');
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        reg.showNotification('Test Bildirimi', {
          body: 'Bu bir test bildirimidir. Her şey çalışıyor! ✅',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png'
        });
      } else {
        new Notification('Test Bildirimi', { body: 'Bu bir test bildirimidir. ✅' });
      }
    } catch (e) {
      console.error('Bildirim testi hatası:', e);
      alert('Bildirim gönderilemedi.');
    }
  }, []);
  return (
    <Card title="Ayarlar" fullHeight>
      <div className="space-y-6">
        {/* Bildirimler */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <SettingsIcon size={20} className="text-green-500" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Bildirim Ayarları
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
              <label className="flex items-center justify-between">
                <span className="text-sm">Bildirimler</span>
                <input type="checkbox" checked={notifEnabled} onChange={(e) => setNotifEnabled(e.target.checked)} />
              </label>
              <div className="mt-3 text-xs text-gray-500">Uygulama ve push bildirimlerini genel olarak aç/kapat.</div>
            </div>

            <div className="p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
              <label className="block text-sm mb-1">Motivasyon sıklığı (dakika)</label>
              <input type="number" min={15} max={720} className="w-full p-2 rounded border bg-transparent" value={motivationInterval}
                     onChange={(e) => setMotivationInterval(Number(e.target.value))} />
              <div className="mt-2 text-xs text-gray-500">2 saat = 120. Minimum 15 dk, maksimum 12 saat.</div>
            </div>

            <div className="p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
              <label className="block text-sm mb-1">Plan hatırlatıcıları (dakika, virgülle)</label>
              <input type="text" className="w-full p-2 rounded border bg-transparent" value={planReminders}
                     onChange={(e) => setPlanReminders(e.target.value)} />
              <div className="mt-2 text-xs text-gray-500">Örn: 1440,60,30 =&gt; 1 gün/1 saat/30 dk kala.</div>
            </div>

            <div className="p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
              <label className="block text-sm mb-1">Günlük motivasyon limiti</label>
              <input type="number" min={1} max={24} className="w-full p-2 rounded border bg-transparent" value={maxDaily}
                     onChange={(e) => setMaxDaily(Number(e.target.value))} />
            </div>
          </div>

          <div className="p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Rahatsız Etme</span>
              <input type="checkbox" checked={dndEnabled} onChange={(e) => setDndEnabled(e.target.checked)} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 max-w-md">
              <div>
                <label className="block text-xs mb-1">Başlangıç (24s)</label>
                <input type="time" value={dndStart} onChange={(e) => setDndStart(e.target.value)} className="w-full p-2 rounded border bg-transparent" />
              </div>
              <div>
                <label className="block text-xs mb-1">Bitiş (24s)</label>
                <input type="time" value={dndEnd} onChange={(e) => setDndEnd(e.target.value)} className="w-full p-2 rounded border bg-transparent" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">Bu saatler arasında hiçbir bildirim gösterilmez.</div>
          </div>
        </div>
        {/* AI API Anahtarı Bölümü */}
        <div className="space-y-4">
          {/* AI Koç Kişiselleştirme */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <SettingsIcon size={20} className="text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Yapay Zeka Koç Ayarları</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
                <label className="block text-sm mb-1">Üslup</label>
                <select value={aiTone} onChange={(e)=>setAiTone(e.target.value as any)} className="w-full p-2 rounded border bg-transparent">
                  <option value="samimi">Samimi</option>
                  <option value="nötr">Nötr</option>
                  <option value="resmi">Resmi</option>
                  <option value="eğlenceli">Eğlenceli</option>
                </select>
              </div>

              <div className="p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
                <label className="block text-sm mb-1">Yanıt uzunluğu</label>
                <select value={aiLength} onChange={(e)=>setAiLength(e.target.value as any)} className="w-full p-2 rounded border bg-transparent">
                  <option value="kısa">Kısa</option>
                  <option value="orta">Orta</option>
                  <option value="uzun">Uzun</option>
                </select>
                <label className="mt-3 inline-flex items-center space-x-2 text-sm">
                  <input type="checkbox" checked={aiAllowEmojis} onChange={(e)=>setAiAllowEmojis(e.target.checked)} />
                  <span>Emojilere izin ver</span>
                </label>
              </div>

              <div className="md:col-span-2 p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
                <label className="block text-sm mb-1">Kişisel talimatlar</label>
                <textarea value={aiInstructions} onChange={(e)=>setAiInstructions(e.target.value)} rows={3}
                  placeholder="Örn: Sıralamam ~45k, hedefim 15k. Hedef netler: TYT 95+, AYT Mat 35+. İTÜ Bilgisayar istiyorum. Konuşurken kısa, samimi ve motive edici ol; gereksiz uzatma."
                  className="w-full p-2 rounded border bg-transparent resize-y"/>
                <div className="mt-1 text-xs text-gray-500">Bu metin, AI koçunun nasıl konuşacağını belirler.</div>
              </div>

              <div className="p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
                <label className="block text-sm mb-1">Hedef sıralama</label>
                <input type="number" min={1} className="w-full p-2 rounded border bg-transparent" value={aiTargetRank}
                  onChange={(e)=>setAiTargetRank(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div className="p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
                <label className="block text-sm mb-1">Hedef üniversite</label>
                <input type="text" className="w-full p-2 rounded border bg-transparent" value={aiTargetUni}
                  onChange={(e)=>setAiTargetUni(e.target.value)} />
              </div>
              <div className="p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
                <label className="block text-sm mb-1">Hedef bölüm</label>
                <input type="text" className="w-full p-2 rounded border bg-transparent" value={aiTargetDept}
                  onChange={(e)=>setAiTargetDept(e.target.value)} />
              </div>
              <div className="p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
                <label className="block text-sm mb-1">Hedef netler (serbest metin)</label>
                <input type="text" className="w-full p-2 rounded border bg-transparent" value={aiTargetNets}
                  onChange={(e)=>setAiTargetNets(e.target.value)} placeholder="Örn: TYT 95+, AYT Mat 35+, Fizik 12+" />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Key size={20} className="text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Yapay Zeka API Anahtarı
            </h3>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-3">
              <AlertTriangle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-2">Gelişmiş AI Özellikleri</p>
                <p className="mb-2">
                  Kendi Google Gemini API anahtarınızı girerek daha gelişmiş AI koçluk özelliklerinden faydalanabilirsiniz.
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  API anahtarınız sadece cihazınızda saklanır ve güvenli bir şekilde kullanılır.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Google Gemini API Anahtarı
            </label>
            
            <div className="relative">
              <input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy... (API anahtarınızı buraya girin)"
                className="w-full p-3 pr-20 border rounded-lg bg-light-card dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-light-primary focus:border-light-primary font-mono text-sm"
              />
              
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title={showApiKey ? 'Gizle' : 'Göster'}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                
                {apiKey && (
                  <button
                    type="button"
                    onClick={clearApiKey}
                    className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                    title="Temizle"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* API Anahtarı Nasıl Alınır */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>API Anahtarı nasıl alınır?</strong>
              </p>
              <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                <li>1. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center">
                  Google AI Studio <ExternalLink size={12} className="ml-1" />
                </a> sayfasına gidin</li>
                <li>2. "Create API Key" butonuna tıklayın</li>
                <li>3. Oluşturulan API anahtarını kopyalayın</li>
                <li>4. Buraya yapıştırın ve kaydedin</li>
              </ol>
            </div>

            {/* Test ve Kaydet Butonları */}
            <div className="flex space-x-3">
              <Button
                onClick={testApiKey}
                disabled={!apiKey.trim() || isTestingApi}
                variant="secondary"
                className="flex-1"
              >
                {isTestingApi ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Test Ediliyor...
                  </>
                ) : (
                  <>
                    <Key size={16} className="mr-2" />
                    API Test Et
                  </>
                )}
              </Button>

              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Kaydet
                  </>
                )}
              </Button>
            </div>

            {/* Test Sonucu */}
            {testResult && (
              <div className={`p-3 rounded-lg flex items-center space-x-2 ${
                testResult === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {testResult === 'success' ? (
                  <>
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">
                      API anahtarı geçerli! Gelişmiş AI özellikleri aktif.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} />
                    <span className="text-sm font-medium">
                      API anahtarı geçersiz. Lütfen kontrol edin.
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mevcut Durum */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
            Mevcut AI Durumu
          </h4>
          
          <div className={`p-4 rounded-lg border-l-4 ${
            settings?.aiEnabled && settings?.geminiApiKey
              ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                settings?.aiEnabled && settings?.geminiApiKey ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  {settings?.aiEnabled && settings?.geminiApiKey 
                    ? 'Gelişmiş AI Aktif' 
                    : 'Temel AI Aktif'
                  }
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {settings?.aiEnabled && settings?.geminiApiKey
                    ? 'Kişisel API anahtarınız ile gelişmiş özellikler kullanılıyor'
                    : 'Temel özellikler kullanılıyor. Gelişmiş özellikler için API anahtarı girin'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Güvenlik Bilgisi */}
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2 flex items-center">
            <SettingsIcon size={16} className="mr-2" />
            Güvenlik ve Gizlilik
          </h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• API anahtarınız sadece tarayıcınızda saklanır</li>
            <li>• Sunucularımızda API anahtarınız saklanmaz</li>
            <li>• İstekler doğrudan Google AI servisine gönderilir</li>
            <li>• İstediğiniz zaman API anahtarınızı silebilirsiniz</li>
          </ul>
          <div className="mt-4">
            <Button variant="secondary" onClick={handleExportData}>
              Verilerimi JSON olarak indir
            </Button>
              <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFileChange} />
              <Button variant="secondary" onClick={handleImportClick}>
                Verilerimi içe aktar (JSON)
              </Button>
              <Button variant="secondary" onClick={handleTestNotification}>
                Bildirim testi gönder
              </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Settings;