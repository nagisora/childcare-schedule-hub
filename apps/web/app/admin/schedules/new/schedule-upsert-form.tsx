'use client';

import React, { useMemo, useState } from 'react';
import type { Facility, Schedule } from '../../../../lib/types';
import { StatusMessage } from '../../../../components/StatusMessage';

type Props = {
	facilities: Facility[];
};

type ApiSuccess = { schedule: Schedule };
type ApiError = { error?: { code?: string; message?: string } };

function getDefaultMonthYYYYMM(): string {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	return `${y}-${m}`;
}

function groupByWard(facilities: Facility[]): Array<{ ward: string; items: Facility[] }> {
	const map = new Map<string, Facility[]>();
	for (const f of facilities) {
		const ward = (f.ward_name ?? '').trim() || '（区名なし）';
		const existing = map.get(ward) ?? [];
		existing.push(f);
		map.set(ward, existing);
	}
	return Array.from(map.entries())
		.sort(([a], [b]) => a.localeCompare(b, 'ja'))
		.map(([ward, items]) => ({
			ward,
			items: items.slice().sort((x, y) => x.name.localeCompare(y.name, 'ja')),
		}));
}

export function ScheduleUpsertForm({ facilities }: Props) {
	const grouped = useMemo(() => groupByWard(facilities), [facilities]);
	const firstFacilityId = facilities[0]?.id ?? '';

	const [facilityId, setFacilityId] = useState<string>(firstFacilityId);
	const [month, setMonth] = useState<string>(getDefaultMonthYYYYMM());
	const [instagramPostUrl, setInstagramPostUrl] = useState<string>('');
	const [notes, setNotes] = useState<string>('');

	const [submitting, setSubmitting] = useState(false);
	const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
	const [lastSaved, setLastSaved] = useState<Schedule | null>(null);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setStatus(null);
		setLastSaved(null);

		if (!facilityId) {
			setStatus({ type: 'error', message: '施設を選択してください' });
			return;
		}
		if (!month) {
			setStatus({ type: 'error', message: '月（YYYY-MM）を入力してください' });
			return;
		}
		if (!instagramPostUrl.trim()) {
			setStatus({ type: 'error', message: 'Instagram投稿URLを入力してください' });
			return;
		}

		setSubmitting(true);
		try {
			const res = await fetch('/api/admin/schedules/upsert', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					facility_id: facilityId,
					month,
					instagram_post_url: instagramPostUrl.trim(),
					notes: notes.trim() ? notes.trim() : null,
				}),
			});

			const data = (await res.json().catch(() => null)) as ApiSuccess | ApiError | null;

			if (!res.ok) {
				const message = (data as ApiError | null)?.error?.message || `登録に失敗しました（${res.status}）`;
				setStatus({ type: 'error', message });
				return;
			}

			const schedule = (data as ApiSuccess).schedule;
			setLastSaved(schedule);
			setStatus({
				type: 'success',
				message: '登録しました。トップページ側で反映が見えない場合は、ページを再読み込みしてください。',
			});

			// 次の入力をしやすくする（同じ施設で月だけ変える運用を想定）
			setInstagramPostUrl('');
		} catch (err) {
			setStatus({ type: 'error', message: err instanceof Error ? err.message : '登録に失敗しました' });
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div className="space-y-1">
				<label htmlFor="facility" className="block text-sm font-medium text-slate-900">
					施設
				</label>
				<select
					id="facility"
					className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
					value={facilityId}
					onChange={(e) => setFacilityId(e.target.value)}
				>
					{grouped.map((g) => (
						<optgroup key={g.ward} label={g.ward}>
							{g.items.map((f) => (
								<option key={f.id} value={f.id}>
									{f.name}
								</option>
							))}
						</optgroup>
					))}
				</select>
			</div>

			<div className="space-y-1">
				<label htmlFor="month" className="block text-sm font-medium text-slate-900">
					月
				</label>
				<input
					id="month"
					type="month"
					className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
					value={month}
					onChange={(e) => setMonth(e.target.value)}
				/>
			</div>

			<div className="space-y-1">
				<label htmlFor="url" className="block text-sm font-medium text-slate-900">
					Instagram投稿URL
				</label>
				<input
					id="url"
					type="url"
					inputMode="url"
					placeholder="https://www.instagram.com/p/XXXXXXXXXXX/"
					className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
					value={instagramPostUrl}
					onChange={(e) => setInstagramPostUrl(e.target.value)}
				/>
				<p className="text-xs text-slate-500">
					補足: クエリ（?）やフラグメント（#）が付いたURLでもOKです（保存時に自動で削除して正規化します）。
				</p>
			</div>

			<div className="space-y-1">
				<label htmlFor="notes" className="block text-sm font-medium text-slate-900">
					メモ（任意）
				</label>
				<textarea
					id="notes"
					rows={3}
					className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
				/>
			</div>

			<button
				type="submit"
				disabled={submitting}
				className="w-full rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
			>
				{submitting ? '登録中…' : '登録する'}
			</button>

			{status && <StatusMessage type={status.type} message={status.message} />}

			{lastSaved && (
				<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
					<div className="font-semibold">登録結果</div>
					<div>facility_id: {lastSaved.facility_id}</div>
					<div>published_month: {lastSaved.published_month}</div>
					<div>
						instagram_post_url:{' '}
						<a className="text-blue-600 underline" href={lastSaved.instagram_post_url ?? undefined} target="_blank" rel="noreferrer">
							{lastSaved.instagram_post_url ?? 'null'}
						</a>
					</div>
				</div>
			)}
		</form>
	);
}


