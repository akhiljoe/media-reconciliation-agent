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

The app calls the backend at whatever `VITE_API_BASE_URL` resolves to. Default fallback is `http://localhost:5000/api` (the local Flask backend).

To point at a different backend (such as a dockerized one on host port 5001):

```bash
echo "VITE_API_BASE_URL=http://localhost:5001/api" > .env.local
npm run dev
```

`.env.local` is gitignored.

## Build for production

```bash
npm run build
```

Output lands in `dist/`. The Azure deploy script (`../deploy/04-deploy-frontend.sh`) builds with the production backend URL and pushes to Azure Static Web Apps.

## Environment Variables

| Var | Required | Default | Notes |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | `http://localhost:5000/api` | Backend root including `/api` |

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
