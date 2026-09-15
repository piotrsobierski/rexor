'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

/**
 * Wspólny formularz dla /kontakt i CTA na /serwis - jedno API (POST /contact),
 * `type` decyduje po stronie backendu, na jaki adres trafi wiadomość
 * (ustawiane w panelu admina, zakładka "Poczta").
 */
export function ContactForm({ type, title, description }: { type: 'contact' | 'service'; title?: string; description?: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
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
        body: JSON.stringify({ type, name, email, phone, message }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Nie udało się wysłać wiadomości.');
      setStatus('sent');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
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
    <div className="grid gap-1.5"><Label htmlFor={`${type}-message`}>Wiadomość</Label><Textarea id={`${type}-message`} required className="min-h-32" value={message} onChange={(event) => setMessage(event.target.value)} /></div>
    {error && <p className="text-sm text-red-600">{error}</p>}
    <Button type="submit" disabled={status === 'sending'} className="h-11 rounded-full bg-ink text-white">{status === 'sending' && <Loader2 className="animate-spin" />} Wyślij wiadomość</Button>
  </form>;
}
