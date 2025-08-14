
export enum Subject {
  // TYT Dersleri
  TYT_TURKCE = "TYT Türkçe",
  TYT_MATEMATIK = "TYT Matematik",
  TYT_FEN = "TYT Fen Bilimleri",
  TYT_SOSYAL = "TYT Sosyal Bilimler",
  
  // AYT Dersleri
  AYT_MATEMATIK = "AYT Matematik",
  AYT_FIZIK = "AYT Fizik",
  AYT_KIMYA = "AYT Kimya",
  AYT_BIYOLOJI = "AYT Biyoloji",
  AYT_TARIH = "AYT Tarih",
  AYT_COGRAFYA = "AYT Coğrafya",
  AYT_FELSEFE = "AYT Felsefe",
  AYT_DIN = "AYT Din Kültürü",
  AYT_EDEBIYAT = "AYT Edebiyat",
  AYT_DIGER_DILLER = "AYT Diğer Diller"
}

export interface Topic {
  id: string;
  name: string;
  subject: Subject;
  completed: boolean;
}

export interface StudySession {
  id: string;
  subject: Subject;
  topic: string;
  duration: number; // in minutes
  date: string;
  note?: string; // Kullanıcının kişisel notu
  sessionCount?: number; // same subject+topic merge count
}

export interface SubjectNet {
  subject: string;
  correct: number;
  wrong: number;
  net: number;
}

export interface PracticeExam {
  id: string;
  name: string;
  type: 'TYT' | 'AYT';
  subjects: SubjectNet[];
  totalNet: number;
  date: string;
}

export interface AiUsageRecord {
  timestamp: string;
  success: boolean;
  userApiKey: boolean; // Kullanıcının kendi API anahtarı mı kullanıldı
}

export interface UserSettings {
  geminiApiKey?: string;
  aiEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  aiUsageHistory?: AiUsageRecord[];
  doNotDisturb?: {
    enabled: boolean;
    start: string; // '21:00'
    end: string;   // '05:00'
  };
  notifications?: {
    enabled: boolean;                 // genel aç/kapa
    motivationIntervalMinutes: number; // 120 varsayılan
    planReminders: number[];          // dakika cinsinden: [1440,60,30]
    maxDailyMotivations?: number;     // günlük limit (opsiyonel)
  };
  /**
   * Yapay zeka koçunun kişiselleştirilmesi için tercihleri
   */
  aiCoachPrefs?: {
    /** Kullanıcının serbestçe yazdığı stil/talimat metni */
    instructions?: string;
    /** Üslup (varsayılan: 'samimi') */
    tone?: 'samimi' | 'nötr' | 'resmi' | 'eğlenceli';
    /** Yanıt uzunluğu tercihi (varsayılan: 'kısa') */
    length?: 'kısa' | 'orta' | 'uzun';
    /** Emoji kullanılsın mı? (varsayılan: false) */
    allowEmojis?: boolean;
    /** Kullanıcının hedefleri */
    targets?: {
      rank?: number; // hedef sıralama
      university?: string; // hedef üniversite
      department?: string; // hedef bölüm
      /** Serbest biçimli hedef netler açıklaması (örn: TYT 90+, AYT Mat 35+) */
      targetNetsText?: string;
    };
  };
}

export interface CompletedTopic {
  subject: Subject;
  topicName: string;
  completedAt: string; // ISO date string
  completedBy?: string; // user ID who completed it
}

export interface StudyGuideData {
  lastVisited?: string;
  preferences?: {
    defaultCategory?: 'TYT' | 'AYT';
    expandedSubjects?: Subject[];
  };
}

export interface AppData {
  studySessions: StudySession[];
  practiceExams: PracticeExam[];
  weeklySchedules: WeeklySchedule[];
  /**
   * Yeni ders-bazlı çalışma kayıtları
   */
  subjectStudyRecords?: SubjectStudyRecord[];
  /**
   * Kullanıcı hedefleri
   */
  goals?: Goal[];
  /**
   * Tamamlanan konular
   */
  completedTopics?: CompletedTopic[];
  /**
   * Kullanıcı ayarları
   */
  settings?: UserSettings;
  /**
   * Ders rehberi verileri
   */
  studyGuide?: StudyGuideData;
}
// Ders > Konular > Her konuda birden fazla kayıt (tarih+süre+not)
export interface SubjectStudyRecord {
  subject: Subject;
  topics: {
    name: string;
    records: {
      duration: number;
      date: string;
      note?: string; // Kullanıcının kişisel notu
    }[];
  }[];
}

export interface AiRecommendation {
  hasData: boolean;
  warningMessage?: string;
  strengths?: string[];
  weaknesses?: string[];
  weeklyPlan?: {
    day: string;
    tasks: string[];
  }[];
  recommendations?: string[];
  dataRequirements?: string[];
}

export interface WeeklyPlan {
  id: string;
  title: string;
  description: string;
  subject: Subject;
  duration: number; // dakika cinsinden
  startTime: string; // "09:00" formatında
  color: string;
  isCompleted?: boolean;
  completedAt?: string; // ISO date string
}

export interface DayPlan {
  day: string;
  plans: WeeklyPlan[];
}

export interface WeeklySchedule {
  id: string;
  weekStart: string; // ISO date string
  days: DayPlan[];
}

export interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: string; // ISO date string
  isAnonymous: boolean;
}

export interface CommunityUser {
  uid: string;
  displayName: string;
  photoURL?: string;
  isAnonymous: boolean;
  lastSeen: string;
}

export interface UserStats {
  uid: string;
  displayName: string;
  photoURL?: string;
  isAnonymous: boolean;
  totalStudyTime: number; // dakika cinsinden
  totalExams: number;
  bestTotalNet: number;
  averageNet: number;
  totalSessions: number;
  lastActive: string;
  joinDate: string;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL?: string;
  isAnonymous: boolean;
  value: number;
  rank: number;
  badge?: string;
}

export type GoalType = 'daily_study' | 'weekly_study' | 'weekly_exam' | 'subject_net' | 'streak';

export interface Goal {
  id: string;
  type: GoalType;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string; // 'dakika', 'adet', 'net', 'gün'
  deadline?: string; // ISO date string
  isActive: boolean;
  createdAt: string;
  completedAt?: string;
  subject?: Subject; // subject_net hedefleri için
}

// Ders Rehberi için yeni interface'ler
export interface TopicNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopicVideo {
  id: string;
  title: string;
  url: string;
  platform: 'YouTube' | 'Khan Academy' | 'Udemy' | 'Other';
  duration?: number; // dakika
  watched: boolean;
  watchedAt?: string;
  createdAt: string;
}

export interface TopicResource {
  id: string;
  title: string;
  url: string;
  type: 'PDF' | 'Website' | 'Book' | 'Article' | 'Other';
  description?: string;
  createdAt: string;
}

export interface TopicProgress {
  topicId: string;
  subjectId: Subject;
  status: 'not_started' | 'in_progress' | 'completed' | 'mastered';
  progressPercentage: number; // 0-100
  studyTime: number; // toplam çalışma süresi (dakika)
  lastStudiedAt?: string;
  notes: TopicNote[];
  videos: TopicVideo[];
  resources: TopicResource[];
  reviewSchedule?: { date: string; done: boolean }[];
  createdAt: string;
  updatedAt: string;
}

export interface StudyGuideData {
  topicProgress: TopicProgress[];
}
