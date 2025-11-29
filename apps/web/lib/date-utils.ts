/**
 * 日付処理ユーティリティ関数
 * 月の計算・フォーマット・パースなど、日付関連の共通処理を提供
 */

/**
 * 月の1日を取得する（YYYY-MM-DD形式、ローカルタイムゾーン）
 * @param year 年
 * @param month 月（1-12）
 * @returns YYYY-MM-DD形式の文字列（月の1日）
 */
export function getMonthFirstDay(year: number, month: number): string {
	const date = new Date(year, month - 1, 1);
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * 現在の年月を取得（ローカルタイムゾーン）
 * @returns 年と月のオブジェクト
 */
export function getCurrentYearMonth(): { year: number; month: number } {
	const now = new Date();
	return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/**
 * YYYY-MM-DD形式の文字列から年月を取得（ローカルタイムゾーン）
 * @param monthStr YYYY-MM-DD形式の文字列（月の1日を想定）
 * @returns 年と月のオブジェクト
 */
export function parseMonthString(monthStr: string): { year: number; month: number } {
	// YYYY-MM-DD形式をパース（ローカルタイムゾーンで解釈）
	const [year, month] = monthStr.split('-').map(Number);
	return { year, month };
}

/**
 * 月の表示名を取得（YYYY年MM月形式）
 * @param monthStr YYYY-MM-DD形式の文字列（月の1日を想定）
 * @returns 表示用の文字列（例: "2024年1月"）
 */
export function getMonthLabel(monthStr: string): string {
	const { year, month } = parseMonthString(monthStr);
	return `${year}年${month}月`;
}

/**
 * 前月の年月を計算する
 * @param year 現在の年
 * @param month 現在の月（1-12）
 * @returns 前月の年と月のオブジェクト
 */
export function getPreviousMonth(year: number, month: number): { year: number; month: number } {
	const prevMonth = month === 1 ? 12 : month - 1;
	const prevYear = month === 1 ? year - 1 : year;
	return { year: prevYear, month: prevMonth };
}

/**
 * 次月の年月を計算する
 * @param year 現在の年
 * @param month 現在の月（1-12）
 * @returns 次月の年と月のオブジェクト
 */
export function getNextMonth(year: number, month: number): { year: number; month: number } {
	const nextMonth = month === 12 ? 1 : month + 1;
	const nextYear = month === 12 ? year + 1 : year;
	return { year: nextYear, month: nextMonth };
}

