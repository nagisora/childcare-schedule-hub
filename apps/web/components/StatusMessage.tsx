'use client';

type StatusMessageProps = {
	/** メッセージタイプ */
	type: 'error' | 'success' | 'info' | 'warning';
	/** メッセージ */
	message: string;
	/** 追加のクラス名 */
	className?: string;
};

/**
 * ステータスメッセージを表示する汎用コンポーネント
 * アクセシビリティ: aria-live="polite" と role="status" を付与
 */
export function StatusMessage({ type, message, className = '' }: StatusMessageProps) {
	const typeClasses = {
		error: 'border-red-200 bg-red-50 text-red-800',
		success: 'border-green-200 bg-green-50 text-green-800',
		info: 'border-blue-200 bg-blue-50 text-blue-800',
		warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
	};

	return (
		<div
			role="status"
			aria-live="polite"
			className={`rounded-lg border p-3 text-sm ${typeClasses[type]} ${className}`}
		>
			{message}
		</div>
	);
}

