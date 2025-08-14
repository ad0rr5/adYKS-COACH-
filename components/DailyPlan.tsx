import React, { useState, useEffect, useRef } from "react";
import { DayPlan, WeeklyPlan } from "../types";
import Card from "./common/Card";
import Button from "./common/Button";
import {
  Calendar,
  Clock,
  BookOpen,
  Play,
  Pause,
  Square,
  CheckCircle,
} from "lucide-react";

interface DailyPlanProps {
  weeklyPlans: DayPlan[];
  onUpdateWeeklyPlans: (plans: DayPlan[]) => void;
}

interface TimerState {
  planId: string;
  isRunning: boolean;
  isPaused: boolean;
  timeLeft: number; // saniye cinsinden
  originalDuration: number; // saniye cinsinden
  isCompleted: boolean;
}

const DailyPlan: React.FC<DailyPlanProps> = ({
  weeklyPlans,
  onUpdateWeeklyPlans,
}) => {
  // Bugünün gününü al (Türkçe)
  const today = new Date();
  const dayNames = [
    "Pazar",
    "Pazartesi",
    "Salı",
    "Çarşamba",
    "Perşembe",
    "Cuma",
    "Cumartesi",
  ];
  const todayName = dayNames[today.getDay()];

  // Bugünün planını bul
  const todayPlan = weeklyPlans.find((plan) => plan.day === todayName);
  const todayPlans = todayPlan?.plans || [];

  // Plan istatistikleri
  const totalPlans = todayPlans.length;
  const completedPlans = todayPlans.filter((plan) => plan.isCompleted).length;
  const completionPercentage =
    totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0;

  // Toplam süreyi hesapla
  const totalDuration = todayPlans.reduce(
    (total, plan) => total + plan.duration,
    0
  );

  // Saat ve dakikaya çevir
  const hours = Math.floor(totalDuration / 60);
  const minutes = totalDuration % 60;

  // Timer states
  const [timers, setTimers] = useState<Record<string, TimerState>>({});
  const intervalRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Ses dosyası oluştur
  useEffect(() => {
    // Basit bir beep sesi oluştur
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const createBeepSound = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 1
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
    };

    audioRef.current = { play: createBeepSound } as HTMLAudioElement;
  }, []);

  // Zamanlayıcı başlat
  const startTimer = (plan: WeeklyPlan) => {
    const durationInSeconds = plan.duration * 60;

    setTimers((prev) => ({
      ...prev,
      [plan.id]: {
        planId: plan.id,
        isRunning: true,
        isPaused: false,
        timeLeft: durationInSeconds,
        originalDuration: durationInSeconds,
        isCompleted: false,
      },
    }));

    intervalRefs.current[plan.id] = setInterval(() => {
      setTimers((prev) => {
        const timer = prev[plan.id];
        if (!timer || timer.isPaused) return prev;

        const newTimeLeft = timer.timeLeft - 1;

        if (newTimeLeft <= 0) {
          // Süre bitti
          clearInterval(intervalRefs.current[plan.id]);
          delete intervalRefs.current[plan.id];

          // Ses çal
          if (audioRef.current) {
            audioRef.current.play();
          }

          // Bildirim gönder
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("Çalışma Süresi Tamamlandı!", {
              body: `${plan.title} planınız tamamlandı. Tebrikler!`,
              icon: "/favicon.ico",
            });
          }

          return {
            ...prev,
            [plan.id]: {
              ...timer,
              timeLeft: 0,
              isRunning: false,
              isCompleted: true,
            },
          };
        }

        return {
          ...prev,
          [plan.id]: {
            ...timer,
            timeLeft: newTimeLeft,
          },
        };
      });
    }, 1000);
  };

  // Zamanlayıcı duraklat/devam ettir
  const togglePause = (planId: string) => {
    setTimers((prev) => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        isPaused: !prev[planId].isPaused,
      },
    }));
  };

  // Zamanlayıcı durdur
  const stopTimer = (planId: string) => {
    if (intervalRefs.current[planId]) {
      clearInterval(intervalRefs.current[planId]);
      delete intervalRefs.current[planId];
    }

    setTimers((prev) => {
      const newTimers = { ...prev };
      delete newTimers[planId];
      return newTimers;
    });
  };

  // Bildirim izni iste
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Component unmount olduğunda tüm interval'ları temizle
  useEffect(() => {
    return () => {
      Object.values(intervalRefs.current).forEach((interval) => {
        clearInterval(interval);
      });
    };
  }, []);

  // Zamanı formatla (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Progress yüzdesi hesapla
  const getProgress = (timer: TimerState) => {
    return (
      ((timer.originalDuration - timer.timeLeft) / timer.originalDuration) * 100
    );
  };

  // Plan tamamla
  const completePlan = (planId: string) => {
    const updatedPlans = weeklyPlans.map((dayPlan) => ({
      ...dayPlan,
      plans: dayPlan.plans.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              isCompleted: true,
              completedAt: new Date().toISOString(),
            }
          : plan
      ),
    }));

    onUpdateWeeklyPlans(updatedPlans);

    // Timer'ı da temizle
    stopTimer(planId);
  };

  // Otomatik temizlik - 1 gün geçmiş tamamlanmış planları sil
  useEffect(() => {
    const cleanupOldPlans = () => {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      let hasChanges = false;
      const cleanedPlans = weeklyPlans.map((dayPlan) => {
        const filteredPlans = dayPlan.plans.filter((plan) => {
          if (plan.isCompleted && plan.completedAt) {
            const completedDate = new Date(plan.completedAt);
            const shouldDelete = completedDate < oneDayAgo;
            if (shouldDelete) hasChanges = true;
            return !shouldDelete;
          }
          return true;
        });

        return {
          ...dayPlan,
          plans: filteredPlans,
        };
      });

      if (hasChanges) {
        onUpdateWeeklyPlans(cleanedPlans);
      }
    };

    // Sayfa yüklendiğinde ve her 1 saatte bir temizlik yap
    cleanupOldPlans();
    const cleanupInterval = setInterval(cleanupOldPlans, 60 * 60 * 1000); // 1 saat

    return () => clearInterval(cleanupInterval);
  }, [weeklyPlans, onUpdateWeeklyPlans]);

  return (
    <Card title="Bugünün Planı" fullHeight>
      <div className="flex flex-col h-full">
        <div className="space-y-3 mb-4">
          {/* Gün ve Süre Bilgisi */}
          <div className="flex items-center justify-between p-3 bg-light-primary/10 dark:bg-dark-primary/10 rounded-lg">
            <div className="flex items-center">
              <Calendar
                size={20}
                className="text-light-primary dark:text-dark-primary mr-2"
              />
              <span className="font-semibold text-light-text dark:text-dark-text">
                {todayName}
              </span>
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <Clock size={16} className="mr-1" />
              {hours > 0 && `${hours}s `}
              {minutes}dk
            </div>
          </div>

          {/* Plan İstatistikleri */}
          {totalPlans > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Plan İlerlemesi
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {completedPlans}/{totalPlans}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      completionPercentage === 100
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : completionPercentage >= 50
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    %{completionPercentage}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    completionPercentage === 100
                      ? "bg-gradient-to-r from-green-400 to-green-600"
                      : completionPercentage >= 50
                      ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                      : "bg-gradient-to-r from-blue-400 to-purple-500"
                  }`}
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>

              {/* Motivasyon Mesajı */}
              <div className="mt-2 text-center">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {completionPercentage === 100
                    ? "🎉 Tüm planlar tamamlandı! Harika iş!"
                    : completionPercentage >= 75
                    ? "🔥 Neredeyse bitti! Devam et!"
                    : completionPercentage >= 50
                    ? "💪 Yarı yoldasın! Güzel gidiyor!"
                    : completionPercentage > 0
                    ? "🚀 Başlangıç yapıldı! Devam et!"
                    : "📝 Planlarını tamamlamaya başla!"}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-grow">
          {todayPlans.length > 0 ? (
            <div className="space-y-3">
              {todayPlans
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-3 rounded-lg shadow-sm border-l-4 transition-all duration-200 hover:shadow-md ${
                      plan.isCompleted
                        ? "opacity-60 bg-green-50 dark:bg-green-900/20"
                        : ""
                    }`}
                    style={{
                      backgroundColor: plan.isCompleted
                        ? "#10B981" + "15"
                        : plan.color + "15",
                      borderLeftColor: plan.isCompleted
                        ? "#10B981"
                        : plan.color,
                    }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-grow">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <h4
                                className={`font-semibold text-sm ${
                                  plan.isCompleted
                                    ? "line-through text-gray-500 dark:text-gray-400"
                                    : "text-gray-800 dark:text-gray-200"
                                }`}
                              >
                                {plan.title}
                              </h4>
                              {plan.isCompleted && (
                                <CheckCircle
                                  size={16}
                                  className="text-green-500"
                                />
                              )}
                            </div>
                            <span className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded">
                              {plan.startTime}
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mb-2">
                            <BookOpen size={12} className="mr-1" />
                            {plan.subject}
                          </div>
                          {plan.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                              {plan.description}
                            </p>
                          )}
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock size={12} className="mr-1" />
                            {plan.duration} dakika
                          </div>
                        </div>
                      </div>

                      {/* Timer Section */}
                      {plan.isCompleted ? (
                        <div className="flex justify-center">
                          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                            <CheckCircle size={16} />
                            <span className="text-sm font-medium">
                              Plan Tamamlandı
                            </span>
                          </div>
                        </div>
                      ) : timers[plan.id] ? (
                        <div className="space-y-2">
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
                              style={{
                                width: `${getProgress(timers[plan.id])}%`,
                              }}
                            ></div>
                          </div>

                          {/* Timer Display */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-lg font-mono font-bold ${
                                  timers[plan.id].timeLeft <= 60
                                    ? "text-red-500"
                                    : "text-blue-600 dark:text-blue-400"
                                }`}
                              >
                                {formatTime(timers[plan.id].timeLeft)}
                              </span>
                              {timers[plan.id].isCompleted && (
                                <CheckCircle
                                  size={20}
                                  className="text-green-500"
                                />
                              )}
                            </div>

                            {/* Timer Controls */}
                            <div className="flex items-center space-x-1">
                              {!timers[plan.id].isCompleted && (
                                <>
                                  <Button
                                    onClick={() => togglePause(plan.id)}
                                    variant="secondary"
                                    className="text-xs px-2 py-1"
                                  >
                                    {timers[plan.id].isPaused ? (
                                      <Play size={12} />
                                    ) : (
                                      <Pause size={12} />
                                    )}
                                  </Button>
                                  <Button
                                    onClick={() => completePlan(plan.id)}
                                    variant="secondary"
                                    className="text-xs px-2 py-1 text-green-600 hover:text-green-700"
                                  >
                                    <CheckCircle size={12} />
                                  </Button>
                                  <Button
                                    onClick={() => stopTimer(plan.id)}
                                    variant="secondary"
                                    className="text-xs px-2 py-1 text-red-500 hover:text-red-700"
                                  >
                                    <Square size={12} />
                                  </Button>
                                </>
                              )}
                              {timers[plan.id].isCompleted && (
                                <Button
                                  onClick={() => completePlan(plan.id)}
                                  variant="secondary"
                                  className="text-xs px-2 py-1 text-green-600"
                                >
                                  <CheckCircle size={12} className="mr-1" />
                                  Tamamla
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <Button
                            onClick={() => completePlan(plan.id)}
                            variant="secondary"
                            className="text-xs px-3 py-1 text-green-600 hover:text-green-700"
                          >
                            <CheckCircle size={12} className="mr-1" />
                            Tamamla
                          </Button>
                          <Button
                            onClick={() => startTimer(plan)}
                            variant="primary"
                            className="text-xs px-3 py-1"
                          >
                            <Play size={12} className="mr-1" />
                            Başla
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Calendar
                size={48}
                className="text-gray-300 dark:text-gray-600 mb-3"
              />
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                Bugün için henüz plan yok
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Planlama sekmesinden bugün için plan ekleyebilirsin
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default DailyPlan;
