import React, { useState, useMemo, useCallback } from 'react';
import { Goal, GoalType, AppData } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Modal from './common/Modal';
import { Target, Plus, Calendar, TrendingUp, Zap, CheckCircle, X, Clock } from 'lucide-react';

interface GoalsProps {
  data: AppData;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'current'>) => void;
  updateGoal: (goalId: string, updates: Partial<Goal>) => void;
  deleteGoal: (goalId: string) => void;
}

const Goals: React.FC<GoalsProps> = ({ data, addGoal, deleteGoal }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goalType, setGoalType] = useState<GoalType>('daily_study');
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');

  const goals = useMemo(() => data.goals || [], [data.goals]);

  // Memoized goal progress calculation
  const calculateGoalProgress = useCallback((goal: Goal) => {
    let current = 0;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (goal.type) {
      case 'daily_study':
        // Bugünkü çalışma süresi
        if (data.subjectStudyRecords) {
          current = data.subjectStudyRecords.reduce((total, subject) => {
            return total + subject.topics.reduce((subjectTotal, topic) => {
              return subjectTotal + topic.records
                .filter(record => {
                  const recordDate = new Date(record.date);
                  const recordDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
                  return recordDay.getTime() === today.getTime();
                })
                .reduce((topicTotal, record) => topicTotal + record.duration, 0);
            }, 0);
          }, 0);
        }
        break;
        
      case 'weekly_study':
        // Bu haftaki toplam çalışma süresi
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + 1); // Pazartesi
        
        if (data.subjectStudyRecords) {
          current = data.subjectStudyRecords.reduce((total, subject) => {
            return total + subject.topics.reduce((subjectTotal, topic) => {
              return subjectTotal + topic.records
                .filter(record => {
                  const recordDate = new Date(record.date);
                  return recordDate >= weekStart && recordDate <= now;
                })
                .reduce((topicTotal, record) => topicTotal + record.duration, 0);
            }, 0);
          }, 0);
        }
        break;
        
      case 'weekly_exam':
        // Bu haftaki deneme sayısı
        const weekStartExam = new Date(today);
        weekStartExam.setDate(today.getDate() - today.getDay() + 1);
        
        current = data.practiceExams.filter(exam => {
          const examDate = new Date(exam.date);
          return examDate >= weekStartExam && examDate <= now;
        }).length;
        break;
        
      case 'subject_net':
        // Belirli derste en yüksek net
        if (goal.subject) {
          const subjectExams = data.practiceExams.filter(exam => 
            exam.subjects?.some(s => s.subject === goal.subject)
          );
          if (subjectExams.length > 0) {
            current = Math.max(...subjectExams.map(exam => {
              const subjectResult = exam.subjects?.find(s => s.subject === goal.subject);
              return subjectResult?.net || 0;
            }));
          }
        }
        break;
        
      case 'streak':
        // Çalışma serisi hesaplama
        if (data.subjectStudyRecords && data.subjectStudyRecords.length > 0) {
          let streak = 0;
          let checkDate = new Date(today);
          
          for (let i = 0; i < 30; i++) { // Son 30 günü kontrol et
            const hasStudyOnDate = data.subjectStudyRecords.some(subject =>
              subject.topics.some(topic =>
                topic.records.some(record => {
                  const recordDate = new Date(record.date);
                  const recordDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
                  return recordDay.getTime() === checkDate.getTime();
                })
              )
            );
            
            if (hasStudyOnDate) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
          current = streak;
        }
        break;
        
      default:
        current = 0;
        break;
    }
    
    return {
      ...goal,
      current,
      progress: Math.min((current / goal.target) * 100, 100),
      isCompleted: current >= goal.target
    };
  }, [data.subjectStudyRecords, data.practiceExams]);

  // Hedef tipine göre bilgileri al
  const getGoalTypeInfo = (type: GoalType) => {
    switch (type) {
      case 'daily_study':
        return { icon: Clock, color: 'text-blue-500', unit: 'dakika', title: 'Günlük Çalışma' };
      case 'weekly_study':
        return { icon: Calendar, color: 'text-green-500', unit: 'dakika', title: 'Haftalık Çalışma' };
      case 'weekly_exam':
        return { icon: TrendingUp, color: 'text-purple-500', unit: 'adet', title: 'Haftalık Deneme' };
      case 'subject_net':
        return { icon: Target, color: 'text-orange-500', unit: 'net', title: 'Ders Net Hedefi' };
      case 'streak':
        return { icon: Zap, color: 'text-yellow-500', unit: 'gün', title: 'Çalışma Serisi' };
      default:
        return { icon: Target, color: 'text-gray-500', unit: 'adet', title: 'Hedef' };
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !target) return;

    const info = getGoalTypeInfo(goalType);
    const newGoal: Omit<Goal, 'id' | 'createdAt' | 'current'> = {
      type: goalType,
      title: title.trim(),
      description: `${info.title} hedefi`,
      target: parseInt(target),
      unit: info.unit,
      isActive: true
    };

    addGoal(newGoal);
    setTitle('');
    setTarget('');
    setIsModalOpen(false);
  };

  return (
    <Card title="Hedeflerim" fullHeight>
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Motivasyonunu artırmak için hedefler belirle
          </p>
          <Button onClick={() => setIsModalOpen(true)} variant="secondary">
            <Plus size={16} className="mr-2" />
            Hedef Ekle
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {goals.length > 0 ? (
            goals.map((goal) => {
              const info = getGoalTypeInfo(goal.type);
              const Icon = info.icon;
              const goalWithProgress = calculateGoalProgress(goal);
              const progress = goalWithProgress.progress;
              
              return (
                <div key={goal.id} className={`p-4 rounded-lg border-l-4 ${
                  goalWithProgress.isCompleted 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                    : 'bg-gray-50 dark:bg-gray-800/50 border-blue-500'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Icon size={20} className={goalWithProgress.isCompleted ? 'text-green-500' : info.color} />
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                          {goal.title}
                          {goalWithProgress.isCompleted && (
                            <CheckCircle size={16} className="text-green-500 ml-2" />
                          )}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {goal.description}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="p-1 rounded-full text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Hedefi Sil"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {goalWithProgress.current} / {goal.target} {goal.unit}
                      </span>
                      <span className={`font-bold ${
                        goalWithProgress.isCompleted ? 'text-green-600' : 'text-gray-800 dark:text-gray-200'
                      }`}>
                        %{Math.round(progress)}
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          goalWithProgress.isCompleted
                            ? 'bg-gradient-to-r from-green-400 to-green-600'
                            : 'bg-gradient-to-r from-blue-400 to-purple-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Target size={48} className="text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                Henüz hedef belirlenmemiş
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                Motivasyonunu artırmak için hedefler belirle
              </p>
              <Button onClick={() => setIsModalOpen(true)} variant="secondary">
                <Plus size={16} className="mr-2" />
                İlk Hedefini Ekle
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Hedef Ekleme Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Yeni Hedef Ekle"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="goalType" className="block text-sm font-medium mb-1">
              Hedef Türü
            </label>
            <select
              id="goalType"
              value={goalType}
              onChange={(e) => setGoalType(e.target.value as GoalType)}
              className="w-full p-2 border rounded-md bg-light-card dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-light-primary focus:border-light-primary"
            >
              <option value="daily_study">Günlük Çalışma</option>
              <option value="weekly_study">Haftalık Çalışma</option>
              <option value="weekly_exam">Haftalık Deneme</option>
              <option value="subject_net">Ders Net Hedefi</option>
              <option value="streak">Çalışma Serisi</option>
            </select>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Hedef Başlığı
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Günde 4 saat çalışma"
              className="w-full p-2 border rounded-md bg-light-card dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-light-primary focus:border-light-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="target" className="block text-sm font-medium mb-1">
              Hedef ({getGoalTypeInfo(goalType).unit})
            </label>
            <input
              id="target"
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              min="1"
              placeholder="Örn: 240"
              className="w-full p-2 border rounded-md bg-light-card dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-light-primary focus:border-light-primary"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              İptal
            </Button>
            <Button type="submit">
              <Target size={16} className="mr-2" />
              Hedef Ekle
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};

export default Goals;