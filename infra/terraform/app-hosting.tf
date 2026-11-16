resource "google_service_account" "app_hosting" {
  provider                     = google-beta
  project                      = var.project_id
  account_id                   = "firebase-app-hosting-compute"
  display_name                 = "Firebase App Hosting Compute SA"
  create_ignore_already_exists = true
}

# backend_id must match firebase.json and the live backend. Changing it forces
# replacement, so run terraform plan first. If the state does not already
# track this backend, import it instead of letting terraform create a new one.
resource "google_firebase_app_hosting_backend" "production" {
  provider         = google-beta
  project          = var.project_id
  location         = var.region
  backend_id       = "ensemble-app"
  app_id           = google_firebase_web_app.ensemble_ai.app_id
  serving_locality = "GLOBAL_ACCESS"
  service_account  = google_service_account.app_hosting.email

  depends_on = [
    google_project_service.required_apis,
    google_project_iam_member.app_hosting_roles
  ]
}
