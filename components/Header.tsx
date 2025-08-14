
import React, { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import { signOut, auth, type User } from '../firebase';
import { Sun, Moon, BarChart3, Calendar, MessageCircle, Trophy, Settings, BookOpen, LogOut, User as UserIcon, Bot } from 'lucide-react';

interface HeaderProps {
  currentPage: 'dashboard' | 'planner' | 'community' | 'leaderboard' | 'settings' | 'study-guide' | 'chatbot';
  onPageChange: (page: 'dashboard' | 'planner' | 'community' | 'leaderboard' | 'settings' | 'study-guide' | 'chatbot') => void;
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onPageChange, user }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
    }
  };

  const getUserDisplayName = () => {
    if (!user) return 'Misafir';
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split('@')[0];
    return 'Kullanıcı';
  };

  const getUserAvatar = () => {
    if (user?.photoURL) return user.photoURL;
    return null;
  };

  return (
    <header className="bg-light-card dark:bg-dark-card shadow-md p-4 transition-colors duration-300">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-light-primary dark:text-dark-secondary">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <h1 className="text-xl md:text-2xl font-bold text-light-text dark:text-dark-text">
            YKS Takip & Koçluk
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Navigation */}
          <nav className="hidden md:flex space-x-2">
            <button
              onClick={() => onPageChange('dashboard')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'dashboard'
                  ? 'bg-light-primary text-white dark:bg-dark-primary'
                  : 'text-light-text dark:text-dark-text hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <BarChart3 size={18} className="mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => onPageChange('planner')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'planner'
                  ? 'bg-light-primary text-white dark:bg-dark-primary'
                  : 'text-light-text dark:text-dark-text hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Calendar size={18} className="mr-2" />
              Planlama
            </button>
            <button
              onClick={() => onPageChange('study-guide')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'study-guide'
                  ? 'bg-light-primary text-white dark:bg-dark-primary'
                  : 'text-light-text dark:text-dark-text hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <BookOpen size={18} className="mr-2" />
              Ders Rehberi
            </button>
            <button
              onClick={() => onPageChange('chatbot')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'chatbot'
                  ? 'bg-light-primary text-white dark:bg-dark-primary'
                  : 'text-light-text dark:text-dark-text hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Bot size={18} className="mr-2" />
              Chatbot
            </button>
            <button
              onClick={() => onPageChange('community')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'community'
                  ? 'bg-light-primary text-white dark:bg-dark-primary'
                  : 'text-light-text dark:text-dark-text hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <MessageCircle size={18} className="mr-2" />
              Topluluk
            </button>
            <button
              onClick={() => onPageChange('leaderboard')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'leaderboard'
                  ? 'bg-light-primary text-white dark:bg-dark-primary'
                  : 'text-light-text dark:text-dark-text hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Trophy size={18} className="mr-2" />
              Liderlik
            </button>
            <button
              onClick={() => onPageChange('settings')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'settings'
                  ? 'bg-light-primary text-white dark:bg-dark-primary'
                  : 'text-light-text dark:text-dark-text hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Settings size={18} className="mr-2" />
              Ayarlar
            </button>
          </nav>

          {/* Mobile Navigation */}
          <nav className="flex md:hidden space-x-1">
            <button
              onClick={() => onPageChange('dashboard')}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 'dashboard'
                  ? 'bg-light-primary text-white dark:bg-dark-primary'
                  : 'text-light-text dark:text-dark-text hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title="Dashboard"
            >
              <BarChart3 size={18} />
            </button>
            <button
              onClick={() => onPageChange('planner')}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 'planner'
                  ? 'bg-light-primary text-white dark:bg-dark-primary'
                  : 'text-light-text dark:text-dark-text hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title="Planlama"
            >
              <Calendar size={18} />
            </button>
            <button
              onClick={() => onPageChange('study-guide')}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 'study-guide'
                  ? 'bg-light-primary text-white dark:bg-dark-primary'
                  : 'text-light-text dark:text-dark-text hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title="Ders Rehberi"
            >
              <BookOpen size={18} />
            </button>
            <button
              onClick={() => onPageChange('chatbot')}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 'chatbot'
                  ? 'bg-light-primary text-white dark:bg-dark-primary'
                  : 'text-light-text dark:text-dark-text hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title="Chatbot"
            >
              <Bot size={18} />
            </button>
            <button
              onClick={() => onPageChange('community')}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 'community'
                  ? 'bg-light-primary text-white dark:bg-dark-primary'
                  : 'text-light-text dark:text-dark-text hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title="Topluluk"
            >
              <MessageCircle size={18} />
            </button>
            <button
              onClick={() => onPageChange('leaderboard')}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 'leaderboard'
                  ? 'bg-light-primary text-white dark:bg-dark-primary'
                  : 'text-light-text dark:text-dark-text hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title="Liderlik"
            >
              <Trophy size={18} />
            </button>
            <button
              onClick={() => onPageChange('settings')}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 'settings'
                  ? 'bg-light-primary text-white dark:bg-dark-primary'
                  : 'text-light-text dark:text-dark-text hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title="Ayarlar"
            >
              <Settings size={18} />
            </button>
          </nav>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {getUserAvatar() ? (
                <img
                  src={getUserAvatar()!}
                  alt="Profil"
                  className="w-6 h-6 rounded-full"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <UserIcon size={16} className="text-gray-600 dark:text-gray-400" />
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-24 truncate">
                {getUserDisplayName()}
              </span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-light-secondary dark:text-dark-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-primary dark:focus:ring-dark-secondary"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              aria-label="Çıkış Yap"
              title="Çıkış Yap"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
