import React, { useState, useMemo, useCallback } from "react";
import { AppData, AiRecommendation } from "../types";
import { getAiCoachAdvice } from "../services/geminiService";
import Card from "./common/Card";
import Button from "./common/Button";
import { Sparkles, Zap, Target, ClipboardList, Lightbulb } from "lucide-react";

interface AiCoachProps {
  data: AppData;
  updateAiUsage?: (record: any) => void;
}

const AiCoach: React.FC<AiCoachProps> = ({ data, updateAiUsage }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<AiRecommendation | null>(
    null
  );

  // Memoize usage info calculation
  const usageInfo = useMemo(() => {
    const userApiKey = data.settings?.geminiApiKey;
    if (userApiKey && userApiKey.trim()) {
      return { hasLimit: false, remaining: -1, total: -1 };
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const usageHistory = data.settings?.aiUsageHistory || [];

    const recentUsage = usageHistory.filter((record) => {
      const recordTime = new Date(record.timestamp);
      return recordTime > oneHourAgo && record.success && !record.userApiKey;
    });

    const hourlyLimit = 2;
    const remaining = Math.max(0, hourlyLimit - recentUsage.length);

    return { hasLimit: true, remaining, total: hourlyLimit };
  }, [data.settings?.geminiApiKey, data.settings?.aiUsageHistory]);

  const handleGetAdvice = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      // Kullanıcının API anahtarını kullan
      const userApiKey = data.settings?.geminiApiKey;
      const advice = await getAiCoachAdvice(data, userApiKey, updateAiUsage);
      setRecommendation(advice);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Bilinmeyen bir hata oluştu.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [data, updateAiUsage]);

  return (
    <div className="h-full">
      <Card title="Yapay Zeka Koçu" fullHeight>
        <div className="flex flex-col h-full">
          {/* Sabit üst kısım */}
          <div className="flex-shrink-0">
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              Verilerini analiz ederek sana özel çalışma planı ve tavsiyeler
              almak için butona tıkla.
            </p>
            {data.settings?.aiCoachPrefs && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Üslup:{" "}
                <strong>{data.settings.aiCoachPrefs.tone || "samimi"}</strong>,
                Uzunluk:{" "}
                <strong>{data.settings.aiCoachPrefs.length || "kısa"}</strong>,
                Emojiler:{" "}
                <strong>
                  {data.settings.aiCoachPrefs.allowEmojis ? "açık" : "kapalı"}
                </strong>
              </p>
            )}

            {/* Kullanım Sınırı Bilgisi */}
            {usageInfo.hasLimit && (
              <div
                className={`mb-4 p-3 rounded-lg border ${
                  usageInfo.remaining > 0
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                    : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                }`}
              >
                <div className="flex items-center space-x-2 text-sm">
                  <Sparkles
                    size={16}
                    className={
                      usageInfo.remaining > 0
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-orange-600 dark:text-orange-400"
                    }
                  />
                  <span
                    className={
                      usageInfo.remaining > 0
                        ? "text-blue-800 dark:text-blue-300"
                        : "text-orange-800 dark:text-orange-300"
                    }
                  >
                    {usageInfo.remaining > 0
                      ? `${usageInfo.remaining}/${usageInfo.total} tavsiye hakkınız kaldı (saatlik)`
                      : "Saatlik tavsiye hakkınız doldu"}
                  </span>
                </div>
                {usageInfo.remaining === 0 && (
                  <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                    Sınırsız kullanım için Ayarlar'dan kendi API anahtarınızı
                    girin
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={handleGetAdvice}
              disabled={
                isLoading || (usageInfo.hasLimit && usageInfo.remaining === 0)
              }
              className="w-full mb-4"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>{" "}
                  Analiz Ediliyor...
                </>
              ) : (
                <>
                  <Sparkles size={18} className="mr-2" />
                  {usageInfo.hasLimit && usageInfo.remaining === 0
                    ? "Sınır Doldu"
                    : "Tavsiye Al"}
                </>
              )}
            </Button>

            {error && (
              <div className="text-red-500 bg-red-100 dark:bg-red-900/50 p-2 rounded-md mb-4 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Scroll yapılabilir içerik alanı - Kesin yükseklik sınırı */}
          {recommendation && (
            <div className="flex-1 overflow-y-auto min-h-0 max-h-80 pr-1">
              {!recommendation.hasData ? (
                // Veri yoksa uyarı göster
                <div className="space-y-4 pb-2">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start space-x-3">
                      <Target
                        size={20}
                        className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5"
                      />
                      <div>
                        <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                          Veri Girişi Gerekli
                        </h4>
                        <p className="text-yellow-700 dark:text-yellow-400 text-sm mb-3">
                          {recommendation.warningMessage ||
                            "Kişiselleştirilmiş tavsiyeler alabilmek için önce verilerinizi girmeniz gerekiyor."}
                        </p>
                        {recommendation.dataRequirements && (
                          <div>
                            <p className="font-medium text-yellow-800 dark:text-yellow-300 text-sm mb-2">
                              Lütfen şunları yapın:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-yellow-700 dark:text-yellow-400 text-sm">
                              {recommendation.dataRequirements.map(
                                (req: string, i: number) => (
                                  <li key={i}>{req}</li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-3">
                      <Sparkles
                        size={20}
                        className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                      />
                      <div>
                        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                          AI Koçunuz Sizi Bekliyor!
                        </h4>
                        <p className="text-blue-700 dark:text-blue-400 text-sm">
                          Verilerinizi girdikten sonra size özel analiz,
                          güçlü/zayıf yönleriniz, detaylı haftalık plan ve somut
                          öneriler sunacağım. Hadi başlayalım! 🚀
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Veri varsa normal analizi göster
                <div className="space-y-3 pb-2">
                  {recommendation.strengths &&
                    recommendation.strengths.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-base flex items-center mb-2 sticky top-0 bg-light-card dark:bg-dark-card py-1 z-10">
                          <Zap size={18} className="mr-2 text-green-500" />
                          Güçlü Yönler
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-green-700 dark:text-green-300 text-sm">
                          {recommendation.strengths.map(
                            (s: string, i: number) => (
                              <li key={i}>{s}</li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  {recommendation.weaknesses &&
                    recommendation.weaknesses.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-base flex items-center mb-2 sticky top-0 bg-light-card dark:bg-dark-card py-1 z-10">
                          <Target size={18} className="mr-2 text-red-500" />
                          Odaklanılacak Alanlar
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-red-600 dark:text-red-400 text-sm">
                          {recommendation.weaknesses.map(
                            (w: string, i: number) => (
                              <li key={i}>{w}</li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  {recommendation.recommendations &&
                    recommendation.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-base flex items-center mb-2 sticky top-0 bg-light-card dark:bg-dark-card py-1 z-10">
                          <Lightbulb
                            size={18}
                            className="mr-2 text-yellow-500"
                          />
                          Öneriler
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 text-sm">
                          {recommendation.recommendations.map(
                            (r: string, i: number) => (
                              <li key={i}>{r}</li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  {recommendation.weeklyPlan &&
                    recommendation.weeklyPlan.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-base flex items-center mb-2 sticky top-0 bg-light-card dark:bg-dark-card py-1 z-10">
                          <ClipboardList
                            size={18}
                            className="mr-2 text-blue-500"
                          />
                          Haftalık Plan
                        </h4>
                        <div className="space-y-2">
                          {recommendation.weeklyPlan.map(
                            (p: any, i: number) => (
                              <div
                                key={i}
                                className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-md"
                              >
                                <p className="font-bold text-gray-800 dark:text-gray-200 mb-2 text-sm">
                                  {p.day}
                                </p>
                                <ul className="list-disc list-inside ml-2 text-sm space-y-1">
                                  {p.tasks.map((t: string, ti: number) => (
                                    <li
                                      key={ti}
                                      className="text-gray-700 dark:text-gray-300"
                                    >
                                      {t}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AiCoach;
