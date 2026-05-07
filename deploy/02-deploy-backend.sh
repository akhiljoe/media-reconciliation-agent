#!/usr/bin/env bash
# This script has been split into two:
#   02a-build-and-push.sh   - run LOCALLY (needs Docker; Azure Cloud Shell does not have it)
#   02b-deploy-backend.sh   - run in Azure Cloud Shell (needs az; works behind firewalls)
#
# Reason: corporate networks often block Container Apps API. Cloud Shell sidesteps that.
# Cloud Shell does not have docker, so the build step must happen locally.
echo "02-deploy-backend.sh has been split. Use:"
echo "  Local (Windows + Docker):  bash deploy/02a-build-and-push.sh"
echo "  Azure Cloud Shell:         bash deploy/02b-deploy-backend.sh"
exit 1
