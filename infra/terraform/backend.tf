# Terraform state is stored in Google Cloud Storage for team collaboration
# and state locking to prevent concurrent modifications.
#
# Before running terraform init, ensure the GCS bucket exists:
#   gsutil mb -p PROJECT_ID -l us-central1 gs://PROJECT_ID-terraform-state
#   gsutil versioning set on gs://PROJECT_ID-terraform-state
#
# Then initialize with:
#   terraform init -backend-config="bucket=PROJECT_ID-terraform-state"

terraform {
  backend "gcs" {
    # Bucket name is configured via -backend-config during terraform init
    # This allows different projects to use different state buckets
    prefix = "ensemble-ai/state"
  }
}
