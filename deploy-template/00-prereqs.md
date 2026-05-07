# One-Time Prerequisites

Run these once per machine and per Azure subscription.

## 1. Local tools

```bash
# Docker Desktop (Windows / Mac) or Docker Engine (Linux)
docker --version

# Git
git --version

# Azure CLI
az --version
```

If any are missing:
- Docker Desktop: https://www.docker.com/products/docker-desktop/
- Azure CLI: https://aka.ms/installazurecliwindows  (or your platform's MSI/PKG)

## 2. Azure login

```bash
az login
az account list --output table
az account set --subscription "<your-subscription-name-or-id>"
az account show
```

## 3. Provider registrations (free, one-time per subscription)

```bash
for ns in Microsoft.App Microsoft.OperationalInsights Microsoft.Web; do
  az provider register --namespace "$ns" --wait
done
```

Verify:
```bash
for ns in Microsoft.App Microsoft.OperationalInsights Microsoft.Web; do
  echo -n "$ns: "
  az provider show --namespace "$ns" --query "registrationState" -o tsv
done
```

All three should print `Registered`.

## 4. Container Apps CLI extension

```bash
az extension add --name containerapp --upgrade
```

## 5. GitHub Personal Access Token

For pushing to GHCR.

1. https://github.com/settings/tokens -> Generate new token (classic)
2. Scopes: `repo`, `write:packages`, `read:packages`
3. Expiration: 30 days (or whatever your demo window is)
4. Save the token. You will need it for `02a-build-push.sh`.

## 6. Set a budget alert (MANDATORY)

In Azure Portal:

1. Cost Management + Billing -> your subscription -> Budgets -> + Add
2. Name: `monthly-cap`
3. Reset period: Monthly
4. Amount: `$1` (or any small number, the trigger logic is the same)
5. Alert thresholds: 50%, 80%, 100% of actual cost
6. Email: your account email
7. Create

Skip this step and you are deploying blind.

## 7. Cloud Shell setup

https://shell.azure.com -> Bash

For the first session, choose **Mount storage account** if you plan to deploy more than once. Costs ~$0.04/month and saves you from re-cloning every session.

## 8. Configure this template

```bash
cd deploy
cp config.example.sh config.sh
# Edit config.sh, set PROJECT_PREFIX, GH_USER, regions, etc.
chmod +x *.sh
```

Add `config.sh` to your `.gitignore` if it contains anything sensitive.

## 9. Confirm your repo layout matches the template

```
your-repo/
├── deploy/                <- this folder
│   ├── config.sh          (gitignored)
│   ├── 01-create-rg.sh
│   ├── 02a-build-push.sh
│   ├── 02b-deploy-backend.sh
│   ├── 03-set-secrets.sh
│   ├── 04-deploy-frontend.sh
│   ├── 05-verify.sh
│   └── 99-teardown.sh
├── backend/               <- contains Dockerfile and .env (gitignored)
└── frontend/              <- contains package.json
```

## 10. Run order

```
01-create-rg.sh                  Cloud Shell
02a-build-push.sh                Local (needs Docker)
02b-deploy-backend.sh            Cloud Shell, prints BACKEND_URL
03-set-secrets.sh                Cloud Shell, with placeholder CORS
04-deploy-frontend.sh            Cloud Shell, prints FRONTEND_URL
03-set-secrets.sh                Cloud Shell, with FRONTEND_URL exported (fixes CORS)
05-verify.sh                     Cloud Shell, smoke tests
```

When done: `99-teardown.sh`.
