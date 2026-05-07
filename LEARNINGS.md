# Azure Deployment Learnings

A field report from deploying the Media Reconciliation Agent to Azure free tier.
What I planned, what actually happened, and what I would tell future-me on day one.

---

## 1. The Original Plan vs Reality

| Decision | Original Plan | What Actually Happened | Why It Changed |
|---|---|---|---|
| Backend hosting | `az containerapp up --source ./backend` (managed build) | Local Docker build → push to GHCR → `az containerapp create` from GHCR | Managed build creates an Azure Container Registry. ACR Basic costs $5/mo. Not free. |
| Region for backend | Central India | Central India (worked) | OK |
| Region for frontend | Central India | Eastasia | Static Web Apps does not exist in Central India. Valid regions: westus2, centralus, eastus2, westeurope, eastasia |
| Where to run `az` commands | Local Git Bash on Windows | Azure Cloud Shell | Corporate network blocked Container Apps API (`WinError 10054` on TLS handshake). Cloud Shell runs inside Azure, no firewall in the way. |
| Where to build Docker image | Anywhere with Docker | Local Windows only | Cloud Shell does not have Docker. Local Windows had it. |
| Image registry | Azure managed (free, automatic) | GitHub Container Registry (private, free) | Switched after ACR cost discovery. |
| Logs / monitoring | Default Log Analytics (5 GB/mo free) | Default Log Analytics, kept | Wanted "proper monitoring", 5 GB is plenty for demo |
| Secrets | Container App secrets | Container App secrets | OK |
| Auth | Backend JWT against env-defined users | Same | OK |
| Subscription | New PAYG, isolated for cost tracking | Used the trial sub instead | $200 credit was a useful safety net for a one-off demo |
| Provider registrations needed | `Microsoft.App`, `Microsoft.OperationalInsights` | Plus `Microsoft.Web` (for Static Web Apps), and almost `Microsoft.ContainerRegistry` | SWA registration was missed in the original plan |

---

## 2. Surprises That Cost Time

### 2.1 Corporate network blocked Container Apps API

**Symptom**: `WinError 10054`, "An existing connection was forcibly closed by the remote host" during TLS handshake.

**Cause**: A corporate firewall (or any TLS-inspecting proxy) interfered with the specific endpoint the `containerapp` extension hits.

**Diagnostic that nailed it**:
```bash
az group list      # PASS
az containerapp list  # FAIL
```
General `management.azure.com` worked. Container Apps endpoint did not.

**Fix**: switched to **Azure Cloud Shell** (https://shell.azure.com). It runs inside Azure so no corporate proxy in the way.

**Lesson**: when one specific Azure SDK endpoint fails consistently while others work, suspect TLS inspection or a region/service-specific block. Cloud Shell is the universal escape hatch.

### 2.2 ACR is not free

**Symptom**: `az containerapp up --source <Dockerfile>` tries to create an Azure Container Registry. Subscription must register `Microsoft.ContainerRegistry`. Then ACR Basic costs ~$5/month while it exists.

**Lesson**: `--source` is convenient but auto-creates a paid resource. For truly free, push to GHCR and use `az containerapp create --image ghcr.io/...`.

**Cost reality**: ACR Basic is $0.167/day. A 1-week demo would cost ~$1. So the "free" rule was a strict reading; the actual cost is trivial. Either path is fine.

### 2.3 Cloud Shell does not have Docker

**Symptom**: Cloud Shell `docker --version` works but `docker info` says "Cannot connect to the Docker daemon".

**Cause**: Microsoft removed the Docker daemon from Cloud Shell years ago.

**Fix**: split the deploy into two scripts.
- `02a-build-and-push.sh`: needs Docker, runs locally on Windows
- `02b-deploy-backend.sh`: needs `az`, runs in Cloud Shell

This split also matched the network reality: GHCR push works from Windows (talks to GitHub), Container Apps API works from Cloud Shell (talks to Azure-internal).

### 2.4 Static Web Apps is not in centralindia

**Symptom**: `LocationNotAvailableForResourceType: 'centralindia' is not available for resource type 'Microsoft.Web/staticSites'`.

**Cause**: SWA only exists in `westus2, centralus, eastus2, westeurope, eastasia`.

**Fix**: hardcoded `SWA_LOCATION=eastasia` in `04-deploy-frontend.sh`. Eastasia = Hong Kong, closest to India of the valid regions.

**Note**: SWA serves through Azure's global CDN edge network, so the management region barely affects end-user latency. It mostly affects which region the management API talks to.

### 2.5 Cloud Shell with no storage = ephemeral

**Symptom**: Session refresh / timeout wipes home dir. Lost cloned repo, `.env`, exported vars.

**Mitigation paths**:
- Mount a tiny storage account (~$0.04/mo). Persistent home dir.
- Or accept ephemeral, re-clone + re-create `.env` each session.

**My choice**: ephemeral, with a recovery snippet ready to paste. For a one-off demo it was fine. For repeated work, mount storage.

### 2.6 Cloud Shell does not allow `npm install -g`

**Symptom**: `EACCES: permission denied, mkdir '/usr/lib/node_modules/@azure'`.

**Cause**: Cloud Shell users are not root. Global npm prefix is locked.

**Fix**: use `npx -y @azure/static-web-apps-cli ...` instead of installing. `npx` downloads on demand to a user-writable dir.

### 2.7 Multiple provider registrations needed

| Provider | Why | When We Hit It |
|---|---|---|
| `Microsoft.App` | Container Apps | Step 02 |
| `Microsoft.OperationalInsights` | Log Analytics workspace | Step 02 |
| `Microsoft.Web` | Static Web Apps | Step 04 |
| `Microsoft.ContainerRegistry` | If using `containerapp up --source` (we ended up not needing this after switching to GHCR) | Step 02 (avoided) |

**Lesson**: `az provider register` is free, fast, and idempotent. Register everything you might need upfront. They never cost anything to be registered.

```bash
# Run all common providers in one shot
for ns in Microsoft.App Microsoft.OperationalInsights Microsoft.Web; do
  az provider register --namespace "$ns" --wait
done
```

### 2.8 `.env` file gotchas

**Issue 1**: Docker `--env-file` does not strip surrounding quotes.

```
OPENAI_API_KEY="sk-proj-..."
```

becomes the literal value `"sk-proj-..."` (quotes included) inside the container, which OpenAI rejects as invalid key.

**Fix**: do NOT wrap values in quotes when using `--env-file`. Bash `source` strips quotes; Docker does not.

**Issue 2**: Windows line endings (`\r\n`) make values include a trailing `\r`. Same effect: invalid key.

**Fix**: `sed -i 's/\r$//' .env` to strip them.

### 2.9 AUTH_USERS as JSON in env var

werkzeug password hashes contain `:` and `$` characters. Bash variable expansion can interpret `$abc` as a variable reference. Wrap the value in **single quotes** when assigning in shell, double quotes inside the JSON itself.

```bash
# Good
export AUTH_USERS='{"akhil@demo.com":"scrypt:32768:8:1$abc..."}'

# Bad: $abc gets expanded by bash
export AUTH_USERS="{\"akhil@demo.com\":\"scrypt:32768:8:1$abc...\"}"
```

Inside `.env`, no outer quotes. Bash `source` does NOT re-expand `$` inside read values.

### 2.10 CrewAI version conflict in requirements.txt

**Symptom**: `pip install -r requirements.txt` failed with `ResolutionImpossible: crewai 0.70.1 depends on langchain<0.3.0 and >=0.2.16. The user requested langchain==0.3.7`.

**Cause**: requirements.txt was stale. Local venv had drifted to crewai 1.14.3 (no langchain dep). The pinned versions in the file were inconsistent with what actually worked locally.

**Fix**: regenerated requirements.txt with the actual installed versions from the venv. Removed the stale `langchain==0.3.7` line.

**Lesson**: when a deploy fails on dep resolution, check `pip freeze` from the working venv and reconcile.

### 2.11 Private registry URLs in package-lock.json

**Symptom**: every `resolved` URL in `package-lock.json` pointed to a private registry host instead of `registry.npmjs.org`.

**Cause**: the dev who generated the lockfile had npm configured to use a company-internal npm mirror.

**Why it matters**: anyone without access to that mirror cannot run `npm install`. Lockfile broke portability.

**Fix**:
```bash
cd frontend
npm config set registry https://registry.npmjs.org/ --location=project
rm -rf node_modules package-lock.json
npm install
```

The `--location=project` writes a local `.npmrc`. Other projects in unrelated dirs keep their own registry settings.

### 2.12 pytesseract was imported but not in venv

**Symptom**: `import pytesseract` at the top of `app.py` would fail in a clean Linux container, but the user's local app started fine.

**Cause**: local venv must have had pytesseract from elsewhere (system Python? earlier global install). Not actually pinned in requirements.txt.

**Fix**: explicitly added `pytesseract==0.3.13` to requirements.txt.

**Lesson**: imports in code are not authoritative for what is in your environment. Always `pip freeze | grep <pkg>` to confirm.

### 2.13 OOM concerns with smallest container size

**Initial plan**: 0.25 vCPU + 0.5 GiB (smallest, cheapest).

**Reality**: CrewAI + langchain-openai loads ~600 MB per worker. Two gunicorn workers in 0.5 GiB = OOM risk on AI routes.

**Fix**: bumped to 0.5 vCPU + 1 GiB. Still inside free tier with scale-to-zero. Two workers fit comfortably.

**Lesson**: CrewAI is heavy. Plan for at least 1 GiB if AI features are exposed.

---

## 3. The Final Architecture

```
[ Browser ]
     |
     | HTTPS
     v
[ Azure Static Web Apps ]   region: eastasia, free SKU
     |
     | HTTPS to backend (CORS scoped)
     v
[ Azure Container Apps ]    region: centralindia, scale-to-zero
     | image pulled from
     v
[ ghcr.io/akhiljoe/media-recon-backend:latest ]   private, free
     |
     | OpenAI calls (token from Container App secret)
     v
[ OpenAI API ]
```

| Component | Resource | Cost |
|---|---|---|
| Backend container | Azure Container Apps Consumption | Free under quota (180k vCPU-sec, 360k GiB-sec / mo). Scale to zero. |
| Backend logs | Log Analytics Workspace (auto-created) | Free up to 5 GB/mo |
| Container image hosting | GitHub Container Registry | Free, private |
| Frontend | Azure Static Web Apps Free SKU | Free permanently |
| Secrets | Container Apps secrets | Free |
| OpenAI | Pay-per-token | Separate billing |

---

## 4. Commands That Saved Time (Reference)

### Diagnostic

```bash
# Check provider registration state
az provider show --namespace Microsoft.App --query "registrationState" -o tsv

# Check what is actually deployed (catch surprise paid resources)
az resource list --resource-group media-recon-rg --output table

# See the resolved env var on a Container App
az containerapp show \
  --name media-recon-backend \
  --resource-group media-recon-rg \
  --query "properties.template.containers[0].env" -o table

# See current revision health and provisioning state
az containerapp revision list \
  --name media-recon-backend \
  --resource-group media-recon-rg \
  --query "[].{name:name, active:properties.active, health:properties.healthState}" \
  -o table

# Tail container logs
az containerapp logs show \
  --name media-recon-backend \
  --resource-group media-recon-rg \
  --follow

# Verify CORS preflight
curl -i -X OPTIONS "$BACKEND_URL/api/health" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET"

# Sanity check the actual env var inside a running container (local docker)
docker exec <container_name> sh -c 'printf "[%s]\n" "$OPENAI_API_KEY" | cat -A'
```

### Recovery

```bash
# Delete a failed Container App so create can run cleanly
az containerapp delete \
  --name media-recon-backend \
  --resource-group media-recon-rg \
  --yes

# Force a Container App to scale to zero (stop billing)
az containerapp update \
  --name media-recon-backend \
  --resource-group media-recon-rg \
  --min-replicas 0 --max-replicas 0

# Bring it back online
az containerapp update \
  --name media-recon-backend \
  --resource-group media-recon-rg \
  --min-replicas 0 --max-replicas 1

# Switch traffic back to a previous revision
az containerapp ingress traffic set \
  --name media-recon-backend \
  --resource-group media-recon-rg \
  --revision-weight <old-revision-name>=100

# Total teardown (zero ongoing cost)
az group delete --name media-recon-rg --yes --no-wait
```

### npm / Docker

```bash
# Strip surrounding quotes from .env values (Docker --env-file gotcha)
sed -i 's/^\([A-Z_]*\)="\(.*\)"$/\1=\2/' backend/.env

# Strip Windows carriage returns from .env
sed -i 's/\r$//' backend/.env

# Confirm a docker image exists and is the right size
docker images | grep media-recon

# Test a built image locally before pushing
docker run --rm -p 5001:5000 --env-file backend/.env media-recon-backend:local

# Login to GHCR and push
echo "$GHCR_PAT" | docker login ghcr.io -u akhiljoe --password-stdin
docker push ghcr.io/akhiljoe/media-recon-backend:latest

# Run npm CLI tools without global install (Cloud Shell friendly)
npx -y @azure/static-web-apps-cli deploy ./dist --deployment-token "$TOKEN" --env production
```

### Cloud Shell

```bash
# Recover from a session refresh (no storage mounted)
git clone https://github.com/akhiljoe/media-recon-azure.git
cd media-recon-azure
cat > backend/.env <<'EOF'
OPENAI_API_KEY=...
JWT_SECRET="..."
AUTH_USERS={"akhil@demo.com":"scrypt:..."}
EOF
export GHCR_PAT="ghp_..."
export BACKEND_URL="https://..."
```

---

## 5. Real Cost Tracker

For a 1-week demo run with low traffic:

| Item | Cost |
|---|---|
| Resource Group | $0 |
| Container Apps Environment | $0 |
| Container App (scale-to-zero, ~50 visits) | $0 (well under free quota) |
| Log Analytics Workspace (auto-created, ~50 MB ingested) | $0 (under 5 GB) |
| Static Web App Free SKU | $0 |
| Container Registry | $0 (used GHCR, not ACR) |
| GHCR storage | $0 (free for private packages) |
| **Total Azure cost** | **$0** |
| OpenAI tokens | Separate, depends on usage |

After demo: `bash deploy/99-teardown.sh` deletes everything. Stops all clocks.

---

## 6. What I Would Tell Day-One Me

1. Run from **Cloud Shell** by default. Skip the local-vs-remote network confusion.
2. **Mount a small storage account** in Cloud Shell. $0.04/mo, save 30 minutes of re-cloning every session.
3. Register all four providers up front: `Microsoft.App`, `Microsoft.OperationalInsights`, `Microsoft.Web`, and `Microsoft.ContainerRegistry` (the last only if you go ACR).
4. Set a **$1 budget alert before any resource creation**. Email reaches you before any actual bill arrives.
5. **GHCR for free private images** is genuinely as easy as ACR once you have a PAT with `write:packages`. No reason to choose ACR for a demo.
6. **Static Web Apps lives in only 5 regions**. Eastasia is the right pick from India. Don't try centralindia.
7. **Split build from deploy** if you might switch machines. `02a` runs anywhere with Docker. `02b` runs anywhere with `az`. Cloud Shell can do `02b` but not `02a`.
8. **JWT auth + CORS scope + Container App secrets** is enough for a public demo. You do not need Entra ID, Key Vault, or App Insights for a one-off.
9. **Image size matters**: CrewAI bundle is ~1.5 GB. Push takes 1 to 2 min. Pull on cold start adds a few seconds.
10. When `az` says **"connection forcibly closed"**, suspect the network, not Azure. Test with another endpoint to isolate.
11. **Provider registration is always free**. Register liberally; you only pay when you create resources.
12. The **Cloud Shell editor** (`code <file>`) is good for fixing small things in `.env` without round-tripping through git.

---

## 7. Things to Improve Next Time

- Create a fresh PAYG subscription dedicated to the demo (better cost tracking than mixing with trial).
- Mount Cloud Shell storage on day one.
- Use Bicep or Terraform for IaC instead of imperative az commands. Easier to teardown + redeploy.
- Add Application Insights once traffic warrants observability beyond `az containerapp logs show`.
- Set up a custom domain (free with Let's Encrypt cert via SWA + Container Apps).
- GitHub Actions to auto-build + push to GHCR on every commit. Removes the local Docker step.

---

End of learnings.
