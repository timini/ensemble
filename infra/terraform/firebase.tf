resource "google_firebase_project" "default" {
  provider   = google-beta
  project    = var.project_id
  depends_on = [google_project_service.required_apis]
}

resource "google_firebase_web_app" "ensemble_ai" {
  provider     = google-beta
  project      = var.project_id
  display_name = "Ensemble AI"
  depends_on   = [google_firebase_project.default]
}
