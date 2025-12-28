'use client';

import { getMonthLabel, getPreviousMonth, getNextMonth, parseMonthString } from '../lib/date-utils';

type MonthSelectorProps = {
	selectedMonth: string; // YYYY-MM-DD形式（月の1日）
	onChange: (year: number, month: number) => void;
};

/**
 * 月切り替えUIコンポーネント
 * 前月・次月ボタンと現在選択中の月を表示
 */
export function MonthSelector({ selectedMonth, onChange }: MonthSelectorProps) {
	const { year: selectedYear, month: selectedMonthNum } = parseMonthString(selectedMonth);
	const { year: prevYear, month: prevMonth } = getPreviousMonth(selectedYear, selectedMonthNum);
	const { year: nextYear, month: nextMonth } = getNextMonth(selectedYear, selectedMonthNum);

	return (
		<div className="mb-3 flex items-center justify-center gap-2">
			<button
				onClick={() => onChange(prevYear, prevMonth)}
				className="px-3 py-1 text-xs rounded-md border border-primary-300 bg-white text-primary-700 hover:bg-primary-50 transition-colors"
				aria-label="前月"
				type="button"
			>
				← 前月
			</button>
			<span className="px-3 py-1 text-sm font-medium text-slate-700 min-w-[100px] text-center">
				{getMonthLabel(selectedMonth)}
			</span>
			<button
				onClick={() => onChange(nextYear, nextMonth)}
				className="px-3 py-1 text-xs rounded-md border border-primary-300 bg-white text-primary-700 hover:bg-primary-50 transition-colors"
				aria-label="次月"
				type="button"
			>
				次月 →
			</button>
		</div>
	);
}

