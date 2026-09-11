'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, RotateCcw, Sparkles, Loader2 } from 'lucide-react';
import { ChatMessageItem } from './chat-message-item';
import type { ChatMessage } from '@/lib/chatbot/types';

interface ChatWindowProps {
  onClose: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: `Cześć! Jestem **Doradcą Rexor** 🚴‍♂️

Znam pełne specyfikacje naszych maszyn, geometrie, silniki Bafang M560 i M620, pakiety akumulatorowe (982 Wh i 1310 Wh), zasięgi w kilometrach oraz aktualne cenniki i możliwości konfiguratora.

O co chciałbyś zapytać?`,
};

export function ChatWindow({ onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    // Nie focusujemy automatycznie na dotykowych ekranach: programowy focus
    // na polu z font-size < 16px natychmiast wywołuje zoom całej strony
    // w Safari na iOS (klasyczny efekt "wybuchającej" strony po otwarciu czatu).
    const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
    if (!isTouchDevice && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: query },
    ];

    setMessages(newMessages);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      // Jedynym backendem czatu jest API PHP. Nie przełączamy się na drugi,
      // niepełny endpoint, gdy PHP lub baza są niedostępne.
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || `Błąd serwera (${response.status})`);
      }

      const data = (await response.json()) as { reply?: string };
      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply! },
        ]);
      } else {
        throw new Error('Brak odpowiedzi od asystenta.');
      }
    } catch (err: unknown) {
      console.error('[Chatbot error]:', err);
      const errMsg = err instanceof Error ? err.message : 'Wystąpił problem z połączeniem.';
      setError(errMsg);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `⚠️ **Przepraszam, API Rexor jest niedostępne**: ${errMsg}\n\nSprawdź połączenie z backendem PHP i spróbuj ponownie za chwilę.`,
        },
      ]);
    } finally {
      setIsLoading(false);
      // autofocus textarea po odpowiedzi (pomijamy na dotyku - patrz komentarz wyżej)
      const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
      if (!isTouchDevice) {
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
    setError(null);
    setInput('');
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-line bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
      {/* Nagłówek okna czatu */}
      <div className="flex items-center justify-between border-b border-line bg-ink px-4 py-3.5 text-white">
        <div className="flex items-center gap-3">
          <div className="relative flex size-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <Sparkles className="size-5 text-amber-400" />
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-ink" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white">Doradca Rexor</span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                Online
              </span>
            </div>
            <p className="text-[11px] text-white/60">Specyfikacje, baterie, zasięgi i cennik</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleReset}
            title="Wyczyść rozmowę"
            className="flex size-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            onClick={onClose}
            title="Zamknij czat"
            className="flex size-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Lista wiadomości */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--muted)]/40 scroll-smooth">
        {messages.map((m, idx) => (
          <ChatMessageItem key={idx} message={m} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-xl bg-ink text-white shadow-sm">
              <Sparkles className="size-4 text-amber-400 animate-spin" />
            </div>
            <div className="rounded-2xl bg-white border border-line px-4 py-3 text-sm text-ink-muted shadow-sm flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-ink" />
              <span className="text-xs font-mono">Rexor analizuje specyfikację...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Panel wprowadzania tekstu */}
      <div className="border-t border-line bg-white p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-[var(--muted)]/50 p-2 focus-within:border-ink focus-within:bg-white focus-within:ring-2 focus-within:ring-ink/10 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Zadaj pytanie o Rexor E82, E55, zasięg, cennik..."
            disabled={isLoading}
            className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-base sm:text-sm text-ink placeholder:text-ink-muted focus:outline-none"
          />
          <button
            onClick={() => { void handleSend(); }}
            disabled={!input.trim() || isLoading}
            aria-label="Wyślij wiadomość"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink text-white hover:bg-black disabled:opacity-30 transition-all shadow-sm"
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-ink-muted">
          <span>Enter = wyślij, Shift + Enter = nowa linia</span>
          <span className="font-medium">Rexor Bikes • Custom e-MTB</span>
        </div>
      </div>
    </div>
  );
}
