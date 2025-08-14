import { GoogleGenAI, Type } from "@google/genai";
import { AppData, AiRecommendation } from "../types";

const DEFAULT_API_KEY = process.env.API_KEY;

// Kullanıcının API anahtarını kontrol et
const getApiKey = (userApiKey?: string): string | null => {
  if (userApiKey && userApiKey.trim()) {
    return userApiKey.trim();
  }
  if (DEFAULT_API_KEY) {
    return DEFAULT_API_KEY;
  }
  return null;
};

const createAiInstance = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

export const buildPersonaHeader = (data: AppData): string => {
  const prefs = data.settings?.aiCoachPrefs;
  const tone = prefs?.tone || 'samimi';
  const length = prefs?.length || 'kısa';
  const allowEmojis = !!prefs?.allowEmojis;
  const custom = prefs?.instructions ? `\nKULLANICI TALİMATLARI: ${prefs.instructions}\n` : '';
  const t = prefs?.targets;
  const targets = t ? `\nHEDEFLER: ${
    [
      t.rank ? `Hedef sıralama: ${t.rank}` : null,
      t.university ? `Hedef üniversite: ${t.university}` : null,
      t.department ? `Hedef bölüm: ${t.department}` : null,
      t.targetNetsText ? `Hedef netler: ${t.targetNetsText}` : null
    ].filter(Boolean).join(' | ')
  }\n` : '';
  const style = `\nÜSLUP VE BİÇİM: Üslubun '${tone}'. Yanıt uzunluğu '${length}'. ${allowEmojis ? 'Emoji kullanımı serbest (abartma).' : 'Emoji kullanma.'}\n`;
  return `Sen 2026 YKS (Türkiye üniversite giriş sınavı) için uzman bir öğrenci koçusun.${custom}${targets}${style}`;
};

const generatePrompt = (data: AppData): string => {
  // Çalışma kayıtlarını analiz et
  const hasStudyRecords =
    data.subjectStudyRecords && data.subjectStudyRecords.length > 0;
  const hasExamRecords = data.practiceExams && data.practiceExams.length > 0;
  const hasWeeklyPlans =
    data.weeklySchedules && data.weeklySchedules.length > 0;

  // Eğer hiç veri yoksa uyarı ver
  if (!hasStudyRecords && !hasExamRecords && !hasWeeklyPlans) {
    return `
      ${buildPersonaHeader(data)}
      Kullanıcının henüz hiç veri girişi yapmadığını görüyorsun.
      
      JSON formatında şu bilgileri döndür:
      - hasData: false
      - warningMessage: Motivasyonlu ve samimi bir uyarı mesajı (kişiselleştirilmiş tavsiye verebilmek için veri gerektiğini açıkla)
      - dataRequirements: Kullanıcının hangi verileri girmesi gerektiğini açıklayan liste
      
      Ton: Samimi, motive edici, yardımsever. Kullanıcıyı suçlama, sadece yönlendir.
    `;
  }

  // Detaylı çalışma analizi
  let studyAnalysis = "";
  if (hasStudyRecords) {
    const totalStudyTime = data.subjectStudyRecords!.reduce(
      (total, subject) => {
        return (
          total +
          subject.topics.reduce((subjectTotal, topic) => {
            return (
              subjectTotal +
              topic.records.reduce(
                (topicTotal, record) => topicTotal + record.duration,
                0
              )
            );
          }, 0)
        );
      },
      0
    );

    const subjectBreakdown = data
      .subjectStudyRecords!.map((subject) => {
        const subjectTime = subject.topics.reduce((total, topic) => {
          return (
            total +
            topic.records.reduce(
              (topicTotal, record) => topicTotal + record.duration,
              0
            )
          );
        }, 0);
        const topicCount = subject.topics.length;
        const recentTopics = subject.topics
          .slice(-3)
          .map((t) => t.name)
          .join(", ");
        return `${subject.subject}: ${subjectTime}dk (${topicCount} konu) - Son konular: ${recentTopics}`;
      })
      .join("\n");

    studyAnalysis = `
Toplam Çalışma Süresi: ${totalStudyTime} dakika (${Math.round(
      totalStudyTime / 60
    )} saat)
Ders Bazlı Dağılım:
${subjectBreakdown}`;
  }

  // Detaylı deneme analizi
  let examAnalysis = "";
  if (hasExamRecords) {
    const recentExams = data.practiceExams.slice(-5);
    const avgNet =
      recentExams.reduce((sum, exam) => sum + (exam.totalNet || 0), 0) /
      recentExams.length;
    const bestNet = Math.max(...recentExams.map((e) => e.totalNet || 0));
    const worstNet = Math.min(...recentExams.map((e) => e.totalNet || 0));

    const examDetails = recentExams
      .map((exam) => {
        const subjectDetails = (exam.subjects || [])
          .map(
            (s) =>
              `${s.subject}: ${s.net.toFixed(1)} net (D:${s.correct} Y:${
                s.wrong
              })`
          )
          .join(", ");
        return `${exam.name} (${exam.type}): ${exam.totalNet?.toFixed(
          1
        )} net - ${subjectDetails}`;
      })
      .join("\n");

    examAnalysis = `
Son 5 Deneme Ortalaması: ${avgNet.toFixed(1)} net
En Yüksek Net: ${bestNet.toFixed(1)}
En Düşük Net: ${worstNet.toFixed(1)}
Deneme Detayları:
${examDetails}`;
  }

  // Haftalık plan analizi
  let planAnalysis = "";
  if (hasWeeklyPlans) {
    const currentWeek = data.weeklySchedules[data.weeklySchedules.length - 1];
    if (currentWeek) {
      const totalPlans = currentWeek.days.reduce(
        (total, day) => total + day.plans.length,
        0
      );
      const completedPlans = currentWeek.days.reduce(
        (total, day) => total + day.plans.filter((p) => p.isCompleted).length,
        0
      );
      const planCompletion =
        totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0;

      planAnalysis = `
Bu Hafta Toplam Plan: ${totalPlans}
Tamamlanan Plan: ${completedPlans}
Tamamlanma Oranı: %${planCompletion}`;
    }
  }

  // Video izleme analizi (Study Guide)
  let videoAnalysis = "";
  const topicProgress = data.studyGuide?.topicProgress || [];
  const allVideos = topicProgress.flatMap(tp => (tp.videos || []).map(v => ({
    ...v,
    subject: tp.subjectId,
    topic: tp.topicId
  })));
  const watchedVideos = allVideos.filter(v => v.watched);
  if (watchedVideos.length > 0) {
    const bySubject = watchedVideos.reduce<Record<string, number>>((acc, v) => {
      const key = String(v.subject);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byPlatform = watchedVideos.reduce<Record<string, number>>((acc, v) => {
      const key = v.platform || 'Other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Son izlenen 5 video
    const sorted = [...watchedVideos].sort((a, b) => {
      const ta = a.watchedAt ? new Date(a.watchedAt).getTime() : 0;
      const tb = b.watchedAt ? new Date(b.watchedAt).getTime() : 0;
      return tb - ta;
    });
    const recent = sorted.slice(0, 5).map(v => `• ${v.title} (${v.platform}) — ${v.subject} / ${v.topic}`).join("\n");

    const subjectLines = Object.entries(bySubject)
      .map(([s, c]) => `${s}: ${c} video`).join("; ");
    const platformLines = Object.entries(byPlatform)
      .map(([p, c]) => `${p}: ${c}`).join("; ");

    const approxMinutes = watchedVideos.reduce((sum, v) => sum + (v.duration || 0), 0);

    videoAnalysis = `\nİzlenen Videolar: ${watchedVideos.length} adet\nDers Bazlı: ${subjectLines || '-'}\nPlatformlar: ${platformLines || '-'}\nTahmini Süre: ${approxMinutes > 0 ? `${approxMinutes} dk` : 'Bilinmiyor'}\nSon İzlenenler (5):\n${recent || '-'}`;
  }

  return `
    ${buildPersonaHeader(data)}
    Aşağıdaki öğrenci verilerini detaylı analiz et ve JSON formatında kişiselleştirilmiş tavsiyeler sun.
    Veriler gerçek performansa dayalı olduğu için çok spesifik ve eyleme geçirilebilir öneriler ver.

    ÖĞRENCI VERİ ANALİZİ:
    
    📚 ÇALIŞMA KAYITLARI:
    ${studyAnalysis || "Henüz çalışma kaydı girilmemiş."}
    
    📊 DENEME SONUÇLARI:
    ${examAnalysis || "Henüz deneme sonucu girilmemiş."}
    
    📅 HAFTALIK PLAN DURUMU:
    ${planAnalysis || "Henüz haftalık plan oluşturulmamış."}

  ▶️ VİDEO İZLEME GEÇMİŞİ (Ders Rehberi):
  ${videoAnalysis || "Henüz video izleme kaydı yok."}

    GÖREV: Bu verilere dayanarak öğrencinin güçlü/zayıf yönlerini belirle, somut iyileştirme önerileri ver ve gelecek hafta için detaylı çalışma planı oluştur. Motivasyonu yüksek tut ama gerçekçi ol.

  Analizini ve önerilerini sadece aşağıda belirtilen JSON şemasına uygun olarak döndür.
  `;
};

const recommendationSchema = {
  type: Type.OBJECT,
  properties: {
    hasData: {
      type: Type.BOOLEAN,
      description: "Kullanıcının analiz edilecek verisi var mı?",
    },
    warningMessage: {
      type: Type.STRING,
      description: "Eğer veri yoksa gösterilecek uyarı mesajı",
    },
    strengths: {
      type: Type.ARRAY,
      description:
        "Öğrencinin güçlü olduğu 2-3 ders veya konu. Sadece hasData true ise doldurulur.",
      items: { type: Type.STRING },
    },
    weaknesses: {
      type: Type.ARRAY,
      description:
        "Öğrencinin zayıf olduğu ve odaklanması gereken 2-3 ders veya konu. Sadece hasData true ise doldurulur.",
      items: { type: Type.STRING },
    },
    weeklyPlan: {
      type: Type.ARRAY,
      description:
        "Önümüzdeki 7 gün için günlük görevler içeren bir çalışma planı. Sadece hasData true ise doldurulur.",
      items: {
        type: Type.OBJECT,
        properties: {
          day: {
            type: Type.STRING,
            description: "Haftanın günü (Pazartesi, Salı, vb.)",
          },
          tasks: {
            type: Type.ARRAY,
            description:
              "O gün yapılacak çalışma görevleri (örn: 'Matematik - Türev tekrarı yap.')",
            items: { type: Type.STRING },
          },
        },
        required: ["day", "tasks"],
      },
    },
    recommendations: {
      type: Type.ARRAY,
      description:
        "Öğrencinin genel başarısını artırmak için 3-4 adet somut ve eyleme geçirilebilir tavsiye. Sadece hasData true ise doldurulur.",
      items: { type: Type.STRING },
    },
    dataRequirements: {
      type: Type.ARRAY,
      description:
        "Eğer hasData false ise, kullanıcının hangi verileri girmesi gerektiği",
      items: { type: Type.STRING },
    },
  },
  required: ["hasData"],
};

// Kullanım sınırı kontrolü
const checkUsageLimit = (settings?: any, userApiKey?: string): { allowed: boolean; remaining: number } => {
  // Kullanıcının kendi API anahtarı varsa sınır yok
  if (userApiKey && userApiKey.trim()) {
    return { allowed: true, remaining: -1 }; // -1 = sınırsız
  }

  // Sistem API anahtarı kullanılıyorsa saatlik sınır kontrol et
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  const usageHistory = settings?.aiUsageHistory || [];
  const recentUsage = usageHistory.filter((record: any) => {
    const recordTime = new Date(record.timestamp);
    return recordTime > oneHourAgo && record.success && !record.userApiKey;
  });

  const hourlyLimit = 2;
  const remaining = Math.max(0, hourlyLimit - recentUsage.length);
  
  return {
    allowed: recentUsage.length < hourlyLimit,
    remaining
  };
};

export const getAiCoachAdvice = async (
  data: AppData,
  userApiKey?: string,
  updateUsageCallback?: (record: any) => void
): Promise<AiRecommendation | null> => {
  const apiKey = getApiKey(userApiKey);
  const isUserApiKey = !!(userApiKey && userApiKey.trim());
  
  if (!apiKey) {
    throw new Error(
      "API Anahtarı bulunamadı. Lütfen kendi API anahtarınızı girin veya sistem yöneticisine başvurun."
    );
  }

  // Kullanım sınırı kontrolü
  const usageCheck = checkUsageLimit(data.settings, userApiKey);
  if (!usageCheck.allowed) {
    throw new Error(
      `Saatlik kullanım sınırına ulaştınız (2/2). ${usageCheck.remaining === 0 ? 'Bir saat sonra tekrar deneyin' : `${usageCheck.remaining} hakkınız kaldı`} veya kendi API anahtarınızı girin.`
    );
  }

  const usageRecord = {
    timestamp: new Date().toISOString(),
    success: false,
    userApiKey: isUserApiKey
  };

  try {
    const ai = createAiInstance(apiKey);
    const prompt = generatePrompt(data);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recommendationSchema,
        temperature: 0.7,
      },
    });
    // SDK sürümleri arasında çıktı alanları değişebiliyor; güvenli şekilde al.
    const rawText =
      typeof (response as any).text === "string"
        ? (response as any).text
        : typeof (response as any).outputText === "string"
        ? (response as any).outputText
        : "";

    const jsonText = rawText?.trim?.() ?? "";
    if (!jsonText) {
      throw new Error("Google AI servisinden boş yanıt alındı.");
    }
    
    const result = JSON.parse(jsonText) as AiRecommendation;
    
    // Başarılı kullanım kaydı
    usageRecord.success = true;
    if (updateUsageCallback) {
      updateUsageCallback(usageRecord);
    }
    
    return result;
  } catch (error) {
    console.error("Error fetching AI coach advice:", error);
    
    // Başarısız kullanım kaydı (sadece sistem API anahtarı için)
    if (!isUserApiKey && updateUsageCallback) {
      updateUsageCallback(usageRecord);
    }
    
    // You might want to handle specific error types from the API here
    if (error instanceof Error) {
      throw new Error(
        `Google AI servisinden yanıt alınamadı: ${error.message}`
      );
    }
    throw new Error("Google AI servisinden bilinmeyen bir hata oluştu.");
  }
};

// Kısa motivasyon mesajı (en fazla 3 cümle)
export const getMotivationBlurb = async (
  data: AppData,
  userApiKey?: string,
  updateUsageCallback?: (record: any) => void
): Promise<string> => {
  const apiKey = getApiKey(userApiKey);
  const isUserApiKey = !!(userApiKey && userApiKey.trim());
  if (!apiKey) {
    // API yoksa sabit motive edici mesaj döndür
    return 'Hedefine bir adım daha! 25 dakika odaklan, küçük kazanımlar büyük fark yaratır. Kendine güven.';
  }

  const usageRecord = {
    timestamp: new Date().toISOString(),
    success: false,
    userApiKey: isUserApiKey
  };
  try {
    const ai = createAiInstance(apiKey);
    const prefs = data.settings?.aiCoachPrefs;
    const length = prefs?.length || 'kısa';
    const allowEmojis = !!prefs?.allowEmojis;
    const custom = prefs?.instructions ? `\nKULLANICI TALİMATLARI: ${prefs.instructions}\n` : '';
    const t = prefs?.targets;
    const targets = t ? `\nHEDEFLER: ${
      [
        t.rank ? `Hedef sıralama: ${t.rank}` : null,
        t.university ? `Hedef üniversite: ${t.university}` : null,
        t.department ? `Hedef bölüm: ${t.department}` : null,
        t.targetNetsText ? `Hedef netler: ${t.targetNetsText}` : null
      ].filter(Boolean).join(' | ')
    }\n` : '';
    const brief = `${buildPersonaHeader(data)}${custom}${targets}\nKullanıcı YKS için hazırlanıyor. Verilere göre en fazla 3 ${length === 'kısa' ? 'kısa' : length === 'orta' ? 'cümle' : 'cümlede'} motive edici mesaj yaz. Saatlik planı varsa kısaca hatırlat. ${allowEmojis ? 'Emoji kullanımı serbest (abartma).' : 'Emoji kullanma.'}\n\nÖzet çalışma: ${data.subjectStudyRecords?.length || 0} ders kaydı, ${data.practiceExams?.length || 0} deneme. Plan sayısı: ${(data.weeklySchedules?.[data.weeklySchedules.length-1]?.days || []).reduce((s,d)=>s+d.plans.length,0)}.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: brief,
      config: { responseMimeType: 'text/plain', temperature: 0.7 }
    });
    const text = (response as any).text || (response as any).outputText || '';
    usageRecord.success = true;
    if (updateUsageCallback) updateUsageCallback(usageRecord);
    return (text || '').trim().split('\n').filter(Boolean).slice(0,3).join(' ');
  } catch (e) {
    if (!isUserApiKey && updateUsageCallback) updateUsageCallback(usageRecord);
    return 'Bugün odaklanırsan yarın daha rahatsın. Hemen 25 dakika başla ve mini hedefine tik at.';
  }
};

// Basit sohbet: kullanıcı kendi API anahtarıyla konuşur; kısa geçmiş + persona ile yanıt üretir
export type ChatTurn = { role: 'user' | 'model'; text: string };

export const chatWithAi = async (
  data: AppData,
  userApiKey: string | undefined,
  history: ChatTurn[],
  updateUsageCallback?: (record: any) => void
): Promise<string> => {
  if (!userApiKey || !userApiKey.trim()) {
    throw new Error("Lütfen Ayarlar'dan Google Gemini API anahtarınızı girin.");
  }

  const apiKey = userApiKey.trim();
  const usageRecord = {
    timestamp: new Date().toISOString(),
    success: false,
    userApiKey: true
  };

  try {
    const ai = createAiInstance(apiKey);
    const persona = buildPersonaHeader(data);
    const recent = history.slice(-10); // son 10 mesaj
    const transcript = recent
      .map((t) => (t.role === 'user' ? `KULLANICI: ${t.text}` : `KOÇ: ${t.text}`))
      .join('\n');
    const prompt = `${persona}\nAşağıda KULLANICI ile KOÇ arasında kısa bir sohbet var. KOÇ az ve net yanıt verir.\n\n${transcript}\n\nKOÇ olarak bir sonraki mesaja tek bir blok metinle yanıt ver.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'text/plain', temperature: 0.7 }
    });
    const text = (response as any).text || (response as any).outputText || '';
    usageRecord.success = true;
    if (updateUsageCallback) updateUsageCallback(usageRecord);
    return (text || '').trim();
  } catch (e) {
    if (updateUsageCallback) updateUsageCallback(usageRecord);
    if (e instanceof Error) throw e;
    throw new Error('Sohbet yanıtı alınamadı.');
  }
};
