import { defineConfig } from 'tsup';
import { baseConfig } from '@internal/tsup-config';

export default defineConfig({ ...baseConfig, entry: ['src/index.ts', 'src/utils/**/*.ts'] });
