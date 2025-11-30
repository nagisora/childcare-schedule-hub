'use client';

import React from 'react';

type LoadingSpinnerProps = {
	/** ローディングメッセージ（任意） */
	message?: string;
	/** 追加のクラス名 */
	className?: string;
	/** サイズ（'sm' | 'md' | 'lg'） */
	size?: 'sm' | 'md' | 'lg';
};

/**
 * ローディングスピナーコンポーネント
 * アクセシビリティ: aria-live="polite" と role="status" を付与
 */
export function LoadingSpinner({ message, className = '', size = 'md' }: LoadingSpinnerProps) {
	const sizeClasses = {
		sm: 'h-4 w-4',
		md: 'h-8 w-8',
		lg: 'h-12 w-12',
	};

	return (
		<div
			role="status"
			aria-live="polite"
			aria-label={message || '読み込み中'}
			className={`flex flex-col items-center justify-center gap-2 ${className}`}
		>
			<div
				className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-primary-200 border-t-primary-600`}
				aria-hidden="true"
			/>
			{message && <p className="text-sm text-slate-600">{message}</p>}
		</div>
	);
}

