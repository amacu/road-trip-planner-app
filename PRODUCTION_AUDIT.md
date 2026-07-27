# Audyt przed wdrożeniem produkcyjnym

Data audytu: 2026-07-27

## 1. Werdykt

**Status: aplikacja nie jest jeszcze gotowa do bezpiecznego wdrożenia produkcyjnego.**

Kod przechodzi lint, kontrolę typów, walidację Prisma i produkcyjny build. Audyt zależności
produkcyjnych nie wykazuje znanych podatności. Pozostają jednak dwa blokery procesu:

1. katalog roboczy nie zawiera metadanych Git, więc nie da się potwierdzić gałęzi, zmian,
   historii ani tego, czy sekrety nie były wcześniej śledzone;
2. repozytorium nie zawiera migracji Prisma, więc schemat produkcyjny nie może być
   odtworzony i wdrażany w kontrolowany sposób.

Przed produkcją trzeba też ręcznie zweryfikować ustawienia Supabase: redirect URLs,
RLS/granty, polityki Storage i konfigurację połączeń.

## 2. Zakres audytu

Sprawdzono:

- strukturę repozytorium i konfigurację Next.js, TypeScript, ESLint, npm i Prisma;
- przepływy logowania, rejestracji, odzyskiwania hasła i ochronę tras;
- autoryzację właściciela, edytora i użytkownika tylko do odczytu;
- wszystkie mutacje podróży, dni, noclegów, punktów, aktywności i listy pakowania;
- publiczne endpointy geokodowania i pobierania cen paliwa;
- upload zdjęć, walidację danych, XSS, open redirect i obsługę błędów;
- integracje Supabase, Prisma, Leaflet, Nominatim, Overpass i OSRM;
- nagłówki bezpieczeństwa, robots, sitemapę i ustalanie publicznego adresu aplikacji;
- podatności zależności, rozmiar artefaktów i produkcyjny smoke test bez logowania.

Nie wykonano deployu, migracji, `db push` ani żadnej mutacji danych w bazie.

## 3. Znalezione i naprawione problemy

### Bezpieczeństwo i uprawnienia

- Rozdzielono dostęp do odczytu od zapisu. Właściciel i członek z rolą `editor` mogą
  modyfikować podróż; `viewer` ma wyłącznie odczyt. Reguła jest egzekwowana po stronie
  serwera dla wszystkich mutacji, niezależnie od UI.
- Endpointy `/api/geocode`, `/api/geocode/reverse` i `/api/geocode/poi` wymagają teraz
  zalogowanego użytkownika. Dodano walidację długości, współrzędnych i bounding boxa oraz
  bezpieczne odpowiedzi na błędy usług zewnętrznych.
- Pobieranie krajów z cenami paliwa również wymaga sesji.
- Usunięto stored XSS w tooltipach Leaflet przez escapowanie nazw punktów i aktywności.
- Callback logowania dopuszcza tylko względny parametr `next`, więc nie umożliwia open
  redirect.
- Upload zdjęcia używa rozszerzenia wynikającego z dozwolonego MIME zamiast nazwy pliku,
  ma limit 8 MB i wymaga prawa do edycji podróży.
- Błędy Supabase i uploadu nie ujawniają użytkownikowi szczegółów infrastruktury.

### Logowanie i profil

- Aktualizacja profilu została przeniesiona do zwalidowanej akcji serwerowej, która
  synchronizuje metadane Supabase z profilem aplikacji.
- Dodano kompletny przepływ „nie pamiętam hasła” i ustawiania nowego hasła.
- Rejestracja poprawnie obsługuje konfigurację wymagającą potwierdzenia adresu e-mail.
- Minimalna długość nowego hasła wynosi 8 znaków.

### Walidacja i stabilność

- Dodano ścisłą walidację godzin, dat, `placeId`, zakresów współrzędnych oraz list
  porządkowania. Identyfikatory w operacjach reorder muszą być unikalne, a lista ma limit.
- Naprawiono wyścig cyklu życia mapy powodujący błąd
  `undefined is not an object (evaluating 'el._leaflet_pos')`: animacje, RAF, obserwatory,
  zapytania i referencje warstw są zatrzymywane podczas odmontowania.
- Usunięto duplikat statycznego `public/robots.txt`; źródłem jest teraz jedna dynamiczna
  konfiguracja blokująca indeksowanie prywatnych tras.
- Ustalanie adresu kanonicznego korzysta kolejno z `NEXT_PUBLIC_SITE_URL`,
  `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL` i localhosta.
- CSP rozszerzono o `object-src 'none'`.

### Build i zależności

- Next.js zaktualizowano do 15.5.22.
- Wymuszono poprawione wersje produkcyjnych zależności `postcss` i `sharp`.
- Silnik Node przypięto do wspieranej linii `22.x`, aby środowisko Vercel było powtarzalne.
- `npm audit --omit=dev` raportuje 0 podatności.
- Dokumentację środowiska, połączeń Prisma i wdrażania migracji poprawiono.

## 4. Wyniki automatycznych kontroli

| Kontrola | Wynik |
| --- | --- |
| `npm run lint` | OK |
| `npm run typecheck` | OK |
| `prisma validate` | OK |
| `prisma generate` | OK |
| `npm run build` | OK |
| `npm audit --omit=dev` | 0 podatności |
| Pełny `npm audit` | 9 high, wyłącznie dev toolchain ESLint |
| Testy automatyczne | brak testów i skryptu testowego |

Smoke test produkcyjnego serwera potwierdził:

- publiczne strony zwracają 200 i mają CSP;
- prywatne strony przekierowują użytkownika bez sesji;
- `/reset-password` bez sesji odzyskiwania przekierowuje do formularza odzyskiwania;
- endpointy geokodowania bez sesji zwracają 401;
- `robots.txt` i `sitemap.xml` generują się poprawnie.

Nie przeprowadzono automatycznego ani ręcznego testu zalogowanego CRUD, ponieważ repo nie
zawiera środowiska testowego, danych testowych ani bezpiecznych poświadczeń. Audyt nie
używał istniejącej bazy do zapisu.

## 5. Blokery produkcji

### Brak repozytorium Git

Polecenia Git zgłaszają, że katalog nie jest repozytorium. Przed wdrożeniem należy odzyskać
właściwy katalog `.git` albo zainicjalizować nowe repozytorium, a następnie:

- przejrzeć wszystkie zmiany;
- potwierdzić, że `.env.local`, artefakty `.next`, logi i sekrety nie są śledzone;
- zrobić skan całej historii, jeśli historia istnieje;
- zacommitować zweryfikowany stan i dopiero wtedy połączyć GitHub z Vercel.

`.gitignore` obecnie poprawnie ignoruje `.env`, lokalne warianty env, `.next`,
`node_modules`, logi i pliki builda, ale bez Git nie można potwierdzić stanu indeksu ani
historii.

### Brak migracji Prisma

Jest tylko bieżący `schema.prisma`. `prisma db push` nie powinno być używane na produkcji.
Należy:

1. utworzyć i przejrzeć migrację bazową na pustej lokalnej/testowej bazie;
2. porównać ją ze stanem docelowej bazy;
3. dla istniejącej zgodnej bazy oznaczyć baseline jako zastosowany przez
   `prisma migrate resolve --applied <nazwa_migracji>`;
4. dla nowej bazy zastosować `prisma migrate deploy`;
5. każdą późniejszą zmianę schematu przechowywać jako migrację w repozytorium.

Operacje te muszą używać właściwego `DIRECT_URL` i zostać wykonane dopiero po ręcznym
potwierdzeniu docelowej bazy. W ramach audytu nie wykonano żadnej z nich.

### Nieweryfikowalna konfiguracja Supabase

Panel Supabase wymaga ręcznej kontroli opisanej w sekcji 7. Jest to blocker bezpieczeństwa,
ponieważ kod serwerowy Prisma łączy się rolą bazodanową, która może omijać RLS, a publiczny
bucket zdjęć wymaga precyzyjnych zasad zapisu.

## 6. Zmienne środowiskowe Vercel

| Zmienna | Ekspozycja | Wymagana | Zalecenie |
| --- | --- | --- | --- |
| `DATABASE_URL` | server-only | tak | runtime Prisma; transaction pooler, zwykle port 6543, `pgbouncer=true`, mały `connection_limit` |
| `DIRECT_URL` | server-only | tak dla migracji | direct lub session pooler, zwykle port 5432; nie używać jako połączenia runtime funkcji |
| `NEXT_PUBLIC_SUPABASE_URL` | publiczna | tak | URL właściwego projektu Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publiczna | tak | anon/publishable key; bezpieczeństwo musi wynikać z RLS i autoryzacji |
| `NEXT_PUBLIC_SITE_URL` | publiczna | zalecana | dokładny kanoniczny URL produkcji, bez końcowego path |
| `VERCEL_PROJECT_PRODUCTION_URL` | publiczna/systemowa | fallback | dostarczana przez Vercel |
| `VERCEL_URL` | publiczna/systemowa | fallback | używana dla preview, gdy brak jawnego site URL |

Zmiennych prywatnych nie wolno prefiksować `NEXT_PUBLIC_`. Aplikacja nie potrzebuje klucza
`service_role` ani klucza Google Maps. Produkcja, preview i development powinny mieć
świadomie rozdzielone wartości; najlepiej używać oddzielnego projektu/bazy dla produkcji.

Lokalny `NEXT_PUBLIC_SITE_URL` nie jest ustawiony. Kod ma bezpieczny fallback, ale na
Vercel należy ustawić go jawnie dla poprawnych canonicali, sitemap i redirectów.

## 7. Ręczna konfiguracja Supabase

### Auth

- ustawić produkcyjny `Site URL`;
- dodać dokładny produkcyjny URL `/auth/callback` do dozwolonych redirect URLs;
- dodać kontrolowany wzorzec preview Vercel tylko wtedy, gdy preview ma korzystać z tego
  samego projektu;
- zweryfikować potwierdzanie e-mail, dostawcę SMTP, szablony rejestracji i resetu hasła;
- przetestować wygaśnięty, użyty ponownie i nieprawidłowy link odzyskiwania.

### Baza i RLS

- sprawdzić RLS oraz granty każdej tabeli dostępnej przez PostgREST;
- jeśli frontend nie korzysta bezpośrednio z tabel, odebrać `anon`/`authenticated`
  zbędne granty albo zastosować polityki deny-by-default;
- potwierdzić, że użytkownik nie odczyta ani nie zmieni cudzej podróży przez REST;
- pamiętać, że autoryzacja mutacji Prisma jest egzekwowana w aplikacji, bo właścicielska
  rola połączenia bazy może omijać RLS.

### Storage

- potwierdzić istnienie bucketa `trip-hero-images`;
- publiczny odczyt jest obecnie wymagany przez `getPublicUrl`; zaakceptować ten model albo
  przebudować go na signed URLs;
- zezwolić na insert/update/delete tylko zalogowanemu użytkownikowi i tylko w folderze
  odpowiadającym jego `auth.uid`;
- ustawić po stronie bucketa limit rozmiaru i allowlistę MIME obrazów;
- przetestować próbę zapisu i usunięcia pliku w folderze innego użytkownika.

## 8. Ryzyka nieblokujące i rekomendacje

- Brak testów automatycznych. Najpierw warto dodać testy autoryzacji/IDOR i krytycznych
  akcji serwerowych, potem testy E2E odzyskiwania hasła i CRUD.
- Pełny audyt npm ma 9 podatności high w zależnościach narzędziowych ESLint. Produkcyjny
  graf jest czysty; automatyczna naprawa wymagałaby ryzykownej migracji major do ESLint 10
  i Next 16, więc jej nie wykonano.
- Build emituje ostrzeżenie o użyciu `process.version` przez `supabase-js` w Edge Runtime.
  Build działa, ale middleware należy sprawdzić po każdej aktualizacji Supabase/Next.
- CSP nadal wymaga `unsafe-inline` dla skryptów zgodnych z aktualnym buildem Next.
  Docelowo warto przejść na nonce/hash, jeśli frameworkowa konfiguracja na to pozwoli.
- Brakuje trwałego rate limitera. Auth ogranicza proxy geokodujące do użytkowników, lecz
  przed większym ruchem warto dodać Vercel WAF/rate limiting per user i IP.
- Nominatim, Overpass i publiczny serwer OSRM mają limity oraz brak SLA. Ustawić prawdziwy
  kontakt w User-Agent i rozważyć dostawcę produkcyjnego albo własną instancję.
- Główny ekran planera jest ciężki: około 462 kB First Load JS. Leaflet i planner warto
  dalej dzielić dynamicznie i profilować na urządzeniu mobilnym.
- Powtarzany upload zdjęcia może pozostawiać osierocone poprzednie pliki w Storage.
- `viewer` jest chroniony po stronie serwera, ale UI może nadal pokazywać część kontrolek
  edycji; warto je ukryć lub oznaczyć jako read-only dla lepszego UX.
- Wejście na pusty ekran główny automatycznie tworzy podróż. Dwa równoległe pierwsze
  żądania mogą utworzyć duplikaty; warto zastosować idempotency albo jawny ekran startowy.
- Funkcje usuwania konta i zmiany avatara pozostają nieaktywne.

## 9. Kolejność wdrożenia i checklista smoke testów

### Zalecana kolejność

1. Odzyskać lub utworzyć repozytorium Git, przejrzeć pliki i historię pod kątem sekretów.
2. Utworzyć, przejrzeć i zacommitować migrację bazową Prisma.
3. Na Node 22 wykonać czyste `npm ci`, lint, typecheck, walidację Prisma, audit i build.
4. Wypchnąć zweryfikowany commit do prywatnego repozytorium GitHub.
5. Przygotować produkcyjny projekt Supabase, Auth, RLS, Storage i połączenia poolera.
6. Wykonać `prisma migrate deploy` z kontrolowanego środowiska przed promocją aplikacji.
7. Utworzyć projekt Vercel, ustawić Node 22 i zmienne osobno dla Production/Preview.
8. Wdrożyć preview i wykonać pełny zalogowany smoke test.
9. Dopiero po jego akceptacji promować dokładnie ten sam commit na produkcję.

### Smoke test po preview i po produkcji

- rejestracja z potwierdzeniem e-mail i bez niego;
- logowanie, wylogowanie, wygasła sesja i odświeżenie cookie;
- odzyskiwanie hasła, nowa sesja recovery i ponowne użycie linku;
- utworzenie, edycja i usunięcie podróży;
- role owner/editor/viewer oraz próby IDOR przez podmianę identyfikatorów;
- dni, punkty, noclegi, aktywności i zmiana kolejności;
- lista pakowania, szybkie wielokrotne zaznaczanie oraz zapis debounce;
- mapa po szybkiej nawigacji i odmontowaniu, geokodowanie, POI i trasy;
- upload poprawnego obrazu, zbyt dużego pliku i niedozwolonego MIME;
- widok mobilny, klawiatura, focus i podstawowa dostępność;
- statusy 401/403/404, brak stack trace i sekretów w odpowiedziach/logach;
- nagłówki CSP/HSTS, robots, sitemap i canonical URL;
- liczba połączeń Prisma i błędy poolera pod krótkim obciążeniem;
- brak dostępu do tabel i Storage innego użytkownika przez Supabase REST.

Po zamknięciu trzech blockerów — Git, migracje i ręczna weryfikacja Supabase — oraz
zaliczonym zalogowanym smoke teście aplikacja może zostać ponownie oceniona jako gotowa do
wdrożenia.
