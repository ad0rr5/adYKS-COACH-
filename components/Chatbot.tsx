import React, { useCallback, useMemo, useRef, useState } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import { AppData } from '../types';
import { chatWithAi } from '../services/geminiService';
import { Send, Bot, User } from 'lucide-react';

interface ChatbotProps {
  data: AppData;
  updateAiUsage?: (record: any) => void;
}

interface ChatMessage { id: string; role: 'user' | 'model'; text: string; time: string }

const Chatbot: React.FC<ChatbotProps> = ({ data, updateAiUsage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const apiKey = data.settings?.geminiApiKey?.trim();
  const personaNote = useMemo(() => {
    const p = data.settings?.aiCoachPrefs;
    if (!p) return 'Üslup: samimi, kısa yanıtlar';
    return `Üslup: ${p.tone || 'samimi'} • Uzunluk: ${p.length || 'kısa'} • Emojiler: ${p.allowEmojis ? 'açık' : 'kapalı'}`;
  }, [data.settings?.aiCoachPrefs]);

  const send = useCallback(async () => {
    const content = input.trim();
    if (!content || loading) return;
    setLoading(true);
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: content, time: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    try {
      const reply = await chatWithAi(
        { ...data },
        apiKey,
        [...messages, userMsg].map(({ role, text }) => ({ role, text })),
        updateAiUsage
      );
      const botMsg: ChatMessage = { id: crypto.randomUUID(), role: 'model', text: reply, time: new Date().toISOString() };
      setMessages((m) => [...m, botMsg]);
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }));
    } catch (e) {
      const errText = e instanceof Error ? e.message : 'Mesaj gönderilemedi.';
      const botMsg: ChatMessage = { id: crypto.randomUUID(), role: 'model', text: `Hata: ${errText}`, time: new Date().toISOString() };
      setMessages((m) => [...m, botMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, data, apiKey, messages, updateAiUsage]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <Card title="Chatbot" fullHeight>
      <div className="flex flex-col h-full">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{personaNote}</div>
        {!apiKey && (
          <div className="mb-3 p-3 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 text-sm">
            Ayarlar &gt; Yapay Zeka API Anahtarı bölümünden anahtar ekleyin.
          </div>
        )}
        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-lg text-sm shadow ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}>
                <div className="flex items-center mb-1 opacity-75 text-xs">
                  {m.role === 'user' ? <User size={12} className="mr-1"/> : <Bot size={12} className="mr-1"/>}
                  {m.role === 'user' ? 'Sen' : 'Koç'}
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center space-x-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Mesaj yazın..."
            className="flex-1 p-3 rounded border bg-light-card dark:bg-dark-bg border-light-border dark:border-dark-border"
          />
          <Button onClick={send} disabled={!input.trim() || loading}>
            <Send size={16} className="mr-1"/> Gönder
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default Chatbot;
