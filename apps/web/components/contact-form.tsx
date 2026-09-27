'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicCopy, usePublicCopyReady } from '@/lib/use-public-copy';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

/**
 * Dodatkowe pole dopisywane do `context` wysyłki (np. rozmiar ramy). Bez
 * `options` to zwykły tekst; z `options` (kod + etykieta) to lista wyboru -
 * np. rozmiary ramy zdefiniowane w panelu zamiast wpisywania ich ręcznie.
 */
export type ContactExtraField = {
  name: string;
  label: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
};

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
  // Etykiety wspólnego formularza są edytowalne w panelu (zakładka „Teksty",
  // sekcja Contact) - jak pozostałe teksty publiczne. Szkielet, dopóki teksty
  // nie są potwierdzone, żeby nie mignęła wartość z builda.
  const copy = usePublicCopy();
  const copyReady = usePublicCopyReady();
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
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : copy.contact.submitError);
      setStatus('sent');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setExtras({});
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : copy.contact.submitError);
    }
  }

  if (status === 'sent') {
    return <div className="rounded-2xl border border-line bg-white p-6 text-center">
      <CheckCircle2 className="mx-auto size-8 text-emerald-600" />
      <p className="mt-3 font-semibold">{copy.contact.successTitle}</p>
      <p className="mt-1 text-sm text-ink-muted">{copy.contact.successText}</p>
    </div>;
  }

  return <form onSubmit={submit} className="grid gap-4">
    {title && <h2 className="text-xl font-semibold tracking-tight">{copyReady ? title : <Skeleton aria-hidden="true" className="h-6 w-28" />}</h2>}
    {description && <p className="text-sm text-ink-muted">{copyReady ? description : <Skeleton aria-hidden="true" className="mt-1 h-4 w-48" />}</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-1.5"><Label htmlFor={`${type}-name`}>{copyReady ? copy.contact.nameLabel : <Skeleton aria-hidden="true" className="h-4 w-24" />}</Label><Input id={`${type}-name`} required value={name} onChange={(event) => setName(event.target.value)} /></div>
      <div className="grid gap-1.5"><Label htmlFor={`${type}-email`}>{copyReady ? copy.contact.emailLabel : <Skeleton aria-hidden="true" className="h-4 w-14" />}</Label><Input id={`${type}-email`} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
    </div>
    <div className="grid gap-1.5"><Label htmlFor={`${type}-phone`}>{copyReady ? copy.contact.phoneLabel : <Skeleton aria-hidden="true" className="h-4 w-32" />}</Label><Input id={`${type}-phone`} value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
    {extraFields.length > 0 && <div className="grid gap-3 sm:grid-cols-2">
      {extraFields.map((field) => <div key={field.name} className="grid gap-1.5">
        <Label htmlFor={`${type}-${field.name}`}>{field.label}</Label>
        {field.options ? (
          <NativeSelect
            id={`${type}-${field.name}`}
            required
            className="w-full"
            value={extras[field.name] ?? ''}
            onChange={(event) => setExtras((current) => ({ ...current, [field.name]: event.target.value }))}
          >
            <NativeSelectOption value="" disabled>{copyReady ? copy.contact.selectPlaceholder : '…'}</NativeSelectOption>
            {field.options.map((option) => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}
          </NativeSelect>
        ) : (
          <Input id={`${type}-${field.name}`} placeholder={field.placeholder} value={extras[field.name] ?? ''} onChange={(event) => setExtras((current) => ({ ...current, [field.name]: event.target.value }))} />
        )}
      </div>)}
    </div>}
    <div className="grid gap-1.5"><Label htmlFor={`${type}-message`}>{copyReady ? copy.contact.messageLabel : <Skeleton aria-hidden="true" className="h-4 w-20" />}</Label><Textarea id={`${type}-message`} required className="min-h-32" value={message} onChange={(event) => setMessage(event.target.value)} /></div>
    {error && <p className="text-sm text-red-600">{error}</p>}
    <Button type="submit" disabled={status === 'sending'} className="h-11 rounded-full bg-ink text-white">{status === 'sending' && <Loader2 className="animate-spin" />} {copyReady ? copy.contact.submitCta : <Skeleton aria-hidden="true" className="h-4 w-36" />}</Button>
  </form>;
}
