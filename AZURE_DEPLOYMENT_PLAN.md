# Azure Deployment Plan

**Project**: Media Reconciliation Agent
**Target**: Free tier Azure demo
**Date written**: 2026-05-04
**Author context**: Plan generated for Akhil Joe by Claude Cowork
**Scope**: Web frontend plus Flask backend. Mobile app excluded.

## 0. Port Map (Important)

| Service | Local dev port | Cloud port | Notes |
|---|---|---|---|
| Frontend Vite | 3000 | 443 (HTTPS via SWA) | Vite hardcoded in `vite.config.ts` line 8 |
| Backend Flask | 5000 | 5000 inside container, 443 via Container Apps ingress | `app.py` reads `PORT` env var |

The `start_frontend.sh` script has a misleading comment saying port 5173. Ignore it. Vite config wins. Frontend always runs on 3000 locally.

---

## 1. Decisions Already Locked

| Decision | Choice | Reason |
|---|---|---|
| Frontend host | Azure Static Web Apps (Free) | Free 100 GB bandwidth. SPA friendly. |
| Backend host | Azure Container Apps (Consumption) | Tesseract via Docker. Scale to zero. |
| Container build | `az containerapp up --source .` | No paid registry needed. |
| Region | Central India | User location. |
| Secret store | Container Apps secrets | Free. Two minute setup. |
| Auth | JWT against env-defined users | Real boundary. No third party login flow. |
| Email feature | Removed for demo | Reduces attack surface. |
| Vendor scoring history | Ephemeral `/tmp/output` | Resets per cold start. |
| Uptime mode | Scale to zero | First request slow. Free. |
| Repo strategy | Modify in place | User pushed safety branch. |
| Deploy mechanism | Local `az` CLI scripts | User reviews each step in portal. |
| OpenAI key handling | Container App secret env var | Never in code or git. |

---

## 2. Architecture Overview

```
Browser
  |
  | 1. POST /api/auth/login (username + password)
  | 2. Receive JWT, store in sessionStorage
  | 3. Subsequent calls include Authorization: Bearer <jwt>
  v
Azure Static Web Apps  (React + Vite build)
  |
  | HTTPS calls VITE_API_BASE_URL
  v
Azure Container Apps   (Flask + gunicorn + tesseract + JWT auth)
  |
  v
OpenAI API             (via secret env var)
```

No database. No blob storage. No queue. Mapping JSON files baked into container image. Uploads written to `/tmp` inside container. User store is a JSON env var.

---

## 2.5 Auth Model

JWT (HS256) signed by `JWT_SECRET`. Token TTL is `JWT_TTL_HOURS` (default 8).

User store lives in env var `AUTH_USERS` as JSON: `{"email1": "<werkzeug-hash>", "email2": "<werkzeug-hash>"}`.

Routes:
- `/api/health` and `/api/auth/login` are public.
- All other `/api/*` routes require `Authorization: Bearer <jwt>`. Returns 401 otherwise.

Rate limit: 5 failed attempts per username triggers 60 second lockout. In-memory per replica. Container App is min=0 max=1 so single replica is the norm.

Client side: token stored in `sessionStorage` (cleared on tab close). Axios interceptor injects header on every request. 401 response auto-redirects to login.

**Generating password hashes** (one liner, run in your venv):

```bash
python -c "from werkzeug.security import generate_password_hash; import json; \
users={'akhil@demo.com': generate_password_hash('CHANGE_ME_1'), \
       'reviewer@demo.com': generate_password_hash('CHANGE_ME_2'), \
       'guest@demo.com': generate_password_hash('CHANGE_ME_3')}; \
print(json.dumps(users))"
```

**Generating a JWT secret**:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Both outputs go straight into Container App secrets. Never commit to git.

---

## 3. Files To Modify In Place

> Note: As of the current commit, the following auth-related files are also modified or new. They are listed under section 4.x where relevant.
> - Modified: `MediaBillingReconcilliation/src/main.tsx`, `Login.tsx`, `Header.tsx`, `App.tsx`
> - Modified: `MediaBillingReconcilliationBackend/app.py` (added `/api/auth/login` plus `@require_auth` on protected routes), `requirements.txt` (added `PyJWT`)
> - New: `MediaBillingReconcilliationBackend/services/auth.py`, `MediaBillingReconcilliation/src/services/auth.ts`

### 3.1 `MediaBillingReconcilliation/src/services/campaignAPI.ts`

Change line 3 only.

**Before:**
```ts
const API_BASE_URL = 'http://localhost:5000/api';
```

**After:**
```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
```

Local dev still works. Production picks up build time env var.

### 3.2 `MediaBillingReconcilliationBackend/app.py`

Multiple targeted edits. Keep all reconciliation logic untouched.

**Edit A**: Drop Windows tesseract path block at top.

Remove lines:
```python
if platform.system() == "Windows":
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

Linux container has tesseract on PATH. Block is harmful in container.

**Edit B**: Replace CORS init.

**Before:**
```python
CORS(app)
```

**After:**
```python
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS(app, origins=ALLOWED_ORIGINS)
```

**Edit C**: Replace `UPLOAD_FOLDER` init.

**Before:**
```python
UPLOAD_FOLDER = Path(__file__).parent / 'uploads'
UPLOAD_FOLDER.mkdir(exist_ok=True)
```

**After:**
```python
UPLOAD_FOLDER = Path(os.getenv('UPLOAD_FOLDER', '/tmp/uploads'))
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
```

**Edit D**: Add `MAPPING_FOLDER` and `OUTPUT_FOLDER` envs near top.

Add after `UPLOAD_FOLDER` block:
```python
MAPPING_FOLDER = os.getenv('MAPPING_FOLDER', str(Path(__file__).parent / 'mapping'))
OUTPUT_FOLDER = os.getenv('OUTPUT_FOLDER', '/tmp/output')
Path(OUTPUT_FOLDER).mkdir(parents=True, exist_ok=True)
```

**Edit E**: In `/api/reconcile-invoice` route, replace mapping folder default.

Find:
```python
mapping_folder = request.json.get('mapping_folder', '../MediaBillingNotebook/mapping')
```

Replace with:
```python
mapping_folder = request.json.get('mapping_folder', MAPPING_FOLDER)
```

Do this in both branches of the route. Two occurrences total.

**Edit F**: In `/api/vendor-scores` route, replace output folder default.

Find:
```python
output_folder = request.args.get('output_folder', 'output')
```

Replace with:
```python
output_folder = request.args.get('output_folder', OUTPUT_FOLDER)
```

**Edit G**: Same change inside `/api/reconcile-invoice` for the `calculate_vendor_score` call.

Find:
```python
vendor_score_result = calculate_vendor_score(vendor_name, 'output')
```

Replace with:
```python
vendor_score_result = calculate_vendor_score(vendor_name, OUTPUT_FOLDER)
```

**Edit H**: Drop the three email routes entirely.

Remove these three function blocks:
- `def generate_discrepancy_email():`
- `def send_discrepancy_email_smtp():`
- `def send_all_discrepancies_email():`

Keep `services/email_service.py` on disk. Just no import or route uses it.

**Edit I**: Replace the `if __name__ == '__main__':` block at bottom.

**Before:**
```python
if __name__ == '__main__':
    print("Starting...")
    app.run(debug=True, port=5000)
```

**After:**
```python
if __name__ == '__main__':
    port = int(os.getenv('PORT', '5000'))
    app.run(host='0.0.0.0', port=port, debug=False)
```

Production uses gunicorn. This block only runs for local dev now.

### 3.3 `MediaBillingReconcilliationBackend/requirements.txt`

Append one line at end:
```
gunicorn==21.2.0
```

Pin Python to 3.11 via Dockerfile. CrewAI 0.70 has known issues on 3.12.

---

## 4. Files To Create

### 4.1 `MediaBillingReconcilliation/.env.production`

Build time env var. Vite reads this during `npm run build`.

```
VITE_API_BASE_URL=https://PLACEHOLDER_BACKEND_URL/api
```

Replace placeholder after backend deploys. See step 7.4.

### 4.2 `MediaBillingReconcilliation/staticwebapp.config.json`

SPA fallback so React Router routes work on refresh.

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/images/*.{png,jpg,gif}", "/css/*"]
  }
}
```

### 4.3 `MediaBillingReconcilliationBackend/Dockerfile`

```dockerfile
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=5000

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libtesseract-dev \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT} --workers 2 --timeout 120 app:app"]
```

Notes. Container port matches local dev port. Workers set to 2. Timeout 120 sec for slow CrewAI calls. Poppler installed for PDF text fallback.

### 4.4 `MediaBillingReconcilliationBackend/.dockerignore`

```
__pycache__
*.pyc
.venv
venv
.env
.env.*
*.log
uploads/*
!uploads/.gitkeep
output/
.git
.idea
.vscode
backend.log
```

Stops local venv and secrets from entering image.

### 4.5 `MediaBillingReconcilliationBackend/mapping/`

Copy these five files from `MediaBillingNotebook/mapping/`:
- `media_invoice_1.json`
- `media_invoice_2.json`
- `media_invoice_3.json`
- `media_invoice_4.json`
- `media_invoice_5.json`

Mapping data must travel with the container.

### 4.6 `deploy/00-prereqs.md`

Setup checklist.

```markdown
# Prerequisites

1. Install Azure CLI.
   Windows: winget install Microsoft.AzureCLI
   Verify: az --version

2. Install Docker Desktop. Required by `containerapp up`.
   Verify: docker --version

3. Login to Azure.
   az login
   Browser opens. Pick subscription.

4. Set default subscription if multiple.
   az account list --output table
   az account set --subscription "<id>"

5. Have your OpenAI API key ready as plain text.

6. Confirm region quota.
   az provider show --namespace Microsoft.App --query "registrationState"
   Should print "Registered". If not:
   az provider register --namespace Microsoft.App
```

### 4.7 `deploy/01-create-rg.sh`

```bash
#!/usr/bin/env bash
set -e

RG_NAME="media-recon-rg"
LOCATION="centralindia"

echo "Creating resource group $RG_NAME in $LOCATION"
az group create --name "$RG_NAME" --location "$LOCATION"

echo "Done. Verify in portal:"
echo "https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/Microsoft.Resources%2Fsubscriptions%2FresourceGroups"
```

What this does. Creates a resource group named `media-recon-rg`. All future resources live inside it. Free.

Verify in portal. Open Resource Groups. Confirm `media-recon-rg` listed.

### 4.8 `deploy/02-deploy-backend.sh`

```bash
#!/usr/bin/env bash
set -e

RG_NAME="media-recon-rg"
LOCATION="centralindia"
ENV_NAME="media-recon-env"
APP_NAME="media-recon-backend"
BACKEND_DIR="../MediaBillingReconcilliationBackend"

echo "Deploying backend container app"

az containerapp up \
  --name "$APP_NAME" \
  --resource-group "$RG_NAME" \
  --location "$LOCATION" \
  --environment "$ENV_NAME" \
  --source "$BACKEND_DIR" \
  --ingress external \
  --target-port 5000

echo ""
echo "Reading public FQDN"
FQDN=$(az containerapp show \
  --name "$APP_NAME" \
  --resource-group "$RG_NAME" \
  --query properties.configuration.ingress.fqdn \
  --output tsv)

echo "Backend URL: https://$FQDN"
echo "Save this. You need it for frontend env var."
```

What this does. Step by step.
1. Uploads the `MediaBillingReconcilliationBackend` folder to a managed cloud builder.
2. Builds the Dockerfile in the cloud.
3. Stores the image in a managed registry Microsoft hosts. Free for this flow.
4. Creates Container Apps Environment `media-recon-env` if missing.
5. Creates Container App `media-recon-backend` with public HTTPS ingress mapped to container port 5000.
6. Prints the public FQDN. Public access uses HTTPS port 443. Container internal port 5000 is hidden behind ingress.

Verify in portal. Resource group `media-recon-rg`. Should now contain a Container Apps Environment, a Container App, a Log Analytics Workspace. Open the Container App. Overview page shows "Application Url".

Test in browser. Open `https://<fqdn>/api/health`. Should return JSON `{"status": "healthy", ...}`.

### 4.9 `deploy/03-set-secrets.sh`

```bash
#!/usr/bin/env bash
set -e

RG_NAME="media-recon-rg"
APP_NAME="media-recon-backend"

# Required
: "${OPENAI_API_KEY:?export OPENAI_API_KEY first}"
: "${JWT_SECRET:?export JWT_SECRET first (use: python -c 'import secrets; print(secrets.token_urlsafe(48))')}"
: "${AUTH_USERS:?export AUTH_USERS first (JSON map of email to werkzeug hash)}"

# Optional
JWT_TTL_HOURS="${JWT_TTL_HOURS:-8}"
if [ -z "$FRONTEND_URL" ]; then
  echo "WARN: FRONTEND_URL not set. CORS will reject browser calls."
  FRONTEND_URL="http://localhost:3000"
fi

echo "Setting secrets"
az containerapp secret set \
  --name "$APP_NAME" \
  --resource-group "$RG_NAME" \
  --secrets \
    "openai-key=$OPENAI_API_KEY" \
    "jwt-secret=$JWT_SECRET" \
    "auth-users=$AUTH_USERS"

echo "Updating env vars"
az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RG_NAME" \
  --set-env-vars \
    "OPENAI_API_KEY=secretref:openai-key" \
    "JWT_SECRET=secretref:jwt-secret" \
    "AUTH_USERS=secretref:auth-users" \
    "JWT_TTL_HOURS=$JWT_TTL_HOURS" \
    "ALLOWED_ORIGINS=$FRONTEND_URL" \
    "MAPPING_FOLDER=/app/mapping" \
    "UPLOAD_FOLDER=/tmp/uploads" \
    "OUTPUT_FOLDER=/tmp/output"

echo "Done. App will restart automatically."
```

How to run.

```bash
export OPENAI_API_KEY="sk-proj-..."
export JWT_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export AUTH_USERS='{"akhil@demo.com":"<hash>","reviewer@demo.com":"<hash>","guest@demo.com":"<hash>"}'
export FRONTEND_URL="https://<your-static-web-app>.azurestaticapps.net"
./03-set-secrets.sh
```

Run this twice. First time after step 02 with placeholder FRONTEND_URL. Second time after step 04 once you know the real Static Web Apps URL.

What this does.
1. Stores three secrets: `openai-key`, `jwt-secret`, `auth-users`. Encrypted at rest.
2. Mounts them as env vars inside the container via `secretref:`.
3. Sets `JWT_TTL_HOURS`, `ALLOWED_ORIGINS`, and folder paths as plain env vars.
4. Restart triggers automatically after env update.

Verify in portal. Container App. Settings. Secrets. Should show `openai-key`, `jwt-secret`, `auth-users`. Settings. Containers. Edit. Env vars listed including the three secretref entries.

### 4.10 `deploy/04-deploy-frontend.sh`

```bash
#!/usr/bin/env bash
set -e

RG_NAME="media-recon-rg"
SWA_NAME="media-recon-frontend"
LOCATION="centralindia"
FRONTEND_DIR="../MediaBillingReconcilliation"

if [ -z "$BACKEND_URL" ]; then
  echo "ERROR: export BACKEND_URL first (https://<fqdn>)"
  exit 1
fi

echo "Writing .env.production"
cat > "$FRONTEND_DIR/.env.production" <<EOF
VITE_API_BASE_URL=$BACKEND_URL/api
EOF

echo "Building frontend"
pushd "$FRONTEND_DIR"
npm install
npm run build
popd

echo "Creating Static Web App"
az staticwebapp create \
  --name "$SWA_NAME" \
  --resource-group "$RG_NAME" \
  --location "$LOCATION" \
  --sku Free

echo "Getting deployment token"
DEPLOY_TOKEN=$(az staticwebapp secrets list \
  --name "$SWA_NAME" \
  --resource-group "$RG_NAME" \
  --query "properties.apiKey" \
  --output tsv)

echo "Installing SWA CLI if missing"
npm install -g @azure/static-web-apps-cli

echo "Deploying built assets"
swa deploy "$FRONTEND_DIR/dist" \
  --deployment-token "$DEPLOY_TOKEN" \
  --env production

echo ""
echo "Frontend URL"
az staticwebapp show \
  --name "$SWA_NAME" \
  --resource-group "$RG_NAME" \
  --query "defaultHostname" \
  --output tsv
```

How to run.

```bash
export BACKEND_URL="https://<fqdn-from-step-02>"
./04-deploy-frontend.sh
```

What this does.
1. Writes Vite env file pointing at backend.
2. Runs `npm install` and `npm run build` locally. Output lands in `dist/`.
3. Creates Azure Static Web App resource on Free SKU.
4. Pulls deployment token.
5. Uses SWA CLI to push `dist/` to the app.
6. Prints the public hostname.

Verify in portal. Resource group. Static Web App resource visible. Open it. Overview. URL ends in `.azurestaticapps.net`. Click. App should load.

Then re-run `03-set-secrets.sh` with the new `FRONTEND_URL` to fix CORS.

### 4.11 `deploy/05-verify.sh`

```bash
#!/usr/bin/env bash
set -e

if [ -z "$BACKEND_URL" ] || [ -z "$FRONTEND_URL" ]; then
  echo "ERROR: export BACKEND_URL and FRONTEND_URL first"
  exit 1
fi

echo "Test 1: backend health (public)"
curl -sS "$BACKEND_URL/api/health"
echo ""

echo "Test 2: protected route rejects without token"
STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/api/upload-file")
if [ "$STATUS" = "401" ]; then
  echo "OK: got 401 as expected"
else
  echo "FAIL: expected 401, got $STATUS"
fi

echo ""
echo "Test 3: backend CORS preflight"
curl -sS -X OPTIONS "$BACKEND_URL/api/health" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" \
  -i | grep -i "access-control"

echo ""
echo "Test 4: login returns a token"
if [ -n "$DEMO_USER" ] && [ -n "$DEMO_PASS" ]; then
  curl -sS -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$DEMO_USER\",\"password\":\"$DEMO_PASS\"}"
  echo ""
else
  echo "SKIP: export DEMO_USER and DEMO_PASS to run this check"
fi

echo ""
echo "Test 5: frontend reachable"
curl -sS -o /dev/null -w "%{http_code}\n" "$FRONTEND_URL"

echo "Done. Now open $FRONTEND_URL in browser and try a real login + upload."
```

What this does. Five smoke tests. Public health, protected-route rejection, CORS headers, login token, frontend HTTP 200.

### 4.12 `deploy/99-teardown.sh`

```bash
#!/usr/bin/env bash
set -e

RG_NAME="media-recon-rg"

read -p "Delete resource group $RG_NAME and ALL resources inside? Type yes: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

az group delete --name "$RG_NAME" --yes --no-wait
echo "Delete started. Takes a few minutes."
```

Saves money. Run when demo period ends.

---

## 5. End To End Execution Order

Run scripts in this exact order.

| Step | Script | Inputs | Outputs |
|---|---|---|---|
| 1 | `00-prereqs.md` | Read only | Tools installed, logged in |
| 2 | `01-create-rg.sh` | None | Resource group created |
| 3 | `02-deploy-backend.sh` | None | Backend FQDN printed |
| 4 | `03-set-secrets.sh` | `OPENAI_API_KEY` | Secrets in Container App |
| 5 | `04-deploy-frontend.sh` | `BACKEND_URL` | Frontend FQDN printed |
| 6 | `03-set-secrets.sh` again | `FRONTEND_URL` | CORS pointed at real frontend |
| 7 | `05-verify.sh` | Both URLs | All three tests pass |
| 8 | Manual smoke in browser | Sample invoice | Upload works |
| 9 | `99-teardown.sh` | When done | Resources deleted |

---

## 6. Cost Expectations

Inside free quotas.

| Resource | Free quota | Expected use | Risk |
|---|---|---|---|
| Resource Group | Free | Always | None |
| Container Apps | 180k vCPU-sec/mo, 360k GiB-sec/mo | Below quota with scale to zero | Heavy demo bursts could exceed |
| Static Web Apps | 100 GB bandwidth/mo, free SKU | Tiny site, small bandwidth | None |
| Log Analytics | 5 GB/mo ingest free | Container App writes here | Could exceed if errors loop |
| OpenAI | Per-token billing | User pays separately | Watch usage |

If costs ever appear, check Cost Management in portal first.

---

## 7. Things To Watch Out For

**OpenAI key.** Never commit it. The repo `.env` previously held a key. Rotate if uncertain.

**JWT secret.** If you change `JWT_SECRET` after deploy, all existing tokens become invalid. Users must log in again. Acceptable for a demo.

**AUTH_USERS as env var.** Container Apps secret values are limited to 65 KB. Three users with werkzeug hashes is well under. If user count grows past dozens, switch to a managed identity store.

**Lockout state is per replica.** With min=0 max=1 there is only one replica so this is fine. If you ever raise max replicas, lockout resets across instances and a brute force attacker could rotate.

**Cold starts.** First request after 5 to 10 min idle takes 10 to 20 sec. Acceptable for demo. Hit `/api/health` 30 sec before showing the demo.

**Image build time.** First `containerapp up` takes 5 to 8 min. Subsequent updates ~3 min.

**CORS chicken-and-egg.** Backend deploys first without knowing frontend URL. Frontend deploys next. Then re-run `03-set-secrets.sh` with the real frontend URL. Step 6 in the table above.

**Mapping path inside container.** Lives at `/app/mapping`. Set via `MAPPING_FOLDER` env var. Frontend default still references `'../MediaBillingNotebook/mapping'` which gets ignored because the backend route reads its own default when JSON omits the field. Safer pattern. Frontend should stop sending `mapping_folder` at all. Optional cleanup.

**Vendor scoring history.** Lost on every cold start. Acceptable per project rules.

**Email feature.** Routes removed. UI buttons that hit them will 404. Frontend code currently does not invoke email endpoints from any screen. Safe.

**Pytesseract on Linux.** Tesseract installs via apt in Dockerfile. No Windows path needed in container.

**Gunicorn workers.** Set to 2. Each worker holds CrewAI in memory. Memory ~ 600 MB total. Container Apps default is 0.5 GiB. May need to bump to 1 GiB if OOMKilled.

If OOM happens. Run:
```bash
az containerapp update \
  --name media-recon-backend \
  --resource-group media-recon-rg \
  --memory 1.0Gi \
  --cpu 0.5
```

---

## 8. Local Dev After Changes

Code still runs locally with same commands. Both branches of the env-var pattern keep `localhost` as fallback.

Frontend.
```bash
cd MediaBillingReconcilliation
npm run dev
```
Opens on **http://localhost:3000** (forced by `vite.config.ts`). Not 5173.

Backend.
```bash
cd MediaBillingReconcilliationBackend
source ../venv/bin/activate
python app.py
```
Opens on **http://localhost:5000**.

Or use the existing `start_backend.sh` and `start_frontend.sh`. They still work. The 5173 message in `start_frontend.sh` is wrong. Site actually runs on 3000.

---

## 9. Git Strategy

User said remove old git link, treat folder as new repo.

```bash
cd C:\Users\you\Documents\media-reconciliation-agent
git remote remove origin
git remote add origin <new-repo-url>
git push -u origin <branch>
```

Old branch already pushed by user. No history loss.

Add to `.gitignore` if not present:
```
.env
.env.production
deploy/.deploy_state
```

---

## 10. What Did Not Get Done On Purpose

Listed for transparency.

- **No Key Vault.** Container App secrets used instead. Faster.
- **No CI/CD.** Local CLI scripts only. User chose this.
- **No keepalive cron.** User chose pure scale to zero.
- **No custom domain.** Default Azure domains used.
- **No Application Insights.** Log Analytics auto-attached is enough for demo.
- **No staging slot.** Container Apps revisions handle blue/green if needed.
- **Mobile app deployment.** Excluded per project rules.

---

## 11. Rollback Procedure

If a deploy goes bad.

1. Check Container App revisions in portal. Each `containerapp up` creates a new revision.
2. Switch traffic back to previous revision via portal or:
   ```bash
   az containerapp revision list --name media-recon-backend --resource-group media-recon-rg
   az containerapp ingress traffic set --name media-recon-backend --resource-group media-recon-rg --revision-weight <old-revision>=100
   ```
3. For frontend, redeploy `dist/` from a previous local build.

If everything is hosed.

```bash
./99-teardown.sh
```

Then start over from step 2.

---

## 12. What Claude Should Do When Re Run

If a future Claude session picks this up.

1. Read this file first.
2. Confirm user intent has not changed.
3. Check which files already exist from the lists in sections 3 and 4.
4. Skip steps already done.
5. Never edit `services/invoice_*.py` or `discrepancy_agent.py`. Reconciliation logic is stable.
6. Never re commit a real OpenAI key.
7. Always set CORS env var rather than wildcard.

---

## 13. Open Questions Saved For Later

None blocking. Listed if scope expands.

- Move to Azure OpenAI for compliance.
- Add Key Vault when team grows.
- Add managed identity when database appears.
- Add Application Insights when traffic grows.
- Custom domain when going public.
- Restore email feature when SMTP credentials available.

---

End of plan.
