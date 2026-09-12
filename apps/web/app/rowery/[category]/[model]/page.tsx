import { BikeModelPage } from '@/components/static-pages';

// Nowe modele/ramy dochodzą tylko z bazy przez panel admina - nie da się
// wypisać z góry wszystkich par kategoria/model przy eksporcie statycznym.
// Zamiast tego generujemy jedną powłokę ("_") i .htaccess przekierowuje do
// niej każdy request /rowery/*/*; właściwy slug BikeModelPage czyta z URL-a
// po stronie klienta (useParams) i dobiera model z żywego katalogu z API.
// Ten sam wzorzec już działa dla /konfiguracja/[token].
export function generateStaticParams() {
  return [{ category: '_', model: '_' }];
}

export default function Page() {
  return <BikeModelPage />;
}
