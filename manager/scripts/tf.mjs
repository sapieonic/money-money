#!/usr/bin/env node
/**
 * Terraform wrapper for the manager/infra stack.
 *
 *   node scripts/tf.mjs <stage> <terraform command> [args...]
 *   npm run tf -- prod plan
 *   npm run tf -- prod output api_url
 *
 * What it does on top of plain `terraform`:
 *  - Loads manager/.env.<stage> and manager/.env, the same files and precedence
 *    as Serverless v4, and passes every variable serverless.yml references as
 *    `${env:NAME}` to Terraform as TF_VAR_app_env, so no secrets live in tfvars.
 *  - Uses a separate working directory per stage (infra/.terraform-<stage>) and
 *    runs `terraform init` against that stage's S3 state the first time.
 *  - Adds -var-file=env/<stage>.tfvars (if present) where Terraform accepts it.
 *  - Rebuilds the Lambda bundles before plan/apply; other commands that read
 *    them only build when they are missing.
 *
 * Env overrides: TERRAFORM_BIN (binary path), SKIP_BUILD=1, TF_STATE_BUCKET,
 * TF_STATE_REGION (default ap-south-1).
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { envVarNames, readServerlessConfig, root } from './serverless-config.mjs';

const infraDir = path.join(root, 'infra');

// Commands that evaluate the configuration: they get -var-file and need bundles.
const CONFIG_COMMANDS = new Set(['plan', 'apply', 'destroy', 'import', 'refresh', 'console']);
// Commands that deploy code always rebuild; the others only need bundles to exist.
const FRESH_BUILD_COMMANDS = new Set(['plan', 'apply']);
// apply/plan flags that may take their value as the next argument (`-target X`).
const FLAGS_WITH_VALUE = new Set([
  '-target', '-replace', '-var', '-var-file', '-parallelism', '-lock-timeout',
  '-state', '-state-out', '-backup', '-out', '-generate-config-out',
]);

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
// Same precedence as Serverless v4: shell environment, then .env.<stage>,
// then .env (dotenv never overrides a value that is already set).
for (const file of [`.env.${stage}`, '.env']) {
  const fullPath = path.join(root, file);
  if (existsSync(fullPath)) {
    dotenv.config({ path: fullPath, quiet: true });
    console.error(`tf: loaded ${file}`);
  }
}

const dataDir = path.join(infraDir, `.terraform-${stage}`);
const appEnv = Object.fromEntries(
  envVarNames(readServerlessConfig())
    .filter((name) => process.env[name] !== undefined)
    .map((name) => [name, process.env[name]])
);
const env = {
  ...process.env,
  TF_VAR_stage: stage,
  // Terraform parses map-typed TF_VAR_ values as HCL: escape template sequences.
  // (Replacement functions, because "$$" in a replacement string means "$".)
  TF_VAR_app_env: JSON.stringify(appEnv)
    .replaceAll('${', () => '$${')
    .replaceAll('%{', () => '%%{'),
  TF_DATA_DIR: dataDir,
};

const terraformBin = process.env.TERRAFORM_BIN || 'terraform';

// Runs terraform and resolves with its exit code. Signals are handled so that
// Terraform can always shut down gracefully and release the state lock:
//  - SIGINT (Ctrl-C): the terminal already delivers it to Terraform directly, so
//    the wrapper ignores it (forwarding a second one would make Terraform abort
//    hard) and waits for Terraform to exit.
//  - SIGTERM (CI cancellation, `timeout`, npm): usually sent to the wrapper only,
//    so it is forwarded to Terraform.
function terraform(args) {
  return new Promise((resolve) => {
    const child = spawn(terraformBin, [`-chdir=${infraDir}`, ...args], { stdio: 'inherit', env });
    const onSigint = () => {};
    const onSigterm = () => child.kill('SIGTERM');
    process.on('SIGINT', onSigint);
    process.on('SIGTERM', onSigterm);
    const done = (code) => {
      process.off('SIGINT', onSigint);
      process.off('SIGTERM', onSigterm);
      resolve(code);
    };
    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        fail(`"${terraformBin}" not found. Install Terraform >= 1.11 or set TERRAFORM_BIN.`);
      }
      console.error(error);
      done(1);
    });
    child.on('exit', (code, signal) => done(code ?? (signal ? 1 : 0)));
  });
}

// --- Backend / init --------------------------------------------------------
// Returns the -backend-config arguments for this stage, or null if neither a
// backend file nor TF_STATE_BUCKET is configured.
function findBackendArgs() {
  const backendFile = path.join(infraDir, 'backends', `${stage}.s3.tfbackend`);
  if (existsSync(backendFile)) {
    return [`-backend-config=${path.relative(infraDir, backendFile)}`];
  }
  const bucket = process.env.TF_STATE_BUCKET;
  if (!bucket) return null;
  return [
    `-backend-config=bucket=${bucket}`,
    `-backend-config=key=finance-watch/${stage}/terraform.tfstate`,
    `-backend-config=region=${process.env.TF_STATE_REGION || 'ap-south-1'}`,
    '-backend-config=encrypt=true',
    '-backend-config=use_lockfile=true',
  ];
}

function backendArgs() {
  const args = findBackendArgs();
  if (!args) {
    fail(
      `no state backend configured for "${stage}". Set TF_STATE_BUCKET in .env ` +
        `(create the bucket with infra/bootstrap) or add infra/backends/${stage}.s3.tfbackend.`
    );
  }
  return args;
}

// Remembers which backend settings this stage was initialised with, so a later
// change (new TF_STATE_BUCKET, new backends/<stage>.s3.tfbackend) is caught
// instead of silently using the old state location.
const backendMarker = path.join(dataDir, 'backend-args.json');

function backendFingerprint(args) {
  const fileArg = args.find((a) => a.endsWith('.s3.tfbackend'));
  const fileContent = fileArg ? readFileSync(path.join(infraDir, fileArg.split('=')[1]), 'utf8') : null;
  return JSON.stringify({ args, fileContent });
}

async function init(args, extra) {
  const status = await terraform(['init', ...args, ...extra]);
  if (status === 0) writeFileSync(backendMarker, backendFingerprint(args));
  return status;
}

if (command === 'init') {
  process.exit(await init(backendArgs(), rest));
}

const currentBackend = findBackendArgs();
if (!existsSync(path.join(dataDir, 'terraform.tfstate'))) {
  console.error(`tf: initializing ${stage} working directory`);
  const status = await init(backendArgs(), ['-input=false']);
  if (status !== 0) process.exit(status);
} else if (
  // Only comparable when the backend settings are available in this shell.
  currentBackend &&
  existsSync(backendMarker) &&
  readFileSync(backendMarker, 'utf8') !== backendFingerprint(currentBackend)
) {
  fail(
    `the state backend settings for "${stage}" changed since it was initialised.\n` +
      `    Run: npm run tf -- ${stage} init -migrate-state   (copy existing state to the new location)\n` +
      `     or: npm run tf -- ${stage} init -reconfigure     (use the new location as-is)`
  );
}

// --- Command ---------------------------------------------------------------
// `apply <planfile>`: the last argument is an existing file and not the value
// of a flag such as `-target X`. Saved plans must not get -var-file and need
// no rebuild (they upload the zips created when the plan was made).
function savedPlanArg() {
  if (command !== 'apply' || rest.length === 0) return null;
  const last = rest[rest.length - 1];
  const previous = rest[rest.length - 2];
  if (last.startsWith('-') || (previous && FLAGS_WITH_VALUE.has(previous))) return null;
  const candidate = path.resolve(infraDir, last);
  return existsSync(candidate) && statSync(candidate).isFile() ? last : null;
}
const appliesSavedPlan = savedPlanArg() !== null;

const bundlesMissing = !existsSync(path.join(root, 'dist', 'lambda', 'bundles'));
const needsBuild = FRESH_BUILD_COMMANDS.has(command) || (CONFIG_COMMANDS.has(command) && bundlesMissing);
if (needsBuild && !appliesSavedPlan && process.env.SKIP_BUILD !== '1') {
  const build = spawnSync(process.execPath, [path.join(root, 'scripts', 'build-lambdas.mjs')], { stdio: 'inherit' });
  if (build.status !== 0) fail('Lambda build failed');
}

const args = [command];
const varFile = path.join(infraDir, 'env', `${stage}.tfvars`);
if (CONFIG_COMMANDS.has(command) && !appliesSavedPlan && existsSync(varFile)) {
  args.push(`-var-file=${path.relative(infraDir, varFile)}`);
}
args.push(...rest);

process.exit(await terraform(args));
