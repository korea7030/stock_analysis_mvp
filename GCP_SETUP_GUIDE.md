# GCP Workload Identity Federation 설정 가이드

이 문서는 GitHub Actions에서 Workload Identity Federation을 사용하여 GCP에 배포하도록 설정하는 방법을 설명합니다.

## 사전 요구사항

- GCP 프로젝트: `gen-lang-client-0464272127`
- 로컬 환경에 `gcloud` CLI 설치
- GCP 프로젝트의 Owner 또는 Editor 권한

## Step 1: 필요한 API 활성화

```bash
gcloud services enable --project=gen-lang-client-0464272127 \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com
```

## Step 2: Workload Identity Pool 생성

```bash
gcloud iam workload-identity-pools create "github-pool" \
  --project=gen-lang-client-0464272127 \
  --location=global \
  --display-name="GitHub Actions Pool"
```

## Step 3: Workload Identity Provider 생성

```bash
WORKLOAD_IDENTITY_PROVIDER=$(gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project=gen-lang-client-0464272127 \
  --location=global \
  --workload-identity-pool=github-pool \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.aud=assertion.aud,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --query 'name' \
  --format='value(name)')

echo "WORKLOAD_IDENTITY_PROVIDER=$WORKLOAD_IDENTITY_PROVIDER"
```

출력된 값을 기억하세요. 뒤에서 GitHub Secrets에 입력할 때 필요합니다.

## Step 4: 서비스 계정 생성

```bash
gcloud iam service-accounts create stock-mvp-actions \
  --project=gen-lang-client-0464272127 \
  --display-name="GitHub Actions - Stock MVP Deployment"

SERVICE_ACCOUNT_EMAIL=$(gcloud iam service-accounts describe stock-mvp-actions \
  --project=gen-lang-client-0464272127 \
  --format='value(email)')

echo "SERVICE_ACCOUNT_EMAIL=$SERVICE_ACCOUNT_EMAIL"
```

## Step 5: 필요한 권한 부여

```bash
# Artifact Registry 푸시 권한
gcloud projects add-iam-policy-binding gen-lang-client-0464272127 \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/artifactregistry.writer"

# Cloud Run 배포 권한
gcloud projects add-iam-policy-binding gen-lang-client-0464272127 \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/run.developer"

# Cloud Run 관리 권한
gcloud projects add-iam-policy-binding gen-lang-client-0464272127 \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/iam.serviceAccountUser"

# 이미지 가져오기 권한
gcloud projects add-iam-policy-binding gen-lang-client-0464272127 \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/artifactregistry.reader"
```

## Step 6: Workload Identity 바인딩 설정

```bash
REPOSITORY="korea7030/stock_analysis_mvp"

gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_EMAIL" \
  --project=gen-lang-client-0464272127 \
  --role="roles/iam.workloadIdentityUser" \
  --condition='resource.name == "projects/gen-lang-client-0464272127/locations/global/workloadIdentityPools/github-pool/providers/github-provider"' \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe gen-lang-client-0464272127 --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-pool/attribute.repository/$REPOSITORY"
```

## Step 7: 특정 브랜치/작업에 제한 (선택사항)

더 강력한 보안을 위해 main 브랜치에서만 배포 허용:

```bash
WORKLOAD_IDENTITY_PROVIDER="projects/$(gcloud projects describe gen-lang-client-0464272127 --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-pool/providers/github-provider"

gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_EMAIL" \
  --project=gen-lang-client-0464272127 \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe gen-lang-client-0464272127 --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-pool/attribute.repository_ref/repo:$REPOSITORY:ref:refs/heads/main"
```

## Step 8: GitHub Secrets 설정

GitHub 저장소의 **Settings > Secrets and variables > Actions** 에서 다음 2개를 추가:

### 1. `WIF_PROVIDER`
```
projects/[PROJECT_NUMBER]/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

PROJECT_NUMBER는 다음 명령으로 구하세요:
```bash
gcloud projects describe gen-lang-client-0464272127 --format='value(projectNumber)'
```

### 2. `SERVICE_ACCOUNT_EMAIL`
```
stock-mvp-actions@gen-lang-client-0464272127.iam.gserviceaccount.com
```

## Step 9: Artifact Registry 저장소 생성 (아직 없다면)

```bash
gcloud artifacts repositories create docker-repo \
  --project=gen-lang-client-0464272127 \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker images for stock MVP"
```

## Step 10: Cloud Run 서비스 생성 (선택: 첫 배포 전)

첫 번째 배포 시 자동으로 생성되지만, 미리 만들 수도 있습니다:

```bash
gcloud run create stock-backend-api \
  --project=gen-lang-client-0464272127 \
  --region=us-central1 \
  --image gcr.io/cloudrun/hello \
  --allow-unauthenticated \
  --platform managed
```

## 검증

모든 설정이 완료되면:

1. GitHub 저장소에서 `.github/workflows/deploy-to-cloud-run.yml` 파일이 있는지 확인
2. `backend/` 폴더의 파일을 수정하고 main 브랜치에 푸시
3. GitHub Actions 탭에서 **Deploy Backend to Cloud Run** 워크플로우 실행 모니터링
4. 배포 성공 후 Cloud Run URL 확인

## 문제 해결

### "Permission denied" 에러
- 서비스 계정 권한이 올바른지 확인
- Workload Identity 바인딩이 제대로 설정되었는지 확인

### "Could not connect to the endpoint URL"
- Artifact Registry 저장소가 생성되었는지 확인
- 프로젝트 번호와 지역이 올바른지 확인

### 이미지 푸시 실패
- `roles/artifactregistry.writer` 권한 확인
- Docker 인증 설정 재확인: `gcloud auth configure-docker`
