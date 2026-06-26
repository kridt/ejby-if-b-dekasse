# Phase 2 — Push-notifikationer: opsætning

Push-notifikationer kører via **Firebase Cloud Messaging (FCM)** på klienten og en
**Next.js API-route med `firebase-admin`** på serveren. Der bruges INGEN Firebase
Cloud Functions (så vi undgår betalt plan).

Koden læser alle hemmeligheder fra miljøvariabler og kaster aldrig ved build —
`npm run build` virker derfor uden at noget er sat. Push virker først når
variablerne herunder er på plads.

## Miljøvariabler

Tilføj disse i `.env.local` (lokalt) og i **Vercel → Project → Settings →
Environment Variables** (produktion).

| Variabel | Type | Hvor bruges den |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | offentlig | Klienten — henter FCM-token |
| `FIREBASE_SERVICE_ACCOUNT` | hemmelig (base64) | Serveren — `firebase-admin` |

De eksisterende `NEXT_PUBLIC_FIREBASE_*`-variabler (apiKey, authDomain, projectId,
storageBucket, messagingSenderId, appId) skal også være sat — de bruges allerede af
appen og sendes med til FCM-service-workeren.

### 1. `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

Firebase Console → **Project settings** → **Cloud Messaging** →
**Web Push certificates** → **Generate key pair**. Kopiér nøglen ("Key pair").

```
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BPx...din-vapid-nøgle...
```

### 2. `FIREBASE_SERVICE_ACCOUNT` (base64-kodet service-account JSON)

Firebase Console → **Project settings** → **Service accounts** →
**Generate new private key**. Det henter en JSON-fil ned.

Konvertér filen til base64 (én lang linje uden linjeskift):

```bash
# macOS / Linux
base64 -i service-account.json | tr -d '\n'

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

Indsæt resultatet som værdien:

```
FIREBASE_SERVICE_ACCOUNT=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Iiwi...
```

> Serveren afkoder base64 → JSON og bruger `cert(...)`. Private-key-newlines
> håndteres automatisk. JSON'en hardcodes ALDRIG i koden.

## Triggere

| Hændelse | Hvem får besked | Route |
| --- | --- | --- |
| Admin godkender en bøde | Den bødede spiller | `POST /api/notify` (`fine-approved`) |
| Medlem foreslår en bøde | Alle admins | `POST /api/notify` (`fine-proposed`) |
| Medlem markerer en betaling | Alle admins | `POST /api/notify` (`payment-claimed`) |

## Sådan tester man push

1. Sæt alle variabler ovenfor.
2. Deploy (eller kør lokalt over HTTPS — service-workere kræver HTTPS, dog er
   `localhost` undtaget).
3. Log ind, gå til **Profil** → **Notifikationer** → **Aktivér notifikationer**,
   og accepter browserens forespørgsel. Token gemmes på din bruger
   (`users/<uid>.fcmTokens`).
4. Få en holdkammerat til at give dig en bøde, og lad en admin godkende den —
   du skulle nu få en notifikation.

## Filer i Phase 2

- `src/lib/messaging.ts` — klient: token-registrering + forgrunds-beskeder.
- `src/lib/notify.ts` — klient-helper der kalder `/api/notify`.
- `src/lib/firebaseAdmin.ts` — lazy `firebase-admin`-init på serveren.
- `src/lib/push.ts` — server: multicast-afsendelse + oprydning af døde tokens.
- `src/app/api/notify/route.ts` — verificeret notifikations-endpoint.
- `src/components/PushToggle.tsx` — "Aktivér notifikationer"-kort på Profil.
- `public/firebase-messaging-sw.js` — FCM baggrunds-service-worker.

## Firestore-sikkerhedsregler (anbefaling)

Spillere skal kunne opdatere deres egen `fcmTokens`. Sørg for at jeres
`users`-regler tillader en bruger at skrive til sit eget dokument, fx:

```
match /users/{uid} {
  allow read: if request.auth != null;
  allow update: if request.auth.uid == uid
                || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

Serveren bruger Admin SDK og forbigår sikkerhedsregler, så token-oprydning og
notifikationsopslag virker uanset reglerne.
