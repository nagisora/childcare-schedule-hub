/**
 * Instagram月間スケジュール投稿URL検索用のユーティリティ
 * タスク2仕様（docs/phase-artifacts/10-schedule-url-coverage/task-02-spec.md）に準拠
 */

import {
	buildFacilityNameVariantsForSearch,
	uniqueStrings,
} from "./facility-name-utils";
import {
	extractInstagramUsername,
	normalizeInstagramPostUrl,
} from "./instagram-url";

export interface ScheduleCandidate {
	url: string;
	type: "p" | "reel";
	title: string;
	snippet: string;
	matchedMonthHints: string[];
}

interface GoogleCSEItem {
	link: string;
	title: string;
	snippet: string;
}

export { extractInstagramUsername, normalizeInstagramPostUrl };

/**
 * 対象月の月ヒントパターンを生成する
 * @param month YYYY-MM形式（例: "2025-12"）
 * @returns 月ヒントパターンの配列（最大8パターン、精度向上のため拡張）
 */
function buildMonthHints(month: string): string[] {
	const [year, monthNum] = month.split("-");
	if (!year || !monthNum) {
		return [];
	}

	const monthInt = parseInt(monthNum, 10);
	if (isNaN(monthInt) || monthInt < 1 || monthInt > 12) {
		return [];
	}

	const hints: string[] = [];
	// "YYYY年MM月"
	hints.push(`${year}年${monthInt}月`);
	// "MM月号"（よく使われるパターン）
	hints.push(`${monthInt}月号`);
	// "MM月"
	hints.push(`${monthInt}月`);
	// "MM月予定"
	hints.push(`${monthInt}月予定`);
	// "MM月の予定"
	hints.push(`${monthInt}月の予定`);
	// "MM月スケジュール"
	hints.push(`${monthInt}月スケジュール`);
	// "MM月カレンダー"
	hints.push(`${monthInt}月カレンダー`);
	// "MM月おたより"
	hints.push(`${monthInt}月おたより`);
	// "月間スケジュール"
	hints.push("月間スケジュール");
	// "カレンダー"
	hints.push("カレンダー");
	// "おたより"
	hints.push("おたより");

	return hints.slice(0, 8); // 最大8パターン（精度向上のため拡張）
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
	month: string,
): string[] {
	const queries: string[] = [];
	const facilityVariants = buildFacilityNameVariantsForSearch(facilityName);
	const facilityTerm =
		facilityVariants.length === 1
			? `"${facilityVariants[0]}"`
			: `(${facilityVariants.map((variant) => `"${variant}"`).join(" OR ")})`;

	// 追加キーワード（カレンダー、おたより、スケジュールなど）
	const additionalKeywords =
		"(カレンダー OR おたより OR スケジュール OR 予定表 OR スケジュール表)";

	// 月号を最優先で使用（精度向上のため）
	const monthInt = parseInt(month.split("-")[1] || "0", 10);
	const monthGou = `${monthInt}月号`;

	if (instagramUsername) {
		// usernameありの場合（最優先）
		// クエリ1: username + "月号" + "カレンダー"（最優先、精度向上のため）
		queries.push(
			`site:instagram.com (inurl:/p/ OR inurl:/reel/) "${instagramUsername}" "${monthGou}" カレンダー`,
		);
		// クエリ2: username + "月号" + "おたより"（最優先）
		queries.push(
			`site:instagram.com (inurl:/p/ OR inurl:/reel/) "${instagramUsername}" "${monthGou}" おたより`,
		);
		// クエリ3: username + "月号" + 追加キーワード
		queries.push(
			`site:instagram.com (inurl:/p/ OR inurl:/reel/) "${instagramUsername}" "${monthGou}" ${additionalKeywords}`,
		);
		// クエリ4: username + "月号"（シンプル版）
		queries.push(
			`site:instagram.com (inurl:/p/ OR inurl:/reel/) "${instagramUsername}" "${monthGou}"`,
		);
		// クエリ5: username + "月" + 追加キーワード（フォールバック）
		queries.push(
			`site:instagram.com (inurl:/p/ OR inurl:/reel/) "${instagramUsername}" "${monthInt}月" ${additionalKeywords}`,
		);
		// クエリ6: username + 施設名 + "月" + 追加キーワード（フォールバック）
		queries.push(
			`site:instagram.com (inurl:/p/ OR inurl:/reel/) "${instagramUsername}" ${facilityTerm} "${monthInt}月" ${additionalKeywords}`,
		);
	} else {
		// usernameなしの場合（施設名中心）
		// クエリ1: 施設名 + 区名 + "月号" + "カレンダー"（最優先、wardNameがある場合）
		if (wardName) {
			queries.push(
				`site:instagram.com (inurl:/p/ OR inurl:/reel/) ${facilityTerm} "${wardName}" "${monthGou}" カレンダー`,
			);
		}
		// クエリ2: 施設名 + "月号" + "カレンダー"（最優先）
		queries.push(
			`site:instagram.com (inurl:/p/ OR inurl:/reel/) ${facilityTerm} "${monthGou}" カレンダー`,
		);
		// クエリ3: 施設名 + "月号" + "おたより"
		queries.push(
			`site:instagram.com (inurl:/p/ OR inurl:/reel/) ${facilityTerm} "${monthGou}" おたより`,
		);
		// クエリ4: 施設名 + "月号" + 追加キーワード
		queries.push(
			`site:instagram.com (inurl:/p/ OR inurl:/reel/) ${facilityTerm} "${monthGou}" ${additionalKeywords}`,
		);
		// クエリ5: 施設名 + "月号"（シンプル版）
		queries.push(
			`site:instagram.com (inurl:/p/ OR inurl:/reel/) ${facilityTerm} "${monthGou}"`,
		);
		// クエリ6: 施設名 + 区名 + "月" + 追加キーワード（wardNameがある場合、フォールバック）
		if (wardName) {
			queries.push(
				`site:instagram.com (inurl:/p/ OR inurl:/reel/) ${facilityTerm} "${wardName}" "${monthInt}月" ${additionalKeywords}`,
			);
		}
		// クエリ7: 施設名 + "月" + 追加キーワード（フォールバック）
		queries.push(
			`site:instagram.com (inurl:/p/ OR inurl:/reel/) ${facilityTerm} "${monthInt}月" ${additionalKeywords}`,
		);
		// クエリ8: 施設名 + 追加キーワード（月ヒントなしのフォールバック、候補が0件の場合の救済）
		queries.push(
			`site:instagram.com (inurl:/p/ OR inurl:/reel/) ${facilityTerm} ${additionalKeywords} 子育て拠点`,
		);
	}

	return uniqueStrings(queries).slice(0, 4);
}

/**
 * title/snippetから対象月のヒントを検出する
 * @param title タイトル
 * @param snippet スニペット
 * @param month 対象月（YYYY-MM形式）
 * @returns マッチした月ヒントの配列
 */
export function extractMonthHints(
	title: string,
	snippet: string,
	month: string,
): string[] {
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
	month: string,
): ScheduleCandidate[] {
	const candidates: ScheduleCandidate[] = [];
	const seenUrls = new Set<string>();

	for (const item of items) {
		if (candidates.length >= 10) {
			break; // 最大10件
		}

		const normalized = normalizeInstagramPostUrl(item.link);
		if (!normalized) {
			continue;
		}

		// 重複排除
		if (seenUrls.has(normalized.normalized)) {
			continue;
		}
		seenUrls.add(normalized.normalized);

		// 月ヒント抽出
		const matchedMonthHints = extractMonthHints(
			item.title,
			item.snippet,
			month,
		);

		candidates.push({
			url: normalized.normalized,
			type: normalized.type,
			title: item.title,
			snippet: item.snippet,
			matchedMonthHints,
		});
	}

	// 候補の並び替え（精度向上のため）
	candidates.sort((a, b) => {
		// 1. 月ヒントがマッチする候補を優先（月号を最優先）
		const aHasMonthGou = a.matchedMonthHints.some((hint) =>
			hint.includes("月号"),
		);
		const bHasMonthGou = b.matchedMonthHints.some((hint) =>
			hint.includes("月号"),
		);
		if (aHasMonthGou && !bHasMonthGou) {
			return -1;
		}
		if (!aHasMonthGou && bHasMonthGou) {
			return 1;
		}

		// 2. 月ヒントがマッチする候補を優先
		const aHasMonthHint = a.matchedMonthHints.length > 0;
		const bHasMonthHint = b.matchedMonthHints.length > 0;
		if (aHasMonthHint && !bHasMonthHint) {
			return -1;
		}
		if (!aHasMonthHint && bHasMonthHint) {
			return 1;
		}

		// 3. /p/ を /reel/ より優先
		if (a.type === "p" && b.type === "reel") {
			return -1;
		}
		if (a.type === "reel" && b.type === "p") {
			return 1;
		}

		return 0;
	});

	return candidates;
}
