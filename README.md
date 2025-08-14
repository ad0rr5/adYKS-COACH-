# YKS Takip ve Koçluk Uygulaması

2026 YKS sınavına hazırlanan öğrenciler için kapsamlı çalışma takip ve AI koçluk platformu.

## 🚀 Özellikler

- **Çalışma Takibi**: Ders bazlı çalışma kayıtları ve istatistikler
- **Deneme Analizi**: TYT/AYT deneme sonuçları ve trend analizi
- **AI Koçluk**: Kişiselleştirilmiş çalışma planları ve öneriler
- **Ders Rehberi**: Konu bazlı not alma ve video kaynak yönetimi
- **Hedef Yönetimi**: Günlük/haftalık hedefler ve ilerleme takibi
- **PWA Desteği**: Offline çalışma ve mobil uygulama deneyimi
- **Topluluk**: Öğrenci sohbeti ve liderlik tablosu

## 🛠️ Teknoloji Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Cloud Messaging)
- **AI**: Google Gemini API
- **Build Tool**: Vite
- **PWA**: Service Worker + Web App Manifest

## 📦 Kurulum

**Gereksinimler:** Node.js 18+

1. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

2. Environment dosyasını oluşturun:
   ```bash
   cp .env.local.example .env.local
   ```

3. `.env.local` dosyasında `GEMINI_API_KEY` değerini ayarlayın

4. Uygulamayı başlatın:
   ```bash
   npm run dev
   ```

## 🔧 Geliştirme Komutları

```bash
# Geliştirme sunucusu
npm run dev

# Production build
npm run build

# Bundle analizi
npm run build:analyze

# Tip kontrolü
npm run type-check

# Preview build
npm run preview
```

## 📱 PWA Özellikleri

- Offline çalışma desteği
- Push bildirimleri
- Mobil cihazlara yüklenebilir
- Service Worker ile cache yönetimi

## 🎯 Performance Optimizasyonları

- React.memo ile component memoization
- Lazy loading ve code splitting
- Debounced inputs
- Optimized bundle splitting
- Service Worker caching
- Error boundaries

## 🔐 Güvenlik

- Firebase Authentication
- API anahtarları sadece client-side
- Secure Firestore rules
- Input validation

## 📊 Monitoring

- Performance monitoring hooks
- Error boundary ile hata yakalama
- Memory usage tracking (development)
- Bundle size analysis
