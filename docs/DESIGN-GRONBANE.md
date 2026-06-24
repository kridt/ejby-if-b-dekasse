# Design Direction: "Grøn Bane" (Green Pitch) — Native-Class Bødekasse

> The implementation source of truth for the premium PWA redesign. Chosen via a judge-panel
> design workflow (scored 25 — top on native-smoothness). Goal: make Ejby IF Bødekasse feel like
> a small, premium **native** club app ("Apple Wallet meets the matchday big screen") **without
> rebranding a single token or Danish string**.

## Vision
Fixed 100dvh app shell (body never scrolls; one inner `<main>` is the only scroll container) so iOS
rubber-band and Android pull-to-refresh die. A deep club-green crest header pins under the notch so
the status-bar strip reads brand-green. A floating bottom tab bar rests on the home-indicator safe
area. Money is the hero: big tabular-nums kroner that roll like a scoreboard powering on. The Tavle
is a living standings table (top-3 podium, growing pot, live FLIP re-rank). Navigation is spatial:
forward = slide-in-right, back = slide-left, same-route tab/scope = crossfade with a gliding pill.
Celebration is **rationed** to three earned milestones. Everything transform/opacity-only for 60fps;
reduced-motion is first-class; finance values stay selectable/copyable.

## Design tokens
**Keep ALL existing tokens in `globals.css` verbatim** (light + dark). ADD:
- `--gold #C9A227`, `--silver #9AA3A8`, `--bronze #B07A48` — thin metallic medal **rings** around podium avatars (never filled blobs).
- `--pitch` — `linear-gradient(--primary-dark → --primary)`, used ONLY behind the podium and the crest-header safe-area band.
- `--safe-top: env(safe-area-inset-top)`, `--safe-bottom: env(safe-area-inset-bottom)`.
- One soft ambient shadow for raised surfaces only (pot/saldo hero, podium leader, sheets): `0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(14,77,42,.10)`.
- `.selectable { user-select: text }` opt-in for names, amounts, comments, MobilePay reference.

**Type:** Geist Sans (already loaded). Money/display: text-3xl–5xl, font-extrabold, tracking-tight, **always tabular-nums**, via `formatKr`. Large titles 28–34px/800/-0.02em. Labels 11–13px/500 tracking-wide muted above each number. **Debt is ALWAYS `--danger` red**, never gold/green.

## Signature "wow" moments
1. **Crest cold-start splash → rolling scoreboard board** — branded green splash (no white flash), Tavle stat counters roll up from 0 (spring), pot gets a one-time gold shimmer. MoneyCounter `useSpring(mass:1,stiffness:120,damping:24)` + `useTransform`→`formatKr`; one-time guard via sessionStorage + useRef; reduced-motion snaps.
2. **Player avatar+amount morph** (headline, progressive enhancement) — tapping a Tavle row flies+grows the avatar+amount into the `/spiller/[uid]` large-title header. `<ViewTransition name={`player-${uid}`}>` on row AND detail header. **A given `player-${uid}` must render exactly once per page** (exclude podium top-3 from the rank-4+ list). Hard-cuts gracefully where unsupported.
3. **Podiet (top-3 podium)** — real 2-1-3 stair on `--pitch`, gold/silver/bronze rings, rolling counters, leader raised/center. New `Podium` consuming the same `PlayerBalance` rows. Render top-3; list renders ranks 4+ only.
4. **"Betalt op" debt-clear payoff** (the showcase, every judge grafted it) — when saldo crosses to 0: red number springs down, card color animates red→green, a Motion `pathLength` check draws, label flips to "Betalt op", ONE 60-particle brand-green confetti (`#0E4D2A/#2f9e5a/#fff`, `disableForReducedMotion:true`, lazy-import) + `navigator.vibrate?.(15)`. One-time guard on `balance>0 → balance===0` transition (useRef prev). Same burst on `appinstalled`.
5. **Live leaderboard re-rank on approval** — Firestore push FLIP-animates the changed row, neighbors reflow, a delta pill pulses, pot rolls up. Motion `layout` + `<AnimatePresence mode="popLayout">` keyed on `b.uid` (never index). Wrap onSnapshot update in `startTransition`. content-visibility on long lists.
6. **Collapsing large title + segmented controls with gliding pill** — UIKit-style large title shrinks on scroll (transform/opacity only); Sæson/Alle-tider + the 3 board tabs become iOS segmented controls with a single `<motion.div layoutId="seg-pill">` that glides; content crossfades.

## Motion rules
- Spatial honesty: forward `transitionTypes ['nav-forward']` slide-in-right ~60px; back `['nav-back']` slide-left; same-route tab/scope CROSSFADE. Header + bottom nav get their own `view-transition-name` + `animation:none` so chrome never flickers.
- Low-bounce springs (stiffness~400 damping~30, bounce ≤0.1). Eased keyframes (200–280ms) only for skeleton→content.
- **Transform/opacity (+ sparing filter) ONLY** — never height/top/width/box-shadow. `will-change:transform` just-in-time. content-visibility on lists.
- **Value-change-gated money**: counters animate ONLY on a real value delta, NEVER on every onSnapshot (useRef prev-vs-next + startTransition/useDeferredValue).
- Reduced-motion first-class: `<MotionConfig reducedMotion="user">` at root; extend the `@media (prefers-reduced-motion: reduce)` block to zero `::view-transition-old/new/group(*)`; confetti `disableForReducedMotion:true`; counters snap; slides → instant/opacity.
- `whilePress` scale 0.96 spring on every button/row/tab/catalog-card; `navigator.vibrate?.(10–15)` guarded (Android-only).
- Celebration rationed to exactly: `appinstalled`, admin approving a fine the member sees, and "Betalt op". NEVER on a pending bøde submission (that gets a calm pathLength check-draw).

## Install flow
**iOS** (no beforeinstallprompt, ever): custom instructional bottom Sheet + a durable `/installer` screen. Show the Sheet ONLY when `isIOS && !isStandalone && isSafari && !isInAppBrowser && !dismissedRecently` and **NOT on login** (after first real value). Three Danish steps ("1. Tryk på Del-ikonet  2. Vælg 'Føj til hjemmeskærm'  3. Tryk 'Tilføj'") + an SVG arrow at the Share icon (bottom-center iPhone / top-right iPad — branch on `maxTouchPoints`). In-app webview (FBAN/FBAV/Instagram/Line lacking Safari) → "Åbn i Safari for at installere" + copy-link. Persist dismissal (timestamp), re-offer ~14 days. **Verify `<meta name="apple-mobile-web-app-capable" content="yes">` survives in rendered HTML** (add via `metadata.other` if missing). `statusBarStyle: 'black-translucent'` with the green band backing the safe area.

**Android**: capture `beforeinstallprompt` early (Zustand store mounted high, can fire pre-hydration), `preventDefault()`, stash, set `canInstall`. Branded "Installér app" button on Tavle + `/installer` + Min profil (NOT a modal on load). On click: `deferred.prompt()` → `userChoice` → null. Listen for `appinstalled` → green confetti + toast "Appen er installeret!". Add manifest `screenshots[]` (form_factor narrow) to unlock the rich install sheet. Hide when standalone.

**Detection** (single source of truth, `usePwa()`/`useStandalone()` Zustand store): OR `matchMedia('(display-mode: standalone)').matches` with `navigator.standalone===true`; subscribe to mq `change`; set `.standalone` class on `<html>`; expose `isIOS/isAndroid/isStandalone/isSafari/isInAppBrowser/canInstall`. Neither API alone is reliable — they MUST be OR'd.

## PWA shell tasks
- Fixed 100dvh shell: html/body never scroll; single inner `<main>` is the only scroll container with `overscroll-behavior-y:contain`. Remove `body{min-height:100dvh;padding-bottom:...}`.
- Use `100dvh` (never `100vh`).
- Safe-area: pad crest header `env(safe-area-inset-top)` backed by green band; bottom tab bar `env(safe-area-inset-bottom)`.
- `statusBarStyle: 'black-translucent'`; move `themeColor` into the `viewport` export as a media array (`#0E4D2A` light, `#0b1410` dark); keep manifest `theme_color`.
- **Remove `maximumScale:1`** (a11y); rely on `touch-action:manipulation`.
- Splash: generate apple-touch-startup-image PNGs (crest-on-green, light+dark) → `metadata.appleWebApp.startupImage`.
- Native-feel CSS: keep `-webkit-tap-highlight-color:transparent`; add `-webkit-touch-callout:none`, `-webkit-user-drag:none` on crest/avatars, `user-select:none` on chrome, `.selectable` opt-in, `touch-action:manipulation` on tappables.
- `next.config.ts`: `experimental.viewTransition:true` (valid in Next 16.2.9) so `import { ViewTransition } from 'react'` works on the bundled canary — do NOT npm-install react@canary. Lazy-import canvas-confetti.
- `manifest.ts`: `background_color → #0E4D2A`; add `screenshots[]`.
- iOS-aware push: gate `PushToggle` visibility on `isStandalone` for iOS (else show install hint).

## Implementation streams (dependency order)
- **A — Native PWA Shell & Tokens** (FOUNDATION, blocks all): AppShell, layout.tsx, globals.css, manifest.ts, next.config.ts, providers.tsx, splash, deps. `dependsOn: none`.
- **B — Motion Primitives & Native Components**: MoneyCounter, Sheet, ui.tsx (Button/Avatar/Card/Skeleton), Celebrate helper, oak-leaf EmptyState. `dependsOn: A`.
- **C — PWA Install / Standalone / Push**: usePwa store, split InstallPrompt (iOS Sheet + Android banner), `/installer` screen, PushToggle gating. `dependsOn: A, B`.
- **D — Tavle: Podium, Pot, Live Re-rank, Morph**: page.tsx, Podium, HowItWorks. `dependsOn: A, B`.
- **E — Player / Profil / Giv bøde flows + celebrations**: spiller, profil, giv-bode, login, signup. `dependsOn: A, B; coordinate view-transition-name with D`.

## Priority order
1. Stream A (foundation — ~80% of native feel, fixes defects). 2. Stream B (primitives). 3. Stream E profil slice — the "Betalt op" celebration (highest wow-per-effort, cross-platform). 4. Stream D Tavle (podium/pot/segmented/FLIP — non-morph parts first). 5. Stream C install/push. 6. LAST/progressive-enhancement: the uid-keyed ViewTransition morph across D+E (render-once-per-uid; test Safari 18+). Defer jersey numbers to a later phase (initials fallback).

## Libraries
`motion` (import from `motion/react`), `canvas-confetti` (+`@types/canvas-confetti`, lazy), `zustand`. Optional `@number-flow/react` (pick MoneyCounter OR this, not both). React `ViewTransition` via the experimental flag (NOT an npm install). `pwa-asset-generator` (dev CLI for splash).
