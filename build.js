const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/bootstrap.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'addon/bootstrap.js',
  target: 'es2022',
  external: ['Zotero']
}).catch(() => process.exit(1));
