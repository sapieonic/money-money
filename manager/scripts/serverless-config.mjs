/**
 * Reads manager/serverless.yml as plain YAML (Serverless `${...}` variables are
 * left unresolved). Shared by build-lambdas.mjs and tf.mjs so that the Terraform
 * deployment derives its handlers, esbuild options and env var names from the
 * same file Serverless uses.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function readServerlessConfig() {
  return parse(readFileSync(path.join(root, 'serverless.yml'), 'utf8'));
}

/** Names referenced as `${env:NAME...}` in provider.environment. */
export function envVarNames(config) {
  const values = Object.values(config.provider?.environment ?? {});
  return [...new Set(values.flatMap((v) => [...String(v).matchAll(/\$\{env:(\w+)/g)].map((m) => m[1])))];
}
