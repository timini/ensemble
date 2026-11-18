# Uptime check, uptime alert and budget alert. Everything here is off until
# the variables are set in terraform.tfvars (see docs/DEPLOYMENT.md), so a
# plan without them changes nothing. Uptime checks and alert policies are
# free at this scale.

locals {
  monitoring_on = var.uptime_check_host != "" && var.alert_email != ""
  budget_on     = var.billing_account_id != "" && var.alert_email != ""
}

resource "google_project_service" "monitoring_apis" {
  provider = google-beta.no_user_project_override
  project  = var.project_id

  for_each = toset(concat(
    local.monitoring_on ? ["monitoring.googleapis.com"] : [],
    local.budget_on ? ["billingbudgets.googleapis.com"] : [],
  ))

  service            = each.key
  disable_on_destroy = false
}

resource "google_monitoring_notification_channel" "email" {
  provider = google-beta
  count    = local.monitoring_on || local.budget_on ? 1 : 0
  project  = var.project_id

  display_name = "Ensemble alerts"
  type         = "email"
  labels = {
    email_address = var.alert_email
  }

  depends_on = [google_project_service.monitoring_apis]
}

# GET https://<host>/api/health every 5 minutes from three regions.
resource "google_monitoring_uptime_check_config" "health" {
  provider = google-beta
  count    = local.monitoring_on ? 1 : 0
  project  = var.project_id

  display_name = "Ensemble /api/health"
  timeout      = "10s"
  period       = "300s"
  # A cold start after idle can take a few seconds; 10 s allows for it.
  selected_regions = ["USA", "EUROPE", "ASIA_PACIFIC"]

  http_check {
    path         = "/api/health"
    port         = 443
    use_ssl      = true
    validate_ssl = true
    accepted_response_status_codes {
      status_class = "STATUS_CLASS_2XX"
    }
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.uptime_check_host
    }
  }

  depends_on = [google_project_service.monitoring_apis]
}

# Email when the check fails from at least two regions for 10 minutes.
resource "google_monitoring_alert_policy" "uptime" {
  provider = google-beta
  count    = local.monitoring_on ? 1 : 0
  project  = var.project_id

  display_name = "Ensemble is down"
  combiner     = "OR"

  conditions {
    display_name = "Uptime check failing"
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.label.check_id=\"${google_monitoring_uptime_check_config.health[0].uptime_check_id}\" AND resource.type=\"uptime_url\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "600s"
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.host"]
      }
      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email[0].id]
}

data "google_project" "this" {
  provider   = google-beta
  project_id = var.project_id
}

# Monthly budget with email alerts at 50%, 90% and 100% (roadmap M0).
resource "google_billing_budget" "monthly" {
  provider        = google-beta
  count           = local.budget_on ? 1 : 0
  billing_account = var.billing_account_id
  display_name    = "Ensemble monthly budget"

  budget_filter {
    projects = ["projects/${data.google_project.this.number}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(var.monthly_budget_usd)
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }
  threshold_rules {
    threshold_percent = 0.9
  }
  threshold_rules {
    threshold_percent = 1.0
  }

  all_updates_rule {
    monitoring_notification_channels = [google_monitoring_notification_channel.email[0].id]
    disable_default_iam_recipients   = false
  }

  depends_on = [google_project_service.monitoring_apis]
}
