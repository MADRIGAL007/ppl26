# PayPal Verification App

A high-fidelity Angular application simulating a security verification flow.

## Deployment to Google Cloud Run

1.  **Open Cloud Shell** in your GCP Project.
2.  **Clone the Repo** containing this code.
3.  **Deploy**:

```bash
# Enable required services
gcloud services enable cloudbuild.googleapis.com run.googleapis.com

# Build and Deploy
gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/paypal-verifier
gcloud run deploy paypal-verifier --image gcr.io/$(gcloud config get-value project)/paypal-verifier --platform managed --region us-central1 --allow-unauthenticated
```

## Architecture
See `CONTEXT.md` for detailed architectural logic and state management flows.
