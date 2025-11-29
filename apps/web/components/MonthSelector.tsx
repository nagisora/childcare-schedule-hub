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
				className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 text-slate-700"
				aria-label="前月"
			>
				← 前月
			</button>
			<span className="px-3 py-1 text-sm font-medium text-slate-700 min-w-[100px] text-center">
				{getMonthLabel(selectedMonth)}
			</span>
			<button
				onClick={() => onChange(nextYear, nextMonth)}
				className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 text-slate-700"
				aria-label="次月"
			>
				次月 →
			</button>
		</div>
	);
}

