"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Minus, Square, Maximize2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'jarvis';
  timestamp: Date;
}

interface JarvisChatProps {
  onScanCommand?: (sector: string, city: string) => void;
  leads?: any[];
}

export default function JarvisChat({ onScanCommand, leads }: JarvisChatProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Merhaba, ben JARVIS. Lead havuzunu optimize etmek için hazırım. Ne yapmamı istersin?',
      sender: 'jarvis',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/leads/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, leadContext: leads })
      });
      
      const data = await res.json();
      
      const jarvisMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply,
        sender: 'jarvis',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, jarvisMsg]);

      if (data.action === 'scan' && data.sector && onScanCommand) {
        toast.success(`JARVIS tarama başlatıyor: ${data.sector} - ${data.city || 'Tümü'}`);
        onScanCommand(data.sector, data.city || '');
      }
    } catch (error) {
       toast.error('JARVIS ile bağlantı kurulamadı');
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-500 transition-colors z-[100] glow-accent"
      >
        <MessageSquare className="w-5 h-5 text-white" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[360px] bg-[#080b12] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-2xl flex flex-col z-[100] overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[#0d1117]">
        <div className="flex items-center gap-2">
            <span className="text-[12px] font-mono font-bold text-[var(--text-primary)]">// JARVIS LIVE</span>
            <div className={`w-2 h-2 rounded-full ${isTyping ? 'bg-yellow-400 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_var(--success)]'}`} />
        </div>
        <button onClick={() => setIsOpen(false)} className="text-[var(--text-tertiary)] hover:text-white">
          <Minus size={16} />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="h-[280px] overflow-y-auto p-4 flex flex-col gap-3"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.map(msg => (
          <div 
            key={msg.id}
            className={`max-w-[85%] p-3 rounded-[var(--radius-md)] text-[12px] ${
              msg.sender === 'user' 
                ? 'self-end bg-[var(--accent-subtle)] border border-[var(--accent-muted)] color-[var(--accent)] text-[#4f9cf9]' 
                : 'self-start bg-[var(--surface-elevated)] border border-[var(--border-subtle)] color-[var(--text-primary)] font-mono leading-relaxed'
            }`}
          >
            {msg.text}
          </div>
        ))}
        {isTyping && (
           <div className="self-start bg-[var(--surface-elevated)] border border-[var(--border-subtle)] p-2 rounded-[var(--radius-md)] text-[10px] font-mono text-[var(--text-tertiary)] italic">
             // DÜŞÜNÜYOR...
           </div>
        )}
      </div>

      {/* Commands Area */}
      {input === '' && (
        <div className="px-4 pb-2">
           <p className="text-[9px] text-[var(--text-tertiary)] font-bold mb-2 tracking-wider">// ÖRNEK KOMUTLAR</p>
           <div className="flex flex-wrap gap-1.5">
             {[
               "İstanbul'da güzellik salonu tara",
               "Skor 80 üstü leadleri listele",
               "Bu hafta kaç lead eklendi?",
               "Yeni lead analiz et"
             ].map(cmd => (
               <button 
                key={cmd}
                onClick={() => handleSend(cmd)}
                className="text-[10px] px-2 py-1 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded hover:border-[var(--accent-muted)] hover:text-[var(--accent)] transition-colors whitespace-nowrap"
               >
                 {cmd}
               </button>
             ))}
           </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-[var(--border-subtle)] flex gap-2 bg-[#0d1117]">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="JARVIS'e yaz..."
          className="flex-1 bg-[var(--surface-overlay)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 text-[12px] text-white focus:border-[var(--accent-muted)] transition-colors outline-none"
        />
        <button 
          onClick={() => handleSend()}
          disabled={isTyping}
          className="bg-[var(--accent)] text-white p-2 rounded-[var(--radius-sm)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
