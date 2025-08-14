import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showOfflineMessage) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isOnline ? 'bg-green-500' : 'bg-red-500'
    }`}>
      <div className="flex items-center justify-center py-2 px-4">
        {isOnline ? (
          <>
            <Wifi size={16} className="text-white mr-2" />
            <span className="text-white text-sm font-medium">
              Bağlantı yeniden kuruldu
            </span>
          </>
        ) : (
          <>
            <WifiOff size={16} className="text-white mr-2" />
            <span className="text-white text-sm font-medium">
              İnternet bağlantısı yok - Offline modda çalışıyor
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;