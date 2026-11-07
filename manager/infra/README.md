# Terraform deployment

Terraform deploys the same backend that `serverless.yml` describes: Lambda
functions, an API Gateway HTTP API, EventBridge schedules, an IAM role and log
groups. Serverless (`npm run deploy` / `deploy:prod`) still works and is kept
as a fallback.

## How it fits together

```
serverless.yml ──(yamldecode)──► infra/*.tf ◄── env/<stage>.tfvars   (non-secret settings)
                                     ▲
src/handlers/*.ts ──esbuild──► dist/lambda/<module>.js ──zip──┘
                                     ▲
manager/.env(.<stage>) ──scripts/tf.mjs──► TF_VAR_*                (secrets)
```

- **`serverless.yml` is the single source of truth** for functions, routes,
  schedules, runtime, memory and timeout, log retention and CORS. Terraform reads
  it with `yamldecode`, so a function added there is deployed by both paths.
  Terraform supports `httpApi` and `schedule` events. Any other event type fails
  a `check` at plan time.
- **Code:** `scripts/build-lambdas.mjs` bundles each file in `src/handlers/`
  with the same esbuild settings as Serverless. All functions from one file share
  a zip; the handler string is `<module>.<export>`. A function is only redeployed
  when its bundle changes.
- **Secrets:** `scripts/tf.mjs` loads `.env.<stage>` (or `.env`), the same file
  Serverless uses, and exports each app setting as `TF_VAR_<name>`.
- **Names:** resources are prefixed `finance-watch-<stage>-…`, while Serverless
  uses `money-tracker-api-<stage>-…`, so both stacks can exist in one account
  at the same time.

| File | Contents |
|---|---|
| `versions.tf` | Terraform/provider versions, S3 backend, AWS provider |
| `variables.tf` | Stage settings and Lambda environment variables |
| `locals.tf` | Parsing of `serverless.yml`, Lambda environment |
| `lambda.tf` | IAM role, code zips, log groups, functions |
| `api.tf` | HTTP API, routes, integrations, optional custom domain |
| `schedules.tf` | EventBridge rules for scheduled jobs |
| `outputs.tf` | API URL, Telegram webhook URL, function names |
| `env/<stage>.tfvars` | Per-stage non-secret settings |
| `bootstrap/` | One-time creation of the state bucket |

## Prerequisites

- Terraform >= 1.10
- AWS credentials for the target account (same as for `serverless deploy`)
- `npm install` in `manager/`

## One-time setup

1. **Create the state bucket** (versioned, encrypted, private, TLS-only):

   ```bash
   cd manager/infra/bootstrap
   terraform init
   terraform apply            # outputs bucket_name
   ```

   The bootstrap keeps its own small state file locally
   (`bootstrap/terraform.tfstate`, gitignored). It only tracks the bucket.

2. **Point Terraform at it.** Add the following to `manager/.env`:

   ```bash
   TF_STATE_BUCKET=<bucket_name from above>
   ```

   Each stage gets its own state key, `finance-watch/<stage>/terraform.tfstate`.
   To set it explicitly instead, copy `backends/example.s3.tfbackend` to
   `backends/<stage>.s3.tfbackend`.

3. **Commit the provider lock file** that the first `init` creates
   (`infra/.terraform.lock.hcl`).

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

`tf.mjs` runs `terraform init` automatically the first time for each stage. It
uses a separate working directory per stage (`infra/.terraform-<stage>`), so
switching between dev and prod is safe.

Logs: `aws logs tail /aws/lambda/finance-watch-prod-<functionName> --follow`

## Switching prod from Serverless to Terraform

The app is stateless (all data is in MongoDB), so the switch is mostly about
moving traffic and scheduled jobs from one stack to the other.

> **Scheduled jobs must only run in one stack.** `processDebtPayments` is not
> idempotent: if both stacks run it, every scheduled debt payment is recorded
> twice. The daily digest, reminders and weekly email would also be sent twice.
> `enable_schedules` is therefore `false` in `env/prod.tfvars` until you switch.

1. `npm run deploy:tf:prod`. This creates the Terraform stack next to the
   Serverless one, with schedules disabled.
2. Smoke-test the API: `curl "$(npm run -s tf -- prod output -raw api_url)/api/dashboard"`.
   It should return 401 without a token.
3. Move traffic:
   - Set `VITE_API_URL` in Netlify to the `api_url` output and redeploy the client.
   - Re-register the Telegram webhook to the `telegram_webhook_url` output:
     `curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=<telegram_webhook_url>"`
4. Move the scheduled jobs. **First** stop them in Serverless, **then** start
   them in Terraform:
   - In the AWS console (EventBridge → Rules), disable the four
     `money-tracker-api-prod-*` schedule rules, or run `serverless remove --stage prod`
     if you no longer want the fallback deployed.
   - Set `enable_schedules = true` in `env/prod.tfvars` and run `npm run deploy:tf:prod`.

Optional: set `api_domain_name` and `api_certificate_arn` in `env/prod.tfvars`
(ACM certificate in ap-south-1), then add a CNAME to the
`api_custom_domain_target` output. Once the client and Telegram use the custom
domain, future infrastructure changes won't change the public URL.

## Falling back to Serverless

`serverless.yml` is unchanged and `npm run deploy:prod` still works. To switch
back, do the same steps in reverse:

1. Set `enable_schedules = false` in `env/prod.tfvars` and run
   `npm run deploy:tf:prod`, so the Terraform jobs stop first.
2. `npm run deploy:prod`. This deploys or updates the Serverless stack, whose
   schedules are enabled.
3. Point `VITE_API_URL` and the Telegram webhook back at the Serverless API URL
   (shown by `npx serverless info --stage prod`).

## Notes

- Terraform state contains the Lambda environment variables, including secrets.
  The same is true of the CloudFormation template Serverless uploads. Keep the
  state bucket private; the bootstrap blocks public access and enforces encryption.
- `MONGODB_DB_NAME` defaults to `money-tracker-dev` (same as `serverless.yml`).
  Set it in `.env.prod` / `.env` for prod.
- `serverless-offline` (`npm run dev`) is still the local dev server.
