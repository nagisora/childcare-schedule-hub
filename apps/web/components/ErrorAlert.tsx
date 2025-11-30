'use client';

import React from 'react';

type ErrorAlertProps = {
	/** エラーメッセージ */
	message: string;
	/** 再試行ボタンのクリックハンドラ（任意） */
	onRetry?: () => void;
	/** 再試行ボタンを表示するか（onRetry が未指定の場合、ページを再読み込み） */
	showRetry?: boolean;
	/** 追加のクラス名 */
	className?: string;
};

/**
 * エラーメッセージを表示するコンポーネント
 * アクセシビリティ: aria-live="polite" と role="alert" を付与
 */
export function ErrorAlert({ message, onRetry, showRetry = true, className = '' }: ErrorAlertProps) {
	const handleRetry = () => {
		if (onRetry) {
			onRetry();
		} else {
			window.location.reload();
		}
	};

	return (
		<div
			role="alert"
			aria-live="polite"
			className={`rounded-xl border border-red-200 bg-red-50 p-4 ${className}`}
		>
			<div className="flex items-start gap-3">
				<div className="flex-1">
					<p className="text-sm font-medium text-red-800">エラーが発生しました</p>
					<p className="mt-1 text-sm text-red-700">{message}</p>
				</div>
				{showRetry && (
					<button
						onClick={handleRetry}
						className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
						aria-label="再試行"
					>
						再試行
					</button>
				)}
			</div>
		</div>
	);
}

