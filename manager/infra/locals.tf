# ---------------------------------------------------------------------------
# serverless.yml is the single source of truth for functions, routes,
# schedules, runtime, memory/timeout, log retention, CORS and the Lambda
# environment. Terraform reads it directly, so changes there deploy through
# both paths. `${...}` Serverless variables are not resolved by yamldecode;
# the few forms this config translates are handled below, and guards.tf fails
# the plan on anything else.
# ---------------------------------------------------------------------------

locals {
  serverless   = yamldecode(file("${path.module}/../serverless.yml"))
  sls_provider = local.serverless.provider

  name_prefix = "${var.project}-${var.stage}"

  runtime            = local.sls_provider.runtime
  default_memory     = local.sls_provider.memorySize
  default_timeout    = local.sls_provider.timeout
  log_retention_days = local.sls_provider.logRetentionInDays
  cors               = try(local.sls_provider.httpApi.cors, {})

  # scripts/build-lambdas.mjs writes one bundle per handler module here.
  # Zips are per stage, so building/planning another stage never swaps the
  # files a saved plan for this stage will upload.
  bundle_dir = "${path.module}/../dist/lambda/bundles"
  zip_dir    = "${path.module}/../dist/lambda/zip/${var.stage}"

  # functionName => normalized definition
  functions = {
    for name, fn in local.serverless.functions : name => {
      # "src/handlers/income.getAll" -> module "income" (bundle name), export "getAll"
      module      = split(".", basename(fn.handler))[0]
      export      = split(".", basename(fn.handler))[1]
      description = try(fn.description, null)
      memory      = try(fn.memorySize, local.default_memory)
      timeout     = try(fn.timeout, local.default_timeout)
      events      = try(fn.events, [])
    }
  }

  # Handler modules that need a bundle/zip.
  modules = toset([for fn in local.functions : fn.module])

  # Every event as { fn, ev }, for routes, schedules and guards.tf.
  events = flatten([
    for name, fn in local.functions : [for ev in fn.events : { fn = name, ev = ev }]
  ])

  # route key ("GET /api/income") => [functions]; >1 entry is a duplicate (guards.tf).
  http_route_owners = {
    for e in local.events :
    "${try(e.ev.httpApi.method == "*" ? "ANY" : upper(e.ev.httpApi.method), "?")} ${try(e.ev.httpApi.path, "?")}" => e.fn...
    if can(e.ev.httpApi)
  }
  http_routes    = { for key, owners in local.http_route_owners : key => owners[0] }
  http_functions = toset(values(local.http_routes))

  # Terraform runs the scheduled jobs only when serverless.yml says Serverless
  # does not (params.<stage>.serverlessRunsSchedules, falling back to
  # params.default like Serverless). See the comment at the top of serverless.yml.
  serverless_params = try(local.serverless.params, {})
  terraform_runs_schedules = !try(
    tobool(local.serverless_params[var.stage].serverlessRunsSchedules),
    tobool(local.serverless_params.default.serverlessRunsSchedules),
    true,
  )

  # "<functionName>-<eventIndex>" => schedule definition
  schedules = merge([
    for name, fn in local.functions : {
      for idx, ev in fn.events : "${name}-${idx}" => {
        function    = name
        expression  = try(tostring(ev.schedule.rate), tostring(ev.schedule), "unsupported") # see guards.tf
        description = try(ev.schedule.description, null)
        # A literal `enabled: false` disables the job in both stacks; the
        # `${strToBool(${param:...})}` expression is Serverless-only.
        enabled = try(tobool(ev.schedule.enabled), true)
      }
      if can(ev.schedule)
    }
  ]...)

  # Lambda environment, derived from provider.environment:
  #   ${env:NAME}             -> var.app_env[NAME] (required, see guards.tf)
  #   ${env:NAME, 'default'}  -> var.app_env[NAME], else default
  #   literal                 -> as is, with ${self:provider.stage} -> var.stage
  env_refs = {
    for k, v in local.sls_provider.environment : k =>
    try(regex("^\\$\\{env:(?P<name>\\w+)(?:,\\s*'(?P<default>[^']*)')?\\}$", tostring(v)), null)
  }
  environment = {
    for k, v in local.sls_provider.environment : k => (
      local.env_refs[k] == null
      ? replace(tostring(v), "$${self:provider.stage}", var.stage)
      : lookup(var.app_env, local.env_refs[k].name, local.env_refs[k].default == null ? "" : local.env_refs[k].default)
    )
  }
}
