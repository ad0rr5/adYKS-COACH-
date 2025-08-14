import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from "react";
import { AppData, StudySession, PracticeExam, DayPlan, Subject, Goal, UserSettings, AiUsageRecord, CompletedTopic, TopicVideo, TopicProgress, StudyGuideData } from "./types";
import StatsService from "./services/statsService";
import Header from "./components/Header";
import Login from "./components/Login";
import PWAInstall from "./components/PWAInstall";
import OfflineIndicator from "./components/OfflineIndicator";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { CardSkeleton } from "./components/common/LoadingSkeleton";

// Lazy load components for better performance
const Dashboard = lazy(() => import("./components/Dashboard"));
const WeeklyPlanner = lazy(() => import("./components/WeeklyPlanner"));
const Community = lazy(() => import("./components/Community"));
const Leaderboard = lazy(() => import("./components/Leaderboard"));
const Settings = lazy(() => import("./components/Settings"));
const Chatbot = lazy(() => import("./components/Chatbot"));
const StudyGuide = lazy(() => import("./components/StudyGuide"));
import { startNotificationScheduler, stopNotificationScheduler } from './services/notificationScheduler';
import { ensurePushSubscribed } from './services/pushService';
import { initMessaging, ensureFcmToken, listenForegroundMessages } from './services/fcmService';
import { getMotivationBlurb } from './services/geminiService';
import { Theme, ThemeContext } from "./contexts/ThemeContext";
import {
  auth,
  db,
  onAuthStateChanged,
  onSnapshot,
  doc,
  setDoc,
  User,
} from "./firebase";

const App: React.FC = () => {
  // Remove undefined recursively (Firestore doesn't accept undefined values)
  const cleanUndefinedDeep = useCallback((obj: any) => {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      return obj;
    }
  }, []);
  const [theme, setTheme] = useState<Theme>("dark");
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false); // Auth durumu kontrol edildi mi?
  const [currentPage, setCurrentPage] = useState<
    "dashboard" | "planner" | "community" | "leaderboard" | "settings" | "study-guide" | "chatbot"
  >(() => {
    try {
      const p = new URLSearchParams(window.location.search).get("page");
      const allowed = [
        "dashboard",
        "planner",
        "community",
        "leaderboard",
        "settings",
  "study-guide",
  "chatbot",
      ] as const;
      return (allowed as readonly string[]).includes(p || "")
        ? (p as any)
        : "dashboard";
    } catch {
      return "dashboard";
    }
  });

  // Handle Firebase authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          // FCM init & token
          initMessaging();
          ensureFcmToken(currentUser);
          console.log("Kullanıcı giriş yaptı:", {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            isAnonymous: currentUser.isAnonymous,
          });
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setData(null);
          setIsLoading(false);
          console.log("Kullanıcı çıkış yaptı");
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        setIsAuthenticated(false);
        setIsLoading(false);
      } finally {
        // Auth durumu kontrol edildi
        setAuthChecked(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Foreground FCM listener
  useEffect(() => {
    const off = listenForegroundMessages((p) => {
      console.log('FCM foreground:', p);
    });
    return () => {
      try { if (typeof off === 'function') (off as any)(); } catch {}
    };
  }, []);

  // Handle data fetching and real-time updates from Firestore
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    setIsLoading(true);
    const userDocRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          // Mevcut kullanıcı verilerinde weeklySchedules yoksa ekle
          const completeData: AppData = {
            studySessions: userData.studySessions || [],
            practiceExams: userData.practiceExams || [],
            weeklySchedules: userData.weeklySchedules || [],
            subjectStudyRecords: userData.subjectStudyRecords || [],
            goals: userData.goals || [],
            completedTopics: userData.completedTopics || [], // Tamamlanan konuları ekle
            settings: userData.settings || {
              aiEnabled: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              doNotDisturb: { enabled: true, start: '21:00', end: '05:00' },
              notifications: { enabled: true, motivationIntervalMinutes: 120, planReminders: [1440,60,30], maxDailyMotivations: 6 }
            },
            studyGuide: userData.studyGuide || { topicProgress: [] },
          };
          // DND varsayılanını uygula
          if (!completeData.settings) {
            completeData.settings = {
              aiEnabled: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              doNotDisturb: { enabled: true, start: '21:00', end: '05:00' }
            };
          } else if (!completeData.settings.doNotDisturb) {
            completeData.settings.doNotDisturb = { enabled: true, start: '21:00', end: '05:00' };
          }
          setData(completeData);

          // Eğer weeklySchedules eksikse Firestore'u güncelle
          if (!userData.weeklySchedules) {
            setDoc(userDocRef, { weeklySchedules: [] }, { merge: true });
          }

          // Kullanıcı istatistiklerini güncelle
          StatsService.updateUserStats(
            user,
            completeData.studySessions,
            completeData.practiceExams
          );
        } else {
          // First time user, create their document
          const initialData: AppData = {
            studySessions: [],
            practiceExams: [],
            weeklySchedules: [],
            goals: [],
            completedTopics: [], // Tamamlanan konuları ekle
            settings: {
              aiEnabled: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              doNotDisturb: { enabled: true, start: '21:00', end: '05:00' },
              notifications: { enabled: true, motivationIntervalMinutes: 120, planReminders: [1440,60,30], maxDailyMotivations: 6 }
            },
            studyGuide: { topicProgress: [] },
          };
          setDoc(userDocRef, initialData).then(() => {
            setData(initialData);
            // İlk kez kullanıcı için istatistikleri başlat
            StatsService.initializeUserStats(user);
          });
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Firestore snapshot error:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, isAuthenticated]);

  // Handle theme persistence with optimized localStorage usage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("yks-app-theme") as Theme | null;
      if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
        setTheme(savedTheme);
      } else {
        // İlk kez açılıyorsa karanlık modu varsayılan yap
        setTheme("dark");
        localStorage.setItem("yks-app-theme", "dark");
      }
    } catch (error) {
      console.error("Theme loading error:", error);
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;

    // Tema değişikliğini hemen uygula
    const applyTheme = () => {
      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    // Use requestAnimationFrame for smooth transition
    requestAnimationFrame(applyTheme);

    // LocalStorage'a kaydet (debounced)
    const saveTheme = setTimeout(() => {
      try {
        localStorage.setItem("yks-app-theme", theme);
      } catch (error) {
        console.error("Theme save error:", error);
      }
    }, 100);

    return () => clearTimeout(saveTheme);
  }, [theme]);

  // Bildirim scheduler'ını başlat
  useEffect(() => {
    if (!data) return;
  if (user) { ensurePushSubscribed(user); }
    let active = true;
    const show = async (title: string, options?: NotificationOptions) => {
      try {
        if (Notification.permission !== 'granted') return;
        const reg = await navigator.serviceWorker.getRegistration();
        if (!active) return;
        if (reg?.showNotification) {
          reg.showNotification(title, options);
        } else {
          new Notification(title, options);
        }
      } catch {
        // ignore
      }
    };
    const getMotivation = async () => {
      try {
        return await getMotivationBlurb(data, data.settings?.geminiApiKey, updateAiUsage);
      } catch {
        return 'Bugün küçük bir adım at. 25 dakika odaklan ve hedefine yaklaş.';
      }
    };
    startNotificationScheduler({ data, showNotification: show, getMotivation });
    return () => { active = false; stopNotificationScheduler(); };
  }, [data]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  }, []);

  // --- Optimized Data modification functions ---
  const updateFirestore = useCallback(async (updatedData: Partial<AppData>) => {
    if (!user) return;
    
    const userDocRef = doc(db, "users", user.uid);
    const previousData = data;
    
    try {
      // Optimistic update: önce UI'yı güncelle
  const cleanedForState = cleanUndefinedDeep(updatedData);
  setData((prev) => (prev ? { ...prev, ...cleanedForState } : prev));

      // Batch write for better performance
  const cleanedForFirestore = cleanUndefinedDeep(updatedData);
  await setDoc(userDocRef, cleanedForFirestore, { merge: true });
    } catch (err) {
      console.error("Firestore güncelleme hatası:", err);
      
      // Rollback on error
      if (previousData) {
        setData(previousData);
      }
      
      // Show user-friendly error message
      if (typeof window !== 'undefined') {
        // You can replace this with a toast notification
        console.warn("Veriler kaydedilemedi. Lütfen internet bağlantınızı kontrol edin.");
      }
    }
  }, [user, data]);

  // Optimized study session addition with memoization
  const addStudySession = useCallback(
    (session: Omit<StudySession, "id" | "date">) => {
      if (!data) return;
      
      const nowIso = new Date().toISOString();
      const subjectKey = session.subject;
      const topicKey = session.topic.trim();

      const prev = data.subjectStudyRecords || [];
      const subjectIndex = prev.findIndex(s => s.subject === subjectKey);

      let nextSubjectStudyRecords: typeof prev;
      
      if (subjectIndex === -1) {
        // Yeni ders ve konu kaydı
        nextSubjectStudyRecords = [
          ...prev,
          {
            subject: subjectKey,
            topics: [{
              name: topicKey,
              records: [{ duration: session.duration, date: nowIso, note: session.note }]
            }]
          }
        ];
      } else {
        const subjectRecord = prev[subjectIndex];
        const topicIndex = subjectRecord.topics.findIndex(t => 
          t.name.trim().toLowerCase() === topicKey.toLowerCase()
        );
        
        if (topicIndex === -1) {
          // Yeni konu
          nextSubjectStudyRecords = prev.map((record, index) => 
            index === subjectIndex 
              ? {
                  ...record,
                  topics: [
                    ...record.topics,
                    {
                      name: topicKey,
                      records: [{ duration: session.duration, date: nowIso, note: session.note }]
                    }
                  ]
                }
              : record
          );
        } else {
          // Mevcut konuya ekleme
          nextSubjectStudyRecords = prev.map((record, index) => 
            index === subjectIndex 
              ? {
                  ...record,
                  topics: record.topics.map((topic, tIndex) =>
                    tIndex === topicIndex
                      ? {
                          ...topic,
                          records: [
                            ...topic.records,
                            { duration: session.duration, date: nowIso, note: session.note }
                          ]
                        }
                      : topic
                  )
                }
              : record
          );
        }
      }

      // Ayrıca düz (flat) studySessions listesine de ekleyerek istatistikleri güncel tut
      const newStudySession: StudySession = {
        id: Date.now().toString(),
        subject: session.subject,
        topic: session.topic,
        duration: session.duration,
        date: nowIso,
        ...(session.note ? { note: session.note } : {})
      };

      updateFirestore({ 
        subjectStudyRecords: nextSubjectStudyRecords,
        studySessions: [...(data.studySessions || []), newStudySession]
      });
    },
    [data?.subjectStudyRecords, data?.studySessions, updateFirestore]
  );

  // Pomodoro tamamlandığında otomatik çalışma kaydı eklemek için yardımcı
  const logPomodoroStudy = useCallback((subject: Subject, topic: string, minutes: number) => {
    addStudySession({ subject, topic, duration: minutes, note: 'Pomodoro oturumu' });
  }, [addStudySession]);

  const deleteStudyRecord = useCallback(
    (subject: Subject, topicName: string, recordIndex: number) => {
      if (!data || !data.subjectStudyRecords) return;

      let subjectStudyRecords = [...data.subjectStudyRecords];

      // İlgili dersi bul
      const subjectRecordIndex = subjectStudyRecords.findIndex(
        (s) => s.subject === subject
      );
      if (subjectRecordIndex === -1) return;

      const subjectRecord = { ...subjectStudyRecords[subjectRecordIndex] };

      // İlgili konuyu bul
      const topicIndex = subjectRecord.topics.findIndex(
        (t) => t.name.trim().toLowerCase() === topicName.trim().toLowerCase()
      );
      if (topicIndex === -1) return;

  const topic = { ...subjectRecord.topics[topicIndex] };
  const deletedRec = topic.records[recordIndex];

      // Kaydı sil
      if (recordIndex >= 0 && recordIndex < topic.records.length) {
        topic.records = topic.records.filter(
          (_, index) => index !== recordIndex
        );

        // Eğer konuda hiç kayıt kalmadıysa konuyu da sil
        if (topic.records.length === 0) {
          subjectRecord.topics = subjectRecord.topics.filter(
            (_, index) => index !== topicIndex
          );
        } else {
          subjectRecord.topics[topicIndex] = topic;
        }

        // Eğer derste hiç konu kalmadıysa dersi de sil
        if (subjectRecord.topics.length === 0) {
          subjectStudyRecords = subjectStudyRecords.filter(
            (_, index) => index !== subjectRecordIndex
          );
        } else {
          subjectStudyRecords[subjectRecordIndex] = subjectRecord;
        }

        console.log("deleteStudyRecord çağrıldı:", {
          subject,
          topicName,
          recordIndex,
          subjectStudyRecords,
        });

        // Düz studySessions listesinden de aynı kaydı düş
        let updatedStudySessions = data.studySessions || [];
        if (deletedRec) {
          updatedStudySessions = updatedStudySessions.filter(s => {
            return !(
              s.subject === subject &&
              s.topic.trim().toLowerCase() === topicName.trim().toLowerCase() &&
              s.duration === deletedRec.duration &&
              s.date === deletedRec.date
            );
          });
        }

        updateFirestore({ subjectStudyRecords, studySessions: updatedStudySessions });
      }
    },
    [data, user]
  );

  // Konu tamamlama fonksiyonu
  const completeTopic = useCallback(
    (subject: Subject, topicName: string) => {
      if (!data) return;
      
      const completedTopics = data.completedTopics || [];
      
      // Bu konu zaten tamamlanmış mı kontrol et
      const isAlreadyCompleted = completedTopics.some(
        ct => ct.subject === subject && ct.topicName === topicName
      );
      
      if (isAlreadyCompleted) return;
      
      const newCompletedTopic: CompletedTopic = {
        subject,
        topicName,
        completedAt: new Date().toISOString(),
        completedBy: user?.uid
      };
      
      const updatedCompletedTopics = [...completedTopics, newCompletedTopic];
      
      updateFirestore({ completedTopics: updatedCompletedTopics });
    },
    [data, user]
  );

  // Konu tamamlanma durumunu kontrol etme fonksiyonu
  const isTopicCompleted = useCallback(
    (subject: Subject, topicName: string): boolean => {
      return data?.completedTopics?.some(
        ct => ct.subject === subject && ct.topicName === topicName
      ) || false;
    },
    [data]
  );

  const addPracticeExam = useCallback(
    (exam: Omit<PracticeExam, "id" | "date">) => {
      if (!data) return;
      const newExam = {
        ...exam,
        id: Date.now().toString(),
        date: new Date().toISOString(),
      };
      updateFirestore({
        practiceExams: [...data.practiceExams, newExam],
      });
    },
    [data, user]
  );

  const deletePracticeExam = useCallback(
    (examId: string) => {
      if (!data) return;
      const updatedExams = data.practiceExams.filter(
        (exam) => exam.id !== examId
      );
      updateFirestore({
        practiceExams: updatedExams,
      });
    },
    [data, user]
  );

  const updateWeeklyPlans = useCallback(
    (plans: DayPlan[]) => {
      if (!data) return;
      // Haftanın pazartesi başlangıcı (Pazar'ı aynı haftaya bağla)
      const d = new Date();
      const day = (d.getDay() + 6) % 7; // 0=Pazartesi
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - day);
      const weekStartString = d.toISOString().split("T")[0];

      const existingScheduleIndex = data.weeklySchedules.findIndex(
        (schedule) => schedule.weekStart === weekStartString
      );

      let updatedSchedules = [...data.weeklySchedules];
      if (existingScheduleIndex >= 0) {
        updatedSchedules[existingScheduleIndex] = {
          ...updatedSchedules[existingScheduleIndex],
          days: plans,
        };
      } else {
        const newSchedule = {
          id: Date.now().toString(),
          weekStart: weekStartString,
          days: plans,
        };
        updatedSchedules = [...data.weeklySchedules, newSchedule];
      }

      updateFirestore({ weeklySchedules: updatedSchedules });
    },
    [data, user]
  );

  // Mevcut haftanın planlarını al
  const getCurrentWeekPlans = useCallback((): DayPlan[] => {
    if (!data) return [];
    // Haftanın pazartesi başlangıcı (Pazar'ı aynı haftaya bağla)
    const d = new Date();
    const day = (d.getDay() + 6) % 7;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    const weekStartString = d.toISOString().split("T")[0];

    const currentSchedule = data.weeklySchedules.find(
      (schedule) => schedule.weekStart === weekStartString
    );

    if (currentSchedule) {
      return currentSchedule.days;
    }

    // Eğer bu hafta için plan yoksa boş planlar döndür
    const DAYS = [
      "Pazartesi",
      "Salı",
      "Çarşamba",
      "Perşembe",
      "Cuma",
      "Cumartesi",
      "Pazar",
    ];
    return DAYS.map((day) => ({ day, plans: [] }));
  }, [data]);

  // Hedef yönetimi fonksiyonları
  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'createdAt' | 'current'>) => {
    if (!data) return;
    const newGoal: Goal = {
      ...goal,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      current: 0
    };
    updateFirestore({
      goals: [...(data.goals || []), newGoal]
    });
  }, [data, user]);

  const updateGoal = useCallback((goalId: string, updates: Partial<Goal>) => {
    if (!data) return;
    const updatedGoals = (data.goals || []).map(goal =>
      goal.id === goalId ? { ...goal, ...updates } : goal
    );
    updateFirestore({ goals: updatedGoals });
  }, [data, user]);

  const deleteGoal = useCallback((goalId: string) => {
    if (!data) return;
    const updatedGoals = (data.goals || []).filter(goal => goal.id !== goalId);
    updateFirestore({ goals: updatedGoals });
  }, [data, user]);

  // Settings yönetimi
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    if (!data) return;
    const updatedSettings: UserSettings = {
      ...data.settings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
      aiEnabled: newSettings.aiEnabled ?? data.settings?.aiEnabled ?? false,
      createdAt: data.settings?.createdAt ?? new Date().toISOString()
    };
    const cleaned = cleanUndefinedDeep(updatedSettings);
    updateFirestore({ settings: cleaned });
  }, [data, user, cleanUndefinedDeep]);

  // AI kullanım kaydı güncelleme
  const updateAiUsage = useCallback((usageRecord: AiUsageRecord) => {
    if (!data || !data.settings) return;
    
    const currentHistory = data.settings.aiUsageHistory || [];
    const updatedHistory = [...currentHistory, usageRecord];
    
    // Son 24 saatlik kayıtları tut (performans için)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filteredHistory = updatedHistory.filter(record => 
      new Date(record.timestamp) > oneDayAgo
    );
    
    const updatedSettings: UserSettings = {
      ...data.settings,
      aiUsageHistory: filteredHistory,
      updatedAt: new Date().toISOString()
    };
    
    updateFirestore({ settings: updatedSettings });
  }, [data, user]);

  // --- Study Guide topic details (notes/videos) ---
  const upsertTopicProgress = useCallback((subject: Subject, topicId: string, updater: (tp: TopicProgress) => TopicProgress) => {
    if (!data) return;
    const sg: StudyGuideData = data.studyGuide || { topicProgress: [] };
    const idx = sg.topicProgress.findIndex(tp => tp.subjectId === subject && tp.topicId === topicId);
    const now = new Date().toISOString();
    let nextList = [...(sg.topicProgress || [])];
    if (idx === -1) {
      const base: TopicProgress = {
        topicId,
        subjectId: subject,
        status: 'in_progress',
        progressPercentage: 0,
        studyTime: 0,
        notes: [],
        videos: [],
        resources: [],
        createdAt: now,
        updatedAt: now
      };
      nextList.push(updater(base));
    } else {
      const updated = updater({ ...nextList[idx] });
      updated.updatedAt = now;
      nextList[idx] = updated;
    }
    updateFirestore({ studyGuide: { ...(data.studyGuide || {}), topicProgress: nextList } });
  }, [data, user]);

  const addTopicNote = useCallback((subject: Subject, topicId: string, content: string) => {
    const id = `${Date.now()}`;
    const now = new Date().toISOString();
    upsertTopicProgress(subject, topicId, (tp) => ({
      ...tp,
      notes: [...(tp.notes || []), { id, content, createdAt: now, updatedAt: now }]
    }));
  }, [upsertTopicProgress]);

  const updateTopicNote = useCallback((subject: Subject, topicId: string, noteId: string, content: string) => {
    const now = new Date().toISOString();
    upsertTopicProgress(subject, topicId, (tp) => ({
      ...tp,
      notes: (tp.notes || []).map(n => n.id === noteId ? { ...n, content, updatedAt: now } : n)
    }));
  }, [upsertTopicProgress]);

  const deleteTopicNote = useCallback((subject: Subject, topicId: string, noteId: string) => {
    upsertTopicProgress(subject, topicId, (tp) => ({
      ...tp,
      notes: (tp.notes || []).filter(n => n.id !== noteId)
    }));
  }, [upsertTopicProgress]);

  const addTopicVideo = useCallback((subject: Subject, topicId: string, title: string, url: string, platform: TopicVideo['platform']) => {
    const id = `${Date.now()}`;
    const now = new Date().toISOString();
    upsertTopicProgress(subject, topicId, (tp) => ({
      ...tp,
      videos: [...(tp.videos || []), { id, title, url, platform, watched: false, createdAt: now }]
    }));
  }, [upsertTopicProgress]);

  const toggleVideoWatched = useCallback((subject: Subject, topicId: string, videoId: string, watched: boolean) => {
    const now = new Date().toISOString();
    upsertTopicProgress(subject, topicId, (tp) => ({
      ...tp,
      videos: (tp.videos || []).map(v => v.id === videoId ? { ...v, watched, watchedAt: watched ? now : undefined } : v)
    }));
  }, [upsertTopicProgress]);

  // Spaced Repetition: tekrar planı oluşturma ve tamamlama
  const scheduleReview = useCallback((subject: Subject, topicId: string, days: number[]) => {
    const now = new Date();
    upsertTopicProgress(subject, topicId, (tp) => ({
      ...tp,
      reviewSchedule: [
        ...(tp.reviewSchedule || []),
        ...days.map(d => ({ date: new Date(now.getTime() + d * 86400000).toISOString(), done: false }))
      ]
    }));
  }, [upsertTopicProgress]);

  const markReviewDone = useCallback((subject: Subject, topicId: string, date: string) => {
    // İstenen davranış: "Tamamla" tıklandığında ilgili plan tamamen silinsin
    upsertTopicProgress(subject, topicId, (tp) => ({
      ...tp,
      reviewSchedule: (tp.reviewSchedule || []).filter(r => r.date !== date)
    }));
  }, [upsertTopicProgress]);

  const handleLogin = () => {
    // Login işlemi auth state change ile otomatik olarak handle edilecek
    console.log("Login callback çağrıldı");
  };

  const themeContextValue = useMemo(
    () => ({ theme, toggleTheme }),
    [theme, toggleTheme]
  );

  // Auth durumu henüz kontrol edilmediyse loading göster (flash önleme)
  if (!authChecked) {
    return (
      <ThemeContext.Provider value={themeContextValue}>
        <div className="flex justify-center items-center min-h-screen bg-light-bg dark:bg-dark-bg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-primary dark:border-dark-primary mx-auto mb-3"></div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Başlatılıyor...
            </div>
          </div>
        </div>
      </ThemeContext.Provider>
    );
  }

  // Auth kontrol edildi ama giriş yapılmamışsa login ekranını göster
  if (!isAuthenticated) {
    return (
      <ThemeContext.Provider value={themeContextValue}>
        <Login onLogin={handleLogin} />
      </ThemeContext.Provider>
    );
  }

  // Veriler yükleniyorsa loading ekranını göster
  if (isLoading || !data) {
    return (
      <ThemeContext.Provider value={themeContextValue}>
        <div className="flex justify-center items-center min-h-screen bg-light-bg dark:bg-dark-bg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-primary dark:border-dark-primary mx-auto mb-4"></div>
            <div className="text-xl font-semibold text-light-text dark:text-dark-text">
              Yükleniyor...
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Verileriniz hazırlanıyor
            </div>
          </div>
        </div>
      </ThemeContext.Provider>
    );
  }

  // Ana uygulama
  return (
    <ThemeContext.Provider value={themeContextValue}>
      <div className="min-h-screen text-light-text dark:text-dark-text font-sans">
        <Header
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          user={user}
        />
        <main className="p-4 md:p-8">
          <ErrorBoundary>
            <Suspense fallback={
              <div className="space-y-6">
                <CardSkeleton />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              </div>
            }>
              {currentPage === "dashboard" && (
                <Dashboard
                  data={data}
                  weeklyPlans={getCurrentWeekPlans()}
                  onUpdateWeeklyPlans={updateWeeklyPlans}
                  addStudySession={addStudySession}
                  addPracticeExam={addPracticeExam}
                  deletePracticeExam={deletePracticeExam}
                  deleteStudyRecord={deleteStudyRecord}
                  addGoal={addGoal}
                  updateGoal={updateGoal}
                  deleteGoal={deleteGoal}
                  updateAiUsage={updateAiUsage}
                  markReviewDone={markReviewDone}
                />
              )}
              {currentPage === "planner" && (
                <WeeklyPlanner
                  weeklyPlans={getCurrentWeekPlans()}
                  onUpdateWeeklyPlans={updateWeeklyPlans}
                />
              )}
              {currentPage === "community" && <Community user={user} />}
              {currentPage === "leaderboard" && <Leaderboard user={user} />}
              {currentPage === "settings" && (
                <Settings
                  settings={data.settings}
                  updateSettings={updateSettings}
                />
              )}
              {currentPage === "chatbot" && (
                <Chatbot
                  data={data}
                  updateAiUsage={updateAiUsage}
                />
              )}
              {currentPage === "study-guide" && (
                <StudyGuide
                  data={data}
                  completeTopic={completeTopic}
                  isTopicCompleted={isTopicCompleted}
                  addTopicNote={addTopicNote}
                  updateTopicNote={updateTopicNote}
                  deleteTopicNote={deleteTopicNote}
                  addTopicVideo={addTopicVideo}
                  toggleVideoWatched={toggleVideoWatched}
                  scheduleReview={scheduleReview}
                  logPomodoroStudy={logPomodoroStudy}
                />
              )}
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* PWA Install Prompt */}
        <PWAInstall />

        {/* Offline Indicator */}
        <OfflineIndicator />
      </div>
    </ThemeContext.Provider>
  );
};

export default App;
