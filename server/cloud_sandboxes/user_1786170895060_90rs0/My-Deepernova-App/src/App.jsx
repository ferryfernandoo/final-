import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './components/MessageBubble';
import ChatInput from './components/ChatInput';

const initialMessages = [
  { id: 1, sender: 'bot', text: 'Halo! 👋 Aku Bot Deepernova. Ada yang bisa aku bantu?', time: '10:00' },
  { id: 2, sender: 'user', text: 'Hai! Bisa kasih tau cara pakai aplikasi ini?', time: '10:01' },
  { id: 3, sender: 'bot', text: 'Tentu! Kamu bisa ketik pesan di bawah, lalu tekan Kirim. Aku akan membalas otomatis 😊', time: '10:01' },
];

const getCurrentTime = () => {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const getBotReply = (text) => {
  const lower = text.toLowerCase();
  if (lower.includes('halo') || lower.includes('hai') || lower.includes('hello')) {
    return 'Halo juga! 👋 Ada yang bisa aku bantu?';
  }
  if (lower.includes('terima kasih') || lower.includes('makasih')) {
    return 'Sama-sama! 😊 Semoga membantu ya.';
  }
  if (lower.includes('apa') || lower.includes('siapa')) {
    return 'Aku adalah bot Deepernova yang siap membantu pertanyaanmu. Tanya apa saja!';
  }
  if (lower.includes('cara') || lower.includes('pakai')) {
    return 'Caranya mudah: ketik pesan di kolom bawah lalu tekan Kirim atau Enter. Aku akan merespons otomatis! 😄';
  }
  if (lower.includes('harga') || lower.includes('biaya')) {
    return 'Harga layanan ini gratis untuk saat ini! 🎉';
  }
  const defaultReplies = [
    'Menarik! Bisa jelaskan lebih lanjut? 🤔',
    'Oke, aku mengerti. Ada hal lain yang ingin kamu tanyakan?',
    'Terima kasih sudah berbagi! Aku di sini untuk membantu 😄',
    'Bagus! Apa yang bisa aku bantu selanjutnya?',
    'Hmm, aku akan cari tahu ya. Tunggu sebentar...',
    'Itu ide yang bagus! 💡',
    'Boleh dicoba! Ada yang ingin kamu eksplorasi?',
  ];
  return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
};

export default function App() {
  const [messages, setMessages] = useState(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (text) => {
    if (!text.trim()) return;
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text,
      time: getCurrentTime(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);
    const delay = 800 + Math.random() * 1200;
    setTimeout(() => {
      const botReply = getBotReply(text);
      const botMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: botReply,
        time: getCurrentTime(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, delay);
  };

  const handleReset = () => {
    setMessages(initialMessages);
    setIsTyping(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-slate-800/90 backdrop-blur-lg border border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-2xl shadow-lg">
                🤖
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-800">
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">CodeDance Chat</h1>
              <p className="text-xs text-green-400">Online</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs text-white transition focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            title="Reset chat"
          >
            🔄 Reset
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/50">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isTyping && (
            <div className="flex justify-start mb-3">
              <div className="bg-slate-700 text-slate-300 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm flex items-center gap-1">
                <span className="animate-bounce">•
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>•
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>•
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
}