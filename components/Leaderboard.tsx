import React, { useState, useEffect, useCallback } from 'react';
import { UserStats, LeaderboardEntry } from '../types';
import { 
  db, 
  collection, 
  query, 
  limit, 
  onSnapshot,
  User 
} from '../firebase';
import Card from './common/Card';
import { 
  Trophy, 
  Medal, 
  Award, 
  Clock, 
  BookOpen, 
  Target, 
  User as UserIcon,
  Crown,
  Zap
} from 'lucide-react';

interface LeaderboardProps {
  user: User | null;
}

type LeaderboardType = 'studyTime' | 'bestNet' | 'averageNet' | 'totalExams' | 'totalSessions';

const Leaderboard: React.FC<LeaderboardProps> = ({ user }) => {
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeaderboardType>('studyTime');
  const [currentUserStats, setCurrentUserStats] = useState<UserStats | null>(null);

  // Kullanıcı istatistiklerini dinle
  useEffect(() => {
    const statsRef = collection(db, 'user_stats');
    const statsQuery = query(statsRef, limit(100));

    const unsubscribe = onSnapshot(statsQuery, (snapshot) => {
      const statsList: UserStats[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const stats: UserStats = {
          uid: data.uid || doc.id,
          displayName: data.displayName || 'Kullanıcı',
          photoURL: data.photoURL,
          isAnonymous: data.isAnonymous || false,
          totalStudyTime: data.totalStudyTime || 0,
          totalExams: data.totalExams || 0,
          bestTotalNet: data.bestTotalNet || 0,
          averageNet: data.averageNet || 0,
          totalSessions: data.totalSessions || 0,
          lastActive: data.lastActive || new Date().toISOString(),
          joinDate: data.joinDate || new Date().toISOString(),
        };
        
        statsList.push(stats);
        
        // Mevcut kullanıcının istatistiklerini kaydet
        if (user && stats.uid === user.uid) {
          setCurrentUserStats(stats);
        }
      });
      
      setUserStats(statsList);
      setIsLoading(false);
    }, (error) => {
      console.error('İstatistikler yüklenirken hata:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Liderlik tablosunu hesapla
  const getLeaderboard = useCallback((type: LeaderboardType): LeaderboardEntry[] => {
    let sortedStats = [...userStats];
    
    // Anonim kullanıcıları filtrele (isteğe bağlı)
    // sortedStats = sortedStats.filter(stat => !stat.isAnonymous);
    
    switch (type) {
      case 'studyTime':
        sortedStats.sort((a, b) => b.totalStudyTime - a.totalStudyTime);
        break;
      case 'bestNet':
        sortedStats.sort((a, b) => b.bestTotalNet - a.bestTotalNet);
        break;
      case 'averageNet':
        sortedStats.sort((a, b) => b.averageNet - a.averageNet);
        break;
      case 'totalExams':
        sortedStats.sort((a, b) => b.totalExams - a.totalExams);
        break;
      case 'totalSessions':
        sortedStats.sort((a, b) => b.totalSessions - a.totalSessions);
        break;
    }
    
    return sortedStats.slice(0, 50).map((stat, index) => ({
      uid: stat.uid,
      displayName: stat.displayName,
      photoURL: stat.photoURL,
      isAnonymous: stat.isAnonymous,
      value: getStatValue(stat, type),
      rank: index + 1,
      badge: getBadge(index + 1),
    }));
  }, [userStats]);

  // İstatistik değerini al
  const getStatValue = (stat: UserStats, type: LeaderboardType): number => {
    switch (type) {
      case 'studyTime': return stat.totalStudyTime;
      case 'bestNet': return stat.bestTotalNet;
      case 'averageNet': return stat.averageNet;
      case 'totalExams': return stat.totalExams;
      case 'totalSessions': return stat.totalSessions;
      default: return 0;
    }
  };

  // Badge al
  const getBadge = (rank: number): string => {
    if (rank === 1) return '👑';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '⭐';
    if (rank <= 25) return '🔥';
    return '';
  };

  // Değeri formatla
  const formatValue = (value: number, type: LeaderboardType): string => {
    switch (type) {
      case 'studyTime':
        const hours = Math.floor(value / 60);
        const minutes = value % 60;
        return hours > 0 ? `${hours}s ${minutes}dk` : `${minutes}dk`;
      case 'bestNet':
      case 'averageNet':
        return value.toFixed(1);
      case 'totalExams':
      case 'totalSessions':
        return value.toString();
      default:
        return value.toString();
    }
  };

  // Tab bilgilerini al
  const getTabInfo = (type: LeaderboardType) => {
    switch (type) {
      case 'studyTime':
        return { 
          title: 'Çalışma Süresi', 
          icon: Clock, 
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          description: 'En çok çalışan öğrenciler'
        };
      case 'bestNet':
        return { 
          title: 'En Yüksek Net', 
          icon: Trophy, 
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          description: 'En yüksek deneme neti'
        };
      case 'averageNet':
        return { 
          title: 'Ortalama Net', 
          icon: Target, 
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          description: 'En istikrarlı performans'
        };
      case 'totalExams':
        return { 
          title: 'Deneme Sayısı', 
          icon: BookOpen, 
          color: 'text-purple-500',
          bgColor: 'bg-purple-500/10',
          description: 'En çok deneme çözen'
        };
      case 'totalSessions':
        return { 
          title: 'Çalışma Oturumu', 
          icon: Zap, 
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
          description: 'En çok oturum yapan'
        };
    }
  };

  // Mevcut kullanıcının sıralamasını bul
  const getCurrentUserRank = (type: LeaderboardType): number => {
    if (!user || !currentUserStats) return -1;
    const leaderboard = getLeaderboard(type);
    const userEntry = leaderboard.find(entry => entry.uid === user.uid);
    return userEntry ? userEntry.rank : -1;
  };

  const tabs: LeaderboardType[] = ['studyTime', 'bestNet', 'averageNet', 'totalExams', 'totalSessions'];
  const currentLeaderboard = getLeaderboard(activeTab);
  const tabInfo = getTabInfo(activeTab);
  // Not using currentUserRank directly here; shown per-card above

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-light-text dark:text-dark-text mb-2 flex items-center justify-center">
          <Trophy className="mr-3 text-yellow-500" size={32} />
          Liderlik Tablosu
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          En başarılı öğrencileri keşfedin ve kendinizi onlarla karşılaştırın
        </p>
      </div>

      {/* Mevcut Kullanıcı Özeti */}
      {currentUserStats && (
        <Card title="Senin İstatistiklerin" fullHeight={false}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {tabs.map((tab) => {
              const info = getTabInfo(tab);
              const Icon = info.icon;
              const value = getStatValue(currentUserStats, tab);
              const rank = getCurrentUserRank(tab);
              
              return (
                <div key={tab} className={`p-3 rounded-lg ${info.bgColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icon size={20} className={info.color} />
                    {rank > 0 && (
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                        #{rank}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {info.title}
                  </p>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {formatValue(value, tab)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Tab Seçimi */}
      <div className="flex flex-wrap gap-2 justify-center">
        {tabs.map((tab) => {
          const info = getTabInfo(tab);
          const Icon = info.icon;
          
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? `${info.bgColor} ${info.color} shadow-md`
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={16} className="mr-2" />
              {info.title}
            </button>
          );
        })}
      </div>

      {/* Liderlik Tablosu */}
      <Card title={`${tabInfo.title} Liderleri`} fullHeight>
        <div className="space-y-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {tabInfo.description}
          </p>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-primary dark:border-dark-primary mx-auto mb-3"></div>
                <p className="text-gray-500 dark:text-gray-400">Liderlik tablosu yükleniyor...</p>
              </div>
            </div>
          ) : currentLeaderboard.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <Trophy size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">Henüz veri yok</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  İlk sıralarda yer almak için çalışmaya başla!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {currentLeaderboard.map((entry, index) => (
                <div
                  key={entry.uid}
                  className={`flex items-center space-x-4 p-3 rounded-lg transition-all hover:shadow-md ${
                    entry.uid === user?.uid
                      ? 'bg-light-primary/10 dark:bg-dark-primary/10 border-2 border-light-primary dark:border-dark-primary'
                      : index < 3
                      ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                  }`}
                >
                  {/* Sıralama */}
                  <div className="flex-shrink-0 w-12 text-center">
                    {entry.rank <= 3 ? (
                      <div className="text-2xl">
                        {entry.rank === 1 && <Crown className="text-yellow-500 mx-auto" size={24} />}
                        {entry.rank === 2 && <Medal className="text-gray-400 mx-auto" size={24} />}
                        {entry.rank === 3 && <Award className="text-orange-500 mx-auto" size={24} />}
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-gray-600 dark:text-gray-400">
                        #{entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {entry.photoURL ? (
                      <img
                        src={entry.photoURL}
                        alt={entry.displayName}
                        className="w-10 h-10 rounded-full"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                        entry.isAnonymous 
                          ? 'bg-gray-500' 
                          : entry.rank <= 3
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          : 'bg-gradient-to-r from-blue-500 to-purple-500'
                      }`}>
                        {entry.isAnonymous ? (
                          <UserIcon size={20} />
                        ) : (
                          entry.displayName.charAt(0).toUpperCase()
                        )}
                      </div>
                    )}
                  </div>

                  {/* İsim ve Badge */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className={`font-medium truncate ${
                        entry.uid === user?.uid
                          ? 'text-light-primary dark:text-dark-primary'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}>
                        {entry.displayName}
                        {entry.uid === user?.uid && ' (Sen)'}
                      </p>
                      {entry.badge && (
                        <span className="text-lg">{entry.badge}</span>
                      )}
                      {entry.isAnonymous && (
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                          Misafir
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Değer */}
                  <div className="flex-shrink-0 text-right">
                    <p className={`text-lg font-bold ${
                      entry.uid === user?.uid
                        ? 'text-light-primary dark:text-dark-primary'
                        : entry.rank <= 3
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-800 dark:text-gray-200'
                    }`}>
                      {formatValue(entry.value, activeTab)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {tabInfo.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Leaderboard;