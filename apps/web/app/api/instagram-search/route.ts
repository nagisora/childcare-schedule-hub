import { NextRequest, NextResponse } from 'next/server';
import { getFacilityById } from '../../../lib/facilities';
import {
	generateSearchQueries,
	processSearchResults,
	processSearchResultsRank,
	processSearchResultsHybrid,
	type Candidate,
} from '../../../lib/instagram-search';

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
	const strategy = searchParams.get('strategy') || 'score';
	
	if (strategy !== 'score' && strategy !== 'rank' && strategy !== 'hybrid') {
		return NextResponse.json(
			{ error: { code: 'BAD_REQUEST', message: 'strategy must be "score", "rank", or "hybrid"' } },
			{ status: 400 }
		);
	}
	
	let targetFacilityName: string;
	let targetWardName: string | null;
	
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
		} catch (error) {
			return NextResponse.json(
				{ error: { code: 'DB_ERROR', message: error instanceof Error ? error.message : 'Failed to fetch facility' } },
				{ status: 500 }
			);
		}
	} else if (facilityName) {
		targetFacilityName = facilityName;
		targetWardName = wardName || null;
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
	
	const queries = generateSearchQueries(targetFacilityName, targetWardName);
	const triedQueries: string[] = [];
	
	const isGenericFacilityName = (targetFacilityName ?? '').trim().length <= 3;
	const maxQueries = isGenericFacilityName ? 3 : 2;

	if (strategy === 'score') {
		const merged = new Map<string, Candidate>();
		const stopScore = 8;
		const stopGap = 2;

		for (const query of queries.slice(0, maxQueries)) {
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
					const candidates = processSearchResults(items, targetFacilityName, targetWardName);
					for (const c of candidates) {
						const existing = merged.get(c.link);
						if (!existing || c.score > existing.score) {
							merged.set(c.link, c);
						}
					}
				}

				const currentCandidates = Array.from(merged.values()).sort((a, b) => b.score - a.score);
				if (currentCandidates.length > 0) {
					const top = currentCandidates[0];
					const second = currentCandidates[1];
					const gap = second ? top.score - second.score : 999;
					if (top.score >= stopScore && gap >= stopGap) {
						break;
					}
				}
			} catch {
				triedQueries.push(query);
				continue;
			}
		}

		const candidates = Array.from(merged.values()).sort((a, b) => b.score - a.score);
		return NextResponse.json({
			candidates,
			triedQueries,
		});
	} else if (strategy === 'rank') {
		const candidates: Candidate[] = [];

		for (const query of queries.slice(0, maxQueries)) {
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
					const rankCandidates = processSearchResultsRank(items, targetFacilityName, targetWardName, 3);
					candidates.push(...rankCandidates);
					
					if (candidates.length > 0) {
						break;
					}
				}
			} catch {
				triedQueries.push(query);
				continue;
			}
		}

		return NextResponse.json({
			candidates,
			triedQueries,
		});
	} else {
		const candidates: Candidate[] = [];

		for (const query of queries.slice(0, maxQueries)) {
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
					const hybridCandidates = processSearchResultsHybrid(items, targetFacilityName, targetWardName, 10);
					candidates.push(...hybridCandidates);
					
					if (candidates.length > 0) {
						break;
					}
				}
			} catch {
				triedQueries.push(query);
				continue;
			}
		}

		return NextResponse.json({
			candidates,
			triedQueries,
		});
	}

}

