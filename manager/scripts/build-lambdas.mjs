#!/usr/bin/env node
/**
 * Bundles the Lambda handler modules for the Terraform deployment.
 *
 * Handlers and esbuild options come from serverless.yml (`functions.*.handler`
 * and `build.esbuild`), so both deployment paths ship the same code.
 *
 * Output: dist/lambda/bundles/<module>.js, one self-contained CommonJS bundle per
 * handler file. Terraform zips each bundle into dist/lambda/zip/<stage>/ and points
 * every function defined in that file at it ("<module>.<export>").
 */
import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { readServerlessConfig, root } from './serverless-config.mjs';

const outDir = path.join(root, 'dist', 'lambda', 'bundles');
const config = readServerlessConfig();

function fail(message) {
  console.error(`build-lambdas: ${message}`);
  process.exit(1);
}

// --- esbuild options from serverless.yml build.esbuild ----------------------
const SUPPORTED_ESBUILD_KEYS = ['bundle', 'minify', 'sourcemap', 'exclude', 'external', 'target', 'platform'];
const esbuildConfig = config.build?.esbuild ?? {};
const unsupported = Object.keys(esbuildConfig).filter((k) => !SUPPORTED_ESBUILD_KEYS.includes(k));
if (unsupported.length) fail(`build.esbuild options not supported here: ${unsupported.join(', ')}`);
if (esbuildConfig.bundle === false) fail('build.esbuild.bundle: false is not supported (Lambda zips must be self-contained)');
if (typeof (esbuildConfig.sourcemap ?? false) !== 'boolean') fail('build.esbuild.sourcemap must be true or false');

// --- Handler modules from serverless.yml functions --------------------------
// "src/handlers/income.getAll" -> module "income" from src/handlers/income.ts
const entryPoints = {};
for (const [name, fn] of Object.entries(config.functions ?? {})) {
  const modulePath = fn.handler.slice(0, fn.handler.lastIndexOf('.'));
  const source = ['.ts', '.js'].map((ext) => path.join(root, modulePath + ext)).find(existsSync);
  if (!source) fail(`function ${name}: no source file for handler ${fn.handler}`);
  const moduleName = path.basename(modulePath);
  if (entryPoints[moduleName] && entryPoints[moduleName] !== source) {
    fail(`handler modules ${entryPoints[moduleName]} and ${source} share the name "${moduleName}"`);
  }
  entryPoints[moduleName] = source;
}

// Start from a clean directory so removed handlers don't linger in deployments.
// Only bundles are wiped: per-stage zips (dist/lambda/zip/<stage>) referenced by a
// saved plan for another stage must stay untouched.
await rm(outDir, { recursive: true, force: true });

const started = Date.now();
await build({
  entryPoints,
  outdir: outDir,
  bundle: true,
  minify: esbuildConfig.minify ?? false,
  sourcemap: esbuildConfig.sourcemap ?? false,
  platform: esbuildConfig.platform ?? 'node',
  target: esbuildConfig.target ?? 'node20',
  format: 'cjs',
  // `exclude` (Serverless) and `external` both mean "don't bundle". The AWS SDK v3
  // is always provided by the Lambda Node.js runtime.
  external: [...(esbuildConfig.exclude ?? []), ...(esbuildConfig.external ?? []), '@aws-sdk/*'],
  logLevel: 'warning',
});

for (const file of (await readdir(outDir)).sort()) {
  const { size } = await stat(path.join(outDir, file));
  console.log(`  ${file}  ${(size / 1024 / 1024).toFixed(2)} MB`);
}
console.log(
  `Built ${Object.keys(entryPoints).length} Lambda bundles in ${Date.now() - started}ms -> ${path.relative(root, outDir)}/`
);
