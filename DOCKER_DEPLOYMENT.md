# Docker Build and GCR Deployment Setup

This repository now includes automated Docker image building and publishing to Google Container Registry (GCR) on pushes to the main branch.

## Prerequisites

### 1. Google Cloud Project Setup

1. Create a Google Cloud Project or use an existing one
2. Enable the following APIs:
   - Container Registry API
   - Artifact Registry API
   - Cloud Run API (optional, for deployment)

### 2. Artifact Registry Repository

Create an Artifact Registry repository:

```bash
gcloud artifacts repositories create clipshare \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker repository for Clipshare application"
```

### 3. Service Account Setup

1. Create a service account:
```bash
gcloud iam service-accounts create clipshare-github \
    --description="Service account for GitHub Actions" \
    --display-name="Clipshare GitHub Actions"
```

2. Grant necessary permissions:
```bash
# For Artifact Registry
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:clipshare-github@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

# For Cloud Run (optional)
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:clipshare-github@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

# For IAM (to create Cloud Run services)
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:clipshare-github@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"
```

3. Create and download a key file:
```bash
gcloud iam service-accounts keys create key.json \
    --iam-account=clipshare-github@PROJECT_ID.iam.gserviceaccount.com
```

### 4. GitHub Secrets Configuration

Add the following secrets to your GitHub repository:

1. **GCP_PROJECT_ID**: Your Google Cloud Project ID
2. **GCP_SA_KEY**: Contents of the `key.json` file (the entire JSON content)

To add secrets:
1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret" and add each secret

## Workflow Details

The GitHub Actions workflow (`.github/workflows/docker-build-deploy.yml`) will:

1. **Trigger**: Automatically run on pushes to the `main` branch
2. **Build**: Create a Docker image from the Next.js application
3. **Tag**: Tag the image with both the commit SHA and `latest`
4. **Push**: Upload the image to Google Artifact Registry
5. **Deploy**: Optionally deploy to Cloud Run (can be disabled if not needed)

## Docker Image Details

- **Base Image**: Node.js 20 Alpine Linux (matches project's Node.js version requirements)
- **Application**: Next.js application with standalone output
- **Dependencies**: Includes FFmpeg and Python for video processing
- **Port**: Exposes port 3000
- **User**: Runs as non-root user for security

## CI/CD Workflows

### Docker Build Test (`docker-build-test.yml`)
- **Triggers**: On pull requests and pushes to main that affect the `web/` directory
- **Purpose**: Ensures Docker images build successfully and basic functionality works
- **Blocks**: Prevents merging PRs if Docker build fails
- **Tests**: 
  - Docker image builds without errors
  - Container starts successfully
  - Application responds to HTTP requests

### Docker Build and Publish (`docker-build-deploy.yml`)
- **Triggers**: On pushes to main branch only
- **Purpose**: Builds and publishes production images to Google Container Registry
- **Requirements**: Requires proper GCP authentication and secrets

## Image URLs

After successful builds, images will be available at:
- `us-central1-docker.pkg.dev/PROJECT_ID/clipshare/clipshare-web:latest`
- `us-central1-docker.pkg.dev/PROJECT_ID/clipshare/clipshare-web:COMMIT_SHA`

## Manual Docker Commands

To build and push manually:

```bash
# Build locally
cd web
docker build -t clipshare-web:local .

# Tag for GCR
docker tag clipshare-web:local us-central1-docker.pkg.dev/PROJECT_ID/clipshare/clipshare-web:manual

# Push to GCR (requires authentication)
gcloud auth configure-docker us-central1-docker.pkg.dev
docker push us-central1-docker.pkg.dev/PROJECT_ID/clipshare/clipshare-web:manual
```

## Environment Variables

The application expects certain environment variables for database connections, authentication, and other services. These should be configured in your deployment target (Cloud Run, Kubernetes, etc.).

## Troubleshooting

1. **Build failures**: Check that all required secrets are properly configured
2. **Permission errors**: Verify the service account has the correct IAM roles
3. **Network issues**: Ensure your Google Cloud project has the necessary APIs enabled
4. **Docker build issues**: The build process temporarily disables TypeScript and ESLint checks for Docker compatibility

## Next Steps

1. Configure the required GitHub secrets
2. Push to the main branch to trigger the first build
3. Monitor the Actions tab for build progress
4. Configure your deployment target to use the published images