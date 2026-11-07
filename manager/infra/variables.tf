# ---------------------------------------------------------------------------
# Deployment settings (non-secret; set per stage in env/<stage>.tfvars)
# ---------------------------------------------------------------------------

variable "stage" {
  description = "Deployment stage (dev, prod, ...). Passed by scripts/tf.mjs from the first CLI argument."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.stage))
    error_message = "stage must contain only lowercase letters, digits and hyphens."
  }
}

variable "region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "ap-south-1"
}

variable "project" {
  description = "Name prefix for every resource. Deliberately different from the Serverless service name (money-tracker-api) so both stacks can coexist in one account."
  type        = string
  default     = "finance-watch"
}

variable "enable_schedules" {
  description = <<-EOT
    Whether the EventBridge schedules (weekly email, daily digest, reminders, debt
    payments) are ENABLED. Keep this false while the Serverless stack for the same
    stage is still live: running both would send duplicate emails/Telegram messages
    and record every scheduled debt payment twice.
  EOT
  type        = bool
  default     = false
}

variable "api_domain_name" {
  description = "Optional custom domain for the HTTP API, e.g. api.money.manasranjan.dev. Requires api_certificate_arn."
  type        = string
  default     = null
}

variable "api_certificate_arn" {
  description = "ARN of an ACM certificate in the deployment region covering api_domain_name."
  type        = string
  default     = null
}

# ---------------------------------------------------------------------------
# Application configuration (Lambda environment variables)
#
# scripts/tf.mjs fills these from manager/.env (or .env.<stage>) by exporting
# TF_VAR_<lowercased env name>, so the same .env file drives both Serverless
# and Terraform deployments. Defaults match serverless.yml.
# ---------------------------------------------------------------------------

variable "mongodb_uri" {
  description = "MONGODB_URI"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.mongodb_uri) > 0
    error_message = "MONGODB_URI must be set."
  }
}

variable "mongodb_db_name" {
  description = "MONGODB_DB_NAME"
  type        = string
  default     = "money-tracker-dev"
}

variable "firebase_project_id" {
  description = "FIREBASE_PROJECT_ID"
  type        = string

  validation {
    condition     = length(var.firebase_project_id) > 0
    error_message = "FIREBASE_PROJECT_ID must be set."
  }
}

variable "telegram_bot_token" {
  description = "TELEGRAM_BOT_TOKEN"
  type        = string
  default     = ""
  sensitive   = true
}

variable "llm_provider" {
  description = "LLM_PROVIDER"
  type        = string
  default     = ""
}

variable "azure_openai_api_key" {
  description = "AZURE_OPENAI_API_KEY"
  type        = string
  default     = ""
  sensitive   = true
}

variable "azure_openai_endpoint" {
  description = "AZURE_OPENAI_ENDPOINT"
  type        = string
  default     = ""
}

variable "azure_openai_deployment" {
  description = "AZURE_OPENAI_DEPLOYMENT"
  type        = string
  default     = ""
}

variable "azure_openai_api_version" {
  description = "AZURE_OPENAI_API_VERSION"
  type        = string
  default     = "2024-02-15-preview"
}

variable "databricks_host" {
  description = "DATABRICKS_HOST"
  type        = string
  default     = ""
}

variable "databricks_token" {
  description = "DATABRICKS_TOKEN"
  type        = string
  default     = ""
  sensitive   = true
}

variable "databricks_serving_endpoint" {
  description = "DATABRICKS_SERVING_ENDPOINT"
  type        = string
  default     = "databricks-claude-sonnet-4-6"
}

variable "email_provider" {
  description = "EMAIL_PROVIDER"
  type        = string
  default     = ""
}

variable "mailjet_api_key" {
  description = "MAILJET_API_KEY"
  type        = string
  default     = ""
  sensitive   = true
}

variable "mailjet_secret_key" {
  description = "MAILJET_SECRET_KEY"
  type        = string
  default     = ""
  sensitive   = true
}

variable "mailjet_from_email" {
  description = "MAILJET_FROM_EMAIL"
  type        = string
  default     = ""
}

variable "mailjet_from_name" {
  description = "MAILJET_FROM_NAME"
  type        = string
  default     = "Finance Watch"
}

variable "grafana_otlp_endpoint" {
  description = "GRAFANA_OTLP_ENDPOINT (exposed to the app as OTEL_EXPORTER_OTLP_ENDPOINT)"
  type        = string
  default     = ""
}

variable "grafana_otlp_headers" {
  description = "GRAFANA_OTLP_HEADERS (exposed to the app as OTEL_EXPORTER_OTLP_HEADERS)"
  type        = string
  default     = ""
  sensitive   = true
}
