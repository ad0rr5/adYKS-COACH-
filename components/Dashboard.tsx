import React, { memo, useMemo } from "react";
import { AppData, PracticeExam, StudySession, Subject, Goal } from "../types";
import StudyLogger from "./StudyLogger";
import ExamAnalyzer from "./ExamAnalyzer";
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import AiCoach from "./AiCoach";
import DailyPlan from "./DailyPlan";
import Goals from "./Goals";
import SpacedReview from "./SpacedReview";
import PomodoroTimer from "./PomodoroTimer";

interface DashboardProps {
  data: AppData;
  weeklyPlans: any[];
  onUpdateWeeklyPlans: (plans: any[]) => void;
  addStudySession: (session: Omit<StudySession, "id" | "date">) => void;
  addPracticeExam: (exam: Omit<PracticeExam, "id" | "date">) => void;
  deletePracticeExam: (examId: string) => void;
  deleteStudyRecord: (
    subject: Subject,
    topicName: string,
    recordIndex: number
  ) => void;
  addGoal: (goal: Omit<Goal, "id" | "createdAt" | "current">) => void;
  updateGoal: (goalId: string, updates: Partial<Goal>) => void;
  deleteGoal: (goalId: string) => void;
  updateAiUsage: (record: any) => void;
  markReviewDone: (subject: Subject, topicId: string, date: string) => void;
}

const Dashboard: React.FC<DashboardProps> = memo(
  ({
    data,
    weeklyPlans,
    onUpdateWeeklyPlans,
    addStudySession,
    addPracticeExam,
    deletePracticeExam,
    addGoal,
  updateGoal,
    deleteGoal,
    updateAiUsage,
    markReviewDone,
  }) => {
    // Memoize expensive calculations
    const memoizedData = useMemo(() => data, [data]);

    return (
      <div className="space-y-6">
        {/* Üst Satır - Hedefler */}
        <div className="grid grid-cols-1 gap-6 min-h-[400px] lg:h-[400px]">
          <div className="h-full min-h-[350px] lg:min-h-0">
            <Goals
              data={memoizedData}
              addGoal={addGoal}
              updateGoal={updateGoal}
              deleteGoal={deleteGoal}
            />
          </div>
        </div>

        {/* Orta Satır - Deneme Analizi ve AI Koç */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px] lg:h-[500px]">
          <div className="lg:col-span-2 h-full min-h-[400px] lg:min-h-0">
            <ExamAnalyzer
              practiceExams={memoizedData.practiceExams}
              addPracticeExam={addPracticeExam}
              deletePracticeExam={deletePracticeExam}
            />
          </div>
          <div className="lg:col-span-1 h-full min-h-[400px] lg:min-h-0">
            <AiCoach data={memoizedData} updateAiUsage={updateAiUsage} />
          </div>
        </div>

        {/* Alt Satır - Günlük Plan ve Çalışma Kaydı */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px] lg:h-[500px]">
          <div className="h-full min-h-[400px] lg:min-h-0">
            <DailyPlan
              weeklyPlans={weeklyPlans}
              onUpdateWeeklyPlans={onUpdateWeeklyPlans}
            />
          </div>
          <div className="h-full min-h-[400px] lg:min-h-0">
            <StudyLogger
              addStudySession={addStudySession}
              subjectStudyRecords={memoizedData.subjectStudyRecords}
            />
          </div>
          <div className="h-full min-h-[400px] lg:min-h-0 flex flex-col space-y-4">
            <PomodoroTimer
              onSessionComplete={(_mins) => {
                // Varsayılan olarak “Genel” konuya yazmak yerine StudyLogger ile koordinasyon sağlanabilir.
                // Burada loglamayı kullanıcı yönlendirmesiyle yapmak daha sağlıklı.
              }}
            />
            <SpacedReview
              data={data}
              markReviewDone={markReviewDone}
            />
            {/* Son 7 gün çalışma grafiği */}
            <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border">
              <h3 className="font-semibold text-sm mb-3">Son 7 Gün Çalışma</h3>
              {(() => {
                const now = new Date();
                const days: { label: string; minutes: number }[] = [];
                for (let i = 6; i >= 0; i--) {
                  const d = new Date(now);
                  d.setHours(0,0,0,0);
                  d.setDate(d.getDate() - i);
                  const label = d.toLocaleDateString('tr-TR', { weekday: 'short' });
                  let minutes = 0;
                  (memoizedData.subjectStudyRecords || []).forEach(s => {
                    s.topics.forEach(t => {
                      t.records.forEach(r => {
                        const rd = new Date(r.date);
                        const rday = new Date(rd.getFullYear(), rd.getMonth(), rd.getDate());
                        if (rday.getTime() === d.getTime()) minutes += r.duration || 0;
                      })
                    })
                  });
                  days.push({ label, minutes });
                }
                return (
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={days} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
                        <Line type="monotone" dataKey="minutes" stroke="#6366f1" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default Dashboard;
