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

	// 空状態コンポーネント
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
			{favorites.map((item, index) => {
				const facilityId = item.facility.id;
				const selectedMonth = selectedMonths[facilityId] || defaultMonth;
				const isLoading = loadingStates[facilityId] || false;
				const error = errors[facilityId] || null;
				const isFirst = index === 0;
				const isLast = index === favorites.length - 1;

				return (
				<FavoriteFacilityCard
						key={facilityId}
					favorite={item}
						schedule={schedules[facilityId]}
						selectedMonth={selectedMonth}
						isLoading={isLoading}
						error={error}
					onRemove={handleRemove}
						onMoveUp={!isFirst ? () => handleMove(facilityId, 'up') : undefined}
						onMoveDown={!isLast ? () => handleMove(facilityId, 'down') : undefined}
						isFirst={isFirst}
						isLast={isLast}
					onMonthChange={handleMonthChange}
				/>
				);
			})}
		</div>
	);
}

