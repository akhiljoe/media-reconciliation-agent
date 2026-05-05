# Prerequisites

Run these once before the first deploy.

## 1. Install Azure CLI

Windows:
```powershell
winget install Microsoft.AzureCLI
```

Verify in Git Bash:
```bash
az --version
```

Should print version 2.x.x.

## 2. Docker Desktop

You already have it (you smoke tested the container).

```bash
docker --version
```

## 3. Login to Azure

```bash
az login
```

A browser opens. Pick your account. Approve.

If you have multiple subscriptions:

```bash
az account list --output table
az account set --subscription "<id-or-name>"
az account show
```

## 4. Register the Container Apps provider

One-time per subscription. Skip if already done.

```bash
az provider show --namespace Microsoft.App --query "registrationState" -o tsv
```

If it prints anything other than `Registered`:

```bash
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

Wait 2 to 5 minutes. Re-check.

## 5. Install the Container Apps CLI extension

```bash
az extension add --name containerapp --upgrade
```

## 6. Install the Static Web Apps CLI

```bash
npm install -g @azure/static-web-apps-cli
swa --version
```

## 7. Have these values ready

Before running deploy scripts.

| Var | What it is | How to get it |
|---|---|---|
| `OPENAI_API_KEY` | Your OpenAI key | platform.openai.com/api-keys |
| `JWT_SECRET` | Random 48 char string | `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `AUTH_USERS` | JSON map of email to werkzeug hash | See deploy/README.md or AZURE_DEPLOYMENT_PLAN.md section 2.5 |

## 8. Run order

```
01-create-rg.sh
02-deploy-backend.sh
03-set-secrets.sh           (with placeholder FRONTEND_URL)
04-deploy-frontend.sh       (gives you real frontend URL)
03-set-secrets.sh           (re-run with real FRONTEND_URL to fix CORS)
05-verify.sh
```

When done with the demo: `99-teardown.sh`.
