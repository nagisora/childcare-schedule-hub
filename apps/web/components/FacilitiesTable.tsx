"use client";

import { useEffect, useMemo, useState } from "react";
import {
	addFavorite,
	FAVORITES_UPDATED_EVENT,
	readFavoritesFromStorage,
	removeFavorite,
	seedDefaultFavoritesInStorageIfNeeded,
	updateFavoritesInStorage,
} from "../lib/storage";
import type { FacilitiesByWard } from "../lib/types";
import { FacilityScheduleMatrix } from "./FacilityScheduleMatrix";
import { FilterCheckbox } from "./FilterCheckbox";
import {
	type FacilityFilters,
	matchesFacilityFilters,
	sortSchedulesByTime,
} from "./facilities-table-utils";

type FacilitiesTableProps = {
	wards: string[];
	facilitiesByWard: FacilitiesByWard;
	/**
	 * サーバーサイドで取得したお気に入りID（Hydrationエラー回避用）
	 * SSR とクライアントサイドの初期状態を一致させるために使用
	 */
	initialFavoriteIds?: string[];
};

export function FacilitiesTable({
	wards,
	facilitiesByWard,
	initialFavoriteIds = [],
}: FacilitiesTableProps) {
	// サーバーサイドの初期値とクライアントサイドの状態を同期
	const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
		new Set(initialFavoriteIds),
	);
	const [filterSaturdayOnly, setFilterSaturdayOnly] = useState(false);
	const [filterSundayOnly, setFilterSundayOnly] = useState(false);
	const [filterHolidayOnly, setFilterHolidayOnly] = useState(false);

	useEffect(() => {
		// クライアントサイドでマウント後にlocalStorageから最新の状態を取得
		const updateFavoriteIds = () => {
			const currentFavorites = readFavoritesFromStorage();
			setFavoriteIds(new Set(currentFavorites.map((f) => f.facilityId)));
		};

		// 初回起動（localStorageキー未作成）の場合のみ、デフォルトお気に入りをseed
		// FavoritesSection とどちらが先にマウントしても整合するように、両方で同じseed処理を実行する。
		const allFacilities = wards.flatMap((ward) => facilitiesByWard[ward] ?? []);
		seedDefaultFavoritesInStorageIfNeeded(allFacilities);

		// 初回読み込み
		updateFavoriteIds();

		// カスタムイベントでお気に入りの変更を検知
		const handleFavoritesUpdated = () => {
			updateFavoriteIds();
		};
		window.addEventListener(FAVORITES_UPDATED_EVENT, handleFavoritesUpdated);

		return () => {
			window.removeEventListener(
				FAVORITES_UPDATED_EVENT,
				handleFavoritesUpdated,
			);
		};
	}, [wards, facilitiesByWard]);

	const handleAddFavorite = (facilityId: string) => {
		const currentFavorites = readFavoritesFromStorage();
		const updated = addFavorite(facilityId, currentFavorites);

		// 最大件数に達している場合は追加できない
		if (updated.length === currentFavorites.length) {
			alert("お気に入りは最大5件まで登録できます。");
			return;
		}

		updateFavoritesInStorage(updated);
		// クライアント側の状態も即時更新して「追加済み」を反映
		setFavoriteIds(new Set(updated.map((f) => f.facilityId)));
		// カスタムイベントを発火してFavoritesSectionに通知
		window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT));
	};

	const handleRemoveFavorite = (facilityId: string) => {
		const currentFavorites = readFavoritesFromStorage();
		const updated = removeFavorite(facilityId, currentFavorites);
		updateFavoritesInStorage(updated);
		// クライアント側の状態も即時更新
		setFavoriteIds(new Set(updated.map((f) => f.facilityId)));
		// カスタムイベントを発火してFavoritesSectionに通知
		window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT));
	};

	// お気に入りボタン（+ / −）をレンダリングする関数
	const renderFavoriteButton = (facilityId: string, facilityName: string) => {
		const isFavorite = favoriteIds.has(facilityId);
		return (
			<button
				aria-label={
					isFavorite
						? `${facilityName}をお気に入りから削除`
						: `${facilityName}をお気に入りに追加`
				}
				className={isFavorite ? "btn-remove" : "btn-add"}
				onClick={() =>
					isFavorite
						? handleRemoveFavorite(facilityId)
						: handleAddFavorite(facilityId)
				}
				type="button"
			>
				{isFavorite ? "−" : "＋"}
			</button>
		);
	};

	const hasActiveFilter =
		filterSaturdayOnly || filterSundayOnly || filterHolidayOnly;

	const filterOptions: Array<{
		id: string;
		label: string;
		checked: boolean;
		onToggle: (checked: boolean) => void;
	}> = [
		{
			id: "filter-saturday-open",
			label: "土曜開所",
			checked: filterSaturdayOnly,
			onToggle: setFilterSaturdayOnly,
		},
		{
			id: "filter-sunday-open",
			label: "日曜開所",
			checked: filterSundayOnly,
			onToggle: setFilterSundayOnly,
		},
		{
			id: "filter-holiday-open",
			label: "祝日開所",
			checked: filterHolidayOnly,
			onToggle: setFilterHolidayOnly,
		},
	];

	const wardSections = useMemo(() => {
		const filters: FacilityFilters = {
			saturdayOnly: filterSaturdayOnly,
			sundayOnly: filterSundayOnly,
			holidayOnly: filterHolidayOnly,
		};
		const isFiltering = Object.values(filters).some(Boolean);
		return wards
			.map((ward) => {
				const facilities = facilitiesByWard[ward] ?? [];
				const ouen = facilities.filter(
					(facility) => facility.facility_type === "childcare_ouen_base",
				);
				const others = facilities.filter(
					(facility) => facility.facility_type !== "childcare_ouen_base",
				);
				const orderedFacilities = [...ouen, ...others];
				const visibleFacilities = isFiltering
					? orderedFacilities.filter((facility) =>
							matchesFacilityFilters(
								facility.facility_schedules ?? [],
								filters,
							),
						)
					: orderedFacilities;

				return { ward, facilities: visibleFacilities };
			})
			.filter((section) => !isFiltering || section.facilities.length > 0);
	}, [
		wards,
		facilitiesByWard,
		filterSaturdayOnly,
		filterSundayOnly,
		filterHolidayOnly,
	]);

	const totalVisibleFacilities = wardSections.reduce(
		(total, section) => total + section.facilities.length,
		0,
	);

	return (
		<section
			aria-labelledby="facilities-heading"
			className="max-w-6xl mx-auto bg-white rounded-2xl px-4 py-4"
		>
			<h2
				id="facilities-heading"
				className="text-xl font-semibold mb-4 text-slate-900"
			>
				拠点一覧
			</h2>
			<nav className="mb-3 flex flex-wrap gap-2 text-xs text-slate-600">
				{wardSections.map(({ ward }) => (
					<a
						key={ward}
						className="rounded-full border border-primary-200 bg-white px-2 py-0.5 text-primary-700 hover:bg-primary-50"
						href={`#ward-${ward}`}
					>
						{ward}へ
					</a>
				))}
			</nav>

			<p className="mb-2 text-xs text-slate-600">
				※ 各区の一番上は「応援」、それ以外は「支援」拠点です
			</p>

			<div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
				<span className="text-slate-600">絞り込み:</span>
				{filterOptions.map((option) => (
					<FilterCheckbox
						key={option.id}
						id={option.id}
						label={option.label}
						checked={option.checked}
						onToggle={option.onToggle}
					/>
				))}
				{hasActiveFilter && (
					<span className="text-slate-500">{totalVisibleFacilities}件</span>
				)}
			</div>
			{hasActiveFilter && (
				<p className="mb-3 text-xs text-slate-500">
					※ スケジュール未登録の拠点は絞り込み結果に表示されません。
				</p>
			)}

			<div className="space-y-4">
				{wardSections.map(({ ward, facilities }) => (
					<section
						key={ward}
						aria-labelledby={`ward-${ward}`}
						className="rounded-xl border border-primary-100 bg-white shadow-sm"
					>
						<h3
							id={`ward-${ward}`}
							className="rounded-t-xl bg-primary-50 px-3 py-3 text-sm font-bold tracking-wide text-primary-900"
						>
							{ward}
						</h3>
						<div className="divide-y divide-primary-100">
							{facilities.length === 0 ? (
								<div className="px-3 py-3 text-xs text-slate-500">
									拠点情報がありません。
								</div>
							) : (
								facilities.map((facility) => {
									const isOuenBase =
										facility.facility_type === "childcare_ouen_base";
									const scheduleRows = sortSchedulesByTime(
										facility.facility_schedules ?? [],
									);

									return (
										<article
											key={facility.id}
											className={`px-3 py-3 ${isOuenBase ? "bg-primary-50/40" : "bg-white"}`}
										>
											<div className="grid grid-cols-[2.25rem_10rem_minmax(0,1fr)] items-center gap-5">
												<div className="flex h-7 items-center justify-center">
													{renderFavoriteButton(facility.id, facility.name)}
												</div>
												<div className="min-w-0">
													<p className="truncate text-sm font-medium text-slate-900">
														{facility.name}
													</p>
												</div>
												<FacilityScheduleMatrix rows={scheduleRows} />
											</div>
										</article>
									);
								})
							)}
						</div>
					</section>
				))}
				{hasActiveFilter && totalVisibleFacilities === 0 && (
					<div className="rounded-xl border border-primary-100 bg-white px-3 py-4 text-sm text-slate-600 shadow-sm">
						条件に一致する拠点は見つかりませんでした。
					</div>
				)}
			</div>
		</section>
	);
}
