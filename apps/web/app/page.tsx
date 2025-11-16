export default function HomePage() {
	return (
		<main className="space-y-12 px-4 py-10">
			<section
				aria-labelledby="hero-heading"
				className="relative max-w-4xl mx-auto rounded-2xl bg-gradient-to-b from-slate-50 to-transparent px-6 py-10"
			>
				<h1 id="hero-heading" className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
					子育て拠点スケジュールハブ
				</h1>
				<p className="mt-3 text-base md:text-lg text-slate-600">
					名古屋市内の子育て応援拠点のスケジュールを、ひと目で確認できます。
				</p>
				{/* 将来の検索フォームプレースホルダー */}
				<div className="mt-6 h-12 rounded-lg border border-dashed border-slate-300/80 bg-white/50 backdrop-blur-sm flex items-center justify-center text-xs text-slate-400">
					検索フォーム（ポストMVP予定）
				</div>
			</section>

			<section aria-labelledby="favorites-heading" className="max-w-6xl mx-auto">
				<div className="flex items-center justify-between mb-3">
					<h2 id="favorites-heading" className="text-xl font-semibold text-slate-900">
						よく使う拠点
					</h2>
					<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
						最大30拠点・この端末のみ
					</span>
				</div>
				{/* 仮のカード群（後で動的に差し替え） */}
				<div className="flex gap-3 overflow-x-auto pb-1">
					<button className="min-w-[180px] rounded-xl border bg-white px-3 py-2 text-left text-sm shadow-sm hover:shadow-md transition">
						★ 拠点A（仮）
					</button>
					<button className="min-w-[180px] rounded-xl border bg-white px-3 py-2 text-left text-sm shadow-sm hover:shadow-md transition">
						★ 拠点B（仮）
					</button>
				</div>
			</section>

			<section aria-labelledby="facilities-heading" className="max-w-6xl mx-auto">
				<h2 id="facilities-heading" className="text-xl font-semibold mb-4 text-slate-900">
					拠点一覧
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
					{/* 仮カード（実際は Supabase から取得） */}
					<article className="rounded-xl border bg-white p-3 text-sm shadow-sm hover:shadow-md transition">
						<h3 className="font-medium text-slate-900">〇〇子育て応援拠点（仮）</h3>
						<p className="text-xs text-slate-500 mt-1">中区 / 名古屋市中区1-1-1</p>
						<div className="mt-3 h-24 rounded-lg bg-slate-50 flex items-center justify-center text-xs text-slate-400">
							スケジュール画像 or Instagram 埋め込み（プレースホルダー）
						</div>
					</article>
				</div>
			</section>
		</main>
	);
}
