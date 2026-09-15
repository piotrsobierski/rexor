'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

/** Dodatkowe, opcjonalne pole tekstowe dopisywane do `context` wysyłki (np. rozmiar ramy). */
export type ContactExtraField = { name: string; label: string; placeholder?: string };

/**
 * Wspólny formularz dla /kontakt, CTA na /serwis i zapytania o ramę - jedno API
 * (POST /contact), `type` decyduje po stronie backendu, na jaki adres trafi
 * wiadomość (ustawiane w panelu admina, zakładka "Poczta").
 *
 * `context` to stałe dane, których użytkownik nie wpisuje (slug i nazwa ramy),
 * a `extraFields` to pola formularza dopisywane do tego samego obiektu. Dzięki
 * temu nie budujemy drugiego formularza dla każdej nowej intencji - etykiety
 * przychodzą z `copy.ts` od strony wywołującej.
 */
export function ContactForm({ type, title, description, context, extraFields = [] }: {
  type: 'contact' | 'service' | 'frame';
  title?: string;
  description?: string;
  context?: Record<string, string>;
  extraFields?: ContactExtraField[];
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const response = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name,
          email,
          phone,
          message,
          // Klucze pól dodatkowych są zawsze obecne (choćby puste), żeby backend
          // dostawał payload o stałym kształcie opisanym w docs/PLAN_RAMY_REALIZACJE.md.
          ...(context || extraFields.length
            ? { context: { ...context, ...Object.fromEntries(extraFields.map((field) => [field.name, extras[field.name] ?? ''])) } }
            : {}),
        }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Nie udało się wysłać wiadomości.');
      setStatus('sent');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setExtras({});
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Nie udało się wysłać wiadomości.');
    }
  }

  if (status === 'sent') {
    return <div className="rounded-2xl border border-line bg-white p-6 text-center">
      <CheckCircle2 className="mx-auto size-8 text-emerald-600" />
      <p className="mt-3 font-semibold">Dziękujemy za wiadomość!</p>
      <p className="mt-1 text-sm text-ink-muted">Odpowiemy najszybciej, jak to możliwe.</p>
    </div>;
  }

  return <form onSubmit={submit} className="grid gap-4">
    {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
    {description && <p className="text-sm text-ink-muted">{description}</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-1.5"><Label htmlFor={`${type}-name`}>Imię i nazwisko</Label><Input id={`${type}-name`} required value={name} onChange={(event) => setName(event.target.value)} /></div>
      <div className="grid gap-1.5"><Label htmlFor={`${type}-email`}>E-mail</Label><Input id={`${type}-email`} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
    </div>
    <div className="grid gap-1.5"><Label htmlFor={`${type}-phone`}>Telefon (opcjonalnie)</Label><Input id={`${type}-phone`} value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
    {extraFields.length > 0 && <div className="grid gap-3 sm:grid-cols-2">
      {extraFields.map((field) => <div key={field.name} className="grid gap-1.5">
        <Label htmlFor={`${type}-${field.name}`}>{field.label}</Label>
        <Input id={`${type}-${field.name}`} placeholder={field.placeholder} value={extras[field.name] ?? ''} onChange={(event) => setExtras((current) => ({ ...current, [field.name]: event.target.value }))} />
      </div>)}
    </div>}
    <div className="grid gap-1.5"><Label htmlFor={`${type}-message`}>Wiadomość</Label><Textarea id={`${type}-message`} required className="min-h-32" value={message} onChange={(event) => setMessage(event.target.value)} /></div>
    {error && <p className="text-sm text-red-600">{error}</p>}
    <Button type="submit" disabled={status === 'sending'} className="h-11 rounded-full bg-ink text-white">{status === 'sending' && <Loader2 className="animate-spin" />} Wyślij wiadomość</Button>
  </form>;
}
