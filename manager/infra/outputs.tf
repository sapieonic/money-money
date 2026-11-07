locals {
  api_gateway_url = trimsuffix(aws_apigatewayv2_stage.default.invoke_url, "/")
  api_url         = var.api_domain_name == null ? local.api_gateway_url : "https://${var.api_domain_name}"
}

output "api_url" {
  description = "Base URL for the client's VITE_API_URL (custom domain if configured)."
  value       = local.api_url
}

output "api_gateway_url" {
  description = "Default execute-api URL of the HTTP API."
  value       = local.api_gateway_url
}

output "api_custom_domain_target" {
  description = "Point a CNAME for api_domain_name at this host."
  value       = try(aws_apigatewayv2_domain_name.api[0].domain_name_configuration[0].target_domain_name, null)
}

output "telegram_webhook_url" {
  description = "Register with Telegram (setWebhook) when this stack takes over traffic."
  value       = "${local.api_url}/api/telegram/webhook"
}

output "schedules_enabled" {
  description = "Whether the scheduled jobs in this stack are active."
  value       = var.enable_schedules
}

output "function_names" {
  description = "Deployed Lambda function names, keyed by the serverless.yml function name."
  value       = { for k, fn in aws_lambda_function.fn : k => fn.function_name }
}
