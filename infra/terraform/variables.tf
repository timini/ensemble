variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Primary region for App Hosting"
  type        = string
  default     = "us-central1"
}

variable "github_repo" {
  description = "GitHub repository in format owner/repo"
  type        = string
}

variable "uptime_check_host" {
  description = "Host the uptime check calls (the custom domain, or the App Hosting domain). Empty turns monitoring off."
  type        = string
  default     = ""
}

variable "alert_email" {
  description = "Email address for uptime alerts. Empty turns monitoring off."
  type        = string
  default     = ""
}

variable "billing_account_id" {
  description = "Billing account for the monthly budget alert (XXXXXX-XXXXXX-XXXXXX). Empty skips the budget."
  type        = string
  default     = ""
}

variable "monthly_budget_usd" {
  description = "Monthly budget; alerts at 50%, 90% and 100% of it."
  type        = number
  default     = 10
}
