import { HeroSection } from '../components/HeroSection';
import { FavoritesSection } from '../components/FavoritesSection';
import { FacilitiesTable } from '../components/FacilitiesTable';
import { getFacilities } from '../lib/facilities';
import { groupFacilitiesByWard } from '../lib/facilities-utils';
import { readFavoritesCookie } from '../lib/cookies-server';
import { matchFavoritesWithFacilities } from '../lib/favorites';
import { MAX_FAVORITES } from '../lib/constants';

/**
 * トップページ（サーバーコンポーネント）
 * Supabase から拠点一覧を取得し、区別にグルーピングして表示する
 * [04 開発ガイド](../docs/04-development.md) 5.7節を参照
 * 
 * ISR: 60分間キャッシュ（[02 設計資料](../docs/02-design.md) 2.3節参照）
 */
export const revalidate = 3600; // 60分（3600秒）

export default async function HomePage() {
	// Supabase から拠点一覧を取得
	const facilities = await getFacilities();
	const { wards, facilitiesByWard } = groupFacilitiesByWard(facilities);

	// お気に入りをクッキーから取得し、Facility データとマッチング
	const favoriteCookieItems = await readFavoritesCookie();
	const favoriteFacilities = matchFavoritesWithFacilities(favoriteCookieItems, facilities);

	// お気に入りIDの配列を取得（Hydrationエラー回避のため）
	const favoriteIds = favoriteFacilities.map((f) => f.facility.id);

	return (
		<main className="space-y-12 px-6 py-10 rounded-2xl">
			<HeroSection />

			<section
				aria-labelledby="favorites-heading"
				className="max-w-6xl mx-auto rounded-2xl border border-primary-100 bg-white shadow-sm px-4 py-4"
			>
				<div className="flex items-center justify-between mb-3">
					<h2 id="favorites-heading" className="text-xl font-semibold text-slate-900">
						お気に入り拠点
					</h2>
					<span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] text-primary-700">
						{favoriteFacilities.length} / {MAX_FAVORITES}（最大{MAX_FAVORITES}件まで登録可）
					</span>
				</div>
				<FavoritesSection initialFavorites={favoriteFacilities} allFacilities={facilities} />
			</section>

			<FacilitiesTable wards={wards} facilitiesByWard={facilitiesByWard} initialFavoriteIds={favoriteIds} />
		</main>
	);
}
