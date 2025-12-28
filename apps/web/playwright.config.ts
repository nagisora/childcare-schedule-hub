import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const isLocalhost = baseURL.startsWith('http://localhost') || baseURL.startsWith('http://127.0.0.1');

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	use: {
		baseURL,
		trace: 'on-first-retry',
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],

	// webServer は localhost の場合のみ有効化
	// Preview/Prod の場合は無効化して、指定URLに対してE2Eを実行
	...(isLocalhost && {
		webServer: {
			command: 'pnpm dev',
			url: 'http://localhost:3000',
			reuseExistingServer: !process.env.CI,
			timeout: 120 * 1000,
		},
	}),
});

