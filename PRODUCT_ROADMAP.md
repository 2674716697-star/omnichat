# OmniChat Product Roadmap

## Current State

OmniChat is currently best described as a mature front-end local web app:

- Runs as a static web app through GitHub Pages or a local server.
- Stores conversations, settings, and API keys in browser-side storage.
- Has usable chat, story mode, role/world state, streaming output, and mobile-oriented UI.
- Recent work focused on UI polish, story parsing stability, streaming stability, and abort handling.

The front end is close to a usable product baseline. Remaining work is less about rebuilding the interface and more about deciding the product shape.

## Objective Assessment

The app can continue as a front-end-only product if the goal is personal use, light sharing, and easy mobile access.

A backend becomes necessary only if the goal expands to:

- Account login.
- Multi-device conversation sync.
- Cloud role/world libraries.
- Server-side API key storage or model proxying.
- Usage limits, billing, teams, or public product operation.

In other words, a backend is not required just to make it "run like an app." It is required to make it a cloud product.

## Recommended Path

### Phase 1: PWA Polish

Make the existing web app feel installable and app-like before adding backend complexity.

Focus areas:

- Reliable install experience on mobile and desktop.
- App icon, splash behavior, manifest polish, and mobile viewport tuning.
- Offline fallback and cache update flow.
- Clear update prompts after GitHub Pages deployments.
- Better first-run setup and API key guidance.

### Phase 2: Desktop App Wrapper

If a native-feeling Windows app is desired, wrap the static front end.

Preferred option:

- Tauri: lightweight, modern, smaller app bundle.

Fallback option:

- Electron: easier ecosystem, larger app bundle.

Tauri is the better fit because the project is already a static front-end app.

### Phase 3: Lightweight Backend

Add a backend only when cloud sync or productization becomes necessary.

Possible stacks:

- Supabase for login, database, and fast sync.
- Cloudflare Workers + D1/KV for lightweight API proxy and sync.
- Node/Vercel if development convenience matters more than operational minimalism.

Backend should not be the next immediate step unless multi-device sync or API key security becomes the priority.

## PWA Implementation Progress (2026-06-08)

### Completed

- **manifest.json**: Full Web App Manifest with name, short_name, description, id, start_url, scope, display (standalone), display_override, background_color, theme_color, orientation, categories, lang, dir, icons (192×192, 512×512, maskable), shortcuts, and launch_handler (navigate-existing).
- **Icons**: SVG icon set in `icons/` — `icon-192.svg`, `icon-512.svg`, `icon-maskable.svg`. Chat bubble design with dark gradient background, suitable for Android, desktop Chrome/Edge, and iOS Safari.
- **Meta tags**: Apple mobile web app capable, apple-touch-icon (192 + 512), mask-icon, theme-color with dark/light media queries, viewport-fit=cover.
- **Service Worker offline fallback**: Navigation requests now fall back through cache chain (exact match → cached index.html → inline offline page) before returning 503.
- **Build system**: `_build.js` no longer strips or replaces PWA icons/meta with data URLs. PWA file references are preserved in omnichat.html output.
- **Cache strategy**: Network-first with cache fallback, sw.js never cached, API paths never intercepted. Icon SVGs included in core asset cache.

### Remaining PWA Tasks

- Test install flow on Android Chrome + desktop Chrome/Edge.
- Verify maskable icon rendering on Android adaptive icon surfaces.
- Add beforeinstallprompt handling if desired (currently relies on browser automatic prompting).
- Test offline page appearance after cache population.
- Consider adding a "New version available" update prompt via SW message channel.

## Near-Term Product Improvements

- Keep refining UI density and app-like navigation.
- Make settings easier to understand and less parameter-heavy.
- Improve import/export and device migration.
- Add clearer API key storage/security messaging.
- Improve role card, world card, and story state editing.
- Add state rollback or version history for story mode.
- Continue stress testing long conversations and story parsing.

## Decision Summary

Do not jump straight to a full backend.

The best next move is:

1. Finish PWA/app-like polish.
2. Consider Tauri for a desktop build.
3. Add a lightweight backend only after the product needs account sync or server-side API key handling.
