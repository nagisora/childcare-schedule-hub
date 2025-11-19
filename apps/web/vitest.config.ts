import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		environment: 'jsdom',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['lib/**/*.ts'],
			exclude: ['node_modules', '__tests__', 'tests'],
		},
		exclude: ['node_modules', 'tests/**/*', 'playwright.config.ts'],
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './'),
		},
	},
});

