import React, { useMemo } from 'react';
import Button from './common/Button';
import { AppData, Subject } from '../types';

interface SpacedReviewProps {
  data: AppData;
  markReviewDone: (subject: Subject, topicId: string, date: string) => void;
}

const SpacedReview: React.FC<SpacedReviewProps> = ({ data, markReviewDone }) => {
  const upcoming = useMemo(() => {
    const now = new Date();
    const list = data.studyGuide?.topicProgress || [];
    const entries: { subject: Subject; topic: string; date: string; done: boolean }[] = [];
    list.forEach(tp => {
      (tp.reviewSchedule || []).forEach(r => {
        if (r.done) return; // zaten tamamlanmışları gösterme
        const d = new Date(r.date);
        // Önümüzdeki 7 gün
        if (d >= now && d.getTime() - now.getTime() <= 7 * 86400000) {
          entries.push({ subject: tp.subjectId, topic: tp.topicId, date: r.date, done: r.done });
        }
      });
    });
    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data.studyGuide]);

  return (
    <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Tekrar Planı</h3>
        <Button variant="secondary" onClick={() => alert('Bir konu kartından “Tekrar Planla” ile ekleyin.')}>Nasıl eklerim?</Button>
      </div>
      <div className="space-y-2 max-h-64 overflow-auto pr-1">
        {upcoming.length === 0 ? (
          <div className="text-sm text-gray-500">Önümüzdeki 7 gün için tekrar planı yok.</div>
        ) : (
          upcoming.map((u, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded border border-light-border dark:border-dark-border">
              <div className="text-sm">
                <div className="font-medium">{u.subject} • {u.topic}</div>
                <div className="text-xs text-gray-500">{new Date(u.date).toLocaleString()}</div>
              </div>
              <Button 
                variant="secondary" 
                className="text-xs"
                onClick={() => markReviewDone(u.subject, u.topic, u.date)}
              >Tamamla</Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SpacedReview;
