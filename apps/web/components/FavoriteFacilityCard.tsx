'use client';

import { getWardName } from '../lib/facilities-utils';
import { getMonthLabel, getMonthFirstDay, getCurrentYearMonth } from '../lib/date-utils';
import { InstagramEmbed } from './InstagramEmbed';
import { MonthSelector } from './MonthSelector';
import { LoadingSpinner } from './LoadingSpinner';
import { StatusMessage } from './StatusMessage';
import type { FavoriteFacility } from '../lib/favorites';
import type { Schedule } from '../lib/types';

type FavoriteFacilityCardProps = {
	favorite: FavoriteFacility;
	schedule: Schedule | undefined;
	selectedMonth: string;
	onRemove: (facilityId: string) => void;
	onMonthChange: (facilityId: string, year: number, month: number) => void;
	/** スケジュール取得中かどうか（任意） */
	isLoading?: boolean;
	/** スケジュール取得エラー（任意） */
	error?: Error | null;
};

/**
 * お気に入り施設カードコンポーネント
 * 施設情報・月切り替えUI・スケジュール表示を担当
 */
export function FavoriteFacilityCard({
	favorite,
	schedule,
	selectedMonth,
	onRemove,
	onMonthChange,
	isLoading = false,
	error = null,
}: FavoriteFacilityCardProps) {
	const { year: currentYear, month: currentMonth } = getCurrentYearMonth();
	const defaultMonth = getMonthFirstDay(currentYear, currentMonth);
	const month = selectedMonth || defaultMonth;

	return (
		<article className="rounded-xl border border-primary-100 bg-white p-3 shadow-sm">
			<header className="flex items-center justify-between mb-3">
				<h3 className="text-sm font-medium text-slate-900">
					<a href={`/facilities/${favorite.facility.id}`} className="hover:text-blue-600 hover:underline">
						{favorite.facility.name} — {getWardName(favorite.facility.ward_name)}
					</a>
				</h3>
				<button
					aria-label={`お気に入りから${favorite.facility.name}を削除`}
					className="btn-remove"
					onClick={() => onRemove(favorite.facility.id)}
				>
					解除
				</button>
			</header>

			<MonthSelector
				selectedMonth={month}
				onChange={(year, month) => onMonthChange(favorite.facility.id, year, month)}
			/>

			{/* スケジュール表示 */}
			<div className="mt-3">
				{isLoading ? (
					<div className="h-64 rounded-lg bg-slate-50 flex items-center justify-center">
						<LoadingSpinner message="スケジュールを読み込み中..." size="sm" />
					</div>
				) : error ? (
					<div className="h-64 rounded-lg bg-slate-50 flex items-center justify-center p-4">
						<StatusMessage
							type="error"
							message="スケジュールの取得に失敗しました。しばらくしてから再度お試しください。"
						/>
					</div>
				) : schedule?.instagram_post_url ? (
					<InstagramEmbed postUrl={schedule.instagram_post_url} className="rounded-lg overflow-hidden" />
				) : (
					<div className="h-64 rounded-lg bg-slate-50 flex items-center justify-center text-xs text-slate-400">
						<div className="text-center">
							<p className="mb-2">{getMonthLabel(month)}のスケジュールが登録されていません</p>
							<a
								href={`/facilities/${favorite.facility.id}`}
								className="text-blue-600 hover:text-blue-800 underline"
							>
								詳細ページを見る
							</a>
						</div>
					</div>
				)}
			</div>
		</article>
	);
}

