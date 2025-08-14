import React, { useState, useEffect } from 'react';
import Button from './common/Button';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstall: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  // Production-ready: no dev/test controls or forced prompts

  useEffect(() => {
    // iOS detection
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Standalone mode detection
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // PWA zaten yüklü mü kontrol et
    if (standalone) {
      setIsInstalled(true);
      return;
    }

    // beforeinstallprompt event listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Kullanıcı daha önce reddetmediyse göster
      const hasDeclined = localStorage.getItem('pwa-install-declined');
      const declineTime = hasDeclined ? parseInt(hasDeclined) : 0;
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      if (!hasDeclined || declineTime < oneDayAgo) {
        // Üretimde nazik bir şekilde tek seferlik göster
        setShowInstallPrompt(true);
      }
    };

    // App installed event listener
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [deferredPrompt, isInstalled, isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        // Kullanıcı yüklemeyi kabul etti
      } else {
        localStorage.setItem('pwa-install-declined', Date.now().toString());
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      // Sessizce başarısız ol
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-declined', Date.now().toString());
  };

  // Zaten yüklüyse veya standalone modda çalışıyorsa gösterme
  if (isInstalled || isStandalone) {
    return null;
  }

  // iOS için özel prompt
  if (isIOS && showInstallPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center">
              <Smartphone className="text-blue-500 mr-2" size={24} />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                Ana Ekrana Ekle
              </h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            YKS Koçu'nu ana ekranınıza ekleyerek daha hızlı erişim sağlayın!
          </p>
          
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-center">
              <span className="mr-2">1.</span>
              <span>Safari'de paylaş butonuna (📤) dokunun</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">2.</span>
              <span>"Ana Ekrana Ekle" seçeneğini seçin</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">3.</span>
              <span>"Ekle" butonuna dokunun</span>
            </div>
          </div>
          
          <div className="mt-4 flex space-x-2">
            <Button
              onClick={handleDismiss}
              variant="secondary"
              className="flex-1 text-xs"
            >
              Daha Sonra
            </Button>
            <Button
              onClick={handleDismiss}
              className="flex-1 text-xs"
            >
              Anladım
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Android/Desktop için install prompt
  if (showInstallPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center">
              <Download className="text-green-500 mr-2" size={24} />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                Uygulamayı İndir
              </h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            YKS Koçu'nu cihazınıza indirerek offline erişim ve daha hızlı performans elde edin!
          </p>
          
          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400 mb-4">
            <div className="flex items-center">
              <Monitor className="mr-2" size={14} />
              <span>Masaüstü kısayolu</span>
            </div>
            <div className="flex items-center">
              <Smartphone className="mr-2" size={14} />
              <span>Offline çalışma</span>
            </div>
            <div className="flex items-center">
              <Download className="mr-2" size={14} />
              <span>Hızlı başlatma</span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={handleDismiss}
              variant="secondary"
              className="flex-1 text-sm"
            >
              Daha Sonra
            </Button>
            <Button
              onClick={handleInstallClick}
              className="flex-1 text-sm"
            >
              <Download size={16} className="mr-2" />
              İndir
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PWAInstall;