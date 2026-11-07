# ---------------------------------------------------------------------------
# Fails `terraform plan` when serverless.yml uses something this Terraform
# config does not deploy, instead of silently deploying a different stack
# than Serverless would. Extend locals.tf (and the allow-lists below) when
# adding support for a new setting.
# ---------------------------------------------------------------------------

locals {
  supported_top_level_keys = ["service", "params", "provider", "build", "plugins", "functions"]
  supported_plugins        = ["serverless-offline"] # local dev only; nothing to deploy
  # Must match the esbuild options hard-coded in scripts/build-lambdas.mjs.
  expected_esbuild = {
    bundle    = true
    minify    = false
    sourcemap = false
    exclude   = ["aws-sdk"]
    target    = "node20"
    platform  = "node"
  }

  supported_provider_keys = ["name", "runtime", "stage", "region", "memorySize", "timeout", "logRetentionInDays", "environment", "httpApi"]
  supported_function_keys = ["handler", "events", "timeout", "memorySize", "description"]
  supported_cors_keys     = ["allowedOrigins", "allowedHeaders", "allowedMethods"]

  # keys() of the environment map is not sensitive, so messages never contain secrets.
  terraform_env_names  = keys(local.environment)
  serverless_env_names = keys(try(local.sls_provider.environment, {}))

  config_errors = concat(
    [for k in keys(local.serverless) : "top-level '${k}' is not supported by the Terraform config" if !contains(local.supported_top_level_keys, k)],
    [for p in try(local.serverless.plugins, []) : "plugin '${p}' is not supported by the Terraform config" if !contains(local.supported_plugins, p)],
    [for k in try(keys(local.serverless.build), []) : "build.${k} is not supported" if k != "esbuild"],
    try(jsonencode(local.serverless.build.esbuild), "") == jsonencode(local.expected_esbuild) ? [] : [
      "build.esbuild differs from the options in scripts/build-lambdas.mjs: update the script and local.expected_esbuild in infra/guards.tf together"
    ],
    [for stage, p in local.serverless_params : "params.${stage}.serverlessRunsSchedules must be a literal true/false" if can(p.serverlessRunsSchedules) && !can(tobool(p.serverlessRunsSchedules))],
    [for k in keys(local.sls_provider) : "provider.${k} is not supported by the Terraform config" if !contains(local.supported_provider_keys, k)],
    [for k in try(keys(local.sls_provider.httpApi), []) : "provider.httpApi.${k} is not supported" if k != "cors"],
    can(keys(local.cors)) ? [
      for k in keys(local.cors) : "provider.httpApi.cors.${k} is not supported" if !contains(local.supported_cors_keys, k)
    ] : ["provider.httpApi.cors must be an object with allowedOrigins/allowedHeaders/allowedMethods (the `cors: true` shorthand is not supported)"],

    # Lambda environment must match key for key.
    [for k in local.serverless_env_names : "provider.environment.${k} is not set by Terraform: add it to infra/variables.tf, infra/locals.tf (environment) and APP_ENV_VARS in scripts/tf.mjs" if !contains(local.terraform_env_names, k)],
    [for k in local.terraform_env_names : "Terraform sets ${k} but serverless.yml provider.environment does not" if !contains(local.serverless_env_names, k)],

    # Numeric settings must be literal numbers (Serverless variables are not resolved here).
    [for k in ["memorySize", "timeout", "logRetentionInDays"] : "provider.${k} must be a literal number" if can(local.sls_provider[k]) && !can(tonumber(local.sls_provider[k]))],

    flatten([
      for name, fn in local.serverless.functions : concat(
        [for k in keys(fn) : "function ${name}: setting '${k}' is not supported by the Terraform config" if !contains(local.supported_function_keys, k)],
        [for k in ["memorySize", "timeout"] : "function ${name}: ${k} must be a literal number" if can(fn[k]) && !can(tonumber(fn[k]))],
        flatten([
          for ev in try(fn.events, []) : (
            can(ev.httpApi) ? (
              can(tostring(ev.httpApi))
              ? (can(regex("^[A-Za-z]+ /", ev.httpApi)) ? [] : ["function ${name}: httpApi '${ev.httpApi}' is not supported (use method + path)"])
              : [for k in keys(ev.httpApi) : "function ${name}: httpApi.${k} is not supported" if !contains(["method", "path"], k)]
            ) :
            can(ev.schedule) ? (
              can(tostring(ev.schedule)) ? [] : concat(
                [for k in keys(ev.schedule) : "function ${name}: schedule.${k} is not supported" if !contains(["rate", "enabled", "description"], k)],
                can(tostring(ev.schedule.rate)) ? [] : ["function ${name}: schedule.rate must be a single string"],
              )
            ) :
            ["function ${name}: event type '${try(join(",", keys(ev)), "?")}' is not supported (only httpApi and schedule)"]
          )
        ]),
      )
    ]),

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
