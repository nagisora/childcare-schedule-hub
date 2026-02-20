#!/usr/bin/env tsx
/**
 * 名古屋市子育てサイトの詳細ページ（detail_page_url）から「開設日・時間」を抽出し、
 * `facility_schedules` テーブルへ反映するスクリプト。
 *
 * 使用方法:
 *   - DRY-RUN（デフォルト）:
 *     pnpm tsx fetch-facility-operating-hours.ts
 *   - DB反映:
 *     pnpm tsx fetch-facility-operating-hours.ts --apply --yes
 *   - 件数制限:
 *     pnpm tsx fetch-facility-operating-hours.ts --limit=20
 *
 * 注意:
 * - 名古屋市サイトへのアクセスはスクレイピングガイドラインに準拠し、最低1秒以上間隔を空ける。
 * - 抽出結果は必ずログ（JSON/Markdown）を確認し、必要に応じて目視で補正する。
 */

import * as cheerio from 'cheerio';
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
const limitArg = args.find((arg) => arg.startsWith('--limit='))?.split('=')[1];
const limit = limitArg ? Math.max(0, Number(limitArg)) : null;

const REQUEST_INTERVAL_MS = 1100;
const MAX_RETRIES = 3;
const BACKOFF_DELAYS_MS = [500, 1000, 2000];

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type DayKey = (typeof DAY_KEYS)[number];

type FacilityRow = {
	id: string;
	name: string;
	ward_name: string | null;
	detail_page_url: string | null;
};

type FacilityScheduleInsert = {
	facility_id: string;
	open_time: string;
	close_time: string;
	monday: boolean;
	tuesday: boolean;
	wednesday: boolean;
	thursday: boolean;
	friday: boolean;
	saturday: boolean;
	sunday: boolean;
	holiday: boolean;
};

type ParseResult = {
	schedules: FacilityScheduleInsert[];
	sourceLines: string[];
	warnings: string[];
};

type ScanResult = {
	facilityId: string;
	facilityName: string;
	wardName: string | null;
	detailPageUrl: string;
	reason: 'no_detail_page_url' | 'fetch_failed' | 'no_schedule_section' | 'parse_failed' | 'dry_run' | 'updated';
	scheduleCount: number;
	warnings: string[];
	sectionText?: string;
	errorMessage?: string;
};

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeJapaneseText(text: string): string {
	return text
		.normalize('NFKC')
		.replace(/\u3000/g, ' ')
		.replace(/〜/g, '～')
		.replace(/[‐‑‒–—―ー]/g, '-')
		.replace(/[，、]/g, '・')
		.replace(/：/g, ':')
		.replace(/\s+/g, ' ')
		.trim();
}

function extractScheduleSectionText(html: string): string | null {
	const $ = cheerio.load(html);
	const heading = $('h1,h2,h3,h4').filter((_, element) => {
		const label = normalizeJapaneseText($(element).text());
		return label.includes('開設日・時間');
	}).first();

	if (!heading.length) {
		return null;
	}

	const lines: string[] = [];
	let cursor = heading.next();
	while (cursor.length) {
		const tagName = cursor.prop('tagName')?.toLowerCase() ?? '';
		if (tagName.startsWith('h')) {
			break;
		}

		if (tagName === 'ul' || tagName === 'ol') {
			cursor.find('li').each((_, li) => {
				const text = normalizeJapaneseText($(li).text());
				if (text) {
					lines.push(text);
				}
			});
		} else {
			const text = normalizeJapaneseText(cursor.text());
			if (text) {
				lines.push(text);
			}
		}
		cursor = cursor.next();
	}

	const compact = lines
		.map((line) => line.replace(/\s*※/g, ' ※').trim())
		.filter((line) => line.length > 0);
	return compact.length > 0 ? compact.join('\n') : null;
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

function emptyFlags(): Record<DayKey, boolean> {
	return {
		monday: false,
		tuesday: false,
		wednesday: false,
		thursday: false,
		friday: false,
		saturday: false,
		sunday: false,
	};
}

function parseDayTokenToKey(token: string): DayKey | null {
	if (token.startsWith('月')) return 'monday';
	if (token.startsWith('火')) return 'tuesday';
	if (token.startsWith('水')) return 'wednesday';
	if (token.startsWith('木')) return 'thursday';
	if (token.startsWith('金')) return 'friday';
	if (token.startsWith('土')) return 'saturday';
	if (token.startsWith('日')) return 'sunday';
	return null;
}

function parseDayFlags(text: string): { flags: Record<DayKey, boolean>; holiday: boolean; isClosedExpression: boolean } {
	const normalized = normalizeJapaneseText(text);
	const flags = emptyFlags();
	const includesHoliday = normalized.includes('祝');
	const isClosedExpression = /(休|除く|お休み)/.test(normalized);

	const rangeMatch = normalized.match(/([月火水木金土日])曜日?から([月火水木金土日])曜日?/);
	if (rangeMatch) {
		const startKey = parseDayTokenToKey(rangeMatch[1] ?? '');
		const endKey = parseDayTokenToKey(rangeMatch[2] ?? '');
		if (startKey && endKey) {
			const dayOrder: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
			const startIndex = dayOrder.indexOf(startKey);
			const endIndex = dayOrder.indexOf(endKey);
			if (startIndex >= 0 && endIndex >= 0) {
				for (let index = startIndex; index <= endIndex; index += 1) {
					const key = dayOrder[index];
					if (key) flags[key] = true;
				}
			}
		}
	}

	const dayTokens = normalized.match(/[月火水木金土日]曜日?/g) ?? [];
	for (const token of dayTokens) {
		const key = parseDayTokenToKey(token);
		if (key) {
			flags[key] = true;
		}
	}

	return {
		flags,
		holiday: includesHoliday && !isClosedExpression,
		isClosedExpression,
	};
}

type ParsedTimeRange = {
	openTime: string;
	closeTime: string;
};

function parseTimePart(rawPart: string): number | null {
	const part = normalizeJapaneseText(rawPart);
	if (part.includes('正午')) return 12 * 60;

	const timeMatch = part.match(/(午前|午後)?\s*(\d{1,2})(?:[:時]\s*(\d{1,2})\s*分?)?(?:\s*半)?/);
	if (!timeMatch) return null;

	const meridiem = timeMatch[1] ?? '';
	const hourRaw = Number(timeMatch[2] ?? '0');
	const minuteFromToken = timeMatch[3] ? Number(timeMatch[3]) : 0;
	const minute = /半/.test(part) && !timeMatch[3] ? 30 : minuteFromToken;
	let hour = hourRaw;

	if (meridiem === '午後' && hour < 12) hour += 12;
	if (meridiem === '午前' && hour === 12) hour = 0;

	if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
	return hour * 60 + minute;
}

function formatMinutesToTime(totalMinutes: number): string {
	const hour = Math.floor(totalMinutes / 60);
	const minute = totalMinutes % 60;
	return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

function parseTimeRanges(text: string): ParsedTimeRange[] {
	const normalized = normalizeJapaneseText(text);
	const ranges: ParsedTimeRange[] = [];

	const regex = /([午前午後正午0-9:時分半\s]+?)から([午前午後正午0-9:時分半\s]+?)(?=(?:[、,・]|$|　|\s))/g;
	let match: RegExpExecArray | null = regex.exec(normalized);
	while (match) {
		const rawOpen = match[1]?.trim() ?? '';
		const rawClose = match[2]?.trim() ?? '';
		const open = parseTimePart(rawOpen);
		const close = parseTimePart(rawClose);

		if (open !== null && close !== null) {
			let openMinutes = open;
			let closeMinutes = close;

			// 例: 「午後9時から午後2時」のような明らかな誤記に対して、openを午前とみなして補正
			if (openMinutes >= closeMinutes && rawOpen.includes('午後') && rawClose.includes('午後')) {
				const adjustedOpen = openMinutes - 12 * 60;
				if (adjustedOpen >= 0 && adjustedOpen < closeMinutes) {
					openMinutes = adjustedOpen;
				}
			}

			if (openMinutes < closeMinutes) {
				ranges.push({
					openTime: formatMinutesToTime(openMinutes),
					closeTime: formatMinutesToTime(closeMinutes),
				});
			}
		}

		match = regex.exec(normalized);
	}

	return ranges;
}

function hasAnyOpenDay(flags: Record<DayKey, boolean>): boolean {
	return DAY_KEYS.some((key) => flags[key]);
}

function mergeOpenFlags(base: Record<DayKey, boolean>, add: Record<DayKey, boolean>): Record<DayKey, boolean> {
	const merged = { ...base };
	for (const key of DAY_KEYS) {
		if (add[key]) merged[key] = true;
	}
	return merged;
}

function subtractClosedFlags(base: Record<DayKey, boolean>, remove: Record<DayKey, boolean>): Record<DayKey, boolean> {
	const merged = { ...base };
	for (const key of DAY_KEYS) {
		if (remove[key]) merged[key] = false;
	}
	return merged;
}

function toScheduleInsert(
	facilityId: string,
	range: ParsedTimeRange,
	flags: Record<DayKey, boolean>,
	holiday: boolean
): FacilityScheduleInsert {
	return {
		facility_id: facilityId,
		open_time: range.openTime,
		close_time: range.closeTime,
		monday: flags.monday,
		tuesday: flags.tuesday,
		wednesday: flags.wednesday,
		thursday: flags.thursday,
		friday: flags.friday,
		saturday: flags.saturday,
		sunday: flags.sunday,
		holiday,
	};
}

function parseScheduleSection(facilityId: string, sectionText: string): ParseResult {
	const warnings: string[] = [];
	const sourceLines = sectionText
		.split('\n')
		.map((line) => normalizeJapaneseText(line))
		.filter((line) => line.length > 0);

	const schedules: FacilityScheduleInsert[] = [];
	let pendingDays: { flags: Record<DayKey, boolean>; holiday: boolean } | null = null;

	for (const line of sourceLines) {
		if (/^(※|最新情報|ご利用頂ける日時)/.test(line)) {
			continue;
		}

		const ranges = parseTimeRanges(line);
		const [openPart, ...restParts] = line.split(/[()（）]/).map((part) => normalizeJapaneseText(part));
		const closedPart = restParts.join(' ');

		const openParse = parseDayFlags(openPart);
		const closedParse = closedPart ? parseDayFlags(closedPart) : { flags: emptyFlags(), holiday: false, isClosedExpression: false };
		let openFlags = openParse.flags;
		let holidayOpen = openParse.holiday;

		if (closedParse.isClosedExpression) {
			if (hasAnyOpenDay(openFlags)) {
				openFlags = subtractClosedFlags(openFlags, closedParse.flags);
			}
			if (closedPart.includes('祝')) {
				holidayOpen = false;
			}
		}

		const hasDays = hasAnyOpenDay(openFlags);

		if (hasDays && ranges.length > 0) {
			for (const range of ranges) {
				schedules.push(toScheduleInsert(facilityId, range, openFlags, holidayOpen));
			}
			pendingDays = { flags: openFlags, holiday: holidayOpen };
			continue;
		}

		if (hasDays && ranges.length === 0) {
			pendingDays = { flags: openFlags, holiday: holidayOpen };
			continue;
		}

		if (!hasDays && ranges.length > 0) {
			if (pendingDays) {
				for (const range of ranges) {
					schedules.push(toScheduleInsert(facilityId, range, pendingDays.flags, pendingDays.holiday));
				}
			} else {
				warnings.push(`曜日未特定の時間表記: ${line}`);
			}
			continue;
		}

		if (ranges.length === 0 && /(休|除く|お休み)/.test(line)) {
			// 休み情報の行は、別行で開設行がある前提で無視（必要時は warning として残す）
			warnings.push(`休み注記（自動反映なし）: ${line}`);
		}
	}

	const dedupedMap = new Map<string, FacilityScheduleInsert>();
	for (const row of schedules) {
		const key = [
			row.open_time,
			row.close_time,
			row.monday ? '1' : '0',
			row.tuesday ? '1' : '0',
			row.wednesday ? '1' : '0',
			row.thursday ? '1' : '0',
			row.friday ? '1' : '0',
			row.saturday ? '1' : '0',
			row.sunday ? '1' : '0',
			row.holiday ? '1' : '0',
		].join('|');
		dedupedMap.set(key, row);
	}

	return {
		schedules: Array.from(dedupedMap.values()),
		sourceLines,
		warnings,
	};
}

function writeJsonLog(results: ScanResult[], backupRows: unknown[] | null): string {
	const logsDir = join(__dirname, 'logs');
	mkdirSync(logsDir, { recursive: true });
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, -5);
	const filename = join(logsDir, `facility-schedules-scan-${timestamp}.json`);
	writeFileSync(
		filename,
		JSON.stringify(
			{
				timestamp: new Date().toISOString(),
				mode: isApply ? 'APPLY' : 'DRY-RUN',
				limit,
				results,
				backupRows,
			},
			null,
			2
		),
		'utf-8'
	);
	return filename;
}

function writeReviewMarkdown(results: ScanResult[]): string {
	const logsDir = join(__dirname, 'logs');
	mkdirSync(logsDir, { recursive: true });
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, -5);
	const filename = join(logsDir, `facility-schedules-review-${timestamp}.md`);

	const updated = results.filter((result) => result.reason === 'updated' || result.reason === 'dry_run');
	const failed = results.filter((result) => result.reason === 'fetch_failed' || result.reason === 'parse_failed' || result.reason === 'no_schedule_section');
	const skipped = results.filter((result) => result.reason === 'no_detail_page_url');

	const lines: string[] = [];
	lines.push(`# Facility schedule extraction review (${new Date().toISOString()})`);
	lines.push('');
	lines.push(`- Mode: ${isApply ? 'APPLY' : 'DRY-RUN'}`);
	lines.push(`- Total: ${results.length}`);
	lines.push(`- Parsed: ${updated.length}`);
	lines.push(`- Failed: ${failed.length}`);
	lines.push(`- Skipped(no detail): ${skipped.length}`);
	lines.push('');

	const appendTable = (title: string, rows: ScanResult[]) => {
		lines.push(`## ${title}`);
		lines.push('');
		lines.push('| 施設名 | 区 | URL | reason | scheduleCount | warnings |');
		lines.push('|---|---|---|---|---:|---|');
		for (const row of rows) {
			lines.push(
				`| ${row.facilityName} | ${row.wardName ?? ''} | ${row.detailPageUrl} | ${row.reason} | ${row.scheduleCount} | ${row.warnings.join('<br>')} |`
			);
		}
		lines.push('');
	};

	appendTable('Parsed', updated);
	appendTable('Failed', failed);
	appendTable('Skipped', skipped);

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
		.select('id,name,ward_name,detail_page_url')
		.not('detail_page_url', 'is', null)
		.like('detail_page_url', 'https://www.kosodate.city.nagoya.jp/%')
		.order('ward_name', { ascending: true })
		.order('name', { ascending: true });

	if (typeof limit === 'number' && Number.isFinite(limit)) {
		query = query.limit(limit);
	}

	const { data, error } = await query;
	if (error) {
		throw new Error(`Failed to fetch facilities: ${error.message}`);
	}

	const facilities = (data ?? []) as FacilityRow[];
	const results: ScanResult[] = [];
	const allParsedRows: FacilityScheduleInsert[] = [];

	for (const facility of facilities) {
		if (!facility.detail_page_url) {
			results.push({
				facilityId: facility.id,
				facilityName: facility.name,
				wardName: facility.ward_name,
				detailPageUrl: '',
				reason: 'no_detail_page_url',
				scheduleCount: 0,
				warnings: [],
			});
			continue;
		}

		try {
			const html = await fetchHtmlWithRetry(facility.detail_page_url);
			const sectionText = extractScheduleSectionText(html);
			if (!sectionText) {
				results.push({
					facilityId: facility.id,
					facilityName: facility.name,
					wardName: facility.ward_name,
					detailPageUrl: facility.detail_page_url,
					reason: 'no_schedule_section',
					scheduleCount: 0,
					warnings: [],
				});
				await sleep(REQUEST_INTERVAL_MS);
				continue;
			}

			const parsed = parseScheduleSection(facility.id, sectionText);
			if (parsed.schedules.length === 0) {
				results.push({
					facilityId: facility.id,
					facilityName: facility.name,
					wardName: facility.ward_name,
					detailPageUrl: facility.detail_page_url,
					reason: 'parse_failed',
					scheduleCount: 0,
					warnings: parsed.warnings,
					sectionText,
				});
				await sleep(REQUEST_INTERVAL_MS);
				continue;
			}

			allParsedRows.push(...parsed.schedules);
			results.push({
				facilityId: facility.id,
				facilityName: facility.name,
				wardName: facility.ward_name,
				detailPageUrl: facility.detail_page_url,
				reason: isApply ? 'updated' : 'dry_run',
				scheduleCount: parsed.schedules.length,
				warnings: parsed.warnings,
				sectionText,
			});
		} catch (e) {
			results.push({
				facilityId: facility.id,
				facilityName: facility.name,
				wardName: facility.ward_name,
				detailPageUrl: facility.detail_page_url,
				reason: 'fetch_failed',
				scheduleCount: 0,
				warnings: [],
				errorMessage: e instanceof Error ? e.message : String(e),
			});
		}

		await sleep(REQUEST_INTERVAL_MS);
	}

	let backupRows: unknown[] | null = null;
	if (isApply) {
		const targetFacilityIds = Array.from(new Set(allParsedRows.map((row) => row.facility_id)));
		if (targetFacilityIds.length > 0) {
			const { data: existingRows, error: backupError } = await supabase
				.from('facility_schedules')
				.select('*')
				.in('facility_id', targetFacilityIds);
			if (backupError) {
				throw new Error(`Failed to backup existing facility_schedules rows: ${backupError.message}`);
			}
			backupRows = existingRows ?? [];

			const { error: deleteError } = await supabase
				.from('facility_schedules')
				.delete()
				.in('facility_id', targetFacilityIds);
			if (deleteError) {
				throw new Error(`Failed to delete existing facility_schedules rows: ${deleteError.message}`);
			}

			const { error: insertError } = await supabase
				.from('facility_schedules')
				.insert(allParsedRows);
			if (insertError) {
				throw new Error(`Failed to insert facility_schedules rows: ${insertError.message}`);
			}
		}
	}

	const jsonLog = writeJsonLog(results, backupRows);
	const reviewLog = writeReviewMarkdown(results);

	console.log(`[INFO] JSON log: ${jsonLog}`);
	console.log(`[INFO] Review log: ${reviewLog}`);
	console.log(`[INFO] Parsed schedules: ${allParsedRows.length}`);
	console.log(`[INFO] Completed. Mode: ${isApply ? 'APPLY' : 'DRY-RUN'}`);
}

main().catch((e) => {
	console.error('[ERROR] Failed to fetch facility operating hours:', e);
	process.exit(1);
});
