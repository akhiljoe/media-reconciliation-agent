# Media Recon Frontend

React + Vite + TypeScript SPA for the Media Billing Reconciliation platform.

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router
- Axios

## Local Setup

```bash
npm install
npm run dev
```

Opens on **http://localhost:3000** (forced by `vite.config.ts`).

The app calls the backend at whatever `VITE_API_BASE_URL` resolves to. Without it, the fallback is the relative path `/api`, and the Vite dev server has no proxy, so set it for local development:

```bash
echo "VITE_API_BASE_URL=http://localhost:5000/api" > .env.local   # local Flask backend
npm run dev
```

Use port 5001 instead if you run the backend in Docker on that host port.

`.env.local` is gitignored.

## Build for production

```bash
npm run build
```

Output lands in `dist/`. The Azure deploy script (`../deploy/04-deploy-frontend.sh`) builds with the production backend URL and pushes to Azure Static Web Apps.

## Environment Variables

| Var | Required | Default | Notes |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes, except same-origin deploys | `/api` | Backend root including `/api` |

## Auth Flow

1. User submits email + password to the `Login` component.
2. Component calls `POST /api/auth/login` via `services/auth.ts`.
3. JWT stored in `sessionStorage` (cleared when tab closes).
4. Axios interceptor attaches `Authorization: Bearer <jwt>` to every request.
5. 401 response triggers logout and redirect to `/`.

## Routes

| Route | Component | Protected |
|---|---|---|
| `/` | `Login` | No |
| `/extractor` | `InvoiceExtractor` | Yes |
| `/review` | `DiscrepancyReview` | Yes |
| `/report` | `DiscrepancyReport` | Yes |
| `*` | redirect to `/` | n/a |

Protected routes are wrapped in `<Protected>` in `App.tsx` which checks for a token before rendering.
