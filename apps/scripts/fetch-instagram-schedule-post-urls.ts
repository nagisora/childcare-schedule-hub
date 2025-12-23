#!/usr/bin/env tsx
/**
 * 施設×月のInstagram月間スケジュール投稿URLを一括取得し、
 * `schedules.instagram_post_url` を更新する（DRY-RUNデフォルト）。
 *
 * 背景:
 * - フェーズ10: 各施設がInstagramに投稿している月間スケジュール（当月）を自動で特定
 * - Google CSE検索（/api/instagram-schedule-search）で候補を取得し、自動採用/未特定/対象外を判定
 *
 * 使用方法:
 *   - DRY-RUN（デフォルト）: pnpm tsx fetch-instagram-schedule-post-urls.ts
 *   - 更新モード: pnpm tsx fetch-instagram-schedule-post-urls.ts --apply --yes
 *   - 件数制限: pnpm tsx fetch-instagram-schedule-post-urls.ts --limit=3
 *   - 対象月指定: pnpm tsx fetch-instagram-schedule-post-urls.ts --month=2025-12
 *   - APIベースURL指定: pnpm tsx fetch-instagram-schedule-post-urls.ts --api-base-url=http://localhost:3000
 *
 * 注意:
 * - シークレット（APIキー/トークン）は絶対に表示・ログ出力しない。
 * - CSEの課金/無料枠を踏まえ、`--limit` で対象を絞る運用を前提にする。
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../web/.env.local') });

const args = process.argv.slice(2);
const isApply = args.includes('--apply');
const isYes = args.includes('--yes');
const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const limit = limitArg ? Math.max(0, Number(limitArg)) : null;
const monthArg = args.find((a) => a.startsWith('--month='))?.split('=')[1];
const apiBaseUrlArg = args.find((a) => a.startsWith('--api-base-url='))?.split('=')[1];
const apiBaseUrl = apiBaseUrlArg || process.env.WEB_BASE_URL || 'http://localhost:3000';

type FacilityRow = {
	id: string;
	name: string;
	ward_name: string | null;
	instagram_url: string | null;
};

type ScheduleRow = {
	id: string;
	facility_id: string;
	published_month: string;
	instagram_post_url: string | null;
	status: string;
};

type ProcessResult = {
	facility_id: string;
	facility_name: string;
	ward_name: string | null;
	published_month: string;
	status: 'registered' | 'not_found' | 'out_of_scope';
	instagram_post_url?: string | null;
	reason_code?: string;
	reason_description?: string;
	candidates?: string[];
};

type OutputSummary = {
	total_facilities: number;
	processed: number;
	registered: number;
	not_found: number;
	out_of_scope: number;
};

type OutputData = {
	summary: OutputSummary;
	results: ProcessResult[];
};

/**
 * Asia/Tokyoタイムゾーンで現在月を取得（YYYY-MM-01形式）
 */
function getCurrentMonthInTokyo(): string {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'Asia/Tokyo',
		year: 'numeric',
		month: '2-digit',
	}).formatToParts(new Date());

	const year = parts.find((p) => p.type === 'year')?.value;
	const month = parts.find((p) => p.type === 'month')?.value;
	if (!year || !month) throw new Error('Failed to get current month in Asia/Tokyo');

	return `${year}-${month}-01`;
}

/**
 * YYYY-MM形式をYYYY-MM-01形式に正規化
 */
function normalizeMonth(month: string): string {
	const monthPattern = /^(\d{4})-(\d{2})$/;
	const match = month.match(monthPattern);
	if (!match) throw new Error(`Invalid month format: ${month}. Expected YYYY-MM`);

	const [, year, monthNum] = match;
	return `${year}-${monthNum}-01`;
}

/**
 * Instagram投稿URLが妥当形式かチェック
 */
function isValidInstagramPostUrl(url: string | null): boolean {
	if (!url) return false;
	// https://(www.)?instagram.com/(p|reel)/[A-Za-z0-9_-]+/
	const pattern = /^https:\/\/(www\.)?instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+\/?$/;
	return pattern.test(url);
}

/**
 * 理由コードと説明を決定（task-01-spec.md の判定フローに準拠）
 */
function decideStatusAndReason(
	candidates: Array<{ url: string; type: 'p' | 'reel'; matchedMonthHints: string[] }>
): {
	status: 'registered' | 'not_found' | 'out_of_scope';
	reasonCode?: string;
	reasonDescription?: string;
	selectedUrl?: string;
} {
	if (candidates.length === 0) {
		return {
			status: 'not_found',
			reasonCode: 'S10_NOT_FOUND_NO_RESULTS',
			reasonDescription: 'CSE検索で候補が0件',
		};
	}

	// /p/ のみを抽出（/reel/は自動採用しない）
	const pCandidates = candidates.filter((c) => c.type === 'p');
	const reelCandidates = candidates.filter((c) => c.type === 'reel');

	if (pCandidates.length === 0 && reelCandidates.length > 0) {
		// /reel/ のみの場合
		return {
			status: 'not_found',
			reasonCode: 'S10_NOT_FOUND_NEEDS_REVIEW',
			reasonDescription: '/reel/ は自動採用しない方針',
		};
	}

	// 月ヒントがマッチする候補のみを対象（精度向上のため）
	const pCandidatesWithMonthHint = pCandidates.filter((c) => c.matchedMonthHints.length > 0);

	// 月ヒントがマッチする候補が1件のみの場合、自動採用
	if (pCandidatesWithMonthHint.length === 1) {
		return {
			status: 'registered',
			selectedUrl: pCandidatesWithMonthHint[0].url,
		};
	}

	// 月ヒントがマッチする候補が複数ある場合
	if (pCandidatesWithMonthHint.length > 1) {
		return {
			status: 'not_found',
			reasonCode: 'S10_NOT_FOUND_MULTIPLE_CANDIDATES',
			reasonDescription: `候補が${pCandidatesWithMonthHint.length}件あり、自動判定不可（月ヒントマッチ: ${pCandidatesWithMonthHint.length}件、全体: ${pCandidates.length}件）`,
		};
	}

	// 月ヒントがマッチする候補が0件の場合
	if (pCandidatesWithMonthHint.length === 0 && pCandidates.length > 0) {
		return {
			status: 'not_found',
			reasonCode: 'S10_NOT_FOUND_NOT_MONTHLY_SCHEDULE',
			reasonDescription: `候補は${pCandidates.length}件あるが、月ヒントが取れないため月間スケジュールと断定できない`,
		};
	}

	// 候補が0件の場合
	if (pCandidates.length === 0) {
		return {
			status: 'not_found',
			reasonCode: 'S10_NOT_FOUND_NO_RESULTS',
			reasonDescription: 'CSE検索で候補が0件',
		};
	}

	// フォールバック（通常は来ない）
	return {
		status: 'not_found',
		reasonCode: 'S10_NOT_FOUND_NEEDS_REVIEW',
		reasonDescription: '判定不能',
	};
}

/**
 * JSONログファイルを書き出す
 */
function writeLogFile(data: OutputData): string {
	const logsDir = join(__dirname, 'logs');
	mkdirSync(logsDir, { recursive: true });
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, -5);
	const filename = join(logsDir, `schedule-url-coverage-${timestamp}.json`);
	writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');
	return filename;
}

/**
 * Markdownレビューファイルを書き出す
 */
function writeReviewMarkdown(data: OutputData, publishedMonth: string): string {
	const logsDir = join(__dirname, 'logs');
	mkdirSync(logsDir, { recursive: true });
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, -5);
	const filename = join(logsDir, `schedule-url-review-${timestamp}.md`);

	const lines: string[] = [];
	lines.push(`# スケジュールURLカバレッジ結果 (${publishedMonth})`);
	lines.push('');
	lines.push(`- Mode: ${isApply ? 'APPLY' : 'DRY-RUN'}`);
	lines.push(`- 対象月: ${publishedMonth}`);
	lines.push(`- 対象施設数: ${data.summary.total_facilities}`);
	lines.push(`- 処理済み: ${data.summary.processed}`);
	lines.push(`- 登録済み: ${data.summary.registered}`);
	lines.push(`- 未特定確定: ${data.summary.not_found}`);
	lines.push(`- 対象外: ${data.summary.out_of_scope}`);
	lines.push('');

	const registered = data.results.filter((r) => r.status === 'registered');
	const notFound = data.results.filter((r) => r.status === 'not_found');
	const outOfScope = data.results.filter((r) => r.status === 'out_of_scope');

	const pushTable = (title: string, rows: ProcessResult[]) => {
		if (rows.length === 0) return;
		lines.push(`## ${title}`);
		lines.push('');
		lines.push('| 施設名 | 区 | instagram_post_url | 理由コード | 備考 |');
		lines.push('|---|---|---|---|---|');
		for (const r of rows) {
			lines.push(
				`| ${r.facility_name} | ${r.ward_name ?? ''} | ${r.instagram_post_url ?? ''} | ${r.reason_code ?? ''} | ${r.reason_description ?? ''} |`
			);
		}
		lines.push('');
	};

	pushTable('登録済み', registered);
	pushTable('未特定確定', notFound);
	pushTable('対象外', outOfScope);

	writeFileSync(filename, lines.join('\n'), 'utf-8');
	return filename;
}

async function main(): Promise<void> {
	if (isApply && !isYes) {
		throw new Error('--apply mode requires --yes flag for confirmation');
	}

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!supabaseUrl || !supabaseServiceKey) {
		throw new Error(
			'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'
		);
	}
	const supabase = createClient(supabaseUrl, supabaseServiceKey);

	const adminApiToken = process.env.ADMIN_API_TOKEN;
	if (!adminApiToken) {
		throw new Error('ADMIN_API_TOKEN is not configured');
	}

	// 対象月の決定
	const publishedMonth = monthArg ? normalizeMonth(monthArg) : getCurrentMonthInTokyo();
	const monthForApi = publishedMonth.slice(0, 7); // YYYY-MM-01 -> YYYY-MM

	console.log(`[INFO] Target month: ${publishedMonth} (${monthForApi})`);
	console.log(`[INFO] Mode: ${isApply ? 'APPLY' : 'DRY-RUN'}`);

	// 対象施設の取得
	let query = supabase
		.from('facilities')
		.select('id,name,ward_name,instagram_url')
		.not('instagram_url', 'is', null)
		.order('ward_name', { ascending: true })
		.order('name', { ascending: true });

	if (typeof limit === 'number' && Number.isFinite(limit)) {
		query = query.limit(limit);
	}

	const { data: facilities, error: facilitiesError } = await query;
	if (facilitiesError) throw new Error(`Failed to fetch facilities: ${facilitiesError.message}`);

	const facilityRows = (facilities ?? []) as FacilityRow[];
	console.log(`[INFO] Found ${facilityRows.length} facilities with instagram_url`);

	// 既存schedulesの一括取得（全フィールドを取得してバックアップ用に保持）
	const facilityIds = facilityRows.map((f) => f.id);
	const { data: existingSchedules, error: schedulesError } = await supabase
		.from('schedules')
		.select('*')
		.in('facility_id', facilityIds)
		.eq('published_month', publishedMonth)
		.eq('status', 'published');

	if (schedulesError) {
		throw new Error(`Failed to fetch existing schedules: ${schedulesError.message}`);
	}

	const existingSchedulesMap = new Map<string, ScheduleRow>();
	for (const s of (existingSchedules ?? []) as ScheduleRow[]) {
		existingSchedulesMap.set(s.facility_id, s);
	}

	const results: ProcessResult[] = [];

	// 各施設を処理
	for (const facility of facilityRows) {
		// 既存レコードの確認
		const existing = existingSchedulesMap.get(facility.id);
		if (existing && isValidInstagramPostUrl(existing.instagram_post_url)) {
			results.push({
				facility_id: facility.id,
				facility_name: facility.name,
				ward_name: facility.ward_name,
				published_month: publishedMonth,
				status: 'registered',
				instagram_post_url: existing.instagram_post_url,
			});
			continue;
		}

		// API呼び出し
		try {
			const apiUrl = new URL(`${apiBaseUrl}/api/instagram-schedule-search`);
			apiUrl.searchParams.set('facilityId', facility.id);
			apiUrl.searchParams.set('month', monthForApi);

			const response = await fetch(apiUrl.toString(), {
				headers: {
					'x-admin-token': adminApiToken,
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`API error: ${response.status} ${errorText}`);
			}

			const apiData = await response.json();
			const candidates = apiData.candidates || [];

			// 判定
			const decision = decideStatusAndReason(candidates);

			results.push({
				facility_id: facility.id,
				facility_name: facility.name,
				ward_name: facility.ward_name,
				published_month: publishedMonth,
				status: decision.status,
				instagram_post_url: decision.selectedUrl || null,
				reason_code: decision.reasonCode,
				reason_description: decision.reasonDescription,
				candidates: candidates.map((c: { url: string }) => c.url),
			});
		} catch (error) {
			results.push({
				facility_id: facility.id,
				facility_name: facility.name,
				ward_name: facility.ward_name,
				published_month: publishedMonth,
				status: 'not_found',
				reason_code: 'S10_NOT_FOUND_NEEDS_REVIEW',
				reason_description: error instanceof Error ? error.message : String(error),
			});
		}
	}

	// サマリ計算
	const summary: OutputSummary = {
		total_facilities: facilityRows.length,
		processed: results.length,
		registered: results.filter((r) => r.status === 'registered').length,
		not_found: results.filter((r) => r.status === 'not_found').length,
		out_of_scope: results.filter((r) => r.status === 'out_of_scope').length,
	};

	const outputData: OutputData = {
		summary,
		results,
	};

	// UPSERT処理（--apply --yes のときのみ）
	const backupEntries: Array<{
		facility_id: string;
		published_month: string;
		before: ScheduleRow | null;
		after: {
			facility_id: string;
			published_month: string;
			instagram_post_url: string;
			image_url: string;
			status: string;
		};
	}> = [];

	if (isApply) {
		const toUpsert = results.filter((r) => r.status === 'registered' && r.instagram_post_url);
		console.log(`[INFO] Applying ${toUpsert.length} UPSERT operations...`);

		for (const result of toUpsert) {
			const before = existingSchedulesMap.get(result.facility_id) || null;

			// バックアップエントリを記録
			backupEntries.push({
				facility_id: result.facility_id,
				published_month: publishedMonth,
				before: before,
				after: {
					facility_id: result.facility_id,
					published_month: publishedMonth,
					instagram_post_url: result.instagram_post_url!,
					image_url: 'https://example.com/dummy.png', // MVP: ダミーURL
					status: 'published',
				},
			});

			// UPSERT実行
			const { error: upsertError } = await supabase
				.from('schedules')
				.upsert(
					{
						facility_id: result.facility_id,
						published_month: publishedMonth,
						instagram_post_url: result.instagram_post_url!,
						image_url: 'https://example.com/dummy.png', // MVP: ダミーURL
						status: 'published',
						embed_html: null,
						notes: null,
					},
					{
						onConflict: 'facility_id,published_month',
					}
				);

			if (upsertError) {
				console.error(
					`[ERROR] Failed to upsert schedule for facility ${result.facility_id}: ${upsertError.message}`
				);
			}
		}

		// バックアップファイルを保存
		if (backupEntries.length > 0) {
			const logsDir = join(__dirname, 'logs');
			mkdirSync(logsDir, { recursive: true });
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, -5);
			const backupFilename = join(logsDir, `schedules-backup-${timestamp}.json`);
			writeFileSync(
				backupFilename,
				JSON.stringify(
					{
						timestamp: new Date().toISOString(),
						published_month: publishedMonth,
						entries: backupEntries,
					},
					null,
					2
				),
				'utf-8'
			);
			console.log(`[INFO] Backup saved: ${backupFilename}`);
		}
	}

	// ログ出力
	const jsonLog = writeLogFile(outputData);
	const mdLog = writeReviewMarkdown(outputData, publishedMonth);

	console.log(`[INFO] JSON log: ${jsonLog}`);
	console.log(`[INFO] Markdown review: ${mdLog}`);
	console.log(`[INFO] Summary: ${summary.registered} registered, ${summary.not_found} not_found, ${summary.out_of_scope} out_of_scope`);
	console.log(`[INFO] Completed. Mode: ${isApply ? 'APPLY' : 'DRY-RUN'}`);
}

main().catch((e) => {
	console.error('[ERROR] Failed to fetch instagram schedule post URLs:', e);
	process.exit(1);
});

