import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts', './src/react/index.tsx', './src/std/index.ts'],
  outDir: './dist',
  platform: 'neutral',
  format: ['cjs', 'esm'],
  dts: true,
});
