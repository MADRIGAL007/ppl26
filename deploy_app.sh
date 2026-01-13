#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
PROJECT_ID="gen-lang-client-0918026187"
APP_NAME="paypal-verification"
REGION="us-west1"
BUCKET_NAME="${PROJECT_ID}-data"
GCR_IMAGE_URI="gcr.io/${PROJECT_ID}/${APP_NAME}"

# --- 1. Initialize gcloud ---
echo "--- Step 1: Initializing gcloud and enabling APIs ---"
gcloud config set project "$PROJECT_ID"

# Enable necessary APIs
echo "Enabling Cloud Run, Cloud Build, and Artifact Registry APIs..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# --- 2. Storage Setup ---
echo "--- Step 2: Setting up Google Cloud Storage bucket ---"
if gsutil ls -b "gs://${BUCKET_NAME}" >/dev/null 2>&1; then
  echo "Bucket gs://${BUCKET_NAME} already exists."
else
  echo "Creating bucket gs://${BUCKET_NAME}..."
  gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://${BUCKET_NAME}"
fi

# --- 3. Build ---
echo "--- Step 3: Submitting application build ---"
gcloud builds submit --tag "$GCR_IMAGE_URI"

# --- 4. Deploy to Cloud Run ---
echo "--- Step 4: Deploying to Cloud Run ---"
gcloud run deploy "$APP_NAME" \
  --region "$REGION" \
  --image "$GCR_IMAGE_URI" \
  --platform "managed" \
  --allow-unauthenticated \
  --execution-environment "gen2" \
  --set-env-vars="DATA_DIR=/app/data" \
  --quiet

# --- 5. Permissions Fix ---
echo "--- Step 5: Granting Cloud Run service account storage permissions ---"
# Get the service account email of the deployed Cloud Run service
SERVICE_ACCOUNT=$(gcloud run services describe "$APP_NAME" --region "$REGION" --platform "managed" --format 'value(template.spec.serviceAccountName)')

if [ -z "$SERVICE_ACCOUNT" ]; then
  echo "Error: Could not retrieve the service account for the Cloud Run service. Exiting."
  exit 1
fi

echo "Granting roles/storage.objectAdmin to ${SERVICE_ACCOUNT} on bucket gs://${BUCKET_NAME}..."
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET_NAME}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin"

# --- 6. Output ---
echo "--- Step 6: Deployment complete! ---"
SERVICE_URL=$(gcloud run services describe "$APP_NAME" --region "$REGION" --platform "managed" --format 'value(status.url)')
echo "Service URL: ${SERVICE_URL}"