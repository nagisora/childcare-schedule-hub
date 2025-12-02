import Link from 'next/link';

/**
 * 拠点詳細ページの not-found ページ
 * 無効なIDやデータが見つからない場合に表示される
 */
export default function NotFound() {
	return (
		<main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
			<div>
				<Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
					← トップページに戻る
				</Link>
			</div>

			<div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
				<h1 className="text-2xl font-bold text-red-800 mb-2">拠点が見つかりませんでした</h1>
				<p className="text-sm text-red-700 mb-4">
					指定された拠点IDが無効か、データが存在しません。
				</p>
				<Link
					href="/"
					className="inline-block rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
				>
					トップページに戻る
				</Link>
			</div>
		</main>
	);
}

