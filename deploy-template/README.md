# Azure Free-Tier Deploy Template

A reusable template for deploying any **Dockerized backend + SPA frontend** to Azure free tier.

**Stack:**
- Backend: Azure Container Apps (Consumption, scale-to-zero)
- Image registry: GitHub Container Registry (GHCR), private, free
- Frontend: Azure Static Web Apps Free SKU
- Secrets: Container App secrets

**Cost target**: $0 inside free quotas with scale-to-zero traffic.

---

## When to use this template

Your project has:
- A backend with a `Dockerfile` that listens on a single port
- A frontend with `package.json` and `npm run build` producing a `dist/` folder
- Secrets that live as env vars (not connection strings, not bound identities)
- No persistent state requirement (or accepts ephemeral `/tmp`)

If you need a database, persistent storage, or multi-region failover, this template is a starting point but not the finish line.

---

## How to adopt for a new project

1. **Copy this folder into your repo**:
   ```bash
   cp -r deploy-template my-new-project/deploy
   ```

2. **Copy config.example.sh to config.sh, edit values**:
   ```bash
   cd my-new-project/deploy
   cp config.example.sh config.sh
   # Edit config.sh, then:
   chmod +x *.sh
   ```

3. **Make sure your repo has**:
   - `<BACKEND_DIR>/Dockerfile`
   - `<BACKEND_DIR>/.env` with your secrets (gitignored)
   - `<FRONTEND_DIR>/package.json` with a `build` script
   - The frontend's API base URL reads from `import.meta.env.VITE_API_BASE_URL`

4. **Read 00-prereqs.md, do every step**

5. **Run scripts in order**: 01, 02a (local), 02b (cloud shell), 03, 04, 03 (again), 05.

---

## Files in this template

| File | Where to run | Purpose |
|---|---|---|
| `config.example.sh` | n/a | Template for `config.sh`. Edit and rename. |
| `00-prereqs.md` | n/a | Read before first deploy. One-time setup. |
| `01-create-rg.sh` | Cloud Shell | Create the resource group. |
| `02a-build-push.sh` | Local (Docker required) | Build the backend image, push to GHCR. |
| `02b-deploy-backend.sh` | Cloud Shell | Deploy GHCR image to Container Apps. |
| `03-set-secrets.sh` | Cloud Shell | Inject env-var secrets. Run twice (placeholder + real CORS). |
| `04-deploy-frontend.sh` | Cloud Shell | Build + deploy the SPA to Static Web Apps. |
| `05-verify.sh` | Cloud Shell | Smoke tests + cost posture audit. |
| `99-teardown.sh` | Anywhere | Delete the resource group. Stop all clocks. |

---

## Why split 02a from 02b

Two practical reasons:

1. **Cloud Shell does not have Docker.** Need a machine with Docker for the build.
2. **Corporate networks often block the Container Apps API endpoint.** Cloud Shell sidesteps that.

So: build locally where you have Docker. Deploy from Cloud Shell where you have Azure-internal network access.

---

## Cost guardrails baked in

- Min replicas = 0. Container sleeps when idle.
- Max replicas = 1. Cannot stampede into paid territory.
- 0.5 vCPU + 1 GiB. Smallest size that fits typical Python ML stacks.
- GHCR for image hosting (free) instead of ACR ($5/mo).
- Static Web Apps Free SKU.
- Mandatory budget alert in 00-prereqs.md.

If you change any of these, update the cost calculations in `LEARNINGS.md`.

---

## Run order summary

```
Step 1   Cloud Shell    bash 01-create-rg.sh
Step 2a  Local          bash 02a-build-push.sh         (needs GHCR_PAT)
Step 2b  Cloud Shell    bash 02b-deploy-backend.sh     (needs GHCR_PAT, prints BACKEND_URL)
Step 3   Cloud Shell    export BACKEND_URL=...; bash 03-set-secrets.sh
Step 4   Cloud Shell    export BACKEND_URL=...; bash 04-deploy-frontend.sh   (prints FRONTEND_URL)
Step 3'  Cloud Shell    export FRONTEND_URL=...; bash 03-set-secrets.sh
Step 5   Cloud Shell    export BACKEND_URL=... FRONTEND_URL=... DEMO_USER=... DEMO_PASS=...; bash 05-verify.sh
```

When done with the deployment: `bash 99-teardown.sh`.
