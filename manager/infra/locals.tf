# ---------------------------------------------------------------------------
# serverless.yml is the single source of truth for functions, routes,
# schedules, runtime, memory/timeout, log retention and CORS. Terraform reads
# it directly, so adding a function there deploys it through both paths.
#
# Only plain YAML is read from the sections below; `${...}` Serverless
# variables (used in provider.environment) are NOT resolved here — the Lambda
# environment is defined explicitly in local.environment instead.
# ---------------------------------------------------------------------------

locals {
  serverless   = yamldecode(file("${path.module}/../serverless.yml"))
  sls_provider = local.serverless.provider

  name_prefix = "${var.project}-${var.stage}"

  runtime            = local.sls_provider.runtime
  default_memory     = try(local.sls_provider.memorySize, 256)
  default_timeout    = try(local.sls_provider.timeout, 20)
  log_retention_days = try(local.sls_provider.logRetentionInDays, 14)
  cors               = local.sls_provider.httpApi.cors

  # Where scripts/build-lambdas.mjs writes bundles (relative to this directory).
  build_dir = "${path.module}/../dist/lambda"

  # functionName => normalized definition
  functions = {
    for name, fn in local.serverless.functions : name => {
      # "src/handlers/income.getAll" -> dir "src/handlers", module "income", export "getAll"
      handler_dir = dirname(fn.handler)
      module      = split(".", basename(fn.handler))[0]
      export      = split(".", basename(fn.handler))[1]
      memory      = try(fn.memorySize, local.default_memory)
      timeout     = try(fn.timeout, local.default_timeout)
      events      = try(fn.events, [])
    }
  }

  # Handler modules that need a bundle/zip.
  modules = toset([for fn in local.functions : fn.module])

  # "GET /api/income" => function name
  http_routes = merge([
    for name, fn in local.functions : {
      for ev in fn.events :
      # Supports both `httpApi: { method, path }` and the `httpApi: 'GET /path'` shorthand.
      try(
        "${ev.httpApi.method == "*" ? "ANY" : upper(ev.httpApi.method)} ${ev.httpApi.path}",
        tostring(ev.httpApi),
      ) => name
      if can(ev.httpApi)
    }
  ]...)

  # Functions that are reachable through the HTTP API.
  http_functions = toset(values(local.http_routes))

  # "<functionName>-<eventIndex>" => schedule definition
  schedules = merge([
    for name, fn in local.functions : {
      for idx, ev in fn.events : "${name}-${idx}" => {
        function    = name
        expression  = try(ev.schedule.rate, ev.schedule)
        description = try(ev.schedule.description, null)
        # A schedule explicitly disabled in serverless.yml stays disabled here too.
        enabled = try(tobool(ev.schedule.enabled), true)
      }
      if can(ev.schedule)
    }
  ]...)

  unsupported_events = flatten([
    for name, fn in local.functions : [
      for ev in fn.events : "${name}: ${join(",", keys(ev))}"
      if !can(ev.httpApi) && !can(ev.schedule)
    ]
  ])

  # Mirrors provider.environment in serverless.yml.
  environment = {
    MONGODB_URI                 = var.mongodb_uri
    MONGODB_DB_NAME             = var.mongodb_db_name
    FIREBASE_PROJECT_ID         = var.firebase_project_id
    TELEGRAM_BOT_TOKEN          = var.telegram_bot_token
    LLM_PROVIDER                = var.llm_provider
    AZURE_OPENAI_API_KEY        = var.azure_openai_api_key
    AZURE_OPENAI_ENDPOINT       = var.azure_openai_endpoint
    AZURE_OPENAI_DEPLOYMENT     = var.azure_openai_deployment
    AZURE_OPENAI_API_VERSION    = var.azure_openai_api_version
    DATABRICKS_HOST             = var.databricks_host
    DATABRICKS_TOKEN            = var.databricks_token
    DATABRICKS_SERVING_ENDPOINT = var.databricks_serving_endpoint
    EMAIL_PROVIDER              = var.email_provider
    MAILJET_API_KEY             = var.mailjet_api_key
    MAILJET_SECRET_KEY          = var.mailjet_secret_key
    MAILJET_FROM_EMAIL          = var.mailjet_from_email
    MAILJET_FROM_NAME           = var.mailjet_from_name
    OTEL_SERVICE_NAME           = "finance-watch-api"
    OTEL_EXPORTER_OTLP_ENDPOINT = var.grafana_otlp_endpoint
    OTEL_EXPORTER_OTLP_HEADERS  = var.grafana_otlp_headers
    # src/utils/telemetry.ts parses this with split('=')[1]; keep it a single attribute.
    OTEL_RESOURCE_ATTRIBUTES = "deployment.environment=${var.stage}"
  }
}

check "serverless_events_supported" {
  assert {
    condition     = length(local.unsupported_events) == 0
    error_message = "serverless.yml has event types Terraform does not deploy (only httpApi and schedule are supported): ${join("; ", local.unsupported_events)}"
  }
}
