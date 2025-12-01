'use client';

import { getMonthFirstDay, getCurrentYearMonth } from '../lib/date-utils';
import { useFavoritesSync } from '../hooks/useFavoritesSync';
import { FavoriteFacilityCard } from './FavoriteFacilityCard';
import type { Facility } from '../lib/types';
import type { FavoriteFacility } from '../lib/favorites';

type FavoritesSectionProps = {
	/** 初期お気に入り（互換性のため残しているが、useFavoritesSync が localStorage から読み込むため実際には使用されない） */
	initialFavorites: FavoriteFacility[];
	allFacilities: Facility[];
};


/**
 * お気に入りセクションコンポーネント
 * お気に入り登録済みの施設とスケジュールを表示
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function FavoritesSection({ initialFavorites: _initialFavorites, allFacilities }: FavoritesSectionProps) {
	// initialFavorites は互換性のため props に残しているが、useFavoritesSync が localStorage から読み込むため使用しない
	const { favorites, schedules, selectedMonths, loadingStates, errors, handleRemove, handleMove, handleMonthChange } =
		useFavoritesSync(allFacilities);


	if (favorites.length === 0) {
		return (
			<div className="rounded-xl border bg-slate-50 p-8 text-center">
				<p className="text-sm text-slate-600">
					お気に入り登録がまだありません。下部の拠点一覧から「+」ボタンを押してお気に入りに追加してください。
				</p>
			</div>
		);
	}

	const { year: currentYear, month: currentMonth } = getCurrentYearMonth();
	const defaultMonth = getMonthFirstDay(currentYear, currentMonth);

	return (
		<div className="space-y-4">
			{favorites.map((item, index) => (
				<FavoriteFacilityCard
					key={item.facility.id}
					favorite={item}
					schedule={schedules[item.facility.id]}
					selectedMonth={selectedMonths[item.facility.id] || defaultMonth}
					isLoading={loadingStates[item.facility.id] || false}
					error={errors[item.facility.id] || null}
					onRemove={handleRemove}
					onMoveUp={index > 0 ? () => handleMove(item.facility.id, 'up') : undefined}
					onMoveDown={index < favorites.length - 1 ? () => handleMove(item.facility.id, 'down') : undefined}
					isFirst={index === 0}
					isLast={index === favorites.length - 1}
					onMonthChange={handleMonthChange}
				/>
			))}
		</div>
	);
}

