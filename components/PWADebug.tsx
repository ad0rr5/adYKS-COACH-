import React from 'react';

// Production modunda PWA Debug paneli devre dışı
const PWADebug: React.FC = () => {
  // Production build'de debug paneli gösterme
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Development modunda da sadece debug=true parametresi varsa göster
  if (!window.location.search.includes('debug=true')) {
    return null;
  }

  return null; // Debug panel tamamen devre dışı
};

export default PWADebug;