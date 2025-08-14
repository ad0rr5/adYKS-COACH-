import React, { useState, useRef } from "react";
import { WeeklyPlan, DayPlan, Subject } from "../types";
import { ALL_SUBJECTS } from "../constants";
import Card from "./common/Card";
import Button from "./common/Button";
import Modal from "./common/Modal";
import { Plus, Clock, GripVertical, Trash2, X } from "lucide-react";

interface WeeklyPlannerProps {
  weeklyPlans: DayPlan[];
  onUpdateWeeklyPlans: (plans: DayPlan[]) => void;
}

const DAYS = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

const PLAN_COLORS = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#EAB308",
  "#84CC16",
  "#22C55E",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#0EA5E9",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#D946EF",
  "#EC4899",
];

// 30 dakika aralıklarla saat seçenekleri oluştur (06:00 - 23:30)
const generateTimeOptions = (): string[] => {
  const times: string[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
      times.push(timeString);
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

const WeeklyPlanner: React.FC<WeeklyPlannerProps> = ({
  weeklyPlans,
  onUpdateWeeklyPlans,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [dayToClear, setDayToClear] = useState<string>("");
  const [planToDelete, setPlanToDelete] = useState<{
    day: string;
    planId: string;
    planTitle: string;
  } | null>(null);
  const [draggedPlan, setDraggedPlan] = useState<WeeklyPlan | null>(null);
  const [draggedFromDay, setDraggedFromDay] = useState<string>("");

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState<Subject>(Subject.TYT_MATEMATIK);
  const [duration, setDuration] = useState("");
  const [startTime, setStartTime] = useState("");

  const dragCounter = useRef(0);

  const openModal = (day: string) => {
    setSelectedDay(day);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTitle("");
    setDescription("");
    setDuration("");
    setStartTime("");
    setSelectedDay("");
  };

  const addPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !duration || !startTime || !selectedDay) return;

    const newPlan: WeeklyPlan = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      subject,
      duration: parseInt(duration),
      startTime,
      color: PLAN_COLORS[Math.floor(Math.random() * PLAN_COLORS.length)],
    };

    const updatedPlans = weeklyPlans.map((dayPlan: DayPlan) => {
      if (dayPlan.day === selectedDay) {
        return {
          ...dayPlan,
          plans: [...dayPlan.plans, newPlan],
        };
      }
      return dayPlan;
    });

    onUpdateWeeklyPlans(updatedPlans);
    closeModal();
  };

  const openDeleteModal = (
    dayName: string,
    planId: string,
    planTitle: string
  ) => {
    setPlanToDelete({ day: dayName, planId, planTitle });
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setPlanToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const confirmDelete = () => {
    if (!planToDelete) return;

    const updatedPlans = weeklyPlans.map((dayPlan: DayPlan) => {
      if (dayPlan.day === planToDelete.day) {
        return {
          ...dayPlan,
          plans: dayPlan.plans.filter(
            (plan: WeeklyPlan) => plan.id !== planToDelete.planId
          ),
        };
      }
      return dayPlan;
    });
    onUpdateWeeklyPlans(updatedPlans);
    closeDeleteModal();
  };

  const openClearAllModal = (dayName: string) => {
    setDayToClear(dayName);
    setIsClearAllModalOpen(true);
  };

  const closeClearAllModal = () => {
    setDayToClear("");
    setIsClearAllModalOpen(false);
  };

  const confirmClearAll = () => {
    if (!dayToClear) return;

    const updatedPlans = weeklyPlans.map((dayPlan: DayPlan) => {
      if (dayPlan.day === dayToClear) {
        return {
          ...dayPlan,
          plans: [],
        };
      }
      return dayPlan;
    });
    onUpdateWeeklyPlans(updatedPlans);
    closeClearAllModal();
  };

  // Drag and Drop handlers
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    plan: WeeklyPlan,
    fromDay: string
  ) => {
    setDraggedPlan(plan);
    setDraggedFromDay(fromDay);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current++;
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current--;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, toDay: string) => {
    e.preventDefault();
    dragCounter.current = 0;

    if (!draggedPlan || !draggedFromDay || draggedFromDay === toDay) {
      setDraggedPlan(null);
      setDraggedFromDay("");
      return;
    }

    // Copy plan to target day (don't remove from source)
    const copiedPlan = {
      ...draggedPlan,
      id: Date.now().toString(), // Yeni ID ver
    };

    const updatedPlans = weeklyPlans.map((dayPlan: DayPlan) => {
      if (dayPlan.day === toDay) {
        return {
          ...dayPlan,
          plans: [...dayPlan.plans, copiedPlan],
        };
      }
      return dayPlan;
    });

    onUpdateWeeklyPlans(updatedPlans);
    setDraggedPlan(null);
    setDraggedFromDay("");
  };

  const getDayPlan = (day: string): DayPlan => {
    return (
      weeklyPlans.find((dp: DayPlan) => dp.day === day) || { day, plans: [] }
    );
  };

  const getTotalDuration = (plans: WeeklyPlan[]): number => {
    return plans.reduce((total, plan) => total + plan.duration, 0);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-2">
          Haftalık Çalışma Planı
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Her güne plan ekleyin ve sürükleyerek diğer günlere taşıyın
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7 gap-4">
        {DAYS.map((day) => {
          const dayPlan = getDayPlan(day);
          const totalDuration = getTotalDuration(dayPlan.plans);

          return (
            <Card
              key={day}
              title={day}
              fullHeight
              action={
                dayPlan.plans.length > 0 && (
                  <button
                    onClick={() => openClearAllModal(day)}
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 px-2 py-1 rounded transition-colors flex items-center"
                    title="Tüm planları sil"
                  >
                    <X size={12} className="mr-1" />
                    Tümünü Sil
                  </button>
                )
              }
            >
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <Clock size={14} className="mr-1" />
                    {totalDuration} dk
                  </span>
                  <Button
                    onClick={() => openModal(day)}
                    variant="secondary"
                    className="text-xs px-2 py-1"
                  >
                    <Plus size={14} className="mr-1" />
                    Ekle
                  </Button>
                </div>

                <div
                  className="flex-grow min-h-[200px] space-y-2 p-2 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg transition-all duration-200 hover:border-light-primary dark:hover:border-dark-primary hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day)}
                >
                  {dayPlan.plans
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((plan) => (
                      <div
                        key={plan.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, plan, day)}
                        className="p-3 rounded-lg shadow-sm cursor-move hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{
                          backgroundColor: plan.color + "20",
                          borderLeft: `4px solid ${plan.color}`,
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-grow">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                                {plan.title}
                              </h4>
                              <span className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded">
                                {plan.startTime}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {plan.subject}
                            </p>
                            {plan.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {plan.description}
                              </p>
                            )}
                            <div className="flex items-center mt-2 text-xs text-gray-500">
                              <Clock size={12} className="mr-1" />
                              {plan.duration} dk
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <GripVertical size={16} className="text-gray-400" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteModal(day, plan.id, plan.title);
                              }}
                              className="p-1 rounded-full text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              title="Planı Sil"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                  {dayPlan.plans.length === 0 && (
                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                      Plan eklemek için + butonuna tıklayın
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`${selectedDay} - Yeni Plan`}
      >
        <form onSubmit={addPlan} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Plan Başlığı
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Matematik Türev Çalışması"
              className="w-full p-2 border rounded-md bg-light-card dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-light-primary focus:border-light-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium mb-1">
              Ders
            </label>
            <select
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value as Subject)}
              className="w-full p-2 border rounded-md bg-light-card dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-light-primary focus:border-light-primary"
            >
              {ALL_SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="startTime"
                className="block text-sm font-medium mb-1"
              >
                Başlangıç Saati
              </label>
              <select
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2 border rounded-md bg-light-card dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-light-primary focus:border-light-primary"
                required
              >
                <option value="">Saat seçin</option>
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="duration"
                className="block text-sm font-medium mb-1"
              >
                Süre (dakika)
              </label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full p-2 border rounded-md bg-light-card dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-light-primary focus:border-light-primary"
                required
              >
                <option value="">Süre seçin</option>
                <option value="30">30 dakika</option>
                <option value="45">45 dakika</option>
                <option value="60">1 saat</option>
                <option value="90">1.5 saat</option>
                <option value="120">2 saat</option>
                <option value="150">2.5 saat</option>
                <option value="180">3 saat</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium mb-1"
            >
              Açıklama (Opsiyonel)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Plan detayları..."
              rows={3}
              className="w-full p-2 border rounded-md bg-light-card dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-light-primary focus:border-light-primary"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal}>
              İptal
            </Button>
            <Button type="submit">Plan Ekle</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title="Planı Sil"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            <strong>"{planToDelete?.planTitle}"</strong> planını silmek
            istediğinizden emin misiniz?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Bu işlem geri alınamaz.
          </p>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={closeDeleteModal}
            >
              İptal
            </Button>
            <Button
              type="button"
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash2 size={16} className="mr-2" />
              Sil
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear All Plans Modal */}
      <Modal
        isOpen={isClearAllModalOpen}
        onClose={closeClearAllModal}
        title="Tüm Planları Sil"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            <strong>{dayToClear}</strong> gününün tüm planlarını silmek
            istediğinizden emin misiniz?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Bu işlem geri alınamaz ve günün tüm planları silinecektir.
          </p>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={closeClearAllModal}
            >
              İptal
            </Button>
            <Button
              type="button"
              onClick={confirmClearAll}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <X size={16} className="mr-2" />
              Tümünü Sil
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WeeklyPlanner;
