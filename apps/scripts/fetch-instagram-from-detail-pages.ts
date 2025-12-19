#!/usr/bin/env tsx
/**
 * 名古屋市子育てサイトの「詳細ページ（detail_page_url）」から Instagram URL を抽出し、
 * `facilities.instagram_url` を更新する（一次ソース優先）。
 *
 * 背景:
 * - Google CSE検索（/api/instagram-search）より、自治体ページの明示リンクがあれば精度が高く無駄が少ない。
 * - 取得できない分は、別途 CSE 検索で補完する。
 *
 * 使用方法:
 *   - DRY-RUN（デフォルト）: pnpm tsx fetch-instagram-from-detail-pages.ts
 *   - 更新モード: pnpm tsx fetch-instagram-from-detail-pages.ts --apply --yes
 *   - 件数制限: pnpm tsx fetch-instagram-from-detail-pages.ts --limit=20
 *
 * 注意:
 * - 名古屋市サイトへのアクセスはスクレイピングガイドラインに準拠し、リクエスト間隔を空ける。
 * - シークレット（APIキー/トークン）は絶対に表示・ログ出力しない。
 */

import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

/**
 * Instagram URLを正規化する（apps/web/lib/instagram-search.ts からコピー）
 * - http → https
 * - m.instagram.com → www.instagram.com
 * - 末尾に / を付与
 * - クエリパラメータ・フラグメントを除去
 */
function normalizeInstagramUrl(url: string): string | null {
	if (!url || typeof url !== 'string') {
		return null;
	}
	const excludedPatterns = [/\/p\//, /\/reel\//, /\/tv\//, /\/stories\//];
	for (const pattern of excludedPatterns) {
		if (pattern.test(url)) return null;
	}
	try {
		const urlObj = new URL(url);
		if (!urlObj.hostname.includes('instagram.com')) return null;
		urlObj.search = '';
		urlObj.hash = '';
		if (urlObj.protocol === 'http:') urlObj.protocol = 'https:';
		if (urlObj.hostname === 'm.instagram.com') urlObj.hostname = 'www.instagram.com';
		const rawPath = urlObj.pathname || '/';
		const segments = rawPath.split('/').filter(Boolean);
		if (segments.length !== 1) return null;
		const username = segments[0];
		const disallowedFirstSegments = new Set(['explore', 'about', 'accounts', 'direct', 'reels', 'stories']);
		if (disallowedFirstSegments.has(username.toLowerCase())) return null;
		urlObj.pathname = `/${username}/`;
		return urlObj.toString();
	} catch {
		return null;
	}
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../web/.env.local') });

const args = process.argv.slice(2);
const isApply = args.includes('--apply');
const isYes = args.includes('--yes');
const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const limit = limitArg ? Math.max(0, Number(limitArg)) : null;

// スクレイピングガイドラインに準拠（最低1秒間隔）
const REQUEST_INTERVAL_MS = 1100;
const MAX_RETRIES = 3;
const BACKOFF_DELAYS_MS = [500, 1000, 2000];

type FacilityRow = {
	id: string;
	name: string;
	ward_name: string | null;
	detail_page_url: string | null;
	instagram_url: string | null;
};

type DetailScanResult = {
	facilityId: string;
	facilityName: string;
	wardName: string | null;
	detailPageUrl: string;
	foundInstagramUrls: string[];
	normalizedInstagramUrl: string | null;
	reason:
		| 'no_detail_page_url'
		| 'fetch_failed'
		| 'no_instagram_link'
		| 'invalid_instagram_link'
		| 'multiple_instagram_links'
		| 'ok_single'
		| 'updated'
		| 'dry_run';
	errorMessage?: string;
};

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtmlWithRetry(url: string, retryCount = 0): Promise<string> {
	try {
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'ChildcareScheduleHub/1.0 (+https://childcare-schedule-hub.example.com)',
			},
		});
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} ${response.statusText}`);
		}
		return await response.text();
	} catch (error) {
		if (retryCount < MAX_RETRIES) {
			const delay = BACKOFF_DELAYS_MS[retryCount] ?? 2000;
			await sleep(delay);
			return fetchHtmlWithRetry(url, retryCount + 1);
		}
		throw error;
	}
}

function extractInstagramLinksFromDetailHtml(html: string): { raw: string[]; normalized: string[] } {
	const $ = cheerio.load(html);
	const rawLinks = new Set<string>();
	$('a[href]').each((_, el) => {
		const href = $(el).attr('href');
		if (!href) return;
		if (!href.includes('instagram.com')) return;
		rawLinks.add(href);
	});

	const normalizedLinks = new Set<string>();
	for (const raw of rawLinks) {
		const normalized = normalizeInstagramUrl(raw);
		if (normalized) normalizedLinks.add(normalized);
	}

	return { raw: Array.from(rawLinks), normalized: Array.from(normalizedLinks) };
}

function writeLogFile(results: DetailScanResult[]): string {
	const logsDir = join(__dirname, 'logs');
	mkdirSync(logsDir, { recursive: true });
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, -5);
	const filename = join(logsDir, `instagram-detail-scan-${timestamp}.json`);
	writeFileSync(
		filename,
		JSON.stringify(
			{
				timestamp: new Date().toISOString(),
				isDryRun: !isApply,
				limit,
				results,
			},
			null,
			2
		),
		'utf-8'
	);
	return filename;
}

function writeReviewMarkdown(results: DetailScanResult[]): string {
	const logsDir = join(__dirname, 'logs');
	mkdirSync(logsDir, { recursive: true });
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, -5);
	const filename = join(logsDir, `instagram-detail-review-${timestamp}.md`);

	const ok = results.filter((r) => r.reason === 'updated' || r.reason === 'dry_run' || r.reason === 'ok_single');
	const needsReview = results.filter((r) => r.reason === 'multiple_instagram_links');
	const notFound = results.filter((r) => r.reason === 'no_instagram_link' || r.reason === 'invalid_instagram_link');
	const failed = results.filter((r) => r.reason === 'fetch_failed');

	const lines: string[] = [];
	lines.push(`# Instagram detail page scan review (${new Date().toISOString()})`);
	lines.push('');
	lines.push(`- Mode: ${isApply ? 'APPLY' : 'DRY-RUN'}`);
	lines.push(`- Total: ${results.length}`);
	lines.push(`- Found (single): ${ok.length}`);
	lines.push(`- Multiple links (needs review): ${needsReview.length}`);
	lines.push(`- Not found: ${notFound.length}`);
	lines.push(`- Fetch failed: ${failed.length}`);
	lines.push('');

	const pushTable = (title: string, rows: DetailScanResult[]) => {
		lines.push(`## ${title}`);
		lines.push('');
		lines.push('| 施設名 | 区 | detail_page_url | instagram_url | 備考 |');
		lines.push('|---|---|---|---|---|');
		for (const r of rows) {
			lines.push(
				`| ${r.facilityName} | ${r.wardName ?? ''} | ${r.detailPageUrl} | ${r.normalizedInstagramUrl ?? ''} | ${r.reason}${r.errorMessage ? ` (${r.errorMessage})` : ''} |`
			);
		}
		lines.push('');
	};

	pushTable('Single found (ok)', ok);
	pushTable('Multiple links (needs review)', needsReview);
	pushTable('Not found', notFound);
	pushTable('Fetch failed', failed);

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
		throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
	}
	const supabase = createClient(supabaseUrl, supabaseServiceKey);

	let query = supabase
		.from('facilities')
		.select('id,name,ward_name,detail_page_url,instagram_url')
		.is('instagram_url', null)
		.not('detail_page_url', 'is', null)
		.like('detail_page_url', 'https://www.kosodate.city.nagoya.jp/%')
		.order('ward_name', { ascending: true })
		.order('name', { ascending: true });

	if (typeof limit === 'number' && Number.isFinite(limit)) {
		query = query.limit(limit);
	}

	const { data, error } = await query;
	if (error) throw new Error(`Failed to fetch facilities: ${error.message}`);

	const facilities = (data ?? []) as FacilityRow[];
	const results: DetailScanResult[] = [];

	for (const facility of facilities) {
		if (!facility.detail_page_url) {
			results.push({
				facilityId: facility.id,
				facilityName: facility.name,
				wardName: facility.ward_name,
				detailPageUrl: '',
				foundInstagramUrls: [],
				normalizedInstagramUrl: null,
				reason: 'no_detail_page_url',
			});
			continue;
		}

		const detailUrl = facility.detail_page_url;
		try {
			const html = await fetchHtmlWithRetry(detailUrl);
			const { raw, normalized } = extractInstagramLinksFromDetailHtml(html);

			if (normalized.length === 0) {
				results.push({
					facilityId: facility.id,
					facilityName: facility.name,
					wardName: facility.ward_name,
					detailPageUrl: detailUrl,
					foundInstagramUrls: raw,
					normalizedInstagramUrl: null,
					reason: raw.length === 0 ? 'no_instagram_link' : 'invalid_instagram_link',
				});
			} else if (normalized.length > 1) {
				results.push({
					facilityId: facility.id,
					facilityName: facility.name,
					wardName: facility.ward_name,
					detailPageUrl: detailUrl,
					foundInstagramUrls: normalized,
					normalizedInstagramUrl: null,
					reason: 'multiple_instagram_links',
				});
			} else {
				const instagramUrl = normalized[0] ?? null;
				if (isApply && instagramUrl) {
					const { error: updateError } = await supabase
						.from('facilities')
						.update({ instagram_url: instagramUrl })
						.eq('id', facility.id);
					if (updateError) throw new Error(`update failed: ${updateError.message}`);
					results.push({
						facilityId: facility.id,
						facilityName: facility.name,
						wardName: facility.ward_name,
						detailPageUrl: detailUrl,
						foundInstagramUrls: raw,
						normalizedInstagramUrl: instagramUrl,
						reason: 'updated',
					});
				} else {
					results.push({
						facilityId: facility.id,
						facilityName: facility.name,
						wardName: facility.ward_name,
						detailPageUrl: detailUrl,
						foundInstagramUrls: raw,
						normalizedInstagramUrl: instagramUrl,
						reason: 'dry_run',
					});
				}
			}
		} catch (e) {
			results.push({
				facilityId: facility.id,
				facilityName: facility.name,
				wardName: facility.ward_name,
				detailPageUrl: detailUrl,
				foundInstagramUrls: [],
				normalizedInstagramUrl: null,
				reason: 'fetch_failed',
				errorMessage: e instanceof Error ? e.message : String(e),
			});
		}

		// アクセス間隔を空ける（ガイドライン準拠）
		await sleep(REQUEST_INTERVAL_MS);
	}

	const jsonLog = writeLogFile(results);
	const mdLog = writeReviewMarkdown(results);

	console.log(`[INFO] Detail scan log: ${jsonLog}`);
	console.log(`[INFO] Detail scan review: ${mdLog}`);
	console.log(`[INFO] Completed. Mode: ${isApply ? 'APPLY' : 'DRY-RUN'}`);
}

main().catch((e) => {
	console.error('[ERROR] Failed to fetch instagram from detail pages:', e);
	process.exit(1);
});
