# Ejby IF Bødekasse ⚽️

En PWA (installerbar web-app) til fodboldholdet **Ejby IF** med et bødesystem.
Bygget med **Next.js 16 + Firebase** (Auth + Firestore). Sprog: dansk. Tema: grøn/hvid.

## Hvad kan appen (Phase 1)

- **Log ind / opret konto** med e-mail + adgangskode (Firebase Auth). Fri tilmelding.
- **Giv bøder**: alle medlemmer kan give en bøde til en holdkammerat fra **bødekataloget**.
- **Godkendelse**: bøder er kun forslag indtil en **admin** godkender dem (og kan justere beløbet).
- **Betaling**: spilleren trykker "Jeg har betalt" (MobilePay), og en admin **bekræfter**. Delbetalinger understøttes (løbende saldo).
- **Tavlen**: Skyldnere · Top-betalere · Flest bøder · samlet bødekasse. Skift mellem **denne sæson** og **alle tider**.
- **Admin**: godkendelser, bødekatalog, medlemmer (gør til admin), sæsoner og MobilePay-nummer.
- **Installerbar** som app på mobilen (manifest + service worker).

> Godkendte bøder kan **ikke** annulleres (efter ønske). Den første bruger der opretter sig bliver automatisk **admin**.

## Kom i gang

### 1. Opret et Firebase-projekt
1. Gå til <https://console.firebase.google.com> → **Add project** (fx `ejby-bodekasse`).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
3. **Build → Firestore Database → Create database** (production mode, region `eur3` / Europa).
4. **Project settings (⚙️) → General → Your apps → Web (</>)** → registrér app og kopiér `firebaseConfig`-værdierne.

### 2. Indsæt nøglerne
Kopiér `.env.local.example` til `.env.local` og udfyld med værdierne fra `firebaseConfig`:

```bash
cp .env.local.example .env.local
```

### 3. Kør lokalt
```bash
npm install
npm run dev
```
Åbn <http://localhost:3000>. **Opret den første konto — den bliver automatisk admin.**
Gå til **Admin → Bødekatalog → Opret standard-bødekatalog** for at komme hurtigt i gang.

### 4. Slå sikkerhedsreglerne til
Reglerne ligger i `firestore.rules`. Udrul dem med Firebase CLI:

```bash
npm i -g firebase-tools
firebase login
firebase use --add        # vælg dit projekt
firebase deploy --only firestore:rules,firestore:indexes
```

(eller kopiér indholdet af `firestore.rules` ind i Firestore → **Rules** i konsollen.)

### 5. Deploy (Vercel)
```bash
npm i -g vercel
vercel
```
Tilføj de samme `NEXT_PUBLIC_FIREBASE_*` variabler i Vercel → Project → Settings → Environment Variables.
Husk at tilføje dit Vercel-domæne under Firebase → Authentication → **Settings → Authorized domains**.

## Datamodel (Firestore)

| Collection | Indhold |
|------------|---------|
| `users` | profil + rolle (`admin`/`member`) |
| `fineCatalog` | bødekatalog (titel + standardbeløb) |
| `fines` | bøder (`pending` → `approved`) |
| `payments` | betalinger (`claimed` → `confirmed`) |
| `seasons` | sæsoner (én er `isCurrent`) |
| `settings/club` | MobilePay-nummer m.m. |
| `settings/bootstrap` | markerer at første admin er oprettet |

Saldo beregnes klient-side: **godkendte bøder − bekræftede betalinger**.

## Næste faser
- **Phase 2:** Push-notifikationer (ny bøde, afventer godkendelse, betaling markeret) via Firebase Cloud Messaging. Service worker er allerede forberedt.
- **Phase 3:** Sæson-arkivvisning, billed-bevis på bøder, badges/animationer.
