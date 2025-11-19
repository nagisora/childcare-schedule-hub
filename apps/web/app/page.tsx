import { HeroSection } from '../components/HeroSection';
import { FavoritesSection } from '../components/FavoritesSection';
import { FacilitiesTable } from '../components/FacilitiesTable';
import { getFacilities, groupFacilitiesByArea } from '../lib/facilities';
import { readFavoritesCookie } from '../lib/cookies-server';
import { matchFavoritesWithFacilities } from '../lib/favorites';

/**
 * トップページ（サーバーコンポーネント）
 * Supabase から拠点一覧を取得し、エリア別にグルーピングして表示する
 * [04 開発ガイド](../docs/04-development.md) 5.7節を参照
 * 
 * ISR: 60分間キャッシュ（[02 設計資料](../docs/02-design.md) 2.3節参照）
 */
export const revalidate = 3600; // 60分（3600秒）

export default async function HomePage() {
	// Supabase から拠点一覧を取得
	const facilities = await getFacilities();
	const { areas, facilitiesByArea } = groupFacilitiesByArea(facilities);

	// お気に入りをクッキーから取得し、Facility データとマッチング
	const favoriteCookieItems = await readFavoritesCookie();
	const favoriteFacilities = matchFavoritesWithFacilities(favoriteCookieItems, facilities);
	const limit = 5;

	return (
		<main className="space-y-12 px-4 py-10">
			<HeroSection />
			<FavoritesSection initialFavorites={favoriteFacilities} allFacilities={facilities} limit={limit} />
			<FacilitiesTable areas={areas} facilitiesByArea={facilitiesByArea} />
		</main>
	);
}
