import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { middleware } from '../middleware';

function basicAuthHeader(user: string, pass: string): string {
	// vitest (jsdom) では btoa が使える
	return `Basic ${btoa(`${user}:${pass}`)}`;
}

describe('middleware (Basic Auth for /admin/* and /api/admin/*)', () => {
	const originalEnv: Partial<Record<string, string | undefined>> = {};

	beforeEach(() => {
		originalEnv.ADMIN_BASIC_AUTH_USER = process.env.ADMIN_BASIC_AUTH_USER;
		originalEnv.ADMIN_BASIC_AUTH_PASSWORD = process.env.ADMIN_BASIC_AUTH_PASSWORD;
	});

	afterEach(() => {
		if (originalEnv.ADMIN_BASIC_AUTH_USER === undefined) {
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete process.env.ADMIN_BASIC_AUTH_USER;
		} else {
			process.env.ADMIN_BASIC_AUTH_USER = originalEnv.ADMIN_BASIC_AUTH_USER;
		}

		if (originalEnv.ADMIN_BASIC_AUTH_PASSWORD === undefined) {
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete process.env.ADMIN_BASIC_AUTH_PASSWORD;
		} else {
			process.env.ADMIN_BASIC_AUTH_PASSWORD = originalEnv.ADMIN_BASIC_AUTH_PASSWORD;
		}
	});

	it('MW-AUTH-01: env未設定なら 500（安全側）', () => {
		// Given: envが未設定
		// When: middleware を呼ぶ
		// Then: 500
		delete process.env.ADMIN_BASIC_AUTH_USER;
		delete process.env.ADMIN_BASIC_AUTH_PASSWORD;

		const req = { headers: new Headers() };
		const res = middleware(req as any);

		expect(res.status).toBe(500);
	});

	it('MW-AUTH-02: Authorization無しなら 401 + WWW-Authenticate', () => {
		// Given: envは設定済み、Authorization無し
		// When: middleware を呼ぶ
		// Then: 401 + WWW-Authenticate
		process.env.ADMIN_BASIC_AUTH_USER = 'u';
		process.env.ADMIN_BASIC_AUTH_PASSWORD = 'p';

		const req = { headers: new Headers() };
		const res = middleware(req as any);

		expect(res.status).toBe(401);
		expect(res.headers.get('WWW-Authenticate')).toContain('Basic');
	});

	it('MW-AUTH-03: 認証情報が不一致なら 401', () => {
		// Given: envは設定済み、Authorizationあり（不一致）
		// When: middleware を呼ぶ
		// Then: 401
		process.env.ADMIN_BASIC_AUTH_USER = 'u';
		process.env.ADMIN_BASIC_AUTH_PASSWORD = 'p';

		const req = {
			headers: new Headers({
				authorization: basicAuthHeader('wrong', 'creds'),
			}),
		};
		const res = middleware(req as any);

		expect(res.status).toBe(401);
	});

	it('MW-AUTH-04: 認証一致なら NextResponse.next()（401にならない）', () => {
		// Given: envは設定済み、Authorizationあり（一致）
		// When: middleware を呼ぶ
		// Then: 401 ではない
		process.env.ADMIN_BASIC_AUTH_USER = 'u';
		process.env.ADMIN_BASIC_AUTH_PASSWORD = 'p';

		const req = {
			headers: new Headers({
				authorization: basicAuthHeader('u', 'p'),
			}),
		};
		const res = middleware(req as any);

		expect(res.status).not.toBe(401);
	});
});


