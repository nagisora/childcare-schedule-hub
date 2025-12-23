import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// NextRequest を厳密に生成せず、必要最小限（headers/nextUrl）の疑似 request を渡す。

vi.mock('../lib/facilities', () => {
	return {
		getFacilityById: vi.fn(),
	};
});

type MockedFetch = ReturnType<typeof vi.fn>;

function createFakeRequest(params: {
	url: string;
	adminToken?: string;
}): { headers: Headers; nextUrl: URL } {
	const headers = new Headers();
	if (params.adminToken) headers.set('x-admin-token', params.adminToken);
	return {
		headers,
		nextUrl: new URL(params.url),
	};
}

describe('GET /api/instagram-schedule-search (Route Handler)', () => {
	const ENV_KEYS = ['ADMIN_API_TOKEN', 'GOOGLE_CSE_API_KEY', 'GOOGLE_CSE_CX'] as const;
	const originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

	let fetchMock: MockedFetch;

	beforeEach(() => {
		for (const k of ENV_KEYS) originalEnv[k] = process.env[k];

		process.env.ADMIN_API_TOKEN = 'test-admin-token';
		process.env.GOOGLE_CSE_API_KEY = 'test-cse-key';
		process.env.GOOGLE_CSE_CX = 'test-cse-cx';

		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
	});

	afterEach(() => {
		for (const k of ENV_KEYS) {
			if (originalEnv[k] === undefined) {
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete process.env[k];
			} else {
				process.env[k] = originalEnv[k];
			}
		}
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it('RT-AUTH-01: ADMIN_API_TOKEN 未設定なら 500 (CONFIG_ERROR)', async () => {
		// Given: ADMIN_API_TOKEN が未設定
		// When: GET を呼ぶ
		// Then: 500 + CONFIG_ERROR
		delete process.env.ADMIN_API_TOKEN;

		const { GET } = await import('../app/api/instagram-schedule-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-schedule-search?facilityName=テスト&month=2025-12',
			adminToken: 'anything',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe('CONFIG_ERROR');
	});

	it('RT-AUTH-02: x-admin-token 不正/欠如なら 401 (UNAUTHORIZED)', async () => {
		// Given: x-admin-token が欠如
		// When: GET を呼ぶ
		// Then: 401 + UNAUTHORIZED
		const { GET } = await import('../app/api/instagram-schedule-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-schedule-search?facilityName=テスト&month=2025-12',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe('UNAUTHORIZED');
	});

	it('RT-REQ-01: month が欠如なら 400 (BAD_REQUEST)', async () => {
		// Given: month が欠如
		// When: GET を呼ぶ
		// Then: 400 + BAD_REQUEST
		const { GET } = await import('../app/api/instagram-schedule-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-schedule-search?facilityName=テスト',
			adminToken: 'test-admin-token',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe('BAD_REQUEST');
		expect(body.error.message).toContain('month');
	});

	it('RT-REQ-02: month が不正形式なら 400 (BAD_REQUEST)', async () => {
		// Given: month が不正形式
		// When: GET を呼ぶ
		// Then: 400 + BAD_REQUEST
		const { GET } = await import('../app/api/instagram-schedule-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-schedule-search?facilityName=テスト&month=2025/12',
			adminToken: 'test-admin-token',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe('BAD_REQUEST');
		expect(body.error.message).toContain('YYYY-MM');
	});

	it('RT-REQ-03: facilityId も facilityName も無いなら 400 (BAD_REQUEST)', async () => {
		// Given: facilityId / facilityName が無い
		// When: GET を呼ぶ
		// Then: 400 + BAD_REQUEST
		const { GET } = await import('../app/api/instagram-schedule-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-schedule-search?month=2025-12',
			adminToken: 'test-admin-token',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe('BAD_REQUEST');
	});

	it('RT-DB-01: facilityId 指定で施設が見つからないなら 404 (NOT_FOUND)', async () => {
		// Given: getFacilityById が null を返す
		// When: GET を呼ぶ
		// Then: 404 + NOT_FOUND
		const { getFacilityById } = await import('../lib/facilities');
		(getFacilityById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const { GET } = await import('../app/api/instagram-schedule-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-schedule-search?facilityId=missing&month=2025-12',
			adminToken: 'test-admin-token',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error.code).toBe('NOT_FOUND');
	});

	it('RT-DB-02: facilityId 指定で getFacilityById が例外なら 500 (DB_ERROR)', async () => {
		// Given: getFacilityById が例外を投げる
		// When: GET を呼ぶ
		// Then: 500 + DB_ERROR（メッセージも反映）
		const { getFacilityById } = await import('../lib/facilities');
		(getFacilityById as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));

		const { GET } = await import('../app/api/instagram-schedule-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-schedule-search?facilityId=broken&month=2025-12',
			adminToken: 'test-admin-token',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe('DB_ERROR');
		expect(body.error.message).toContain('boom');
	});

	it('RT-CFG-01: GOOGLE_CSE_API_KEY / GOOGLE_CSE_CX 未設定なら 500 (CONFIG_ERROR)', async () => {
		// Given: GOOGLE_CSE_* が未設定
		// When: GET を呼ぶ
		// Then: 500 + CONFIG_ERROR
		delete process.env.GOOGLE_CSE_API_KEY;
		delete process.env.GOOGLE_CSE_CX;

		const { GET } = await import('../app/api/instagram-schedule-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-schedule-search?facilityName=テスト&month=2025-12',
			adminToken: 'test-admin-token',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe('CONFIG_ERROR');
	});

	it('RT-CSE-01: CSEレスポンスが error を返すなら 500 (CSE_ERROR)', async () => {
		// Given: fetch は ok=true だが JSON に error が入る
		// When: GET を呼ぶ
		// Then: 500 + CSE_ERROR
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: { message: 'quota exceeded' } }), { status: 200 })
		);

		const { GET } = await import('../app/api/instagram-schedule-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-schedule-search?facilityName=テスト&month=2025-12',
			adminToken: 'test-admin-token',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe('CSE_ERROR');
		expect(body.error.message).toContain('quota');
	});

	it('RT-CSE-02: fetch.ok=false が続くと candidates=[] で返る', async () => {
		// Given: fetch が常に失敗（ok=false）
		// When: GET を呼ぶ
		// Then: 200 で candidates=[]、triedQueries は実行したクエリ数
		fetchMock.mockResolvedValue(new Response('upstream error', { status: 503 }));

		const { GET } = await import('../app/api/instagram-schedule-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-schedule-search?facilityName=テスト拠点&wardName=東区&month=2025-12',
			adminToken: 'test-admin-token',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(Array.isArray(body.candidates)).toBe(true);
		expect(body.candidates).toHaveLength(0);
		expect(Array.isArray(body.triedQueries)).toBe(true);
		expect(body.triedQueries.length).toBeGreaterThan(0);
	});

	it('RT-N-01: /p/ と /reel/ のpermalink候補が抽出され、/p/が優先される', async () => {
		// Given: /p/ と /reel/ のpermalinkが混在する items
		// When: GET を呼ぶ
		// Then: 200 で /p/ と /reel/ が candidates に含まれ、/p/ が先頭
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					items: [
						{
							link: 'https://www.instagram.com/reel/REEL123/',
							title: 'リール投稿',
							snippet: '2025年12月のスケジュール',
						},
						{
							link: 'https://www.instagram.com/p/POST123/',
							title: '投稿',
							snippet: '2025年12月のスケジュール',
						},
						{
							link: 'https://www.instagram.com/testuser/',
							title: 'プロフィール',
							snippet: '名古屋 東区 子育て',
						},
					],
				}),
				{ status: 200 }
			)
		);

		const { GET } = await import('../app/api/instagram-schedule-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-schedule-search?facilityName=テスト拠点&wardName=東区&month=2025-12',
			adminToken: 'test-admin-token',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.candidates.length).toBeGreaterThanOrEqual(2);
		// /p/ が先頭に来る
		expect(body.candidates[0].type).toBe('p');
		expect(body.candidates[0].url).toContain('/p/');
		// /reel/ も含まれる
		const reelCandidate = body.candidates.find((c: { type: string }) => c.type === 'reel');
		expect(reelCandidate).toBeDefined();
		expect(reelCandidate.url).toContain('/reel/');
		// プロフィールURLは除外される
		expect(body.candidates.every((c: { url: string }) => !c.url.includes('/testuser/'))).toBe(true);
		// 月ヒントが抽出されている
		expect(body.candidates[0].matchedMonthHints.length).toBeGreaterThan(0);
	});
});

