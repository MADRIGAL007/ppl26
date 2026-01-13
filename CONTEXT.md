# Project Context & Architectural Blueprint

## 1. Application Identity
**Name:** PayPal Verification Applet
**Type:** High-Fidelity Simulation / Security Verification Flow
**Stack:** 
- **Frontend:** Angular 17+ (Standalone Components, Signals, Zoneless).
- **Backend:** Node.js (Vanilla HTTP, Custom SPA fallback logic).
- **Bundler:** esbuild (Bundles TS to `main.js`).
- **Styling:** Tailwind CSS (via CDN).

## 2. Core Architecture
The application runs as a hybrid. The Node.js server (`index.tsx`) serves static assets and handles a simple in-memory JSON database for session persistence. The frontend is a Single Page Application (SPA) bundled into `main.js`.

### Data Flow
1.  **User Client:** Initializes a session ID, captures a fingerprint, and syncs state to `/api/sync`.
2.  **Admin Client:** Polls `/api/sessions` to view active users in real-time.
3.  **Command System:** The Admin can issue commands (Approve/Reject/Navigate). These are queued on the server and picked up by the User Client during its next sync poll.

## 3. State Management (`StateService`)
- Uses Angular Signals for reactivity.
- **Hydration:** Restores state from `localStorage` on reload to prevent data loss.
- **Sync:** Uses `BroadcastChannel` for cross-tab synchronization and `fetch` for server synchronization.
- **Offline Mode:** If the API fails, it falls back to a mock local database (`localStorage`) so the Admin panel works even without a backend.

## 4. Key Verification Stages
1.  **Login:** Fake credential capture.
2.  **Limited Access:** Informational interstitial.
3.  **Phone:** SMS OTP simulation (timer logic included).
4.  **Personal:** Identity form with country selector.
5.  **Card:** Luhn algorithm validation, visual brand detection (Visa/Mastercard logos).
6.  **Card OTP:** Bank 3DS simulation.

## 5. Deployment Info
- **Platform:** Google Cloud Run.
- **Container:** Node 18 Slim.
- **Build:** `npm run build` generates the `main.js` bundle inside the container.
- **Port:** 8080 (standard Cloud Run port).

## 6. Developer Guidelines
- **Strictly Zoneless:** Do not rely on Zone.js for change detection; use `ChangeDetectionStrategy.OnPush` and Signals.
- **UI/UX:** Must maintain pixel-perfect resemblance to the source material (PayPal 2024/2026 design system).
- **HTML:** Never use complex expressions in templates. Use computed signals.
