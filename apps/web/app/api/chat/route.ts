import { NextResponse } from 'next/server';
import { getLiveRexorKnowledgePrompt } from '@/lib/chatbot/rexor-knowledge';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[] };
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];

    if (!messages.length) {
      return NextResponse.json(
        { error: 'Brak wiadomości do przetworzenia.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error('[Rexor Chatbot] Błąd: Brak zmiennej środowiskowej OPENROUTER_API_KEY na serwerze.');
      return NextResponse.json(
        { error: 'Błąd konfiguracji serwera: brak klucza OPENROUTER_API_KEY.' },
        { status: 500 }
      );
    }

    const model = process.env.OPENROUTER_MODEL || 'z-ai/glm-5.3-flash';

    // Pobieramy całą wiedzę bezpośrednio z bazy danych i cennika API w czasie rzeczywistym
    const systemPrompt = await getLiveRexorKnowledgePrompt();

    // Filtrujemy i ograniczamy historię wiadomości do ostatnich 10, by zachować płynność
    const sanitizedHistory = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-10);

    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...sanitizedHistory,
      ],
      temperature: 0.6,
      max_tokens: 1500,
      include_reasoning: false,
    };

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://rexorbikes.com',
        'X-Title': 'Rexor Bikes AI Advisor',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Rexor Chatbot] OpenRouter error:', response.status, errorText);
      return NextResponse.json(
        { error: `Błąd komunikacji z OpenRouter (${response.status}). Spróbuj ponownie za chwilę.` },
        { status: response.status }
      );
    }

    type OpenRouterResponse = {
      model?: string;
      usage?: unknown;
      choices?: Array<{
        message?: {
          content?: string | null;
          reasoning?: string | null;
        };
      }>;
    };

    const data = (await response.json()) as OpenRouterResponse;
    const choice = data?.choices?.[0];
    const rawReply = choice?.message?.content ?? '';

    // Bezpieczne czyszczenie ewentualnych znaczników myślenia
    let reply = rawReply
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/^Thinking Process:[\s\S]*?(?:\n\n|\r\n\r\n)/gi, '')
      .trim();

    if (!reply) {
      reply = 'Przepraszam, nie udało mi się wygenerować odpowiedzi. Proszę zadać pytanie ponownie.';
    }

    return NextResponse.json({
      reply,
      model: 'Rexor AI',
      usage: data?.usage,
    });
  } catch (error: unknown) {
    console.error('[Rexor Chatbot] Server handler error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Wystąpił nieoczekiwany błąd serwera.' },
      { status: 500 }
    );
  }
}
