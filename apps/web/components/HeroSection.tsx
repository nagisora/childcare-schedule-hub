export function HeroSection() {
	return (
		<section
			aria-labelledby="hero-heading"
			className="relative max-w-4xl mx-auto rounded-2xl bg-white px-6 py-10 border border-primary-100 shadow-sm"
		>
			<h1
				id="hero-heading"
				className="flex flex-wrap items-center gap-x-3 gap-y-2 text-3xl md:text-4xl font-bold tracking-tight text-slate-900"
			>
				<span>子育て拠点スケジュールハブ</span>
				<span className="ml-3 text-xs font-semibold text-primary-700">
					β版
				</span>
			</h1>
			<p className="mt-3 text-base md:text-lg text-slate-600">
				名古屋市内の子育て応援拠点のスケジュールを、ひと目で確認できます。
			</p>
			<p className="mt-2 text-[11px] leading-snug text-slate-500 opacity-60">
				※ β版（試験公開）のため、内容は予告なく更新される場合があります。
			</p>
		</section>
	);
}


