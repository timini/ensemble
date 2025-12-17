output "app_hosting_backend_id" {
  description = "Firebase App Hosting backend ID"
  value       = google_firebase_app_hosting_backend.production.backend_id
}

output "app_hosting_url" {
  description = "Firebase App Hosting URL"
  value       = "https://${google_firebase_app_hosting_backend.production.backend_id}--${var.project_id}.${var.region}.hosted.app"
}

output "workload_identity_provider" {
  description = "Workload Identity Provider for GitHub Actions"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "github_actions_service_account" {
  description = "Service account email for GitHub Actions deployment"
  value       = google_service_account.github_actions.email
}

output "firebase_web_app_id" {
  description = "Firebase Web App ID"
  value       = google_firebase_web_app.ensemble_ai.app_id
}
