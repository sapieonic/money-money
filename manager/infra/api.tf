# ---------------------------------------------------------------------------
# API Gateway HTTP API (v2) — equivalent of Serverless `httpApi` events.
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_api" "http" {
  name          = local.name_prefix
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = try(local.cors.allowedOrigins, [])
    allow_headers = try(local.cors.allowedHeaders, [])
    allow_methods = try(local.cors.allowedMethods, [])
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "fn" {
  for_each = local.http_functions

  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.fn[each.key].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "route" {
  for_each = local.http_routes

  api_id    = aws_apigatewayv2_api.http.id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.fn[each.value].id}"
}

resource "aws_lambda_permission" "api" {
  for_each = local.http_functions

  statement_id  = "AllowHttpApiInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.fn[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*"
}

# ---------------------------------------------------------------------------
# Optional custom domain (keeps the public URL stable across re-deployments).
# DNS is not managed here: point a CNAME at the `api_custom_domain_target` output.
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_domain_name" "api" {
  count = var.api_domain_name == null ? 0 : 1

  domain_name = var.api_domain_name

  domain_name_configuration {
    certificate_arn = var.api_certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  lifecycle {
    precondition {
      condition     = var.api_certificate_arn != null
      error_message = "api_certificate_arn must be set when api_domain_name is set."
    }
  }
}

resource "aws_apigatewayv2_api_mapping" "api" {
  count = var.api_domain_name == null ? 0 : 1

  api_id      = aws_apigatewayv2_api.http.id
  domain_name = aws_apigatewayv2_domain_name.api[0].id
  stage       = aws_apigatewayv2_stage.default.id
}
