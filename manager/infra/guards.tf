# ---------------------------------------------------------------------------
# Fails `terraform plan` when serverless.yml uses something this Terraform
# config does not deploy, instead of silently deploying a different stack
# than Serverless would. Extend locals.tf (and the allow-lists below) when
# adding support for a new setting. build.esbuild options are validated by
# scripts/build-lambdas.mjs, which consumes them.
# ---------------------------------------------------------------------------

locals {
  supported_top_level_keys = ["service", "params", "provider", "build", "plugins", "functions"]
  supported_plugins        = ["serverless-offline"] # local dev only; nothing to deploy
  supported_provider_keys  = ["name", "runtime", "stage", "region", "memorySize", "timeout", "logRetentionInDays", "environment", "httpApi"]
  supported_function_keys  = ["handler", "events", "timeout", "memorySize", "description"]
  supported_cors_keys      = ["allowedOrigins", "allowedHeaders", "allowedMethods"]

  config_errors = concat(
    # Top level, plugins, build, params
    [for k in keys(local.serverless) : "top-level '${k}' is not supported by the Terraform config" if !contains(local.supported_top_level_keys, k)],
    [for p in try(local.serverless.plugins, []) : "plugin '${p}' is not supported by the Terraform config" if !contains(local.supported_plugins, p)],
    [for k in try(keys(local.serverless.build), []) : "build.${k} is not supported" if k != "esbuild"],
    [for stage, p in local.serverless_params : "params.${stage}.serverlessRunsSchedules must be a literal true/false" if can(p.serverlessRunsSchedules) && !can(tobool(p.serverlessRunsSchedules))],

    # Provider
    [for k in keys(local.sls_provider) : "provider.${k} is not supported by the Terraform config" if !contains(local.supported_provider_keys, k)],
    [for k in ["memorySize", "timeout", "logRetentionInDays"] : "provider.${k} must be a literal number" if !can(tonumber(local.sls_provider[k]))],
    [for k in try(keys(local.sls_provider.httpApi), []) : "provider.httpApi.${k} is not supported" if k != "cors"],
    can(keys(local.cors)) ? [
      for k in keys(local.cors) : "provider.httpApi.cors.${k} is not supported" if !contains(local.supported_cors_keys, k)
    ] : ["provider.httpApi.cors must be an object with allowedOrigins/allowedHeaders/allowedMethods (the `cors: true` shorthand is not supported)"],

    # Lambda environment (see local.environment). Messages contain names only, never values.
    [for k, v in local.sls_provider.environment : "provider.environment.${k}: only $${env:NAME}, $${env:NAME, 'default'} and $${self:provider.stage} are supported"
    if local.env_refs[k] == null && strcontains(replace(tostring(v), "$${self:provider.stage}", ""), "$${")],
    [for k, r in local.env_refs : "provider.environment.${k}: ${try(r.name, "?")} must be set (in .env, .env.<stage> or the shell)"
    if r != null && try(r.default, null) == null && nonsensitive(lookup(var.app_env, try(r.name, ""), "") == "")],

    # Functions
    flatten([for name, fn in local.serverless.functions : [
      for k in keys(fn) : "function ${name}: setting '${k}' is not supported by the Terraform config" if !contains(local.supported_function_keys, k)
    ]]),
    flatten([for name, fn in local.serverless.functions : [
      for k in ["memorySize", "timeout"] : "function ${name}: ${k} must be a literal number" if can(fn[k]) && !can(tonumber(fn[k]))
    ]]),

    # Events
    [for e in local.events : "function ${e.fn}: event type '${try(join(",", keys(e.ev)), "?")}' is not supported (only httpApi and schedule)" if !can(e.ev.httpApi) && !can(e.ev.schedule)],
    [for e in local.events : "function ${e.fn}: httpApi shorthand '${e.ev.httpApi}' is not supported (use method + path)" if can(tostring(e.ev.httpApi))],
    flatten([for e in local.events : [
      for k in try(keys(e.ev.httpApi), []) : "function ${e.fn}: httpApi.${k} is not supported" if !contains(["method", "path"], k)
    ]]),
    flatten([for e in local.events : [
      for k in try(keys(e.ev.schedule), []) : "function ${e.fn}: schedule.${k} is not supported" if !contains(["rate", "enabled", "description"], k)
    ]]),
    [for e in local.events : "function ${e.fn}: schedule.rate must be a single string" if can(keys(e.ev.schedule)) && !can(tostring(e.ev.schedule.rate))],
    [for key, owners in local.http_route_owners : "route '${key}' is defined by more than one function: ${join(", ", owners)}" if length(owners) > 1],
  )
}

resource "terraform_data" "serverless_config_guard" {
  lifecycle {
    precondition {
      condition     = length(local.config_errors) == 0
      error_message = "serverless.yml uses settings Terraform does not deploy:\n  - ${join("\n  - ", local.config_errors)}"
    }
  }
}
