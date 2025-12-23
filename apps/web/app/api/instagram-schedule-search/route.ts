import { NextRequest, NextResponse } from 'next/server';
import { getFacilityById } from '../../../lib/facilities';
import {
	generateScheduleSearchQueries,
	extractScheduleCandidates,
	extractInstagramUsername,
	type ScheduleCandidate,
} from '../../../lib/instagram-schedule-search';

export async function GET(request: NextRequest) {
	const adminToken = request.headers.get('x-admin-token');
	const expectedToken = process.env.ADMIN_API_TOKEN;

	if (!expectedToken) {
		return NextResponse.json(
			{ error: { code: 'CONFIG_ERROR', message: 'ADMIN_API_TOKEN is not configured' } },
			{ status: 500 }
		);
	}

	if (!adminToken || adminToken !== expectedToken) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing x-admin-token header' } },
			{ status: 401 }
		);
	}

	const searchParams = request.nextUrl.searchParams;
	const facilityId = searchParams.get('facilityId');
	const facilityName = searchParams.get('facilityName');
	const wardName = searchParams.get('wardName');
	const instagramUrl = searchParams.get('instagramUrl');
	const month = searchParams.get('month');

	// monthは必須
	if (!month) {
		return NextResponse.json(
			{ error: { code: 'BAD_REQUEST', message: 'month parameter is required (YYYY-MM format)' } },
			{ status: 400 }
		);
	}

	// month形式のバリデーション
	const monthPattern = /^\d{4}-\d{2}$/;
	if (!monthPattern.test(month)) {
		return NextResponse.json(
			{ error: { code: 'BAD_REQUEST', message: 'month must be in YYYY-MM format' } },
			{ status: 400 }
		);
	}

	let targetFacilityName: string;
	let targetWardName: string | null;
	let targetInstagramUrl: string | null;

	if (facilityId) {
		try {
			const facility = await getFacilityById(facilityId);
			if (!facility) {
				return NextResponse.json(
					{ error: { code: 'NOT_FOUND', message: `Facility with id ${facilityId} not found` } },
					{ status: 404 }
				);
			}
			targetFacilityName = facility.name;
			targetWardName = facility.ward_name;
			targetInstagramUrl = facility.instagram_url;
		} catch (error) {
			return NextResponse.json(
				{ error: { code: 'DB_ERROR', message: error instanceof Error ? error.message : 'Failed to fetch facility' } },
				{ status: 500 }
			);
		}
	} else if (facilityName) {
		targetFacilityName = facilityName;
		targetWardName = wardName || null;
		targetInstagramUrl = instagramUrl || null;
	} else {
		return NextResponse.json(
			{ error: { code: 'BAD_REQUEST', message: 'Either facilityId or facilityName must be provided' } },
			{ status: 400 }
		);
	}

	const apiKey = process.env.GOOGLE_CSE_API_KEY;
	const cx = process.env.GOOGLE_CSE_CX;

	if (!apiKey || !cx) {
		return NextResponse.json(
			{ error: { code: 'CONFIG_ERROR', message: 'GOOGLE_CSE_API_KEY or GOOGLE_CSE_CX is not configured' } },
			{ status: 500 }
		);
	}

	// Instagram usernameを抽出
	const instagramUsername = extractInstagramUsername(targetInstagramUrl);

	// クエリ生成
	const queries = generateScheduleSearchQueries(
		targetFacilityName,
		targetWardName,
		instagramUsername,
		month
	);

	const triedQueries: string[] = [];
	const allCandidates: ScheduleCandidate[] = [];
	const seenUrls = new Set<string>();

	// 最大4クエリまで実行
	for (const query of queries.slice(0, 4)) {
		try {
			const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
			searchUrl.searchParams.set('key', apiKey);
			searchUrl.searchParams.set('cx', cx);
			searchUrl.searchParams.set('q', query);
			searchUrl.searchParams.set('num', '10');
			searchUrl.searchParams.set('hl', 'ja');
			searchUrl.searchParams.set('gl', 'jp');

			const response = await fetch(searchUrl.toString(), {
				method: 'GET',
				headers: {
					'User-Agent': 'ChildcareScheduleHub/1.0',
				},
			});

			if (!response.ok) {
				triedQueries.push(query);
				continue;
			}

			const data = await response.json();

			if (data.error) {
				return NextResponse.json(
					{ error: { code: 'CSE_ERROR', message: data.error.message || 'Google CSE API error' } },
					{ status: 500 }
				);
			}

			const items = data.items || [];
			triedQueries.push(query);

			if (items.length > 0) {
				const candidates = extractScheduleCandidates(items, month);
				for (const candidate of candidates) {
					// 重複排除（複数クエリで同じURLが出てくる可能性がある）
					if (!seenUrls.has(candidate.url)) {
						seenUrls.add(candidate.url);
						allCandidates.push(candidate);
					}
				}
			}
		} catch (error) {
			triedQueries.push(query);
			// 個別クエリのエラーは続行（他のクエリで成功する可能性がある）
			continue;
		}
	}

	// /p/ を先頭に並べ替え（既にextractScheduleCandidatesで並べ替え済みだが、念のため）
	allCandidates.sort((a, b) => {
		if (a.type === 'p' && b.type === 'reel') return -1;
		if (a.type === 'reel' && b.type === 'p') return 1;
		return 0;
	});

	return NextResponse.json({
		candidates: allCandidates,
		triedQueries,
	});
}

