-- Rozwinięcie szkieletów z migracji 022 do pełnej treści regulaminu i
-- polityki prywatności (typowej dla sklepu z konfiguratorem produktu na
-- zamówienie). To NIE jest porada prawna - pola w nawiasach kwadratowych
-- (dane firmy, terminy realizacji) admin musi uzupełnić realnymi danymi
-- przed potraktowaniem tekstu jako ostateczny (patrz docs/PYTANIA_OTWARTE.md).

UPDATE site_pages SET content_html = '<p><em>Poniższy tekst to gotowy do uzupełnienia szablon regulaminu, nie porada prawna. Pola w nawiasach kwadratowych trzeba wypełnić realnymi danymi firmy przed publikacją jako ostateczna wersja - zobacz docs/PYTANIA_OTWARTE.md.</em></p>
<h2>&sect;1. Postanowienia ogólne</h2>
<p>Niniejszy regulamin określa zasady korzystania z konfiguratora rowerów oraz składania zapytań ofertowych i zamówień za pośrednictwem serwisu internetowego [nazwa serwisu] (dalej: „Serwis”).</p>
<p>Administratorem Serwisu i sprzedawcą jest [pełna nazwa firmy], [adres siedziby], NIP: [NIP], REGON: [REGON], e-mail: [e-mail kontaktowy], telefon: [numer telefonu] (dalej: „Sprzedawca”).</p>
<h2>&sect;2. Konfigurator i zapytania ofertowe</h2>
<p>Konfigurator pozwala dobrać model, rozmiar, baterię i osprzęt roweru oraz zobaczyć orientacyjną cenę brutto. Zapisanie konfiguracji i przesłanie danych kontaktowych nie stanowi zawarcia umowy sprzedaży, lecz zapytanie ofertowe.</p>
<p>Sprzedawca kontaktuje się z klientem w celu potwierdzenia dostępności wybranych elementów, zgodności technicznej konfiguracji oraz ostatecznej ceny i terminu realizacji. Umowa sprzedaży zostaje zawarta dopiero po takim potwierdzeniu przez obie strony.</p>
<h2>&sect;3. Ceny i płatność</h2>
<p>Ceny prezentowane w konfiguratorze są cenami brutto (zawierają podatek VAT) i mają charakter orientacyjny do czasu potwierdzenia zamówienia przez Sprzedawcę. Sposób i termin płatności ustalane są indywidualnie przy potwierdzeniu zamówienia. [Opisz akceptowane metody płatności, np. przelew, płatność online, płatność przy odbiorze.]</p>
<h2>&sect;4. Realizacja zamówienia</h2>
<p>Orientacyjny czas realizacji zamówienia wynosi [czas realizacji, np. 14-30 dni roboczych] od potwierdzenia zamówienia i wpłaty (jeśli wymagana). [Opisz sposób dostawy/odbioru: kurier, odbiór osobisty, punkt partnerski.] Dokładny termin Sprzedawca potwierdza indywidualnie.</p>
<h2>&sect;5. Prawo odstąpienia od umowy</h2>
<p>Konsumentowi przysługuje prawo odstąpienia od umowy zawartej na odległość w terminie 14 dni bez podania przyczyny, zgodnie z ustawą z dnia 30 maja 2014 r. o prawach konsumenta.</p>
<p>Prawo odstąpienia nie przysługuje w odniesieniu do umów, w których przedmiotem świadczenia jest rzecz nieprefabrykowana, wyprodukowana według specyfikacji konsumenta lub służąca zaspokojeniu jego zindywidualizowanych potrzeb (art. 38 pkt 3 ustawy o prawach konsumenta) - dotyczy to roweru złożonego według indywidualnie wybranej w konfiguratorze specyfikacji. [Ustal i doprecyzuj z prawnikiem zakres wyłączenia odpowiadający faktycznemu modelowi sprzedaży.]</p>
<h2>&sect;6. Reklamacje i rękojmia</h2>
<p>Sprzedawca odpowiada za zgodność towaru z umową na zasadach określonych w Kodeksie cywilnym oraz ustawie o prawach konsumenta. Reklamacje można zgłaszać na adres e-mail [e-mail kontaktowy] lub pisemnie na adres siedziby Sprzedawcy. Sprzedawca ustosunkuje się do reklamacji w terminie 14 dni od jej otrzymania.</p>
<h2>&sect;7. Dane osobowe</h2>
<p>Zasady przetwarzania danych osobowych opisuje odrębna <a href="/polityka-prywatnosci">Polityka prywatności</a>.</p>
<h2>&sect;8. Postanowienia końcowe</h2>
<p>W sprawach nieuregulowanych niniejszym regulaminem zastosowanie mają przepisy prawa polskiego, w tym Kodeksu cywilnego oraz ustawy o prawach konsumenta. Regulamin może ulegać zmianom; zamówienia złożone przed zmianą regulaminu realizowane są na dotychczasowych zasadach.</p>'
WHERE slug = 'regulamin';

UPDATE site_pages SET content_html = '<p><em>Poniższy tekst to gotowy do uzupełnienia szablon polityki prywatności, nie porada prawna/opinia IOD. Pola w nawiasach kwadratowych trzeba wypełnić realnymi danymi firmy przed publikacją jako ostateczna wersja - zobacz docs/PYTANIA_OTWARTE.md.</em></p>
<h2>&sect;1. Administrator danych</h2>
<p>Administratorem danych osobowych przetwarzanych w związku z korzystaniem z Serwisu jest [pełna nazwa firmy], [adres siedziby], NIP: [NIP], e-mail: [e-mail kontaktowy].</p>
<h2>&sect;2. Zakres i cel przetwarzania</h2>
<p>W formularzu konfiguratora i zapytania ofertowego przetwarzamy: imię i nazwisko, adres e-mail, numer telefonu, treść uwag oraz wybraną konfigurację roweru. Dane te przetwarzamy w celu przygotowania oferty, kontaktu w tej sprawie oraz - po potwierdzeniu zamówienia - jego realizacji.</p>
<h2>&sect;3. Podstawa prawna</h2>
<p>Podstawą przetwarzania jest art. 6 ust. 1 lit. b RODO (działania podejmowane na żądanie osoby przed zawarciem umowy oraz wykonanie umowy) oraz art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes administratora, np. dochodzenie roszczeń, archiwizacja korespondencji).</p>
<h2>&sect;4. Okres przechowywania</h2>
<p>Dane przechowujemy przez czas niezbędny do realizacji zapytania/zamówienia, a następnie przez okres przedawnienia ewentualnych roszczeń [doprecyzuj konkretny okres, jeśli inny niż ustawowy] lub do momentu wycofania zgody, jeśli przetwarzanie odbywało się na jej podstawie.</p>
<h2>&sect;5. Odbiorcy danych</h2>
<p>Dane mogą być powierzane podmiotom wspierającym działanie Serwisu (np. dostawca hostingu) oraz - w zakresie niezbędnym do realizacji zamówienia - firmie kurierskiej/spedycyjnej. [Uzupełnij listę faktycznie używanych podmiotów przetwarzających.]</p>
<h2>&sect;6. Prawa osoby, której dane dotyczą</h2>
<p>Przysługuje Ci prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia danych, wniesienia sprzeciwu wobec przetwarzania oraz wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych.</p>
<h2>&sect;7. Pliki cookies i przechowywanie lokalne</h2>
<p>Serwis zapisuje w przeglądarce lokalnie (localStorage) informację o zaakceptowaniu ostrzeżenia prawnego przy wejściu w kategorię „Pojazdy elektryczne” - dane te nie opuszczają Twojej przeglądarki i nie są przez nas odczytywane. [Jeśli Serwis zacznie używać narzędzi analitycznych/marketingowych (np. Google Analytics), uzupełnij tę sekcję o pełną informację o cookies i uzyskaj wymaganą zgodę.]</p>
<h2>&sect;8. Kontakt w sprawie danych osobowych</h2>
<p>W sprawach dotyczących przetwarzania danych osobowych napisz na [e-mail kontaktowy].</p>'
WHERE slug = 'polityka-prywatnosci';
