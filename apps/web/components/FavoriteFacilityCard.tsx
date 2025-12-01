'use client';

import React from 'react';
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
	/** 上に移動するハンドラ（任意） */
	onMoveUp?: () => void;
	/** 下に移動するハンドラ（任意） */
	onMoveDown?: () => void;
	/** 先頭のカードかどうか（上ボタンの表示制御用） */
	isFirst?: boolean;
	/** 末尾のカードかどうか（下ボタンの表示制御用） */
	isLast?: boolean;
};

/**
 * お気に入りカードのヘッダーアクション部分（上下移動ボタン・解除ボタン）
 */
function FavoriteCardHeaderActions({
	facilityName,
	facilityId,
	onMoveUp,
	onMoveDown,
	onRemove,
	isFirst,
	isLast,
}: {
	facilityName: string;
	facilityId: string;
	onMoveUp?: () => void;
	onMoveDown?: () => void;
	onRemove: (facilityId: string) => void;
	isFirst: boolean;
	isLast: boolean;
}) {
	return (
		<div className="flex items-center gap-2">
			{/* 上下移動ボタン */}
			{onMoveUp && !isFirst && (
				<button
					aria-label={`${facilityName}をお気に入り内で上に移動`}
					className="btn-move"
					onClick={onMoveUp}
					type="button"
				>
					↑
				</button>
			)}
			{onMoveDown && !isLast && (
				<button
					aria-label={`${facilityName}をお気に入り内で下に移動`}
					className="btn-move"
					onClick={onMoveDown}
					type="button"
				>
					↓
				</button>
			)}
			{/* 解除ボタン */}
			<button
				aria-label={`お気に入りから${facilityName}を削除`}
				className="btn-remove"
				onClick={() => onRemove(facilityId)}
				type="button"
			>
				解除
			</button>
		</div>
	);
}

/**
 * スケジュール表示内容をレンダリングする内部関数
 */
function renderScheduleContent(
	isLoading: boolean,
	error: Error | null,
	schedule: Schedule | undefined,
	month: string,
	facilityId: string
) {
	if (isLoading) {
		return (
			<div className="h-64 rounded-lg bg-slate-50 flex items-center justify-center">
				<LoadingSpinner message="スケジュールを読み込み中..." size="sm" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="h-64 rounded-lg bg-slate-50 flex items-center justify-center p-4">
				<StatusMessage
					type="error"
					message="スケジュールの取得に失敗しました。しばらくしてから再度お試しください。"
				/>
			</div>
		);
	}

	if (schedule?.instagram_post_url) {
		return <InstagramEmbed postUrl={schedule.instagram_post_url} className="rounded-lg overflow-hidden" />;
	}

	return (
		<div className="h-64 rounded-lg bg-slate-50 flex items-center justify-center text-xs text-slate-400">
			<div className="text-center">
				<p className="mb-2">{getMonthLabel(month)}のスケジュールが登録されていません</p>
				<a href={`/facilities/${facilityId}`} className="text-blue-600 hover:text-blue-800 underline">
					詳細ページを見る
				</a>
			</div>
		</div>
	);
}

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
	onMoveUp,
	onMoveDown,
	isFirst = false,
	isLast = false,
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
				<FavoriteCardHeaderActions
					facilityName={favorite.facility.name}
					facilityId={favorite.facility.id}
					onMoveUp={onMoveUp}
					onMoveDown={onMoveDown}
					onRemove={onRemove}
					isFirst={isFirst}
					isLast={isLast}
				/>
			</header>

			<MonthSelector
				selectedMonth={month}
				onChange={(year, month) => onMonthChange(favorite.facility.id, year, month)}
			/>

			{/* スケジュール表示 */}
			<div className="mt-3">
				{renderScheduleContent(isLoading, error, schedule, month, favorite.facility.id)}
			</div>
		</article>
	);
}

