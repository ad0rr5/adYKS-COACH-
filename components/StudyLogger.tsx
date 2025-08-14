import React, { useState } from 'react';
import { StudySession, Subject, SubjectStudyRecord } from '../types';
import { ALL_SUBJECTS, SUBJECT_TOPICS } from '../constants';
import Card from './common/Card';
import Button from './common/Button';
import { Clock, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';

interface StudyLoggerProps {
  addStudySession: (session: Omit<StudySession, 'id' | 'date'>) => void;
  subjectStudyRecords?: SubjectStudyRecord[];
}

const StudyLogger: React.FC<StudyLoggerProps> = ({ addStudySession, subjectStudyRecords }) => {
  const [subject, setSubject] = useState<Subject>(Subject.TYT_MATEMATIK);
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState<Set<Subject>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get available topics for selected subject
  const availableTopics = SUBJECT_TOPICS[subject] || [];

  // Toggle subject expansion
  const toggleSubjectExpansion = (subjectKey: Subject) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subjectKey)) {
      newExpanded.delete(subjectKey);
    } else {
      newExpanded.add(subjectKey);
    }
    setExpandedSubjects(newExpanded);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const d = parseInt(duration, 10);
    if (!topic.trim()) {
      setError('Lütfen bir konu seçin.');
      return;
    }
    if (!d || d < 1) {
      setError('Süre en az 1 dakika olmalı.');
      return;
    }
    addStudySession({ subject, topic, duration: d });
    // Konuyu temizlemeden önce ilgili dersi genişlet
    setExpandedSubjects((prev) => new Set(prev).add(subject));
    setSuccess('Kayıt eklendi.');
    setTopic('');
    setDuration('');
    // Başarı mesajını kısa süre sonra kaldır
    setTimeout(() => setSuccess(null), 2000);
  };

  // Subject değiştiğinde topic'i sıfırla
  const handleSubjectChange = (newSubject: Subject) => {
    setSubject(newSubject);
    setTopic(''); // Topic seçimini sıfırla
  };

  return (
    <Card title="Çalışma Kaydı Ekle" fullHeight>
      <div className="h-full flex flex-col md:flex-row gap-8 md:gap-12 items-stretch">
        {/* Sol: Form */}
        <div className="md:w-1/2 w-full flex flex-col justify-center md:justify-start md:pl-4 md:pr-6">
          <form onSubmit={handleSubmit} className="space-y-4 mb-4">
            {error && (
              <div className="p-2 rounded border border-red-300 bg-red-50 text-red-700 text-sm">{error}</div>
            )}
            {success && (
              <div className="p-2 rounded border border-green-300 bg-green-50 text-green-700 text-sm">{success}</div>
            )}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium mb-1">Ders Kategorisi</label>
              <select
                id="subject"
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value as Subject)}
                className="w-full p-2 border rounded-md bg-light-bg dark:bg-dark-card border-light-border dark:border-dark-border focus:ring-light-primary focus:border-light-primary"
              >
                {ALL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="topic" className="block text-sm font-medium mb-1">Konu</label>
              <select
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-2 border rounded-md bg-light-bg dark:bg-dark-card border-light-border dark:border-dark-border focus:ring-light-primary focus:border-light-primary"
              >
                <option value="">Konu seçiniz...</option>
                {availableTopics.map(topicName => (
                  <option key={topicName} value={topicName}>{topicName}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="duration" className="block text-sm font-medium mb-1">Süre (dakika)</label>
              <input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Örn: 45"
                className="w-full p-2 border rounded-md bg-light-bg dark:bg-dark-card border-light-border dark:border-dark-border focus:ring-light-primary focus:border-light-primary"
                min="1"
                max="600"
              />
              <div className="flex gap-2 mt-2">
                {[15,25,45].map((m)=> (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDuration(String(m))}
                    className="px-2 py-1 text-xs rounded border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {m} dk
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full">
              <BookOpen size={16} className="mr-2" />
              Çalışma Kaydı Ekle
            </Button>
          </form>
        </div>

        {/* Sağ: Ders Bazlı Kayıtlar */}
        <div className="md:w-1/2 w-full flex flex-col md:pr-4 md:pl-6">
          <h4 className="font-bold text-lg mb-4 flex-shrink-0 text-center md:text-left">Ders Bazlı Kayıtlar</h4>
          <div className="flex-grow overflow-y-auto pr-1">
            {subjectStudyRecords && subjectStudyRecords.length > 0 ? (
              <ul className="space-y-4">
                {subjectStudyRecords.map(subjectRecord => (
                  <li key={subjectRecord.subject} className="">
                    <div 
                      className="font-semibold text-base text-light-primary dark:text-dark-primary mb-2 border-b border-light-border dark:border-dark-border pb-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded-md"
                      onClick={() => toggleSubjectExpansion(subjectRecord.subject)}
                    >
                      <div className="flex items-center gap-2">
                        <span>{subjectRecord.subject}</span>
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                          {subjectRecord.topics.length} konu
                        </span>
                      </div>
                      {expandedSubjects.has(subjectRecord.subject) ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </div>
                    
                    {expandedSubjects.has(subjectRecord.subject) && (
                      <div className="ml-2 mt-2">
                        {subjectRecord.topics.length > 0 ? (
                          <ul className="space-y-3">
                            {subjectRecord.topics.map(topicRecord => (
                              <li key={topicRecord.name} className="">
                                <div className="font-medium text-sm text-light-text dark:text-dark-text mb-1 pl-1">
                                  {topicRecord.name}
                                  <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded-full">
                                    {topicRecord.records.length} kayıt
                                  </span>
                                </div>
                                <ul className="space-y-1 ml-4">
                                  {topicRecord.records.map((rec, idx) => (
                                    <li key={idx} className="flex items-center text-xs text-gray-600 dark:text-gray-400 gap-2">
                                      <Clock size={12} className="mr-1.5" />
                                      <span className="font-medium">{rec.duration} dk</span>
                                      <span className="mx-2">|</span>
                                      <span>{new Date(rec.date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-xs text-gray-400 pl-2">Henüz konu kaydı yok.</div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500 dark:text-gray-400 text-center md:text-left">
                Henüz çalışma kaydı yok.
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StudyLogger;
