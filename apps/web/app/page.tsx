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
			</section>

			<section aria-labelledby="favorites-heading" className="max-w-6xl mx-auto">
				<div className="flex items-center justify-between mb-3">
					<h2 id="favorites-heading" className="text-xl font-semibold text-slate-900">
						お気に入り拠点
					</h2>
					<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
						2 / 5（最大5件まで登録可）
					</span>
				</div>
				{/* 縦並び（Instagram 埋め込み想定のプレースホルダー + 解除ボタン） */}
				<div className="space-y-4">
					<article className="rounded-xl border bg-white p-3 shadow-sm">
						<header className="flex items-center justify-between">
							<h3 className="text-sm font-medium text-slate-900">拠点A（仮） — 中区</h3>
							<button
								aria-label="お気に入りから削除"
								className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
							>
								解除
							</button>
						</header>
						<div className="mt-3 h-64 rounded-lg bg-slate-50 flex items-center justify-center text-xs text-slate-400">
							Instagram 埋め込み（プレースホルダー）
						</div>
					</article>
					<article className="rounded-xl border bg-white p-3 shadow-sm">
						<header className="flex items-center justify-between">
							<h3 className="text-sm font-medium text-slate-900">拠点B（仮） — 西区</h3>
							<button
								aria-label="お気に入りから削除"
								className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
							>
								解除
							</button>
						</header>
						<div className="mt-3 h-64 rounded-lg bg-slate-50 flex items-center justify-center text-xs text-slate-400">
							Instagram 埋め込み（プレースホルダー）
						</div>
					</article>
				</div>
			</section>

			<section aria-labelledby="facilities-heading" className="max-w-6xl mx-auto">
				<h2 id="facilities-heading" className="text-xl font-semibold mb-4 text-slate-900">
					拠点一覧
				</h2>
				{/* エリア内リンク（ページ内ジャンプ） */}
				<nav className="mb-3 flex flex-wrap gap-2 text-xs text-slate-600">
					<a className="rounded-full border px-2 py-0.5 hover:bg-slate-50" href="#area-中区">
						中区へ
					</a>
					<a className="rounded-full border px-2 py-0.5 hover:bg-slate-50" href="#area-西区">
						西区へ
					</a>
				</nav>
				<div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
					<table className="w-full text-sm">
						<thead className="bg-slate-50 text-slate-600">
							<tr>
								<th className="text-left font-medium px-3 py-2">拠点名</th>
								<th className="text-left font-medium px-3 py-2">エリア</th>
								<th className="text-left font-medium px-3 py-2">住所</th>
								<th className="text-left font-medium px-3 py-2">電話</th>
								<th className="text-left font-medium px-3 py-2">お気に入り</th>
							</tr>
						</thead>
						<tbody>
							{/* 中区 グルーピング見出し */}
							<tr className="bg-slate-50/70">
								<td colSpan={5} className="px-3 py-2 font-semibold text-slate-700" id="area-中区">
									中区
								</td>
							</tr>
							<tr className="border-t">
								<td className="px-3 py-2 font-medium text-slate-900">〇〇子育て応援拠点（仮）</td>
								<td className="px-3 py-2 text-slate-700 whitespace-nowrap">中区</td>
								<td className="px-3 py-2 text-slate-700">名古屋市中区1-1-1</td>
								<td className="px-3 py-2 text-slate-700 whitespace-nowrap">052-000-0000</td>
								<td className="px-3 py-2">
									<button
										aria-label="お気に入りに追加"
										className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
									>
										＋
									</button>
								</td>
							</tr>
							{/* 西区 グルーピング見出し */}
							<tr className="bg-slate-50/70 border-t">
								<td colSpan={5} className="px-3 py-2 font-semibold text-slate-700" id="area-西区">
									西区
								</td>
							</tr>
							<tr className="border-t">
								<td className="px-3 py-2 font-medium text-slate-900">△△子育て支援拠点（仮）</td>
								<td className="px-3 py-2 text-slate-700 whitespace-nowrap">西区</td>
								<td className="px-3 py-2 text-slate-700">名古屋市西区2-2-2</td>
								<td className="px-3 py-2 text-slate-700 whitespace-nowrap">052-111-1111</td>
								<td className="px-3 py-2">
									<button
										aria-label="お気に入りに追加"
										className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
									>
										＋
									</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>
		</main>
	);
}
