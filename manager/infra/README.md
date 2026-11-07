# Terraform deployment

Terraform deploys the same backend that `serverless.yml` describes: Lambda
functions, an API Gateway HTTP API, EventBridge schedules, an IAM role and log
groups. Serverless (`npm run deploy` / `deploy:prod`) still works and is kept
as a fallback.

## How it fits together

```
serverless.yml ──(yamldecode)──► infra/*.tf ◄── env/<stage>.tfvars   (non-secret settings)
                                     ▲
src/handlers/*.ts ──esbuild──► dist/lambda/bundles/<module>.js ──zip──┘
                                     ▲
manager/.env.<stage> + .env ──scripts/tf.mjs──► TF_VAR_*           (secrets)
```

- **`serverless.yml` is the single source of truth** for functions, routes,
  schedules, runtime, memory and timeout, log retention and CORS. Terraform reads
  it with `yamldecode`, so a function added there is deployed by both paths.
- **Guards.** `guards.tf` makes `terraform plan` fail if `serverless.yml` uses
  something Terraform doesn't translate, instead of deploying a different stack
  than Serverless would. That covers:
  - event types other than `httpApi`/`schedule`, and httpApi `authorizer`;
  - per-function `environment`, `layers` or `runtime`;
  - provider `iam` or `architecture`, and the `cors: true` shorthand;
  - duplicate routes;
  - non-literal memory and timeout values;
  - an env var present in `serverless.yml` but missing from Terraform;
  - top-level sections such as `resources` or `custom`, or other plugins;
  - `build.esbuild` options that differ from `scripts/build-lambdas.mjs`.

  A `terraform plan -target=…` that leaves out
  `terraform_data.serverless_config_guard` skips these checks.

  To add support for one, extend `locals.tf` and the allow-lists in `guards.tf`.
- **Code.** `scripts/build-lambdas.mjs` bundles each file in `src/handlers/`
  with the same esbuild settings as Serverless.
  - All functions from one file share a zip; the handler string is `<module>.<export>`.
  - Zips are deterministic, so a function is only redeployed when its bundle changes.
  - Zips are stored per stage in `dist/lambda/zip/<stage>/`.
- **Secrets.** `scripts/tf.mjs` loads `.env.<stage>` and `.env`, with the same
  precedence as Serverless v4 (shell, then `.env.<stage>`, then `.env`). It
  exports each app setting as `TF_VAR_<name>`.
- **Names.** Resources are prefixed `finance-watch-<stage>-…`, while Serverless
  uses `money-tracker-api-<stage>-…`, so both stacks can exist in one account
  at the same time.

| File | Contents |
|---|---|
| `versions.tf` | Terraform/provider versions, S3 backend, AWS provider |
| `variables.tf` | Stage settings and Lambda environment variables |
| `locals.tf` | Parsing of `serverless.yml`, Lambda environment |
| `guards.tf` | Fails the plan on `serverless.yml` settings Terraform doesn't deploy |
| `lambda.tf` | IAM role, code zips, log groups, functions |
| `api.tf` | HTTP API, routes, integrations, optional custom domain |
| `schedules.tf` | EventBridge rules for scheduled jobs |
| `outputs.tf` | API URL, Telegram webhook URL, function names |
| `env/<stage>.tfvars` | Per-stage non-secret settings |
| `bootstrap/` | One-time creation of the state bucket |
| `.terraform.lock.hcl` | Provider versions and checksums for all platforms (committed) |

## Prerequisites

- Terraform >= 1.11
- AWS credentials for the target account (same as for `serverless deploy`)
- `npm install` in `manager/`, including devDependencies (the scripts use `esbuild` and `dotenv`)

## One-time setup

1. **Create the state bucket** (versioned, encrypted, private, TLS-only):

   ```bash
   cd manager/infra/bootstrap
   terraform init
   terraform apply            # outputs bucket_name
   ```

   The bootstrap keeps its own small state file locally
   (`bootstrap/terraform.tfstate`, gitignored). It only tracks the bucket.
   Keep a copy somewhere safe, or simply don't run the bootstrap again; the
   bucket has `prevent_destroy`.

2. **Point Terraform at it.** Add the following to `manager/.env`:

   ```bash
   TF_STATE_BUCKET=<bucket_name from above>
   ```

   `.env` is read for every stage, so one entry covers dev and prod. Each stage
   gets its own state key, `finance-watch/<stage>/terraform.tfstate`. To set it
   explicitly instead, copy `backends/example.s3.tfbackend` to
   `backends/<stage>.s3.tfbackend`.

## Everyday use

```bash
cd manager
npm run tf:plan:prod       # build + terraform plan (prod)
npm run deploy:tf:prod     # build + terraform apply (prod)
npm run tf:plan            # dev
npm run deploy:tf          # dev

# Anything else: npm run tf -- <stage> <terraform args>
npm run tf -- prod output api_url
npm run tf -- prod plan -out=tfplan && npm run tf -- prod apply tfplan
```

`tf.mjs` behaviour:
- **First run per stage:** runs `terraform init` automatically, using a separate
  working directory per stage (`infra/.terraform-<stage>`), so switching between
  dev and prod is safe.
- **Backend changes:** if the backend settings change later (a new
  `TF_STATE_BUCKET` or a backend file), it stops and asks you to run
  `init -migrate-state` or `init -reconfigure`.
- **Saved plans:** `apply <planfile>` reuses the zips created at plan time and
  skips the rebuild.

Env var changes appear as `(sensitive value)` in plans, because the Lambda
environment contains secrets. Check `.env` itself to see what changed.

Logs: `aws logs tail /aws/lambda/finance-watch-prod-<functionName> --follow`

## Switching prod from Serverless to Terraform

The app is stateless (all data is in MongoDB), so the switch is mostly about
moving traffic and scheduled jobs from one stack to the other.

> **Scheduled jobs must only run in one stack.** `processDebtPayments` is not
> idempotent: if both stacks run it, every scheduled debt payment is recorded
> twice. The daily digest, reminders and weekly email would also be sent twice.
>
> **One committed switch decides who runs them:** `params.<stage>.serverlessRunsSchedules`
> at the top of `serverless.yml` (falling back to `params.default`, which is
> `true`). Serverless enables its rules when it's `true`; Terraform enables its
> rules only when it's `false`. Both stacks read the same value, so a deploy of
> either one, from any machine, can never leave the jobs on in both. When you
> flip it, **deploy the stack that turns off first**. In between, the jobs run
> nowhere, which is safe.

0. **Before you start (once):** check that Serverless resolves the switch.
   `npx serverless print --stage prod` should show `enabled: true` (a boolean)
   under each `schedule` event.
1. **Deploy the Terraform stack:** `npm run deploy:tf:prod`. It's created next
   to the Serverless stack. Its schedules stay disabled, because
   `serverlessRunsSchedules` is still `true`.
2. **Smoke test.**
   - `curl -i "$(npm run -s tf -- prod output -raw api_gateway_url)/api/dashboard"`
     should return 401. This only proves routing works.
   - For a real check, start the client locally against it:
     `VITE_API_URL=<api_gateway_url> npm run dev` in `client/`. Then sign in and
     open the dashboard. This exercises Firebase and MongoDB with the new env vars.
     localhost:5173 is already allowed by CORS.
3. **Move traffic.**
   - Set `VITE_API_URL` in Netlify to the `api_url` output and redeploy the client.
   - Re-register the Telegram webhook to the `telegram_webhook_url` output:
     `curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=<telegram_webhook_url>"`
   - If you set a custom domain, create its CNAME (the `api_custom_domain_target`
     output) and wait for DNS before using `api_url`. Until then, use `api_gateway_url`.
4. **Move the scheduled jobs.**
   - **Pick a safe day.** Check whether the Serverless debt job already ran today
     (UTC); the logs keep about a day:
     `aws logs tail /aws/lambda/money-tracker-api-prod-processDebtPayments --since 24h`.
     If it did, wait until tomorrow. The Terraform rule runs on its own 4-day
     cycle, so the days on which debts are processed will shift.
   - **Flip the switch.** Add this under `params:` in `serverless.yml` and commit it:

     ```yaml
     prod:
       serverlessRunsSchedules: false
     ```

   - **Turn Serverless off first:** run `npm run deploy:prod`. CloudFormation sets
     its four rules to DISABLED. Check with
     `aws events list-rules --name-prefix money-tracker-api-prod- --query 'Rules[].[Name,State]' --output table`.
   - **Then turn Terraform on:** run `npm run deploy:tf:prod`. Its rules become
     ENABLED; `npm run tf -- prod output schedules_enabled` prints `true`. Check
     with the same `list-rules` command and `--name-prefix finance-watch-prod-`.
5. **Observability.** Function names, log groups and the `faas.name` telemetry
   attribute change from `money-tracker-api-prod-*` to `finance-watch-prod-*`.
   Update any Grafana dashboards or alerts that filter on them.
6. **Optional:** after a stable period, run `npx serverless remove --stage prod`.
   The fallback then means a fresh `npm run deploy:prod`, which still works and
   keeps its schedules off until you flip the switch back.

**Optional custom domain.** Set `api_domain_name` and `api_certificate_arn` in
`env/prod.tfvars` (the ACM certificate must be in ap-south-1). Once the client
and Telegram use that hostname, later infrastructure changes won't change the
public URL.

## Falling back to Serverless

`npm run deploy:prod` still works. Do the switchover steps in reverse.

1. **Flip the switch back.** Set `params.prod.serverlessRunsSchedules: true` in
   `serverless.yml` (or delete the `prod:` block) and commit it.
2. **Turn Terraform's schedules off first.**
   - If Terraform works: run `npm run deploy:tf:prod`. Its rules become DISABLED.
   - If Terraform itself is broken: disable the rules with the AWS CLI.

     ```bash
     for fn in weeklyExpenseSummary dailyTelegramDigest dailyExpenseReminder processDebtPayments; do
       aws events disable-rule --name "finance-watch-prod-$fn-0"
     done
     ```

     Because of step 1, a later Terraform apply keeps them disabled.
3. **Then turn Serverless's schedules on:** run `npm run deploy:prod`. The
   setting is part of the template, so CloudFormation re-enables the rules. Check with
   `aws events list-rules --name-prefix money-tracker-api-prod- --query 'Rules[].[Name,State]' --output table`.
4. **Move traffic back.** Point `VITE_API_URL` and the Telegram webhook at the
   Serverless API URL, shown by `npx serverless info --stage prod`.

Avoid enabling or disabling rules in the AWS console except in that emergency
case. Any later deploy of either stack resets them to what `serverless.yml` says.

## Notes

- Terraform state contains the Lambda environment variables, including secrets.
  The same is true of the CloudFormation template Serverless uploads. Keep the
  state bucket private; the bootstrap blocks public access and enforces
  encryption and TLS.
- `.env` values are read literally (no `${OTHER_VAR}` expansion). Avoid
  references between variables in `.env`.
- `MONGODB_DB_NAME` defaults to `money-tracker-dev` (same as `serverless.yml`).
  Set it in `.env.prod`/`.env` for prod.
- Upgrading providers:
  1. Run `npm run tf -- prod init -upgrade`.
  2. Refresh the checksums for every platform with
     `terraform -chdir=infra providers lock -platform=linux_amd64 -platform=darwin_arm64 -platform=darwin_amd64 -platform=windows_amd64`.
  3. Commit `.terraform.lock.hcl`.
- `serverless-offline` (`npm run dev`) is still the local dev server.
