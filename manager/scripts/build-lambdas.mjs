#!/usr/bin/env node
/**
 * Bundles every Lambda handler module in src/handlers/ for the Terraform deployment.
 *
 * Output: dist/lambda/bundles/<module>.js (one self-contained CommonJS bundle per
 * handler file). Terraform zips each bundle into dist/lambda/zip/<stage>/ and points
 * every function defined in that file at it, using the handler string "<module>.<export>".
 *
 * esbuild options mirror the `build.esbuild` block in serverless.yml so both
 * deployment paths ship the same code.
 */
import { build } from 'esbuild';
import { readdir, rm, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const handlersDir = path.join(root, 'src', 'handlers');
const outDir = path.join(root, 'dist', 'lambda', 'bundles');

const entries = (await readdir(handlersDir))
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
  .map((f) => path.basename(f, '.ts'));

if (entries.length === 0) {
  console.error(`No handler modules found in ${handlersDir}`);
  process.exit(1);
}

// Start from a clean directory so removed handlers don't linger in deployments.
// Only bundles are wiped: per-stage zips (dist/lambda/zip/<stage>) referenced by a
// saved plan for another stage must stay untouched.
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const started = Date.now();

await Promise.all(
  entries.map((name) =>
    build({
      entryPoints: [path.join(handlersDir, `${name}.ts`)],
      outfile: path.join(outDir, `${name}.js`),
      bundle: true,
      minify: false,
      sourcemap: false,
      platform: 'node',
      target: 'node20',
      format: 'cjs',
      // Provided by the Lambda Node.js runtime; never bundle it.
      external: ['@aws-sdk/*', 'aws-sdk'],
      logLevel: 'warning',
    })
  )
);

for (const name of entries) {
  const { size } = await stat(path.join(outDir, `${name}.js`));
  console.log(`  ${name}.js  ${(size / 1024 / 1024).toFixed(2)} MB`);
}
console.log(`Built ${entries.length} Lambda bundles in ${Date.now() - started}ms -> ${path.relative(root, outDir)}/`);
