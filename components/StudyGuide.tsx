import React, { useMemo, useState, useCallback } from 'react';
import { Subject, AppData, TopicVideo } from '../types';
import { SUBJECT_TOPICS, SUBJECT_CATEGORIES } from '../constants';
import Card from './common/Card';
import Button from './common/Button';
import Modal from './common/Modal';
import { 
  BookOpen, 
  Clock, 
  ChevronDown,
  ChevronRight,
  CheckCircle
} from 'lucide-react';

interface StudyGuideProps {
  data: AppData;
  completeTopic: (subject: Subject, topicName: string) => void;
  isTopicCompleted: (subject: Subject, topicName: string) => boolean;
  addTopicNote: (subject: Subject, topicId: string, content: string) => void;
  updateTopicNote: (subject: Subject, topicId: string, noteId: string, content: string) => void;
  deleteTopicNote: (subject: Subject, topicId: string, noteId: string) => void;
  addTopicVideo: (subject: Subject, topicId: string, title: string, url: string, platform: TopicVideo['platform']) => void;
  toggleVideoWatched: (subject: Subject, topicId: string, videoId: string, watched: boolean) => void;
  scheduleReview?: (subject: Subject, topicId: string, days: number[]) => void;
  logPomodoroStudy?: (subject: Subject, topic: string, minutes: number) => void;
}

const StudyGuide: React.FC<StudyGuideProps> = ({ data, completeTopic, isTopicCompleted, addTopicNote, updateTopicNote, deleteTopicNote, addTopicVideo, toggleVideoWatched, scheduleReview, logPomodoroStudy }) => {
  const [selectedCategory, setSelectedCategory] = useState<'TYT' | 'AYT'>('TYT');
  // const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<Subject>>(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsSubject, setDetailsSubject] = useState<Subject | null>(null);
  const [detailsTopic, setDetailsTopic] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoPlatform, setNewVideoPlatform] = useState<TopicVideo['platform']>('YouTube');
  const [quickPomodoro, setQuickPomodoro] = useState(25);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Memoized study time calculations
  const getTopicStudyTime = useCallback((subject: Subject, topicName: string): number => {
    const subjectRecord = data.subjectStudyRecords?.find(s => s.subject === subject);
    if (!subjectRecord) return 0;
    
    const topicRecord = subjectRecord.topics.find(t => t.name === topicName);
    if (!topicRecord) return 0;
    
    return topicRecord.records.reduce((total, record) => total + record.duration, 0);
  }, [data.subjectStudyRecords]);

  // Check if topic has been studied
  const hasStudiedTopic = useCallback((subject: Subject, topicName: string): boolean => {
    return getTopicStudyTime(subject, topicName) > 0;
  }, [getTopicStudyTime]);

  // Toggle subject expansion
  const toggleSubjectExpansion = (subject: Subject) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subject)) {
      newExpanded.delete(subject);
    } else {
      newExpanded.add(subject);
    }
    setExpandedSubjects(newExpanded);
  };

  // Get completion percentage for subject
  const getSubjectCompletionPercentage = (subject: Subject): number => {
    const topics = SUBJECT_TOPICS[subject] || [];
    if (topics.length === 0) return 0;
    
  // Konu tamamlama yüzdesini hesapla ("Konuyu Bitir" butonuna göre)
  const completedCount = topics.filter(topic => isTopicCompleted(subject, topic)).length;
  return Math.round((completedCount / topics.length) * 100);
  };

  // Get total study time for subject
  const getSubjectTotalStudyTime = (subject: Subject): number => {
    const topics = SUBJECT_TOPICS[subject] || [];
    return topics.reduce((total, topic) => total + getTopicStudyTime(subject, topic), 0);
  };

  // Current topic progress for modal
  const currentTopicProgress = useMemo(() => {
    if (!detailsOpen || !detailsSubject || !detailsTopic) return null;
    const list = data.studyGuide?.topicProgress || [];
    return list.find(tp => tp.subjectId === detailsSubject && tp.topicId === detailsTopic) || null;
  }, [data.studyGuide, detailsOpen, detailsSubject, detailsTopic]);

  const openTopicDetails = (subject: Subject, topic: string) => {
    setDetailsSubject(subject);
    setDetailsTopic(topic);
    setDetailsOpen(true);
    setNewNote("");
    setNewVideoTitle("");
    setNewVideoUrl("");
    setNewVideoPlatform('YouTube');
  };

  const closeDetails = () => {
    setDetailsOpen(false);
  setActionMessage(null);
  };

  return (
    <Card title="Ders Rehberi" fullHeight>
      <div className="h-full flex flex-col">
        {/* Kategori Seçimi */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setSelectedCategory('TYT')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === 'TYT'
                  ? 'bg-white dark:bg-gray-700 text-light-primary dark:text-dark-primary shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              TYT Dersleri
            </button>
            <button
              onClick={() => setSelectedCategory('AYT')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === 'AYT'
                  ? 'bg-white dark:bg-gray-700 text-light-primary dark:text-dark-primary shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              AYT Dersleri
            </button>
          </div>
        </div>

        {/* Ders Listesi */}
        <div className="flex-grow overflow-y-auto">
          <div className="space-y-3">
            {SUBJECT_CATEGORIES[selectedCategory].map(subject => {
              const topics = SUBJECT_TOPICS[subject] || [];
              const completionPercentage = getSubjectCompletionPercentage(subject);
              const totalStudyTime = getSubjectTotalStudyTime(subject);
              const isExpanded = expandedSubjects.has(subject);

              return (
                <div key={subject} className="border border-light-border dark:border-dark-border rounded-lg">
                  {/* Ders Başlığı */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => toggleSubjectExpansion(subject)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {isExpanded ? (
                          <ChevronDown size={20} className="text-gray-400" />
                        ) : (
                          <ChevronRight size={20} className="text-gray-400" />
                        )}
                        <BookOpen size={20} className="text-light-primary dark:text-dark-primary" />
                        <div>
                          <h3 className="font-semibold text-light-text dark:text-dark-text">
                            {subject}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {topics.length} konu • {Math.floor(totalStudyTime / 60)}s {totalStudyTime % 60}dk çalışıldı
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-sm font-medium text-light-text dark:text-dark-text">
                            %{completionPercentage}
                          </div>
                          <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-300"
                              style={{ width: `${completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Konu Listesi */}
                  {isExpanded && (
                    <div className="border-t border-light-border dark:border-dark-border bg-gray-50 dark:bg-gray-800/30">
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {topics.map(topic => {
                            const studyTime = getTopicStudyTime(subject, topic);
                            const hasStudied = hasStudiedTopic(subject, topic);
                            const isCompleted = isTopicCompleted(subject, topic);

                            return (
                              <div 
                                key={topic}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                  isCompleted 
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                                    : hasStudied
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-light-primary dark:hover:border-dark-primary'
            }`}
            onClick={() => openTopicDetails(subject, topic)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-grow">
                                    <div className="flex items-center space-x-2 mb-2">
                                      {isCompleted ? (
                                        <CheckCircle size={16} className="text-green-500" />
                                      ) : hasStudied ? (
                                        <BookOpen size={16} className="text-blue-500" />
                                      ) : (
                                        <Clock size={16} className="text-gray-400" />
                                      )}
                                      <h4 className={`font-medium text-sm ${
                                        isCompleted 
                                          ? 'text-green-700 dark:text-green-300' 
                                          : hasStudied
                                          ? 'text-blue-700 dark:text-blue-300'
                                          : 'text-gray-700 dark:text-gray-300'
                                      }`}>
                                        {topic}
                                      </h4>
                                    </div>
                                    
                                    {hasStudied && (
                                      <div className={`text-xs ${
                                        isCompleted 
                                          ? 'text-green-600 dark:text-green-400'
                                          : 'text-blue-600 dark:text-blue-400'
                                      }`}>
                                        {Math.floor(studyTime / 60)}s {studyTime % 60}dk çalışıldı
                                      </div>
                                    )}

                                    {isCompleted && (
                                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                                        ✓ Konu tamamlandı
                                      </div>
                                    )}
                                  </div>
                                  
                                  {!isCompleted && (
                                    <Button 
                                      variant="primary"
                                      className="text-xs px-3 py-1"
              onClick={(e) => { e.stopPropagation(); completeTopic(subject, topic); }}
                                    >
                                      <CheckCircle size={12} className="mr-1" />
                                      Konuyu Bitir
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* İstatistikler */}
        <div className="flex-shrink-0 mt-6 pt-4 border-t border-light-border dark:border-dark-border">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-light-primary dark:text-dark-primary">
                {SUBJECT_CATEGORIES[selectedCategory].length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Toplam Ders</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-500">
                {SUBJECT_CATEGORIES[selectedCategory].filter(subject => getSubjectCompletionPercentage(subject) > 0).length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Başlanan Ders</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-500">
                {Math.round(
                  SUBJECT_CATEGORIES[selectedCategory].reduce((avg, subject) => 
                    avg + getSubjectCompletionPercentage(subject), 0
                  ) / SUBJECT_CATEGORIES[selectedCategory].length
                )}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Ortalama Tamamlanma</div>
            </div>
          </div>
        </div>
      </div>

      {/* Topic Details Modal */}
      <Modal 
        isOpen={detailsOpen} 
        onClose={closeDetails} 
        title={detailsSubject && detailsTopic ? `${detailsSubject} • ${detailsTopic}` : 'Konu Detayları'}
      >
        {/* Quick actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <select 
              className="px-2 py-1 rounded border border-light-border dark:border-dark-border bg-white dark:bg-gray-700 text-xs"
              value={quickPomodoro}
              onChange={(e) => setQuickPomodoro(parseInt(e.target.value, 10))}
            >
              <option value={15}>15 dk</option>
              <option value={25}>25 dk</option>
              <option value={45}>45 dk</option>
              <option value={60}>60 dk</option>
            </select>
            <Button 
              variant="secondary" 
              className="text-xs"
              onClick={() => { 
                if (detailsSubject && detailsTopic && logPomodoroStudy) {
                  logPomodoroStudy(detailsSubject, detailsTopic, quickPomodoro);
                  setActionMessage(`Pomodoro olarak ${quickPomodoro} dk kaydedildi.`);
                  setTimeout(() => setActionMessage(null), 2500);
                }
              }}
            >Pomodoro kaydet</Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="secondary" 
              className="text-xs"
              onClick={() => { 
                if (detailsSubject && detailsTopic && scheduleReview) {
                  scheduleReview(detailsSubject, detailsTopic, [1,3,7]);
                  setActionMessage('Tekrar planı 1-3-7 gün olarak eklendi.');
                  setTimeout(() => setActionMessage(null), 2500);
                }
              }}
            >Tekrar Planla 1-3-7</Button>
          </div>
        </div>

        {actionMessage && (
          <div className="mb-4 text-xs text-green-600 dark:text-green-400">{actionMessage}</div>
        )}

        {/* Notes Section */}
        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-semibold text-light-text dark:text-dark-text">Notlar</h4>
          <div className="space-y-2 max-h-40 overflow-auto pr-1">
            {currentTopicProgress?.notes?.length ? (
              currentTopicProgress.notes.map(note => (
                <div key={note.id} className="p-2 rounded border border-light-border dark:border-dark-border flex items-start justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mr-3">{note.content}</div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="secondary" 
                      className="text-xs"
                      onClick={() => {
                        const content = prompt('Notu düzenle', note.content);
                        if (content != null && detailsSubject && detailsTopic) {
                          updateTopicNote(detailsSubject, detailsTopic, note.id, content);
                        }
                      }}
                    >Düzenle</Button>
                    <Button 
                      variant="secondary" 
                      className="text-xs"
                      onClick={() => { if (detailsSubject && detailsTopic) deleteTopicNote(detailsSubject, detailsTopic, note.id); }}
                    >Sil</Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-500">Henüz not eklenmemiş.</div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <input 
              className="flex-1 px-3 py-2 rounded border border-light-border dark:border-dark-border bg-white dark:bg-gray-700 text-sm"
              placeholder="Yeni not yazın..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <Button 
              className="text-sm"
              onClick={() => { 
                if (detailsSubject && detailsTopic && newNote.trim()) { 
                  addTopicNote(detailsSubject, detailsTopic, newNote.trim()); 
                  setNewNote('');
                }
              }}
            >Ekle</Button>
          </div>
        </div>

        {/* Videos Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-light-text dark:text-dark-text">Videolar</h4>
          <div className="space-y-2 max-h-40 overflow-auto pr-1">
            {currentTopicProgress?.videos?.length ? (
              currentTopicProgress.videos.map(video => (
                <div key={video.id} className="p-2 rounded border border-light-border dark:border-dark-border flex items-start justify-between">
                  <div className="mr-3">
                    <div className="text-sm font-medium text-light-text dark:text-dark-text">
                      <a href={video.url} target="_blank" rel="noreferrer" className="underline">
                        {video.title}
                      </a>
                    </div>
                    <div className="text-xs text-gray-500">{video.platform}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs flex items-center space-x-1">
                      <input 
                        type="checkbox" 
                        checked={!!video.watched} 
                        onChange={(e) => { if (detailsSubject && detailsTopic) toggleVideoWatched(detailsSubject, detailsTopic, video.id, e.target.checked); }}
                      />
                      <span>İzlendi</span>
                    </label>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-500">Henüz video eklenmemiş.</div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input 
              className="px-3 py-2 rounded border border-light-border dark:border-dark-border bg-white dark:bg-gray-700 text-sm"
              placeholder="Başlık"
              value={newVideoTitle}
              onChange={(e) => setNewVideoTitle(e.target.value)}
            />
            <input 
              className="px-3 py-2 rounded border border-light-border dark:border-dark-border bg-white dark:bg-gray-700 text-sm md:col-span-1"
              placeholder="URL"
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
            />
            <select 
              className="px-3 py-2 rounded border border-light-border dark:border-dark-border bg-white dark:bg-gray-700 text-sm"
              value={newVideoPlatform}
              onChange={(e) => setNewVideoPlatform(e.target.value as TopicVideo['platform'])}
            >
              <option value="YouTube">YouTube</option>
              <option value="Khan Academy">Khan Academy</option>
              <option value="Udemy">Udemy</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="mt-2">
            <Button 
              className="text-sm"
              onClick={() => {
                if (detailsSubject && detailsTopic && newVideoTitle.trim() && newVideoUrl.trim()) {
                  addTopicVideo(detailsSubject, detailsTopic, newVideoTitle.trim(), newVideoUrl.trim(), newVideoPlatform);
                  setNewVideoTitle('');
                  setNewVideoUrl('');
                  setNewVideoPlatform('YouTube');
                }
              }}
            >Video Ekle</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export default StudyGuide;
