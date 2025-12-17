# Justfile for Ensemble AI
# https://just.systems/man/en/

# Show available commands
default:
    @just --list

# Variables
project_id := env_var_or_default("FIREBASE_PROJECT_ID", "")
billing_account := env_var_or_default("GCP_BILLING_ACCOUNT", "")
github_repo := env_var_or_default("GITHUB_REPO", "")
region := env_var_or_default("GCP_REGION", "us-central1")
backend_id := "ensemble-ai-prod"
wif_pool_id := "github-actions-pool"
wif_provider_id := "github-provider"
deploy_sa_id := "github-actions-deploy"

# ==================== Development ====================

# Start development server (free mode with real APIs)
dev:
    cd packages/app && npm run dev:free

# Start development server (mock mode)
dev-mock:
    cd packages/app && npm run dev:mock

# Start Storybook for component development
storybook:
    cd packages/component-library && npm run storybook

# ==================== Quality ====================

# Run all quality checks (lint + typecheck)
check:
    npm run lint && npm run typecheck

# Run linting across all packages
lint:
    npm run lint

# Fix linting issues
lint-fix:
    npm run lint:fix

# Run type checking
typecheck:
    npm run typecheck

# Format code with Prettier
format:
    cd packages/app && npm run format:write

# Check code formatting
format-check:
    cd packages/app && npm run format:check

# ==================== Testing ====================

# Run all tests
test:
    npm run test

# Run E2E tests (mock mode)
test-e2e:
    npm run test:e2e

# Run tests with coverage
test-coverage:
    cd packages/app && npm run test -- --coverage

# ==================== Building ====================

# Build all packages for production
build:
    npm run build --workspace=packages/shared-utils
    npm run build --workspace=packages/app

# Clean build artifacts
clean:
    rm -rf packages/app/.next
    rm -rf packages/app/node_modules/.cache
    rm -rf packages/component-library/storybook-static
    rm -rf node_modules/.cache

# ==================== Deployment ====================

# Deploy to Firebase App Hosting (production)
deploy: build
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "{{project_id}}" ]; then
        echo "Error: FIREBASE_PROJECT_ID environment variable is required"
        echo "Usage: FIREBASE_PROJECT_ID=your-project-id just deploy"
        exit 1
    fi
    firebase apphosting:rollouts:create {{backend_id}} \
        --git-branch main \
        --project {{project_id}}

# View deployment status
deploy-status:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "{{project_id}}" ]; then
        echo "Error: FIREBASE_PROJECT_ID environment variable is required"
        exit 1
    fi
    firebase apphosting:backends:get {{backend_id}} --project {{project_id}}

# List recent rollouts
deploy-list:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "{{project_id}}" ]; then
        echo "Error: FIREBASE_PROJECT_ID environment variable is required"
        exit 1
    fi
    firebase apphosting:rollouts:list {{backend_id}} --project {{project_id}}

# ==================== Infrastructure ====================

# Create Terraform state bucket (run once before tf-init)
tf-state-bucket:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "{{project_id}}" ]; then
        echo "Error: FIREBASE_PROJECT_ID environment variable is required"
        exit 1
    fi
    bucket_name="{{project_id}}-terraform-state"
    echo "Creating Terraform state bucket: gs://${bucket_name}"
    if gsutil ls -b "gs://${bucket_name}" &>/dev/null; then
        echo "   Bucket already exists"
    else
        gsutil mb -p {{project_id}} -l {{region}} "gs://${bucket_name}"
        gsutil versioning set on "gs://${bucket_name}"
        echo "   Created bucket with versioning enabled"
    fi

# Initialize Terraform (requires FIREBASE_PROJECT_ID)
tf-init:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "{{project_id}}" ]; then
        echo "Error: FIREBASE_PROJECT_ID environment variable is required"
        exit 1
    fi
    cd infra/terraform && terraform init -backend-config="bucket={{project_id}}-terraform-state"

# Plan Terraform changes
tf-plan:
    cd infra/terraform && terraform plan

# Apply Terraform changes
tf-apply:
    cd infra/terraform && terraform apply

# Show Terraform outputs
tf-output:
    cd infra/terraform && terraform output

# Destroy infrastructure (use with caution!)
tf-destroy:
    cd infra/terraform && terraform destroy

# ==================== Firebase CLI ====================

# Login to Firebase
firebase-login:
    firebase login

# Login to Google Cloud
gcloud-login:
    gcloud auth login && gcloud auth application-default login

# ==================== CI Helpers ====================

# Run full CI check (same as GitHub Actions)
ci: check build test

# Run pre-commit checks
pre-commit: format-check lint typecheck

# ==================== Bootstrap (Full Setup) ====================

# Bootstrap everything from scratch (run this first!)
bootstrap: _check-bootstrap-vars
    #!/usr/bin/env bash
    set -euo pipefail
    echo "🚀 Bootstrapping Ensemble AI infrastructure..."
    echo ""
    echo "Project ID: {{project_id}}"
    echo "Region: {{region}}"
    echo "GitHub Repo: {{github_repo}}"
    echo "Billing Account: {{billing_account}}"
    echo ""
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    just bootstrap-project
    just bootstrap-billing
    just bootstrap-apis
    just bootstrap-firebase
    just bootstrap-service-accounts
    just bootstrap-wif
    just tf-state-bucket
    just bootstrap-app-hosting
    echo ""
    echo "✅ Bootstrap complete!"
    echo ""
    just bootstrap-github-vars

# Check required bootstrap variables are set
_check-bootstrap-vars:
    #!/usr/bin/env bash
    set -euo pipefail
    missing=""
    if [ -z "{{project_id}}" ]; then
        missing="$missing FIREBASE_PROJECT_ID"
    fi
    if [ -z "{{billing_account}}" ]; then
        missing="$missing GCP_BILLING_ACCOUNT"
    fi
    if [ -z "{{github_repo}}" ]; then
        missing="$missing GITHUB_REPO"
    fi
    if [ -n "$missing" ]; then
        echo "Error: Missing required environment variables:$missing"
        echo ""
        echo "Usage:"
        echo "  FIREBASE_PROJECT_ID=my-project \\"
        echo "  GCP_BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX \\"
        echo "  GITHUB_REPO=username/repo \\"
        echo "  just bootstrap"
        echo ""
        echo "To find your billing account ID:"
        echo "  gcloud billing accounts list"
        exit 1
    fi

# Create GCP project
bootstrap-project:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "📁 Creating GCP project {{project_id}}..."
    if gcloud projects describe {{project_id}} &>/dev/null; then
        echo "   Project already exists, skipping."
    else
        gcloud projects create {{project_id}} --name="Ensemble AI"
        echo "   Created project {{project_id}}"
    fi

# Link billing account to project
bootstrap-billing:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "💳 Linking billing account..."
    gcloud billing projects link {{project_id}} --billing-account={{billing_account}}
    echo "   Linked billing account {{billing_account}}"

# Enable required GCP APIs
bootstrap-apis:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "🔌 Enabling required APIs..."
    apis=(
        "firebase.googleapis.com"
        "firebaseapphosting.googleapis.com"
        "cloudbuild.googleapis.com"
        "run.googleapis.com"
        "artifactregistry.googleapis.com"
        "secretmanager.googleapis.com"
        "iam.googleapis.com"
        "cloudresourcemanager.googleapis.com"
        "iamcredentials.googleapis.com"
        "serviceusage.googleapis.com"
        "developerconnect.googleapis.com"
    )
    for api in "${apis[@]}"; do
        echo "   Enabling $api..."
        gcloud services enable "$api" --project={{project_id}}
    done
    echo "   All APIs enabled"

# Initialize Firebase project
bootstrap-firebase:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "🔥 Initializing Firebase..."
    # Add Firebase to the GCP project
    firebase projects:addfirebase {{project_id}} || echo "   Firebase may already be enabled"
    # Create web app
    echo "   Creating Firebase web app..."
    firebase apps:create web "Ensemble AI" --project={{project_id}} || echo "   Web app may already exist"
    # Update .firebaserc with actual project ID
    echo "   Updating .firebaserc..."
    cat > .firebaserc << EOF
    {
      "projects": {
        "default": "{{project_id}}"
      }
    }
    EOF
    echo "   Firebase initialized"

# Create service accounts
bootstrap-service-accounts:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "👤 Creating service accounts..."

    # App Hosting compute service account
    if gcloud iam service-accounts describe "firebase-app-hosting-compute@{{project_id}}.iam.gserviceaccount.com" --project={{project_id}} &>/dev/null; then
        echo "   App Hosting SA already exists"
    else
        gcloud iam service-accounts create firebase-app-hosting-compute \
            --display-name="Firebase App Hosting Compute SA" \
            --project={{project_id}}
        echo "   Created App Hosting service account"
    fi

    # GitHub Actions deploy service account
    if gcloud iam service-accounts describe "{{deploy_sa_id}}@{{project_id}}.iam.gserviceaccount.com" --project={{project_id}} &>/dev/null; then
        echo "   GitHub Actions SA already exists"
    else
        gcloud iam service-accounts create {{deploy_sa_id}} \
            --display-name="GitHub Actions Deploy SA" \
            --project={{project_id}}
        echo "   Created GitHub Actions service account"
    fi

    # Grant roles to App Hosting SA
    echo "   Granting roles to App Hosting SA..."
    gcloud projects add-iam-policy-binding {{project_id}} \
        --member="serviceAccount:firebase-app-hosting-compute@{{project_id}}.iam.gserviceaccount.com" \
        --role="roles/firebaseapphosting.computeRunner" \
        --condition=None --quiet

    # Grant roles to GitHub Actions SA
    echo "   Granting roles to GitHub Actions SA..."
    for role in "roles/firebaseapphosting.admin" "roles/firebase.admin" "roles/iam.serviceAccountUser" "roles/cloudbuild.builds.editor"; do
        gcloud projects add-iam-policy-binding {{project_id}} \
            --member="serviceAccount:{{deploy_sa_id}}@{{project_id}}.iam.gserviceaccount.com" \
            --role="$role" \
            --condition=None --quiet
    done
    echo "   Service accounts configured"

# Set up Workload Identity Federation for GitHub Actions
bootstrap-wif:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "🔐 Setting up Workload Identity Federation..."

    # Create workload identity pool
    if gcloud iam workload-identity-pools describe {{wif_pool_id}} --location=global --project={{project_id}} &>/dev/null; then
        echo "   Workload Identity Pool already exists"
    else
        gcloud iam workload-identity-pools create {{wif_pool_id}} \
            --location="global" \
            --display-name="GitHub Actions Pool" \
            --project={{project_id}}
        echo "   Created Workload Identity Pool"
    fi

    # Create workload identity provider
    if gcloud iam workload-identity-pools providers describe {{wif_provider_id}} --workload-identity-pool={{wif_pool_id}} --location=global --project={{project_id}} &>/dev/null; then
        echo "   Workload Identity Provider already exists"
    else
        gcloud iam workload-identity-pools providers create-oidc {{wif_provider_id}} \
            --location="global" \
            --workload-identity-pool={{wif_pool_id}} \
            --display-name="GitHub Provider" \
            --issuer-uri="https://token.actions.githubusercontent.com" \
            --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
            --attribute-condition="assertion.repository == '{{github_repo}}'" \
            --project={{project_id}}
        echo "   Created Workload Identity Provider"
    fi

    # Get the project number
    project_number=$(gcloud projects describe {{project_id}} --format="value(projectNumber)")

    # Allow GitHub Actions to impersonate the deploy service account
    echo "   Configuring service account impersonation..."
    gcloud iam service-accounts add-iam-policy-binding \
        "{{deploy_sa_id}}@{{project_id}}.iam.gserviceaccount.com" \
        --role="roles/iam.workloadIdentityUser" \
        --member="principalSet://iam.googleapis.com/projects/${project_number}/locations/global/workloadIdentityPools/{{wif_pool_id}}/attribute.repository/{{github_repo}}" \
        --project={{project_id}}

    echo "   Workload Identity Federation configured"

# Create Firebase App Hosting backend
bootstrap-app-hosting:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "🌐 Creating App Hosting backend..."

    # Check if backend already exists
    if firebase apphosting:backends:get {{backend_id}} --project={{project_id}} &>/dev/null; then
        echo "   App Hosting backend already exists"
    else
        echo "   Creating App Hosting backend (this may take a few minutes)..."
        # Note: This command is interactive, but we can try non-interactive first
        firebase apphosting:backends:create \
            --project={{project_id}} \
            --location={{region}} \
            --backend={{backend_id}} \
            --app-root=packages/app \
            --service-account=firebase-app-hosting-compute@{{project_id}}.iam.gserviceaccount.com \
            || echo "   If this failed, run: firebase apphosting:backends:create --project={{project_id}}"
    fi
    echo "   App Hosting backend configured"

# Print GitHub repository variables to configure
bootstrap-github-vars:
    #!/usr/bin/env bash
    set -euo pipefail
    project_number=$(gcloud projects describe {{project_id}} --format="value(projectNumber)")

    echo "📋 GitHub Repository Variables"
    echo "================================"
    echo ""
    echo "Add these as Repository Variables in GitHub:"
    echo "  Settings → Secrets and variables → Actions → Variables → New repository variable"
    echo ""
    echo "┌─────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────┐"
    echo "│ Variable Name               │ Value                                                                                               │"
    echo "├─────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────┤"
    printf "│ %-27s │ %-99s │\n" "FIREBASE_PROJECT_ID" "{{project_id}}"
    printf "│ %-27s │ %-99s │\n" "DEPLOY_SERVICE_ACCOUNT" "{{deploy_sa_id}}@{{project_id}}.iam.gserviceaccount.com"
    printf "│ %-27s │ %-99s │\n" "WORKLOAD_IDENTITY_PROVIDER" "projects/${project_number}/locations/global/workloadIdentityPools/{{wif_pool_id}}/providers/{{wif_provider_id}}"
    echo "└─────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────┘"
    echo ""
    echo "Or use GitHub CLI:"
    echo ""
    echo "  gh variable set FIREBASE_PROJECT_ID --body '{{project_id}}'"
    echo "  gh variable set DEPLOY_SERVICE_ACCOUNT --body '{{deploy_sa_id}}@{{project_id}}.iam.gserviceaccount.com'"
    echo "  gh variable set WORKLOAD_IDENTITY_PROVIDER --body 'projects/${project_number}/locations/global/workloadIdentityPools/{{wif_pool_id}}/providers/{{wif_provider_id}}'"

# Set GitHub variables automatically using gh CLI
bootstrap-github-vars-set:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "🔧 Setting GitHub repository variables..."
    project_number=$(gcloud projects describe {{project_id}} --format="value(projectNumber)")

    gh variable set FIREBASE_PROJECT_ID --body "{{project_id}}"
    echo "   Set FIREBASE_PROJECT_ID"

    gh variable set DEPLOY_SERVICE_ACCOUNT --body "{{deploy_sa_id}}@{{project_id}}.iam.gserviceaccount.com"
    echo "   Set DEPLOY_SERVICE_ACCOUNT"

    gh variable set WORKLOAD_IDENTITY_PROVIDER --body "projects/${project_number}/locations/global/workloadIdentityPools/{{wif_pool_id}}/providers/{{wif_provider_id}}"
    echo "   Set WORKLOAD_IDENTITY_PROVIDER"

    echo ""
    echo "✅ GitHub variables configured!"

# List available billing accounts
bootstrap-list-billing:
    gcloud billing accounts list

# Show current bootstrap status
bootstrap-status:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "{{project_id}}" ]; then
        echo "Set FIREBASE_PROJECT_ID to check status"
        exit 1
    fi
    echo "📊 Bootstrap Status for {{project_id}}"
    echo "========================================"
    echo ""

    echo -n "GCP Project: "
    gcloud projects describe {{project_id}} --format="value(name)" 2>/dev/null && echo " ✅" || echo "❌ Not found"

    echo -n "Billing: "
    gcloud billing projects describe {{project_id}} --format="value(billingAccountName)" 2>/dev/null && echo " ✅" || echo "❌ Not linked"

    echo -n "Firebase: "
    firebase projects:list 2>/dev/null | grep -q {{project_id}} && echo "✅" || echo "❌ Not initialized"

    echo -n "App Hosting Backend: "
    firebase apphosting:backends:get {{backend_id}} --project={{project_id}} &>/dev/null && echo "✅" || echo "❌ Not created"

    echo -n "Workload Identity Pool: "
    gcloud iam workload-identity-pools describe {{wif_pool_id}} --location=global --project={{project_id}} &>/dev/null && echo "✅" || echo "❌ Not created"

    echo -n "Deploy Service Account: "
    gcloud iam service-accounts describe "{{deploy_sa_id}}@{{project_id}}.iam.gserviceaccount.com" --project={{project_id}} &>/dev/null && echo "✅" || echo "❌ Not created"

# Teardown all infrastructure (DANGER!)
bootstrap-destroy:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "⚠️  WARNING: This will delete the entire GCP project {{project_id}}"
    echo "   All resources, data, and configurations will be permanently lost!"
    echo ""
    read -p "Type the project ID to confirm deletion: " confirm
    if [ "$confirm" != "{{project_id}}" ]; then
        echo "Confirmation failed. Aborted."
        exit 1
    fi
    echo ""
    echo "Deleting project {{project_id}}..."
    gcloud projects delete {{project_id}}
    echo "Project scheduled for deletion."
