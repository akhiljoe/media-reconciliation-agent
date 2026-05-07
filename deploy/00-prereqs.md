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

The deploy script `03-set-secrets.sh` reads from `backend/.env` automatically. If your `.env` already contains the values below, you do not need to export them in the shell. Shell exports always win on conflict.

| Var | What it is | How to get it |
|---|---|---|
| `OPENAI_API_KEY` | Your OpenAI key | platform.openai.com/api-keys |
| `JWT_SECRET` | Random 48 char string | `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `AUTH_USERS` | JSON map of email to werkzeug hash | See AZURE_DEPLOYMENT_PLAN.md section 2.5 |
| `JWT_TTL_HOURS` (optional) | Token validity hours | Defaults to 8 |

Verify your `.env` has all three. Open `backend/.env` and confirm.

## 8. Set a budget alert (MANDATORY before any resource creation)

This is your safety net. If anything misconfigures and starts billing, you get an email before it grows.

1. Portal -> **Cost Management + Billing** -> pick your subscription
2. Left sidebar -> **Budgets** -> **+ Add**
3. Name: `monthly-cap`
4. Reset period: `Monthly`
5. Amount: `$1` (or any small number)
6. Alert thresholds: 50%, 80%, 100% of actual cost
7. Email: your account email
8. Create

Skip this and you are deploying blind.

## 9. Run order

```
01-create-rg.sh
02-deploy-backend.sh
03-set-secrets.sh           (with placeholder FRONTEND_URL)
04-deploy-frontend.sh       (gives you real frontend URL)
03-set-secrets.sh           (re-run with real FRONTEND_URL to fix CORS)
05-verify.sh
```

When done with the demo: `99-teardown.sh`.
