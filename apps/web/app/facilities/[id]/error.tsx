'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ErrorAlert } from '../../../components/ErrorAlert';

/**
 * 拠点詳細ページのエラーページ
 * データ取得エラーなどが発生した場合に表示される
 */
export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// エラーログを記録（本番環境では外部サービスに送信）
		console.error('Facility detail page error:', error);
	}, [error]);

	return (
		<main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
			<div>
				<Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
					← トップページに戻る
				</Link>
			</div>

			<ErrorAlert
				message={error.message || '拠点情報の取得に失敗しました。'}
				onRetry={reset}
			/>
		</main>
	);
}

