import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/supabase-admin', () => {
	return {
		createSupabaseAdminClient: vi.fn(),
	};
});

vi.mock('next/cache', () => {
	return {
		revalidateTag: vi.fn(),
	};
});

function createFakeRequest(params: { jsonImpl: () => Promise<unknown> }): { json: () => Promise<unknown> } {
	return {
		json: params.jsonImpl,
	};
}

describe('POST /api/admin/schedules/upsert (Route Handler)', () => {
	const originalEnv: Partial<Record<string, string | undefined>> = {};

	beforeEach(() => {
		originalEnv.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
		originalEnv.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
		process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
	});

	afterEach(() => {
		for (const [k, v] of Object.entries(originalEnv)) {
			if (v === undefined) {
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete process.env[k];
			} else {
				process.env[k] = v;
			}
		}
		vi.clearAllMocks();
	});

	it('TC-A-01: bodyがJSONでないなら 400 (BAD_REQUEST)', async () => {
		// Given: request.json が例外を投げる
		// When: POST を呼ぶ
		// Then: 400 + BAD_REQUEST
		const { POST } = await import('../app/api/admin/schedules/upsert/route');
		const req = createFakeRequest({
			jsonImpl: async () => {
				throw new Error('invalid json');
			},
		});
		const res = await POST(req as unknown as Parameters<typeof POST>[0]);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe('BAD_REQUEST');
	});

	it('TC-A-02: facility_id がUUIDでないなら 400', async () => {
		// Given: facility_id が不正
		// When: POST を呼ぶ
		// Then: 400
		const { POST } = await import('../app/api/admin/schedules/upsert/route');
		const req = createFakeRequest({
			jsonImpl: async () => ({
				facility_id: 'not-a-uuid',
				month: '2025-12',
				instagram_post_url: 'https://www.instagram.com/p/POST123/',
			}),
		});
		const res = await POST(req as unknown as Parameters<typeof POST>[0]);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe('BAD_REQUEST');
		expect(body.error.message).toContain('facility_id');
	});

	it('TC-A-03: month が空なら 400', async () => {
		// Given: month が欠如
		// When: POST を呼ぶ
		// Then: 400
		const { POST } = await import('../app/api/admin/schedules/upsert/route');
		const req = createFakeRequest({
			jsonImpl: async () => ({
				facility_id: '11111111-1111-4111-8111-111111111111',
				instagram_post_url: 'https://www.instagram.com/p/POST123/',
			}),
		});
		const res = await POST(req as unknown as Parameters<typeof POST>[0]);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe('BAD_REQUEST');
		expect(body.error.message).toContain('month');
	});

	it('TC-A-04: month が YYYY-MM 形式でないなら 400', async () => {
		// Given: month が不正形式
		// When: POST を呼ぶ
		// Then: 400
		const { POST } = await import('../app/api/admin/schedules/upsert/route');
		const req = createFakeRequest({
			jsonImpl: async () => ({
				facility_id: '11111111-1111-4111-8111-111111111111',
				month: '2025/12',
				instagram_post_url: 'https://www.instagram.com/p/POST123/',
			}),
		});
		const res = await POST(req as unknown as Parameters<typeof POST>[0]);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe('BAD_REQUEST');
		expect(body.error.message).toContain('YYYY-MM');
	});

	it('TC-A-05: month が範囲外 (00) なら 400', async () => {
		// Given: month が 00
		// When: POST を呼ぶ
		// Then: 400
		const { POST } = await import('../app/api/admin/schedules/upsert/route');
		const req = createFakeRequest({
			jsonImpl: async () => ({
				facility_id: '11111111-1111-4111-8111-111111111111',
				month: '2025-00',
				instagram_post_url: 'https://www.instagram.com/p/POST123/',
			}),
		});
		const res = await POST(req as unknown as Parameters<typeof POST>[0]);

		expect(res.status).toBe(400);
	});

	it('TC-A-05b: month が範囲外 (13) なら 400', async () => {
		// Given: month が 13
		// When: POST を呼ぶ
		// Then: 400
		const { POST } = await import('../app/api/admin/schedules/upsert/route');
		const req = createFakeRequest({
			jsonImpl: async () => ({
				facility_id: '11111111-1111-4111-8111-111111111111',
				month: '2025-13',
				instagram_post_url: 'https://www.instagram.com/p/POST123/',
			}),
		});
		const res = await POST(req as unknown as Parameters<typeof POST>[0]);

		expect(res.status).toBe(400);
	});

	it('TC-A-06: instagram_post_url が非instagramドメインなら 400', async () => {
		// Given: 非instagramドメイン
		// When: POST を呼ぶ
		// Then: 400
		const { POST } = await import('../app/api/admin/schedules/upsert/route');
		const req = createFakeRequest({
			jsonImpl: async () => ({
				facility_id: '11111111-1111-4111-8111-111111111111',
				month: '2025-12',
				instagram_post_url: 'https://example.com/p/POST123/',
			}),
		});
		const res = await POST(req as unknown as Parameters<typeof POST>[0]);

		expect(res.status).toBe(400);
	});

	it('TC-N-03: instagram_post_url に query/hash が付いていても正規化して 200', async () => {
		// Given: ?query / #hash が付与されている（スマホの「リンクをコピー」で発生しがち）
		// When: POST を呼ぶ
		// Then: 200 で保存URLはクエリ/フラグメント無しに正規化される
		const { createSupabaseAdminClient } = await import('../lib/supabase-admin');
		const { revalidateTag } = await import('next/cache');

		const supabaseFromMock = vi.fn();
		vi.mocked(createSupabaseAdminClient).mockReturnValue({ from: supabaseFromMock } as any);

		const singleMock = vi.fn().mockResolvedValue({
			data: {
				id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
				facility_id: '11111111-1111-4111-8111-111111111111',
				image_url: 'https://www.instagram.com/p/POST123/',
				instagram_post_url: 'https://www.instagram.com/p/POST123/',
				embed_html: null,
				published_month: '2025-12-01',
				status: 'published',
				notes: null,
			},
			error: null,
		});
		const selectMock = vi.fn().mockReturnValue({ single: singleMock });
		const upsertMock = vi.fn().mockReturnValue({ select: selectMock });
		supabaseFromMock.mockReturnValue({ upsert: upsertMock });

		const { POST } = await import('../app/api/admin/schedules/upsert/route');
		const req = createFakeRequest({
			jsonImpl: async () => ({
				facility_id: '11111111-1111-4111-8111-111111111111',
				month: '2025-12',
				instagram_post_url: 'https://www.instagram.com/p/POST123/?utm_source=x#frag',
			}),
		});
		const res = await POST(req as unknown as Parameters<typeof POST>[0]);

		expect(res.status).toBe(200);

		expect(upsertMock).toHaveBeenCalledTimes(1);
		const [payload] = upsertMock.mock.calls[0];
		expect(payload.instagram_post_url).toBe('https://www.instagram.com/p/POST123/');
		expect(payload.image_url).toBe('https://www.instagram.com/p/POST123/');
		expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith('schedules');
	});

	it('TC-A-08: instagram_post_url のパスが想定外なら 400', async () => {
		// Given: セグメント過多
		// When: POST を呼ぶ
		// Then: 400
		const { POST } = await import('../app/api/admin/schedules/upsert/route');
		const req = createFakeRequest({
			jsonImpl: async () => ({
				facility_id: '11111111-1111-4111-8111-111111111111',
				month: '2025-12',
				instagram_post_url: 'https://www.instagram.com/p/POST123/extra/',
			}),
		});
		const res = await POST(req as unknown as Parameters<typeof POST>[0]);

		expect(res.status).toBe(400);
	});

	it('TC-A-09: Supabaseがerrorを返すなら 500 (DB_ERROR)', async () => {
		// Given: Supabase upsert が error を返す
		// When: POST を呼ぶ
		// Then: 500 + DB_ERROR
		const { createSupabaseAdminClient } = await import('../lib/supabase-admin');
		const supabaseFromMock = vi.fn();
		vi.mocked(createSupabaseAdminClient).mockReturnValue({ from: supabaseFromMock } as any);

		const singleMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'db boom' } });
		const selectMock = vi.fn().mockReturnValue({ single: singleMock });
		const upsertMock = vi.fn().mockReturnValue({ select: selectMock });
		supabaseFromMock.mockReturnValue({ upsert: upsertMock });

		const { POST } = await import('../app/api/admin/schedules/upsert/route');
		const req = createFakeRequest({
			jsonImpl: async () => ({
				facility_id: '11111111-1111-4111-8111-111111111111',
				month: '2025-12',
				instagram_post_url: 'https://www.instagram.com/p/POST123/',
			}),
		});
		const res = await POST(req as unknown as Parameters<typeof POST>[0]);

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe('DB_ERROR');
		expect(body.error.message).toContain('db boom');
	});

	it('TC-N-01: 正常なら 200 + schedule を返し、URLが正規化される', async () => {
		// Given: Supabase upsert が成功する
		// When: POST を呼ぶ
		// Then: 200、published_month=YYYY-MM-01、image_url が instagram_post_url と同値
		const { createSupabaseAdminClient } = await import('../lib/supabase-admin');
		const { revalidateTag } = await import('next/cache');

		const supabaseFromMock = vi.fn();
		vi.mocked(createSupabaseAdminClient).mockReturnValue({ from: supabaseFromMock } as any);

		const fakeSchedule = {
			id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
			facility_id: '11111111-1111-4111-8111-111111111111',
			image_url: 'https://www.instagram.com/p/POST123/',
			instagram_post_url: 'https://www.instagram.com/p/POST123/',
			embed_html: null,
			published_month: '2025-12-01',
			status: 'published',
			notes: null,
		};

		const singleMock = vi.fn().mockResolvedValue({ data: fakeSchedule, error: null });
		const selectMock = vi.fn().mockReturnValue({ single: singleMock });
		const upsertMock = vi.fn().mockReturnValue({ select: selectMock });
		supabaseFromMock.mockReturnValue({ upsert: upsertMock });

		const { POST } = await import('../app/api/admin/schedules/upsert/route');
		const req = createFakeRequest({
			jsonImpl: async () => ({
				facility_id: fakeSchedule.facility_id,
				month: '2025-12',
				instagram_post_url: 'https://instagram.com/p/POST123', // www無し・末尾スラ無し
				notes: null,
			}),
		});
		const res = await POST(req as unknown as Parameters<typeof POST>[0]);

		expect(res.status).toBe(200);

		// upsert の payload が正規化されていること
		expect(upsertMock).toHaveBeenCalledTimes(1);
		const [payload, options] = upsertMock.mock.calls[0];
		expect(options).toEqual({ onConflict: 'facility_id,published_month' });
		expect(payload.published_month).toBe('2025-12-01');
		expect(payload.instagram_post_url).toBe('https://www.instagram.com/p/POST123/');
		expect(payload.image_url).toBe('https://www.instagram.com/p/POST123/');

		// revalidateTag が呼ばれること
		expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith('schedules');

		const body = await res.json();
		expect(body.schedule).toBeDefined();
	});
});


