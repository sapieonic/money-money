# ---------------------------------------------------------------------------
# Deployment settings (non-secret; override per stage in env/<stage>.tfvars)
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
# Application configuration
# ---------------------------------------------------------------------------

variable "app_env" {
  description = <<-EOT
    Values for the $${env:NAME} references in serverless.yml provider.environment,
    keyed by NAME. scripts/tf.mjs fills it from manager/.env.<stage> and .env, so
    the same files drive both deployments. The Lambda environment itself (names,
    defaults, literals) is derived from serverless.yml in locals.tf.
  EOT
  type        = map(string)
  default     = {}
  sensitive   = true
}
