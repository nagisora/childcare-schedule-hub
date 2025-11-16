import { HeroSection } from '../components/HeroSection';
import { FavoritesSection } from '../components/FavoritesSection';
import { FacilitiesTable } from '../components/FacilitiesTable';

export default function HomePage() {
	// モックデータ（後で Supabase 連携へ差し替え）
	const favoriteItems = [
		{ name: '拠点A（仮）', area: '中区' },
		{ name: '拠点B（仮）', area: '西区' },
	];
	const limit = 5;
	const areas = ['中区', '西区'];
	const facilitiesByArea = {
		中区: [
			{ name: '〇〇子育て応援拠点（仮）', area: '中区', address: '名古屋市中区1-1-1', phone: '052-000-0000' },
		],
		西区: [
			{ name: '△△子育て支援拠点（仮）', area: '西区', address: '名古屋市西区2-2-2', phone: '052-111-1111' },
		],
	};

	return (
		<main className="space-y-12 px-4 py-10">
			<HeroSection />
			<FavoritesSection items={favoriteItems} limit={limit} />
			<FacilitiesTable areas={areas} facilitiesByArea={facilitiesByArea} />
		</main>
	);
}
