
import React, { useState } from 'react';
import { PracticeExam, SubjectNet } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Modal from './common/Modal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PlusCircle, Eye, Calendar, TrendingUp, Trash2 } from 'lucide-react';

interface ExamAnalyzerProps {
  practiceExams: PracticeExam[];
  addPracticeExam: (exam: Omit<PracticeExam, 'id' | 'date'>) => void;
  deletePracticeExam: (examId: string) => void;
}

// TYT ve AYT ders tanımları
const TYT_SUBJECTS = [
  { name: 'Türkçe', maxQuestions: 40 },
  { name: 'Matematik', maxQuestions: 40 },
  { name: 'Fen Bilimleri', maxQuestions: 20 },
  { name: 'Sosyal Bilimler', maxQuestions: 20 }
];

const AYT_SUBJECTS = [
  { name: 'Matematik', maxQuestions: 40 },
  { name: 'Fizik', maxQuestions: 14 },
  { name: 'Kimya', maxQuestions: 13 },
  { name: 'Biyoloji', maxQuestions: 13 },
  { name: 'Tarih', maxQuestions: 11 },
  { name: 'Coğrafya', maxQuestions: 11 },
  { name: 'Felsefe', maxQuestions: 12 },
  { name: 'Din Kültürü', maxQuestions: 6 }
];

const ExamAnalyzer: React.FC<ExamAnalyzerProps> = ({ practiceExams, addPracticeExam, deletePracticeExam }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<PracticeExam | null>(null);
  const [examToDelete, setExamToDelete] = useState<PracticeExam | null>(null);
  
  // Form states
  const [examName, setExamName] = useState('');
  const [examType, setExamType] = useState<'TYT' | 'AYT'>('TYT');
  const [subjectScores, setSubjectScores] = useState<Record<string, { correct: number; wrong: number }>>({});
  
  const sortedExams = [...practiceExams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const chartData = sortedExams.map((exam) => ({
    name: exam.name.length > 12 ? `${exam.name.substring(0, 12)}…` : exam.name,
    Net: exam.totalNet || (exam as any).tytNet || 0, // Eski verilerle uyumluluk
    fullDate: new Date(exam.date).toLocaleDateString('tr-TR'),
    type: exam.type || 'TYT' // Eski veriler için varsayılan
  }));

  // Net hesaplama fonksiyonu
  const calculateNet = (correct: number, wrong: number): number => {
    return Math.max(0, correct - (wrong / 4));
  };

  // Form reset
  const resetForm = () => {
    setExamName('');
    setExamType('TYT');
    setSubjectScores({});
  };

  // Subject score güncelleme
  const updateSubjectScore = (subject: string, field: 'correct' | 'wrong', value: number) => {
    setSubjectScores(prev => ({
      ...prev,
      [subject]: {
        correct: prev[subject]?.correct || 0,
        wrong: prev[subject]?.wrong || 0,
        [field]: Math.max(0, value) // Negatif değerleri engelle
      }
    }));
  };

  // Form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!examName.trim()) {
      alert('Lütfen deneme adını girin.');
      return;
    }

    try {
      const subjects = (examType === 'TYT' ? TYT_SUBJECTS : AYT_SUBJECTS);
      const examSubjects: SubjectNet[] = subjects.map(subject => {
        const scores = subjectScores[subject.name] || { correct: 0, wrong: 0 };
        const correct = Math.max(0, Math.min(scores.correct, subject.maxQuestions));
        const wrong = Math.max(0, Math.min(scores.wrong, subject.maxQuestions));
        
        return {
          subject: subject.name,
          correct,
          wrong,
          net: calculateNet(correct, wrong)
        };
      });

      const totalNet = examSubjects.reduce((sum, subject) => sum + subject.net, 0);

      const newExam = {
        name: examName.trim(),
        type: examType,
        subjects: examSubjects,
        totalNet: Math.round(totalNet * 100) / 100
      };

      console.log('Yeni deneme ekleniyor:', newExam);
      addPracticeExam(newExam);

      resetForm();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Deneme eklenirken hata:', error);
      alert('Deneme eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  // Detay modal aç
  const openDetailModal = (exam: PracticeExam) => {
    setSelectedExam(exam);
    setIsDetailModalOpen(true);
  };

  // Silme modal aç
  const openDeleteModal = (exam: PracticeExam, e: React.MouseEvent) => {
    e.stopPropagation(); // Parent click'i engelle
    setExamToDelete(exam);
    setIsDeleteModalOpen(true);
  };

  // Deneme sil
  const handleDeleteExam = () => {
    if (examToDelete) {
      deletePracticeExam(examToDelete.id);
      setIsDeleteModalOpen(false);
      setExamToDelete(null);
    }
  };

  return (
    <Card 
      title="Deneme Analizi"
      fullHeight
      action={
        <Button onClick={() => setIsModalOpen(true)} variant="secondary">
          <PlusCircle size={16} className="mr-2"/> Deneme Ekle
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
        {/* Grafik Alanı */}
        <div className="lg:col-span-2">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                <XAxis dataKey="name" stroke="currentColor" />
                <YAxis stroke="currentColor"/>
                <Tooltip 
                  contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                      borderColor: '#334155',
                      color: '#E5E7EB',
                      borderRadius: '0.5rem'
                  }} 
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend />
                <Line type="monotone" dataKey="Net" stroke="#06B6D4" strokeWidth={2} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <TrendingUp size={48} className="mx-auto mb-3 opacity-50" />
                <p>Grafiği görmek için deneme sonucu ekleyin</p>
              </div>
            </div>
          )}
        </div>

        {/* Deneme Listesi */}
        <div className="lg:col-span-1">
          <div className="h-full overflow-y-auto">
            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">
              Son Denemeler ({practiceExams.length})
            </h4>
            {practiceExams.length > 0 ? (
              <div className="space-y-2">
                {sortedExams.slice(-5).reverse().map((exam) => (
                  <div
                    key={exam.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => openDetailModal(exam)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {exam.name}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Eye size={14} className="text-gray-400 hover:text-gray-600" />
                        <button
                          onClick={(e) => openDeleteModal(exam, e)}
                          className="p-1 rounded-full text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          title="Denemeyi Sil"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (exam.type || 'TYT') === 'TYT' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {exam.type || 'TYT'}
                      </span>
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        {exam.totalNet || (exam as any).tytNet || 0} Net
                      </span>
                    </div>
                    <div className="flex items-center mt-1 text-xs text-gray-400">
                      <Calendar size={12} className="mr-1" />
                      {new Date(exam.date).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
                Henüz deneme eklenmemiş
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deneme Ekleme Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }} 
        title="Yeni Deneme Ekle"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="examName" className="block text-sm font-medium mb-1">Deneme Adı</label>
            <input
              id="examName" 
              type="text" 
              value={examName} 
              onChange={(e) => setExamName(e.target.value)}
              placeholder="Örn: Töder Türkiye Geneli 1"
              className="w-full p-2 border rounded-md bg-light-card dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-light-primary focus:border-light-primary"
              required
            />
          </div>
          
          <div>
            <label htmlFor="examType" className="block text-sm font-medium mb-1">Deneme Türü</label>
            <select
              id="examType"
              value={examType}
              onChange={(e) => setExamType(e.target.value as 'TYT' | 'AYT')}
              className="w-full p-2 border rounded-md bg-light-card dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-light-primary focus:border-light-primary"
            >
              <option value="TYT">TYT (Temel Yeterlilik Testi)</option>
              <option value="AYT">AYT (Alan Yeterlilik Testi)</option>
            </select>
          </div>

          {/* Ders Bazlı Net Girişi */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">Ders Bazlı Sonuçlar</h4>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                Toplam Net: {
                  (examType === 'TYT' ? TYT_SUBJECTS : AYT_SUBJECTS)
                    .reduce((sum, subject) => {
                      const scores = subjectScores[subject.name] || { correct: 0, wrong: 0 };
                      return sum + calculateNet(scores.correct, scores.wrong);
                    }, 0)
                    .toFixed(2)
                }
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-3">
              {(examType === 'TYT' ? TYT_SUBJECTS : AYT_SUBJECTS).map((subject) => (
                <div key={subject.name} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {subject.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      Max: {subject.maxQuestions}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Doğru</label>
                      <input
                        type="number"
                        min="0"
                        max={subject.maxQuestions}
                        value={subjectScores[subject.name]?.correct || ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          if (value >= 0 && value <= subject.maxQuestions) {
                            updateSubjectScore(subject.name, 'correct', value);
                          }
                        }}
                        className="w-full p-1 text-sm border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        placeholder="0"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">0 - {subject.maxQuestions}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Yanlış</label>
                      <input
                        type="number"
                        min="0"
                        max={subject.maxQuestions}
                        value={subjectScores[subject.name]?.wrong || ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          if (value >= 0 && value <= subject.maxQuestions) {
                            updateSubjectScore(subject.name, 'wrong', value);
                          }
                        }}
                        className="w-full p-1 text-sm border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        placeholder="0"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">0 - {subject.maxQuestions}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Net</label>
                      <div className="p-1 text-sm bg-gray-100 dark:bg-gray-600 rounded text-center font-medium">
                        {calculateNet(
                          subjectScores[subject.name]?.correct || 0,
                          subjectScores[subject.name]?.wrong || 0
                        ).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              İptal
            </Button>
            <Button type="submit">Kaydet</Button>
          </div>
        </form>
      </Modal>

      {/* Detay Modal */}
      <Modal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        title={selectedExam ? `${selectedExam.name} - Detaylar` : ''}
      >
        {selectedExam && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  (selectedExam.type || 'TYT') === 'TYT' 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                }`}>
                  {selectedExam.type || 'TYT'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {selectedExam.totalNet || (selectedExam as any).tytNet || 0} Net
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(selectedExam.date).toLocaleDateString('tr-TR')}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">Ders Bazlı Sonuçlar</h4>
              {selectedExam.subjects && selectedExam.subjects.length > 0 ? (
                selectedExam.subjects.map((subject) => (
                  <div key={subject.subject} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {subject.subject}
                    </span>
                    <div className="flex items-center space-x-3 text-sm">
                      <span className="text-green-600">D: {subject.correct}</span>
                      <span className="text-red-600">Y: {subject.wrong}</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        Net: {subject.net.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 text-sm p-4">
                  Bu deneme eski formatta kaydedilmiş. Ders bazlı detaylar mevcut değil.
                  <br />
                  {(selectedExam as any).tytNet && (
                    <span className="text-blue-600">TYT Net: {(selectedExam as any).tytNet}</span>
                  )}
                  {(selectedExam as any).aytNet && (
                    <span className="text-orange-600 ml-4">AYT Net: {(selectedExam as any).aytNet}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Silme Onay Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => {
          setIsDeleteModalOpen(false);
          setExamToDelete(null);
        }} 
        title="Denemeyi Sil"
      >
        {examToDelete && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <Trash2 size={20} className="text-red-500" />
              <div>
                <p className="text-gray-800 dark:text-gray-200 font-medium">
                  Bu denemeyi silmek istediğinizden emin misiniz?
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <strong>"{examToDelete.name}"</strong> kalıcı olarak silinecek.
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Deneme Türü:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  (examToDelete.type || 'TYT') === 'TYT' 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                }`}>
                  {examToDelete.type || 'TYT'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600 dark:text-gray-400">Toplam Net:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {examToDelete.totalNet || (examToDelete as any).tytNet || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600 dark:text-gray-400">Tarih:</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {new Date(examToDelete.date).toLocaleDateString('tr-TR')}
                </span>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                ⚠️ Bu işlem geri alınamaz. Deneme ve tüm detayları kalıcı olarak silinecektir.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setExamToDelete(null);
                }}
              >
                İptal
              </Button>
              <Button 
                type="button" 
                onClick={handleDeleteExam}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Trash2 size={16} className="mr-2" />
                Sil
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default ExamAnalyzer;
