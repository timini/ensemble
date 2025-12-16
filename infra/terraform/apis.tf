resource "google_project_service" "required_apis" {
  provider = google-beta.no_user_project_override
  project  = var.project_id

  for_each = toset([
    "firebase.googleapis.com",
    "firebaseapphosting.googleapis.com",
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iamcredentials.googleapis.com",
    "serviceusage.googleapis.com",
  ])

  service            = each.key
  disable_on_destroy = false
}
