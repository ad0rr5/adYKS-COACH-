import React, { useState } from 'react';
import { Subject, AppData } from '../types';
import { SUBJECT_TOPICS, SUBJECT_CATEGORIES } from '../constants';
import Card from './common/Card';
import Button from './common/Button';
import { 
  BookOpen, 
  Clock, 
  ChevronDown,
  ChevronRight,
  Play,
  CheckCircle
} from 'lucide-react';

interface StudyGuideProps {
  data: AppData;
}

const StudyGuide: React.FC<StudyGuideProps> = ({ data }) => {
  const [selectedCategory, setSelectedCategory] = useState<'TYT' | 'AYT'>('TYT');
  // const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<Subject>>(new Set());

  // Get study time for a specific topic
  const getTopicStudyTime = (subject: Subject, topicName: string): number => {
    const subjectRecord = data.subjectStudyRecords?.find(s => s.subject === subject);
    if (!subjectRecord) return 0;
    
    const topicRecord = subjectRecord.topics.find(t => t.name === topicName);
    if (!topicRecord) return 0;
    
    return topicRecord.records.reduce((total, record) => total + record.duration, 0);
  };

  // Check if topic has been studied
  const hasStudiedTopic = (subject: Subject, topicName: string): boolean => {
    return getTopicStudyTime(subject, topicName) > 0;
  };

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
    
    const studiedTopics = topics.filter(topic => hasStudiedTopic(subject, topic)).length;
    return Math.round((studiedTopics / topics.length) * 100);
  };

  // Get total study time for subject
  const getSubjectTotalStudyTime = (subject: Subject): number => {
    const topics = SUBJECT_TOPICS[subject] || [];
    return topics.reduce((total, topic) => total + getTopicStudyTime(subject, topic), 0);
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

                            return (
                              <div 
                                key={topic}
                                className={`p-3 rounded-lg border transition-all ${
                                  hasStudied 
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-light-primary dark:hover:border-dark-primary'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-grow">
                                    <div className="flex items-center space-x-2 mb-2">
                                      {hasStudied ? (
                                        <CheckCircle size={16} className="text-green-500" />
                                      ) : (
                                        <Clock size={16} className="text-gray-400" />
                                      )}
                                      <h4 className={`font-medium text-sm ${
                                        hasStudied 
                                          ? 'text-green-700 dark:text-green-300' 
                                          : 'text-gray-700 dark:text-gray-300'
                                      }`}>
                                        {topic}
                                      </h4>
                                    </div>
                                    
                                    {hasStudied && (
                                      <div className="text-xs text-green-600 dark:text-green-400">
                                        {Math.floor(studyTime / 60)}s {studyTime % 60}dk çalışıldı
                                      </div>
                                    )}
                                  </div>
                                  
                                  {!hasStudied && (
                                    <Button 
                                      variant="secondary"
                                      className="text-xs px-2 py-1 text-xs"
                                    >
                                      <Play size={12} className="mr-1" />
                                      Başla
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
    </Card>
  );
};

export default StudyGuide;
