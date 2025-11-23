export function HeroSection() {
	return (
		<section
			aria-labelledby="hero-heading"
			className="relative max-w-4xl mx-auto rounded-2xl bg-white px-6 py-10 border border-primary-100 shadow-sm"
		>
			<h1 id="hero-heading" className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
				子育て拠点スケジュールハブ
			</h1>
			<p className="mt-3 text-base md:text-lg text-slate-600">
				名古屋市内の子育て応援拠点のスケジュールを、ひと目で確認できます。
			</p>
		</section>
	);
}


