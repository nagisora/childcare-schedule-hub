import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// NOTE:
// Next.js の NextRequest をテスト側で厳密に生成しなくても、
// Route Handler が参照するのは request.headers / request.nextUrl だけなので、
// 最小限の shape を持つ疑似 request を渡して分岐テストする。

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

describe('GET /api/instagram-search (Route Handler)', () => {
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

		const { GET } = await import('../app/api/instagram-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-search?facilityName=テスト&wardName=東区',
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
		const { GET } = await import('../app/api/instagram-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-search?facilityName=テスト&wardName=東区',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe('UNAUTHORIZED');
	});

	it('RT-REQ-01: strategy が不正なら 400 (BAD_REQUEST)', async () => {
		// Given: strategy が不正
		// When: GET を呼ぶ
		// Then: 400 + BAD_REQUEST
		const { GET } = await import('../app/api/instagram-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-search?facilityName=テスト&wardName=東区&strategy=invalid',
			adminToken: 'test-admin-token',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe('BAD_REQUEST');
	});

	it('RT-REQ-02: facilityId も facilityName も無いなら 400 (BAD_REQUEST)', async () => {
		// Given: facilityId / facilityName が無い
		// When: GET を呼ぶ
		// Then: 400 + BAD_REQUEST
		const { GET } = await import('../app/api/instagram-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-search?wardName=東区',
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

		const { GET } = await import('../app/api/instagram-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-search?facilityId=missing',
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

		const { GET } = await import('../app/api/instagram-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-search?facilityId=broken',
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

		const { GET } = await import('../app/api/instagram-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-search?facilityName=テスト&wardName=東区',
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

		const { GET } = await import('../app/api/instagram-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-search?facilityName=テスト&wardName=東区&strategy=rank',
			adminToken: 'test-admin-token',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe('CSE_ERROR');
		expect(body.error.message).toContain('quota');
	});

	it('RT-CSE-02: fetch.ok=false が続くと candidates=[] で返る（maxQueries=2）', async () => {
		// Given: fetch が常に失敗（ok=false）
		// When: GET を呼ぶ
		// Then: 200 で candidates=[]、triedQueries は maxQueries(=2) 件
		fetchMock.mockResolvedValue(
			new Response('upstream error', { status: 503 })
		);

		const { GET } = await import('../app/api/instagram-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-search?facilityName=あおぞらわらばぁ～&wardName=東区&strategy=rank',
			adminToken: 'test-admin-token',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(Array.isArray(body.candidates)).toBe(true);
		expect(body.candidates).toHaveLength(0);
		expect(body.triedQueries).toHaveLength(2);
	});

	it('RT-BND-01: 施設名が短い（<=3）場合は maxQueries=3 まで試す', async () => {
		// Given: 施設名が短い（<=3）
		// When: GET を呼ぶ（fetch.ok=false 継続）
		// Then: triedQueries は 3 件
		fetchMock.mockResolvedValue(new Response('upstream error', { status: 503 }));

		const { GET } = await import('../app/api/instagram-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-search?facilityName=いずみ&wardName=東区&strategy=rank',
			adminToken: 'test-admin-token',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.triedQueries).toHaveLength(3);
	});

	it('RT-N-01: rank 戦略でプロフィールURLのみ候補として返る', async () => {
		// Given: プロフィールURLと投稿URLが混在する items
		// When: GET を呼ぶ
		// Then: 200 でプロフィールURLのみが candidates に含まれる
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					items: [
						{
							link: 'https://www.instagram.com/p/ABC123/',
							title: '投稿',
							snippet: '投稿スニペット',
						},
						{
							link: 'https://www.instagram.com/testuser/',
							title: 'テスト拠点',
							snippet: '名古屋 東区 子育て',
						},
					],
				}),
				{ status: 200 }
			)
		);

		const { GET } = await import('../app/api/instagram-search/route');
		const req = createFakeRequest({
			url: 'http://localhost/api/instagram-search?facilityName=テスト拠点&wardName=東区&strategy=rank',
			adminToken: 'test-admin-token',
		});
		const res = await GET(req as unknown as Parameters<typeof GET>[0]);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.triedQueries).toHaveLength(1);
		expect(body.candidates.length).toBeGreaterThanOrEqual(1);
		expect(body.candidates.every((c: { link: string }) => !c.link.includes('/p/'))).toBe(true);
	});
});

