/**
 * Instagram月間スケジュール投稿URL検索用のユーティリティ
 * タスク2仕様（docs/phase-artifacts/10-schedule-url-coverage/task-02-spec.md）に準拠
 */

export interface ScheduleCandidate {
	url: string;
	type: 'p' | 'reel';
	title: string;
	snippet: string;
	matchedMonthHints: string[];
}

interface GoogleCSEItem {
	link: string;
	title: string;
	snippet: string;
}

/**
 * Instagram URLからユーザー名を抽出する
 * @param instagramUrl Instagram URL（例: https://www.instagram.com/username/）
 * @returns ユーザー名（抽出できない場合は null）
 */
export function extractInstagramUsername(instagramUrl: string | null): string | null {
	if (!instagramUrl) return null;

	try {
		const urlObj = new URL(instagramUrl);
		if (!urlObj.hostname.includes('instagram.com')) return null;

		const rawPath = urlObj.pathname || '/';
		const segments = rawPath.split('/').filter(Boolean);
		if (segments.length !== 1) return null;

		const username = segments[0];
		const disallowedFirstSegments = new Set([
			'explore',
			'about',
			'accounts',
			'direct',
			'reels',
			'stories',
			'p',
			'reel',
		]);
		if (disallowedFirstSegments.has(username.toLowerCase())) return null;

		return username;
	} catch {
		return null;
	}
}

/**
 * 対象月の月ヒントパターンを生成する
 * @param month YYYY-MM形式（例: "2025-12"）
 * @returns 月ヒントパターンの配列（最大4パターン）
 */
function buildMonthHints(month: string): string[] {
	const [year, monthNum] = month.split('-');
	if (!year || !monthNum) return [];

	const monthInt = parseInt(monthNum, 10);
	if (isNaN(monthInt) || monthInt < 1 || monthInt > 12) return [];

	const hints: string[] = [];
	// "YYYY年MM月"
	hints.push(`${year}年${monthInt}月`);
	// "YYYY/MM"
	hints.push(`${year}/${monthNum}`);
	// "YYYY.MM"
	hints.push(`${year}.${monthNum}`);
	// "MM月"
	hints.push(`${monthInt}月`);
	// "MM月予定"
	hints.push(`${monthInt}月予定`);
	// "MM月の予定"
	hints.push(`${monthInt}月の予定`);
	// "MM月スケジュール"
	hints.push(`${monthInt}月スケジュール`);
	// "月間スケジュール"
	hints.push('月間スケジュール');

	return hints.slice(0, 4); // 最大4パターン
}

/**
 * 月ヒントのOR句を生成する（クエリ用）
 * @param month YYYY-MM形式
 * @returns OR句（例: "2025年12月" OR "12月" OR "12月の予定" OR "月間スケジュール"）
 */
function buildMonthHintsOrClause(month: string): string {
	const hints = buildMonthHints(month);
	if (hints.length === 0) return '';
	if (hints.length === 1) return `"${hints[0]}"`;
	return `(${hints.map(h => `"${h}"`).join(' OR ')})`;
}

/**
 * 施設名のバリアントを生成（既存のinstagram-search.tsから流用）
 */
function buildFacilityNameVariantsForSearch(name: string): string[] {
	const raw = name.trim();
	if (!raw) return [];

	const normalized = normalizeFacilityNameForSearch(raw);
	const withoutParenContent = normalizeFacilityNameDropParentheticalContent(normalized);
	const expandedParenContent = normalizeFacilityNameExpandParentheticalContent(normalized);

	return uniqueStrings([raw, normalized, withoutParenContent, expandedParenContent]).slice(0, 3);
}

function normalizeFacilityNameForSearch(name: string): string {
	return name.replace(/[〜～]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeFacilityNameDropParentheticalContent(name: string): string {
	return name.replace(/（[^）]*）/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeFacilityNameExpandParentheticalContent(name: string): string {
	return name.replace(/[（）()]/g, ' ').replace(/\s+/g, ' ').trim();
}

function uniqueStrings(values: string[]): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	for (const v of values) {
		const s = v.trim();
		if (!s) continue;
		if (seen.has(s)) continue;
		seen.add(s);
		out.push(s);
	}
	return out;
}

/**
 * CSEクエリを生成する（タスク2仕様に準拠）
 * @param facilityName 施設名
 * @param wardName 区名（任意）
 * @param instagramUsername Instagramユーザー名（任意）
 * @param month 対象月（YYYY-MM形式）
 * @returns クエリ配列（最大4本）
 */
export function generateScheduleSearchQueries(
	facilityName: string,
	wardName: string | null,
	instagramUsername: string | null,
	month: string
): string[] {
	const queries: string[] = [];
	const monthHintsOr = buildMonthHintsOrClause(month);
	const facilityVariants = buildFacilityNameVariantsForSearch(facilityName);
	const facilityTerm = facilityVariants.length === 1 ? `"${facilityVariants[0]}"` : `(${facilityVariants.map(v => `"${v}"`).join(' OR ')})`;

	if (instagramUsername) {
		// usernameありの場合（最優先）
		// クエリ1
		if (monthHintsOr) {
			queries.push(
				`site:instagram.com (inurl:/p/ OR inurl:/reel/) "${instagramUsername}" ${monthHintsOr}`
			);
		}
		// クエリ2
		if (monthHintsOr) {
			queries.push(
				`site:instagram.com (inurl:/p/ OR inurl:/reel/) "${instagramUsername}" ${facilityTerm} (${buildMonthHintsOrClause(month).split(' OR ').slice(0, 2).join(' OR ')})`
			);
		}
		// クエリ3（wardNameがある場合のみ）
		if (wardName && monthHintsOr) {
			queries.push(
				`site:instagram.com (inurl:/p/ OR inurl:/reel/) "${instagramUsername}" "${wardName}" (${buildMonthHintsOrClause(month).split(' OR ').slice(0, 2).join(' OR ')})`
			);
		}
	} else {
		// usernameなしの場合（施設名中心）
		// クエリ1（wardNameがある場合）
		if (wardName && monthHintsOr) {
			queries.push(
				`site:instagram.com (inurl:/p/ OR inurl:/reel/) ${facilityTerm} "${wardName}" (${buildMonthHintsOrClause(month).split(' OR ').slice(0, 2).join(' OR ')})`
			);
		}
		// クエリ2
		if (monthHintsOr) {
			queries.push(
				`site:instagram.com (inurl:/p/ OR inurl:/reel/) ${facilityTerm} (${buildMonthHintsOrClause(month).split(' OR ').slice(0, 2).join(' OR ')})`
			);
		}
		// クエリ3（wardNameがある場合、月ヒントなしのフォールバック）
		if (wardName) {
			queries.push(
				`site:instagram.com (inurl:/p/ OR inurl:/reel/) ${facilityTerm} "${wardName}" 子育て拠点`
			);
		}
		// クエリ4（月ヒントなしのフォールバック）
		queries.push(`site:instagram.com (inurl:/p/ OR inurl:/reel/) ${facilityTerm} 子育て拠点`);
	}

	return uniqueStrings(queries).slice(0, 4);
}

/**
 * Instagram投稿URL（permalink）を正規化する
 * @param url 元のURL
 * @returns 正規化されたURL（/p/ または /reel/ 形式のみ。それ以外は null）
 */
export function normalizeInstagramPostUrl(url: string): { normalized: string; type: 'p' | 'reel' } | null {
	if (!url) return null;

	try {
		const urlObj = new URL(url);

		if (!urlObj.hostname.includes('instagram.com')) {
			return null;
		}

		// クエリパラメータとフラグメントを除去
		urlObj.search = '';
		urlObj.hash = '';

		// http → https
		if (urlObj.protocol === 'http:') {
			urlObj.protocol = 'https:';
		}

		// m.instagram.com → www.instagram.com
		if (urlObj.hostname === 'm.instagram.com') {
			urlObj.hostname = 'www.instagram.com';
		}

		const rawPath = urlObj.pathname || '/';
		const segments = rawPath.split('/').filter(Boolean);

		// /p/<shortcode>/ または /reel/<shortcode>/ 形式のみ許可
		if (segments.length === 2 && (segments[0] === 'p' || segments[0] === 'reel')) {
			const shortcode = segments[1];
			if (!shortcode || shortcode.length === 0) return null;

			// shortcodeの妥当性チェック（英数字とハイフン/アンダースコアのみ）
			if (!/^[A-Za-z0-9_-]+$/.test(shortcode)) return null;

			urlObj.pathname = `/${segments[0]}/${shortcode}/`;
			return {
				normalized: urlObj.toString(),
				type: segments[0] === 'p' ? 'p' : 'reel',
			};
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * title/snippetから対象月のヒントを検出する
 * @param title タイトル
 * @param snippet スニペット
 * @param month 対象月（YYYY-MM形式）
 * @returns マッチした月ヒントの配列
 */
export function extractMonthHints(title: string, snippet: string, month: string): string[] {
	const hints = buildMonthHints(month);
	const text = `${title} ${snippet}`;
	const matched: string[] = [];

	for (const hint of hints) {
		if (text.includes(hint)) {
			matched.push(hint);
		}
	}

	return matched;
}

/**
 * CSE結果から投稿URL候補を抽出・正規化する
 * @param items CSE APIのitems
 * @param month 対象月（YYYY-MM形式）
 * @returns 候補配列（最大10件、/p/を優先）
 */
export function extractScheduleCandidates(
	items: GoogleCSEItem[],
	month: string
): ScheduleCandidate[] {
	const candidates: ScheduleCandidate[] = [];
	const seenUrls = new Set<string>();

	for (const item of items) {
		if (candidates.length >= 10) break; // 最大10件

		const normalized = normalizeInstagramPostUrl(item.link);
		if (!normalized) continue;

		// 重複排除
		if (seenUrls.has(normalized.normalized)) continue;
		seenUrls.add(normalized.normalized);

		// 月ヒント抽出
		const matchedMonthHints = extractMonthHints(item.title, item.snippet, month);

		candidates.push({
			url: normalized.normalized,
			type: normalized.type,
			title: item.title,
			snippet: item.snippet,
			matchedMonthHints,
		});
	}

	// /p/ を先頭に並べ替え
	candidates.sort((a, b) => {
		if (a.type === 'p' && b.type === 'reel') return -1;
		if (a.type === 'reel' && b.type === 'p') return 1;
		return 0;
	});

	return candidates;
}

