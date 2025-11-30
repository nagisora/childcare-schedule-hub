'use client';

type LoadingSkeletonProps = {
	/** 行数 */
	rows?: number;
	/** 追加のクラス名 */
	className?: string;
};

/**
 * スケルトンローディングコンポーネント
 * テーブルやカードのローディング状態を表現
 */
export function LoadingSkeleton({ rows = 3, className = '' }: LoadingSkeletonProps) {
	return (
		<div className={`space-y-2 ${className}`} aria-label="読み込み中" role="status" aria-live="polite">
			{Array.from({ length: rows }).map((_, i) => (
				<div key={i} className="h-12 animate-pulse rounded-lg bg-slate-200" />
			))}
		</div>
	);
}

