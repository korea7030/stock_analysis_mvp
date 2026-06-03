#!/bin/bash
# GCP Workload Identity Federation 자동 설정 스크립트
# 사용법: bash setup_wif.sh

set -e

PROJECT_ID="gen-lang-client-0464272127"
SERVICE_ACCOUNT_NAME="stock-mvp-actions"
POOL_ID="github-pool"
PROVIDER_ID="github-provider"
REPOSITORY="korea7030/stock_analysis_mvp"
REGION="us-central1"

echo "🔧 GCP Workload Identity Federation 설정 시작..."
echo "프로젝트: $PROJECT_ID"
echo "저장소: $REPOSITORY"
echo ""

# Step 1: API 활성화
echo "1️⃣  필요한 API 활성화..."
gcloud services enable --project=$PROJECT_ID \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  --quiet

# Step 2: Workload Identity Pool 생성
echo "2️⃣  Workload Identity Pool 생성..."
gcloud iam workload-identity-pools create "$POOL_ID" \
  --project=$PROJECT_ID \
  --location=global \
  --display-name="GitHub Actions Pool" \
  --quiet 2>/dev/null || echo "Pool already exists"

# Step 3: Workload Identity Provider 생성
echo "3️⃣  Workload Identity Provider 생성..."
PROVIDER=$(gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --project=$PROJECT_ID \
  --location=global \
  --workload-identity-pool=$POOL_ID \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.aud=assertion.aud,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --query 'name' \
  --format='value(name)' 2>/dev/null || \
  gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project=$PROJECT_ID \
  --location=global \
  --workload-identity-pool=$POOL_ID \
  --query 'name' \
  --format='value(name)')

echo "   Provider: $PROVIDER"

# Step 4: 서비스 계정 생성
echo "4️⃣  서비스 계정 생성..."
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
  --project=$PROJECT_ID \
  --display-name="GitHub Actions - Stock MVP Deployment" \
  --quiet 2>/dev/null || echo "Service account already exists"

SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"
echo "   서비스 계정: $SERVICE_ACCOUNT_EMAIL"

# Step 5: 필요한 권한 부여
echo "5️⃣  필요한 권한 부여..."

ROLES=(
  "roles/artifactregistry.writer"
  "roles/run.developer"
  "roles/iam.serviceAccountUser"
  "roles/artifactregistry.reader"
)

for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="$ROLE" \
    --condition="" \
    --quiet 2>/dev/null || echo "   Role $ROLE already assigned"
done

# Step 6: Workload Identity 바인딩
echo "6️⃣  Workload Identity 바인딩 설정..."

PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# 모든 브랜치 허용 (더 유연함)
gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_EMAIL" \
  --project=$PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository/$REPOSITORY" \
  --quiet 2>/dev/null || echo "   Binding already exists"

# Step 7: Artifact Registry 저장소 생성
echo "7️⃣  Artifact Registry 저장소 생성..."
gcloud artifacts repositories create docker-repo \
  --project=$PROJECT_ID \
  --repository-format=docker \
  --location=$REGION \
  --description="Docker images for stock MVP" \
  --quiet 2>/dev/null || echo "Repository already exists"

# Step 8: Cloud Run 서비스 생성 (선택)
echo "8️⃣  Cloud Run 서비스 생성..."
gcloud run create stock-backend-api \
  --project=$PROJECT_ID \
  --region=$REGION \
  --image=gcr.io/cloudrun/hello \
  --allow-unauthenticated \
  --platform managed \
  --quiet 2>/dev/null || echo "Cloud Run service already exists"

# Step 9: GitHub Secrets 정보 출력
echo ""
echo "✅ GCP 설정 완료!"
echo ""
echo "📝 GitHub Secrets 설정 필요:"
echo "   저장소: https://github.com/$REPOSITORY/settings/secrets/actions"
echo ""
echo "   1. WIF_PROVIDER 추가:"
echo "      projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"
echo ""
echo "   2. SERVICE_ACCOUNT_EMAIL 추가:"
echo "      $SERVICE_ACCOUNT_EMAIL"
echo ""
echo "🚀 설정 완료 후 backend 폴더의 파일을 main 브랜치에 푸시하면 자동 배포됩니다!"
