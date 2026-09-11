'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquareText, X, Sparkles } from 'lucide-react';
import { ChatWindow } from './chat-window';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotificationBadge, setShowNotificationBadge] = useState(false);

  useEffect(() => {
    // Pokaż subtelny dymek powitalny po 2.5 sekundach, jeśli czat nie został jeszcze otwarty
    const timer = setTimeout(() => {
      setShowNotificationBadge(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setShowNotificationBadge(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end print:hidden">
      {/* Okno czatu */}
      {isOpen && (
        <div className="mb-4 h-[620px] max-h-[82vh] w-[420px] max-w-[calc(100vw-32px)] origin-bottom-right transition-all animate-in fade-in-50 zoom-in-95 duration-200">
          <ChatWindow onClose={handleClose} />
        </div>
      )}

      {/* Dymek podpowiedzi przed otwarciem */}
      {!isOpen && showNotificationBadge && (
        <div
          onClick={handleOpen}
          className="mb-3 flex max-w-[280px] cursor-pointer items-center gap-2.5 rounded-2xl border border-line bg-white/95 backdrop-blur-md px-3.5 py-2.5 shadow-[0_10px_25px_rgba(0,0,0,0.12)] transition-all hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
            <Sparkles className="size-3.5 text-amber-400" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-ink">Doradca Rexor AI</p>
            <p className="text-ink-muted text-[11px] leading-tight">
              Masz pytania o E82, E55, baterie lub zasięg? Kliknij tutaj!
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowNotificationBadge(false);
            }}
            className="text-ink-muted hover:text-ink p-0.5 rounded-md hover:bg-black/5"
            aria-label="Zamknij podpowiedź"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Pływający przycisk z ikoną czatbota */}
      <button
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        aria-label={isOpen ? 'Zamknij czat z doradcą' : 'Otwórz czat z doradcą Rexor AI'}
        aria-expanded={isOpen}
        className={`group relative flex size-14 items-center justify-center rounded-2xl shadow-[0_10px_28px_rgba(0,0,0,0.2)] transition-all duration-300 hover:scale-105 active:scale-95 ${
          isOpen
            ? 'bg-zinc-900 text-white hover:bg-black ring-2 ring-white/20'
            : 'bg-ink text-white hover:bg-black ring-1 ring-white/15'
        }`}
      >
        {isOpen ? (
          <X className="size-6 transition-transform duration-200 group-hover:rotate-90" />
        ) : (
          <>
            <MessageSquareText className="size-6 text-white transition-transform duration-200 group-hover:scale-110" />
            {/* Wskaźnik online / AI */}
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-amber-400 ring-2 ring-white" />
            </span>
          </>
        )}
      </button>
    </div>
  );
}
