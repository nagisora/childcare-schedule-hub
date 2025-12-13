import { NextRequest, NextResponse } from 'next/server';
import { getFacilityById } from '../../../lib/facilities';
import {
	generateSearchQueries,
	processSearchResults,
	type Candidate,
} from '../../../lib/instagram-search';

/**
 * Instagram検索API（サーバーサイド）
 * Google Custom Search API を使用してInstagramアカウントを検索し、候補を返す
 * 
 * 参照: docs/05-09-instagram-account-url-coverage.md（タスク4）
 * 参照: docs/instagram-integration/03-design-decisions.md（検索クエリ設計と判定ルール）
 * 
 * 認証: x-admin-token ヘッダーで ADMIN_API_TOKEN を検証（必須）
 * 入力: facilityId（優先）または facilityName + wardName
 * 出力: { candidates: Candidate[], triedQueries: string[] } または { error: { code, message } }
 */
export async function GET(request: NextRequest) {
	// 認証チェック: x-admin-token ヘッダー
	const adminToken = request.headers.get('x-admin-token');
	const expectedToken = process.env.ADMIN_API_TOKEN;
	
	if (!expectedToken) {
		// 環境変数が未設定の場合は500を返す（設定ミスを明示）
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
	
	// 入力パラメータの取得
	const searchParams = request.nextUrl.searchParams;
	const facilityId = searchParams.get('facilityId');
	const facilityName = searchParams.get('facilityName');
	const wardName = searchParams.get('wardName');
	
	// facilityId または facilityName + wardName のいずれかが必要
	let targetFacilityName: string;
	let targetWardName: string | null;
	
	if (facilityId) {
		// facilityId から施設情報を取得
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
	
	// Google CSE の環境変数チェック
	const apiKey = process.env.GOOGLE_CSE_API_KEY;
	const cx = process.env.GOOGLE_CSE_CX;
	
	if (!apiKey || !cx) {
		return NextResponse.json(
			{ error: { code: 'CONFIG_ERROR', message: 'GOOGLE_CSE_API_KEY or GOOGLE_CSE_CX is not configured' } },
			{ status: 500 }
		);
	}
	
	// 検索クエリの生成（優先順位順）
	const queries = generateSearchQueries(targetFacilityName, targetWardName);
	const triedQueries: string[] = [];

	// 各クエリを順番に試行し、候補を統合（取りこぼし防止）
	const merged = new Map<string, Candidate>();
	for (const query of queries) {
		try {
			// Google Custom Search API を呼び出す
			// 注意: URLに key= を含むため、フルURLをログ出力しない（ステータス/件数のみ）
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
				// HTTPエラーの場合は次のクエリを試す
				triedQueries.push(query);
				continue;
			}
			
			const data = await response.json();
			
			// エラーレスポンスのチェック
			if (data.error) {
				// APIエラー（レート制限など）の場合はエラーを返す
				return NextResponse.json(
					{ error: { code: 'CSE_ERROR', message: data.error.message || 'Google CSE API error' } },
					{ status: 500 }
				);
			}
			
			// 検索結果の処理
			const items = data.items || [];
			triedQueries.push(query);
			
			// 候補が見つかった場合は正規化・スコアリングして統合
			if (items.length > 0) {
				const candidates = processSearchResults(items, targetFacilityName, targetWardName);
				for (const c of candidates) {
					const existing = merged.get(c.link);
					if (!existing || c.score > existing.score) {
						merged.set(c.link, c);
					}
				}
			}

			// 次のクエリも試す（クエリごとの偏りを吸収する）
		} catch (error) {
			// ネットワークエラーなどの場合は次のクエリを試す
			triedQueries.push(query);
			continue;
		}
	}

	// すべてのクエリを試した結果を返す
	const candidates = Array.from(merged.values()).sort((a, b) => b.score - a.score);
	return NextResponse.json({
		candidates,
		triedQueries,
	});

}

