import { 
  db, 
  doc, 
  setDoc, 
  serverTimestamp,
  User 
} from '../firebase';
import { StudySession, PracticeExam, UserStats } from '../types';

export class StatsService {
  // Kullanıcı istatistiklerini güncelle
  static async updateUserStats(
    user: User, 
    studySessions: StudySession[], 
    practiceExams: PracticeExam[]
  ): Promise<void> {
    if (!user) return;

    try {
      // İstatistikleri hesapla
  const totalStudyTime = studySessions.reduce((total, session) => total + (session.duration || 0), 0);
  const totalSessions = studySessions.reduce((total, s) => total + (s.sessionCount || 1), 0);
      const totalExams = practiceExams.length;
      
      // En yüksek net hesapla
      const bestTotalNet = practiceExams.length > 0 
        ? Math.max(...practiceExams.map(exam => exam.totalNet || 0))
        : 0;
      
      // Ortalama net hesapla
      const averageNet = practiceExams.length > 0
        ? practiceExams.reduce((sum, exam) => sum + (exam.totalNet || 0), 0) / practiceExams.length
        : 0;

      // Kullanıcı bilgilerini al
      const displayName = user.displayName || 
        (user.email ? user.email.split('@')[0] : 
        (user.isAnonymous ? `Misafir${user.uid.slice(-4)}` : 'Kullanıcı'));

  // joinDate alanını TS seviyesinde zorunlu kılmadan güncelleme: firestore'a merge ile yazarken mevcut joinDate korunur.
  const userStats = {
        uid: user.uid,
        displayName,
        isAnonymous: user.isAnonymous,
        totalStudyTime,
        totalExams,
        bestTotalNet,
        averageNet: Math.round(averageNet * 10) / 10, // 1 ondalık basamak
        totalSessions,
        lastActive: new Date().toISOString(),
      };
  // Only include photoURL if present
  const userStatsWithPhoto = user.photoURL ? { ...userStats, photoURL: user.photoURL } : userStats;

      // Firestore'a kaydet (merge: true ile mevcut joinDate korunur)
      const statsRef = doc(db, 'user_stats', user.uid);
      await setDoc(statsRef, {
        ...(userStatsWithPhoto as Partial<UserStats>),
        lastUpdated: serverTimestamp(),
      }, { merge: true });

      console.log('Kullanıcı istatistikleri güncellendi:', userStats);
    } catch (error) {
      console.error('İstatistik güncelleme hatası:', error);
    }
  }

  // İlk kayıt için kullanıcı istatistiklerini oluştur
  static async initializeUserStats(user: User): Promise<void> {
    if (!user) return;

    try {
      const displayName = user.displayName || 
        (user.email ? user.email.split('@')[0] : 
        (user.isAnonymous ? `Misafir${user.uid.slice(-4)}` : 'Kullanıcı'));

      const baseInitial: Omit<UserStats, 'photoURL'> & { photoURL?: string } = {
        uid: user.uid,
        displayName,
        isAnonymous: user.isAnonymous,
        totalStudyTime: 0,
        totalExams: 0,
        bestTotalNet: 0,
        averageNet: 0,
        totalSessions: 0,
        lastActive: new Date().toISOString(),
        joinDate: new Date().toISOString(),
      };
      const initialStats: UserStats = (user.photoURL
        ? { ...baseInitial, photoURL: user.photoURL }
        : baseInitial) as UserStats;

      const statsRef = doc(db, 'user_stats', user.uid);
      await setDoc(statsRef, {
        ...initialStats,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      }, { merge: true }); // merge: true ile mevcut veriler korunur

      console.log('Kullanıcı istatistikleri başlatıldı:', initialStats);
    } catch (error) {
      console.error('İstatistik başlatma hatası:', error);
    }
  }

  // Kullanıcı aktiflik durumunu güncelle
  static async updateUserActivity(user: User): Promise<void> {
    if (!user) return;

    try {
      const statsRef = doc(db, 'user_stats', user.uid);
      await setDoc(statsRef, {
        lastActive: new Date().toISOString(),
        lastUpdated: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error('Aktiflik güncelleme hatası:', error);
    }
  }
}

export default StatsService;