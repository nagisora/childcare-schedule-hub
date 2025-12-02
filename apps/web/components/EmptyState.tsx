'use client';

import React from 'react';

type EmptyStateProps = {
	/** メッセージ */
	message: string;
	/** 追加の説明文（任意） */
	description?: string;
	/** アクション（リンクやボタンなど、任意） */
	action?: React.ReactNode;
	/** 追加のクラス名 */
	className?: string;
};

/**
 * 空状態を表示するコンポーネント
 * データが0件の場合などに使用
 */
export function EmptyState({ message, description, action, className = '' }: EmptyStateProps) {
	return (
		<div className={`rounded-xl border bg-slate-50 p-8 text-center ${className}`}>
			<p className="text-sm font-medium text-slate-700">{message}</p>
			{description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}

