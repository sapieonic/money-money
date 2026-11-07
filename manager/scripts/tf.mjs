#!/usr/bin/env node
/**
 * Terraform wrapper for the manager/infra stack.
 *
 *   node scripts/tf.mjs <stage> <terraform command> [args...]
 *   npm run tf -- prod plan
 *   npm run tf -- prod output api_url
 *
 * What it does on top of plain `terraform`:
 *  - Loads manager/.env.<stage> (or .env), the same files Serverless reads, and
 *    exports each app setting as TF_VAR_<name> so no secrets live in tfvars.
 *  - Uses a separate working directory per stage (infra/.terraform-<stage>) and
 *    runs `terraform init` against that stage's S3 state the first time.
 *  - Adds -var-file=env/<stage>.tfvars where Terraform accepts it.
 *  - Rebuilds the Lambda bundles before commands that read them.
 *
 * Env overrides: TERRAFORM_BIN (binary path), SKIP_BUILD=1, TF_STATE_BUCKET,
 * TF_STATE_REGION (default ap-south-1).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const infraDir = path.join(root, 'infra');

// App settings forwarded to Terraform. Names match .env / serverless.yml.
const APP_ENV_VARS = [
  'MONGODB_URI',
  'MONGODB_DB_NAME',
  'FIREBASE_PROJECT_ID',
  'TELEGRAM_BOT_TOKEN',
  'LLM_PROVIDER',
  'AZURE_OPENAI_API_KEY',
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_DEPLOYMENT',
  'AZURE_OPENAI_API_VERSION',
  'DATABRICKS_HOST',
  'DATABRICKS_TOKEN',
  'DATABRICKS_SERVING_ENDPOINT',
  'EMAIL_PROVIDER',
  'MAILJET_API_KEY',
  'MAILJET_SECRET_KEY',
  'MAILJET_FROM_EMAIL',
  'MAILJET_FROM_NAME',
  'GRAFANA_OTLP_ENDPOINT',
  'GRAFANA_OTLP_HEADERS',
];

const VAR_FILE_COMMANDS = new Set(['plan', 'apply', 'destroy', 'import', 'refresh', 'console']);
const BUILD_COMMANDS = new Set(['plan', 'apply', 'destroy', 'import', 'refresh', 'console']);

function fail(message) {
  console.error(`tf: ${message}`);
  process.exit(1);
}

const [stage, command, ...rest] = process.argv.slice(2);

if (!stage || !command) {
  fail('usage: node scripts/tf.mjs <stage> <terraform command> [args...]\n    e.g. npm run tf -- prod plan');
}
if (!/^[a-z0-9-]+$/.test(stage)) {
  fail(`invalid stage "${stage}" (lowercase letters, digits, hyphens)`);
}

// --- Environment -----------------------------------------------------------
// Same lookup as Serverless v4: .env.<stage> if present, otherwise .env.
// Values already set in the shell win over the file.
const stageEnvFile = path.join(root, `.env.${stage}`);
const envFile = existsSync(stageEnvFile) ? stageEnvFile : path.join(root, '.env');
if (existsSync(envFile)) {
  dotenv.config({ path: envFile, quiet: true });
  console.error(`tf: loaded ${path.relative(root, envFile)}`);
}

const env = { ...process.env, TF_VAR_stage: stage, TF_DATA_DIR: path.join(infraDir, `.terraform-${stage}`) };
for (const name of APP_ENV_VARS) {
  if (process.env[name] !== undefined) {
    env[`TF_VAR_${name.toLowerCase()}`] = process.env[name];
  }
}

const terraformBin = process.env.TERRAFORM_BIN || 'terraform';

function terraform(args) {
  const result = spawnSync(terraformBin, [`-chdir=${infraDir}`, ...args], { stdio: 'inherit', env });
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      fail(`"${terraformBin}" not found. Install Terraform >= 1.10 or set TERRAFORM_BIN.`);
    }
    throw result.error;
  }
  return result.status ?? 1;
}

// --- Backend / init --------------------------------------------------------
function backendArgs() {
  const backendFile = path.join(infraDir, 'backends', `${stage}.s3.tfbackend`);
  if (existsSync(backendFile)) {
    return [`-backend-config=${path.relative(infraDir, backendFile)}`];
  }
  const bucket = process.env.TF_STATE_BUCKET;
  if (!bucket) {
    fail(
      `no state backend configured for "${stage}". Set TF_STATE_BUCKET in .env ` +
        `(create the bucket with infra/bootstrap) or add infra/backends/${stage}.s3.tfbackend.`
    );
  }
  return [
    `-backend-config=bucket=${bucket}`,
    `-backend-config=key=finance-watch/${stage}/terraform.tfstate`,
    `-backend-config=region=${process.env.TF_STATE_REGION || 'ap-south-1'}`,
    '-backend-config=encrypt=true',
    '-backend-config=use_lockfile=true',
  ];
}

if (command === 'init') {
  process.exit(terraform(['init', ...backendArgs(), ...rest]));
}

if (!existsSync(path.join(env.TF_DATA_DIR, 'terraform.tfstate'))) {
  console.error(`tf: initializing ${stage} working directory`);
  const status = terraform(['init', '-input=false', ...backendArgs()]);
  if (status !== 0) process.exit(status);
}

// --- Command ---------------------------------------------------------------
// `apply <planfile>` must not get -var-file and needs no rebuild.
const appliesSavedPlan = command === 'apply' && rest.some((arg) => !arg.startsWith('-'));

if (BUILD_COMMANDS.has(command) && !appliesSavedPlan && process.env.SKIP_BUILD !== '1') {
  const build = spawnSync(process.execPath, [path.join(root, 'scripts', 'build-lambdas.mjs')], { stdio: 'inherit' });
  if (build.status !== 0) fail('Lambda build failed');
}

const args = [command];
const varFile = path.join(infraDir, 'env', `${stage}.tfvars`);
if (VAR_FILE_COMMANDS.has(command) && !appliesSavedPlan && existsSync(varFile)) {
  args.push(`-var-file=${path.relative(infraDir, varFile)}`);
}
args.push(...rest);

process.exit(terraform(args));
