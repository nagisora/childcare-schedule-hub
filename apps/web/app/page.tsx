export default function HomePage() {
	return (
		<main className="space-y-8 px-4 py-8">
			<section aria-labelledby="hero-heading" className="max-w-3xl mx-auto">
				<h1 id="hero-heading" className="text-2xl font-bold">
					子育て拠点スケジュールハブ
				</h1>
				<p className="mt-2 text-sm text-gray-600">
					名古屋市内の子育て応援拠点のスケジュールを、ひと目で確認できます。
				</p>
				{/* 将来の検索フォームプレースホルダー */}
				<div className="mt-4 h-12 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
					検索フォーム（ポストMVP予定）
				</div>
			</section>

			<section aria-labelledby="favorites-heading" className="max-w-5xl mx-auto">
				<div className="flex items-center justify-between mb-2">
					<h2 id="favorites-heading" className="text-lg font-semibold">
						よく使う拠点
					</h2>
					<p className="text-xs text-gray-500">最大30拠点まで保存されます（この端末のみ）</p>
				</div>
				{/* 仮のカード群（後で動的に差し替え） */}
				<div className="flex gap-3 overflow-x-auto">
					<button className="min-w-[160px] rounded-md border px-3 py-2 text-left text-sm">
						★ 拠点A（仮）
					</button>
					<button className="min-w-[160px] rounded-md border px-3 py-2 text-left text-sm">
						★ 拠点B（仮）
					</button>
				</div>
			</section>

			<section aria-labelledby="facilities-heading" className="max-w-5xl mx-auto">
				<h2 id="facilities-heading" className="text-lg font-semibold mb-3">
					拠点一覧
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{/* 仮カード（実際は Supabase から取得） */}
					<article className="rounded-md border p-3 text-sm">
						<h3 className="font-medium">〇〇子育て応援拠点（仮）</h3>
						<p className="text-xs text-gray-500 mt-1">中区 / 名古屋市中区1-1-1</p>
						<div className="mt-2 h-24 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">
							スケジュール画像 or Instagram 埋め込み（プレースホルダー）
						</div>
					</article>
				</div>
			</section>
		</main>
	);
}
