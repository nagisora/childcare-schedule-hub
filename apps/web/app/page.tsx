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
						最大5拠点・この端末のみ
					</span>
				</div>
				{/* 仮のリスト（後で動的に差し替え） */}
				<ul className="space-y-2">
					<li className="rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:shadow-md transition">
						★ 拠点A（仮） — 中区 / 名古屋市中区1-1-1
					</li>
					<li className="rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:shadow-md transition">
						★ 拠点B（仮） — 西区 / 名古屋市西区2-2-2
					</li>
				</ul>
			</section>

			<section aria-labelledby="facilities-heading" className="max-w-6xl mx-auto">
				<h2 id="facilities-heading" className="text-xl font-semibold mb-4 text-slate-900">
					拠点一覧
				</h2>
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
