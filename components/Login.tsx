import React, { useState, useEffect } from 'react';
import { signInWithPopup, signInAnonymously, auth, googleProvider } from '../firebase';
import Button from './common/Button';
import { LogIn, User, GraduationCap, BookOpen, Target, TrendingUp, Users, Award, Sparkles, Star, Zap } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

// Parçacık bileşeni
const Particle: React.FC<{ delay: number; duration: number; size: number; color: string; x: string; y: string }> = ({ delay, duration, size, color, x, y }) => (
  <div
    className={`absolute w-${size} h-${size} ${color} rounded-full opacity-20 animate-pulse`}
    style={{
      left: x,
      top: y,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    }}
  />
);

// Yıldız bileşeni
const FloatingIcon: React.FC<{ icon: React.ReactNode; delay: number; x: string; y: string }> = ({ icon, delay, x, y }) => (
  <div
    className="absolute text-white/10 animate-bounce"
    style={{
      left: x,
      top: y,
      animationDelay: `${delay}s`,
      animationDuration: '3s',
    }}
  >
    {icon}
  </div>
);

const Login: React.FC<LoginProps> = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAnonymousLoading, setIsAnonymousLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Google ile giriş başarılı:', result.user);
    } catch (error: any) {
      console.error('Google giriş hatası:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Giriş işlemi iptal edildi.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Popup engellendi. Lütfen popup engelleyiciyi kapatın.');
      } else {
        setError('Google ile giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsGoogleLoading(false);
      setIsLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setIsAnonymousLoading(true);
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signInAnonymously(auth);
      console.log('Anonim giriş başarılı:', result.user);
    } catch (error: any) {
      console.error('Anonim giriş hatası:', error);
      setError('Anonim giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsAnonymousLoading(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Animasyonlu Arka Plan */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 animate-gradient-x"></div>
      
      {/* Parçacık Sistemi */}
      {mounted && (
        <div className="fixed inset-0 pointer-events-none">
          {/* Büyük parçacıklar */}
          <Particle delay={0} duration={4} size={2} color="bg-blue-400" x="10%" y="20%" />
          <Particle delay={1} duration={5} size={1} color="bg-purple-400" x="80%" y="30%" />
          <Particle delay={2} duration={3} size={3} color="bg-cyan-400" x="60%" y="70%" />
          <Particle delay={0.5} duration={6} size={1} color="bg-pink-400" x="30%" y="80%" />
          <Particle delay={1.5} duration={4} size={2} color="bg-yellow-400" x="90%" y="60%" />
          <Particle delay={2.5} duration={5} size={1} color="bg-green-400" x="20%" y="50%" />
          
          {/* Yüzen ikonlar */}
          <FloatingIcon icon={<Sparkles size={16} />} delay={0} x="15%" y="25%" />
          <FloatingIcon icon={<Star size={12} />} delay={1} x="85%" y="40%" />
          <FloatingIcon icon={<Zap size={14} />} delay={2} x="70%" y="15%" />
          <FloatingIcon icon={<BookOpen size={10} />} delay={0.5} x="25%" y="75%" />
          <FloatingIcon icon={<Target size={12} />} delay={1.5} x="95%" y="80%" />
        </div>
      )}

      {/* Sol Panel - Siyah/Koyu - %30 */}
      <div className="hidden lg:flex lg:w-[30%] relative overflow-hidden">
        {/* Animasyonlu Arka Plan Katmanları */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 via-gray-800/90 to-black/95 backdrop-blur-sm"></div>
        
        {/* Hareket Eden Arka Plan Desenleri */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-32 right-20 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-cyan-500/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-10 right-10 w-20 h-20 bg-pink-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-10 left-10 w-28 h-28 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>

        {/* Geometrik Şekiller */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-1/4 w-16 h-16 border-2 border-white rotate-45 animate-spin" style={{ animationDuration: '20s' }}></div>
          <div className="absolute bottom-1/4 right-1/4 w-12 h-12 border-2 border-white rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
          <div className="absolute top-3/4 left-1/2 w-8 h-8 bg-white rotate-45 animate-bounce" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* İçerik */}
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 w-full">
          {/* Logo ve Başlık - Animasyonlu */}
          <div className={`text-center mb-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="mb-8">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-2xl transform hover:scale-110 transition-all duration-300 hover:rotate-3 animate-pulse">
                <GraduationCap size={48} className="text-white animate-bounce" style={{ animationDuration: '2s' }} />
              </div>
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
                YKS
              </h1>
              <p className="text-2xl font-semibold text-gray-300 mb-2 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                Takip & Koçluk
              </p>
              <p className="text-gray-400 text-lg animate-fade-in-up" style={{ animationDelay: '1s' }}>
                2026 YKS sınavına hazırlık için kişisel asistanınız
              </p>
            </div>
          </div>

          {/* Özellikler - Staggered Animation */}
          <div className={`grid grid-cols-2 gap-6 w-full max-w-md transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '0.3s' }}>
            <div className="text-center p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:scale-105 transition-all duration-300 hover:border-blue-400/50 group">
              <BookOpen className="w-8 h-8 text-blue-400 mx-auto mb-2 group-hover:animate-bounce" />
              <p className="text-sm font-medium text-gray-300">Çalışma Takibi</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:scale-105 transition-all duration-300 hover:border-green-400/50 group" style={{ animationDelay: '0.1s' }}>
              <Target className="w-8 h-8 text-green-400 mx-auto mb-2 group-hover:animate-bounce" />
              <p className="text-sm font-medium text-gray-300">Deneme Analizi</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:scale-105 transition-all duration-300 hover:border-purple-400/50 group" style={{ animationDelay: '0.2s' }}>
              <TrendingUp className="w-8 h-8 text-purple-400 mx-auto mb-2 group-hover:animate-bounce" />
              <p className="text-sm font-medium text-gray-300">AI Koçluk</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:scale-105 transition-all duration-300 hover:border-cyan-400/50 group" style={{ animationDelay: '0.3s' }}>
              <Users className="w-8 h-8 text-cyan-400 mx-auto mb-2 group-hover:animate-bounce" />
              <p className="text-sm font-medium text-gray-300">Topluluk</p>
            </div>
          </div>

          {/* Alt Bilgi - Animasyonlu */}
          <div className={`mt-12 text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '0.6s' }}>
            <div className="flex items-center justify-center space-x-2 text-gray-400 mb-4 hover:text-gray-300 transition-colors duration-300">
              <Award className="w-5 h-5 animate-pulse" />
              <span className="text-sm">Binlerce öğrenci tarafından tercih ediliyor</span>
            </div>
            <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
              <span className="hover:text-green-400 transition-colors duration-300 cursor-default">✓ Ücretsiz</span>
              <span className="hover:text-blue-400 transition-colors duration-300 cursor-default">✓ Güvenli</span>
              <span className="hover:text-purple-400 transition-colors duration-300 cursor-default">✓ Offline Çalışır</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sağ Panel - Giriş Formu - %70 */}
      <div className="w-full lg:w-[70%] flex items-center justify-center p-8 relative">
        {/* Glassmorphism Arka Plan */}
        <div className="absolute inset-0 bg-white/10 dark:bg-gray-900/10 backdrop-blur-xl"></div>
        
        <div className={`w-full max-w-lg relative z-10 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Mobil Logo - Animasyonlu */}
          <div className="lg:hidden text-center mb-8 animate-fade-in-up">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 mx-auto hover:scale-110 transition-transform duration-300 hover:rotate-3">
              <GraduationCap size={32} className="text-white animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              YKS Takip & Koçluk
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Giriş yapın ve başarıya ulaşın
            </p>
          </div>

          {/* Masaüstü Başlık - Animasyonlu */}
          <div className="hidden lg:block text-center mb-8 animate-fade-in-up">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Hoş Geldiniz
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Hesabınıza giriş yapın veya hemen başlayın
            </p>
          </div>

          {/* Hata Mesajı - Animasyonlu */}
          {error && (
            <div className="mb-6 p-4 bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl backdrop-blur-sm animate-shake">
              <p className="text-red-700 dark:text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Giriş Seçenekleri - Staggered Animation */}
          <div className="space-y-4">
            {/* Google ile Giriş */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className={`w-full bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-gray-700 shadow-lg hover:shadow-2xl transition-all duration-300 py-4 backdrop-blur-sm hover:scale-105 transform ${mounted ? 'animate-slide-in-right' : ''}`}
              style={{ animationDelay: '0.2s' }}
            >
              {isGoogleLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
              ) : (
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span className="font-medium">
                {isGoogleLoading ? 'Google ile giriş yapılıyor...' : 'Google ile Giriş Yap'}
              </span>
            </Button>

            {/* Ayırıcı - Animasyonlu */}
            <div className={`relative my-8 ${mounted ? 'animate-fade-in' : ''}`} style={{ animationDelay: '0.4s' }}>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 font-medium backdrop-blur-sm rounded-full">
                  veya
                </span>
              </div>
            </div>

            {/* Anonim Giriş */}
            <Button
              onClick={handleAnonymousSignIn}
              disabled={isLoading}
              className={`w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-2xl transition-all duration-300 py-4 hover:scale-105 transform relative overflow-hidden group ${mounted ? 'animate-slide-in-left' : ''}`}
              style={{ animationDelay: '0.6s' }}
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"></div>
              
              {isAnonymousLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              ) : (
                <User size={20} className="mr-3 animate-pulse" />
              )}
              <span className="font-medium relative z-10">
                {isAnonymousLoading ? 'Giriş yapılıyor...' : 'Misafir Olarak Devam Et'}
              </span>
            </Button>
          </div>

          {/* Bilgi Kartı - Animasyonlu */}
          <div className={`mt-8 p-6 bg-blue-50/80 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 backdrop-blur-sm hover:bg-blue-100/80 dark:hover:bg-blue-900/30 transition-all duration-300 ${mounted ? 'animate-fade-in-up' : ''}`} style={{ animationDelay: '0.8s' }}>
            <div className="flex items-start">
              <LogIn size={20} className="text-blue-500 mr-3 mt-0.5 flex-shrink-0 animate-pulse" />
              <div className="text-sm">
                <p className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                  Giriş Seçenekleri
                </p>
                <div className="space-y-2 text-blue-700 dark:text-blue-400">
                  <div className="flex items-center hover:translate-x-1 transition-transform duration-200">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-xs"><strong>Google:</strong> Verileriniz güvenle saklanır ve senkronize edilir</span>
                  </div>
                  <div className="flex items-center hover:translate-x-1 transition-transform duration-200">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <span className="text-xs"><strong>Misafir:</strong> Hemen başlayın, veriler cihazınızda saklanır</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Animasyonlu */}
          <div className={`mt-8 text-center ${mounted ? 'animate-fade-in' : ''}`} style={{ animationDelay: '1s' }}>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Giriş yaparak{' '}
              <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200">
                Kullanım Şartları
              </span>{' '}
              ve{' '}
              <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200">
                Gizlilik Politikası
              </span>
              'nı kabul etmiş olursunuz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;