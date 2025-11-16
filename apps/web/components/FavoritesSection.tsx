type FavoriteMock = {
	name: string;
	area: string;
};

type FavoritesSectionProps = {
	items: FavoriteMock[];
	limit: number;
};

export function FavoritesSection({ items, limit }: FavoritesSectionProps) {
	return (
		<section aria-labelledby="favorites-heading" className="max-w-6xl mx-auto">
			<div className="flex items-center justify-between mb-3">
				<h2 id="favorites-heading" className="text-xl font-semibold text-slate-900">
					お気に入り拠点
				</h2>
				<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
					{items.length} / {limit}（最大{limit}件まで登録可）
				</span>
			</div>
			<div className="space-y-4">
				{items.map((it, idx) => (
					<article key={`${it.name}-${idx}`} className="rounded-xl border bg-white p-3 shadow-sm">
						<header className="flex items-center justify-between">
							<h3 className="text-sm font-medium text-slate-900">
								{it.name} — {it.area}
							</h3>
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
				))}
			</div>
		</section>
	);
}


