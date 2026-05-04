// Use JS for this because it's the build tooling needed to build all other TS packages

const isDebugBuild = process.env.TSUP_DEBUG === '1';

/**
 * @type {import('tsup').Options}
 */
export const baseConfig = {
  format: ['cjs', 'esm'],
  entry: ['./src/index.ts'],
  sourcemap: isDebugBuild ? 'inline' : true,
  clean: true,
  dts: true,
  splitting: !isDebugBuild,
  minify: !isDebugBuild,
  treeshake: !isDebugBuild,
  keepNames: true,
  tsconfig: './tsconfig.json',
};
