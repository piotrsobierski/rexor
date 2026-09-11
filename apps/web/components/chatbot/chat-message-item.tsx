'use client';

import React from 'react';
import { Bot, User, ArrowUpRight } from 'lucide-react';
import type { ChatMessage } from '@/lib/chatbot/types';

/**
 * Zaawansowany i bezpieczny renderer Markdown dla czatbota:
 * - nagłówki (#, ##, ###, ####)
 * - linie poziome (---, ***)
 * - listy punktowane (*, -) oraz numerowane (1., 2.)
 * - pogrubienia (**bold**) oraz pogrubioną kursywę (***bold italic***)
 * - kursywę (*italic* lub _italic_)
 * - kod inline (`kod`)
 * - linki ([tekst](url)) z obsługą routingu wewnętrznego
 * - tabele markdown z wyrównaniem i komórkami
 * - czyszczenie formuł LaTeX ($$ ... $$) do czytelnego formatu
 */
function renderMarkdownContent(text: string) {
  // Usuwamy ewentualne wewnętrzne myśli modelu (<think>...</think> lub Thinking Process:)
  let cleanText = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^Thinking Process:[\s\S]*?(?:\n\n|\r\n\r\n)/gi, '')
    .trim();

  // Usuwamy lub formatujemy bloki math LaTeX $$ ... $$
  cleanText = cleanText.replace(/\$\$\\text\{Zasięg \(km\)\} = \\frac\{\\text\{.*?\}\}\{\\text\{.*?\}\}\$\$/gi, () => {
    return 'Zasięg (km) = Pojemność baterii (Wh) ÷ Średnie zużycie (Wh/km)';
  }).replace(/\$\$(.*?)\$\$/g, '$1').replace(/\\text\{(.*?)\}/g, '$1').replace(/\\frac\{(.*?)\}\{(.*?)\}/g, '$1 ÷ $2');

  const lines = cleanText.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeaders: string[] = [];

  const flushTable = (key: string) => {
    if (!inTable) return;
    elements.push(
      <div key={key} className="my-2.5 overflow-x-auto rounded-xl border border-line bg-ink/[0.02] p-2.5 text-xs shadow-sm">
        <table className="w-full border-collapse text-left">
          {tableHeaders.length > 0 && (
            <thead>
              <tr className="border-b border-line/80 font-semibold text-ink bg-black/[0.03]">
                {tableHeaders.map((th, i) => (
                  <th key={i} className="p-2 text-ink font-semibold">{parseInlineMarkdown(th)}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {tableRows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-line/40 last:border-0 hover:bg-black/[0.02] transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="p-2 text-ink/90">{parseInlineMarkdown(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    inTable = false;
    tableHeaders = [];
    tableRows = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Sprawdzenie tabeli markdown: np. | a | b |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      // Linia separatora | --- | --- | lub | :--- | :--- |
      if (cells.every((c) => /^[-:\s]+$/.test(c))) {
        return;
      }

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      return;
    } else if (inTable) {
      flushTable(`table-${idx}`);
    }

    if (!trimmed) {
      elements.push(<div key={`empty-${idx}`} className="h-2" />);
      return;
    }

    // Linia pozioma --- lub ***
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(<hr key={`hr-${idx}`} className="my-3 border-line/70" />);
      return;
    }

    // Nagłówki
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h5 key={`h4-${idx}`} className="mt-2.5 mb-1 font-bold text-ink text-[0.88rem] tracking-tight">
          {parseInlineMarkdown(trimmed.replace(/^####\s+/, ''))}
        </h5>
      );
      return;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${idx}`} className="mt-3 mb-1 font-bold text-ink text-[0.95rem] tracking-tight">
          {parseInlineMarkdown(trimmed.replace(/^###\s+/, ''))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${idx}`} className="mt-3.5 mb-1.5 font-bold text-ink text-[1.05rem] tracking-tight">
          {parseInlineMarkdown(trimmed.replace(/^##\s+/, ''))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${idx}`} className="mt-4 mb-2 font-bold text-ink text-lg tracking-tight">
          {parseInlineMarkdown(trimmed.replace(/^#\s+/, ''))}
        </h2>
      );
      return;
    }

    // Listy numerowane: np. "1. ", "2. "
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={`num-${idx}`} className="my-1 flex items-start gap-2 ml-2 text-[0.88rem] leading-relaxed text-ink/90">
          <span className="font-semibold text-ink font-mono text-xs mt-0.5 shrink-0">{numMatch[1]}.</span>
          <div className="flex-1">{parseInlineMarkdown(numMatch[2])}</div>
        </div>
      );
      return;
    }

    // Lista punktowana: "- ", "* "
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={`li-${idx}`} className="ml-4 list-disc pl-1 my-0.5 text-[0.88rem] leading-relaxed text-ink/90 marker:text-ink/60">
          {parseInlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}
        </li>
      );
      return;
    }

    // Zwykły akapit
    elements.push(
      <p key={`p-${idx}`} className="my-1 text-[0.88rem] leading-relaxed text-ink/90">
        {parseInlineMarkdown(trimmed)}
      </p>
    );
  });

  if (inTable) {
    flushTable('table-end');
  }

  return elements;
}

/**
 * Parsuje inline z pełnym wsparciem dla:
 * - ***bold italic***
 * - **bold**
 * - *italic* oraz _italic_
 * - `code`
 * - [label](url)
 */
function parseInlineMarkdown(text: string): React.ReactNode {
  // Regex dopasowujący kolejne tokeny markdown inline bez kolizji gwiazdek
  const tokenRegex = /(\*\*\*[^*]+?\*\*\*|\*\*[^*]+?\*\*|\*[^*]+?\*|_[^_]+?_|`[^`]+?`|\[[^\]]+?\]\([^)]+?\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Pogrubiona kursywa ***tekst***
    if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
      return (
        <strong key={index} className="font-bold italic text-ink">
          {part.slice(3, -3)}
        </strong>
      );
    }

    // Pogrubienie **tekst**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-bold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Kursywa *tekst* lub _tekst_
    if (
      ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) &&
      part.length >= 2
    ) {
      return (
        <em key={index} className="italic text-ink/90">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Kod inline `tekst`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={index} className="rounded bg-black/8 px-1.5 py-0.5 font-mono text-[0.82em] text-ink font-semibold">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Link [tekst](url)
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        const [, label, href] = match;
        const isInternal = href.startsWith('/');
        return (
          <a
            key={index}
            href={href}
            target={isInternal ? '_self' : '_blank'}
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors"
          >
            {label}
            {!isInternal && <ArrowUpRight className="size-3 inline" />}
          </a>
        );
      }
    }

    return part;
  });
}

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-xl bg-ink text-white shadow-sm mt-1">
          <Bot className="size-4 text-amber-400" />
        </div>
      )}

      <div
        className={`relative min-w-0 max-w-[85%] break-words rounded-2xl px-4 py-3 text-sm shadow-sm transition-all ${
          isUser
            ? 'bg-ink text-white rounded-br-sm'
            : 'bg-white border border-line text-ink rounded-bl-sm shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed text-sm font-normal text-white/95">
            {message.content}
          </p>
        ) : (
          <div className="rich-chat-content text-ink">
            {renderMarkdownContent(message.content)}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-xl bg-ink-wash border border-line text-ink-muted shadow-sm mt-1">
          <User className="size-4" />
        </div>
      )}
    </div>
  );
}
