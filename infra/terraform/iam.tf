resource "google_project_iam_member" "app_hosting_roles" {
  provider = google-beta
  project  = var.project_id

  for_each = toset([
    "roles/firebase.sdkAdminServiceAgent",
    "roles/firebaseapphosting.computeRunner",
  ])

  role   = each.key
  member = "serviceAccount:${google_service_account.app_hosting.email}"
}

resource "google_project_iam_member" "github_actions_roles" {
  provider = google-beta
  project  = var.project_id

  for_each = toset([
    "roles/firebaseapphosting.admin",
    "roles/firebase.admin",
    "roles/iam.serviceAccountUser",
    "roles/cloudbuild.builds.editor",
  ])

  role   = each.key
  member = "serviceAccount:${google_service_account.github_actions.email}"
}
