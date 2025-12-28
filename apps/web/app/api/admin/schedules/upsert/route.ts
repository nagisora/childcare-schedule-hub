import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getMonthFirstDay } from '../../../../../lib/date-utils';
import { createSupabaseAdminClient } from '../../../../../lib/supabase-admin';

type UpsertScheduleRequestBody = {
	facility_id?: unknown;
	month?: unknown; // YYYY-MM
	instagram_post_url?: unknown;
	notes?: unknown;
};

function jsonError(status: number, code: string, message: string) {
	return NextResponse.json({ error: { code, message } }, { status });
}

function isUuid(value: string): boolean {
	// RFC4122 v1-v5 を許容（実運用上はこれで十分）
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseMonthYYYYMM(value: string): { year: number; month: number } | null {
	const m = /^(\d{4})-(\d{2})$/.exec(value);
	if (!m) return null;
	const year = Number(m[1]);
	const month = Number(m[2]);
	if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
	if (month < 1 || month > 12) return null;
	return { year, month };
}

function normalizeInstagramPostUrl(value: string): string | null {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return null;
	}

	if (url.protocol !== 'https:') return null;

	const hostname = url.hostname.toLowerCase();
	if (hostname !== 'www.instagram.com' && hostname !== 'instagram.com') return null;

	const segments = url.pathname.split('/').filter(Boolean);
	// 期待: /p/<code>/ または /reel/<code>/
	if (segments.length !== 2) return null;
	const [kind, code] = segments;
	if (kind !== 'p' && kind !== 'reel') return null;
	if (!code || !/^[A-Za-z0-9_-]+$/.test(code)) return null;

	// 正規化: www + trailing slash
	return `https://www.instagram.com/${kind}/${code}/`;
}

export async function POST(request: NextRequest) {
	let body: UpsertScheduleRequestBody;
	try {
		body = (await request.json()) as UpsertScheduleRequestBody;
	} catch {
		return jsonError(400, 'BAD_REQUEST', 'Request body must be valid JSON');
	}

	const facilityId = typeof body.facility_id === 'string' ? body.facility_id.trim() : '';
	if (!facilityId || !isUuid(facilityId)) {
		return jsonError(400, 'BAD_REQUEST', 'facility_id must be a valid UUID');
	}

	const monthRaw = typeof body.month === 'string' ? body.month.trim() : '';
	const parsedMonth = monthRaw ? parseMonthYYYYMM(monthRaw) : null;
	if (!parsedMonth) {
		return jsonError(400, 'BAD_REQUEST', 'month must be in YYYY-MM format');
	}

	const urlRaw = typeof body.instagram_post_url === 'string' ? body.instagram_post_url.trim() : '';
	const instagramPostUrl = urlRaw ? normalizeInstagramPostUrl(urlRaw) : null;
	if (!instagramPostUrl) {
		return jsonError(
			400,
			'BAD_REQUEST',
			'instagram_post_url must be a valid Instagram post URL (https://www.instagram.com/p/.../ or /reel/.../)'
		);
	}

	const notes = typeof body.notes === 'string' ? body.notes : null;

	const publishedMonth = getMonthFirstDay(parsedMonth.year, parsedMonth.month);

	try {
		const supabaseAdmin = createSupabaseAdminClient();
		const imageUrl = instagramPostUrl; // 既存データにも合わせて、まずは投稿URLで埋める

		const { data, error } = await supabaseAdmin
			.from('schedules')
			.upsert(
				{
					facility_id: facilityId,
					published_month: publishedMonth,
					instagram_post_url: instagramPostUrl,
					image_url: imageUrl,
					status: 'published',
					notes,
				},
				{ onConflict: 'facility_id,published_month' }
			)
			.select('*')
			.single();

		if (error) {
			return jsonError(500, 'DB_ERROR', error.message);
		}

		// 将来サーバー側で schedules をキャッシュする場合に備えて保険で入れる（現状は主にクライアント直fetch）
		revalidateTag('schedules');

		return NextResponse.json({ schedule: data }, { status: 200 });
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unexpected error';
		return jsonError(500, 'INTERNAL_ERROR', message);
	}
}


