#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
PROJECT_ID="gen-lang-client-0918026187"
APP_NAME="paypal-verification"
REGION="us-west1"
GCR_IMAGE_URI="gcr.io/${PROJECT_ID}/${APP_NAME}"

# --- 1. Initialize gcloud ---
echo "--- Step 1: Initializing gcloud and enabling APIs ---"
gcloud config set project "$PROJECT_ID"

# Enable necessary APIs
echo "Enabling Cloud Run, Cloud Build, and Artifact Registry APIs..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# --- 2. Build ---
echo "--- Step 2: Submitting application build ---"
gcloud builds submit --tag "$GCR_IMAGE_URI"

# --- 3. Deploy to Cloud Run ---
echo "--- Step 3: Deploying to Cloud Run ---"
gcloud run deploy "$APP_NAME" \
  --region "$REGION" \
  --image "$GCR_IMAGE_URI" \
  --platform "managed" \
  --allow-unauthenticated \
  --execution-environment "gen2" \
  --set-env-vars="DATA_DIR=/app/data" \
  --quiet

# --- 4. Output ---
echo "--- Step 4: Deployment complete! ---"
SERVICE_URL=$(gcloud run services describe "$APP_NAME" --region "$REGION" --platform "managed" --format 'value(status.url)')
echo "Service URL: ${SERVICE_URL}"
