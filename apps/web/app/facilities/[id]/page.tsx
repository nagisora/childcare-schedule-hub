import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getFacilityById } from '../../../lib/facilities';
import { getWardName } from '../../../lib/facilities-utils';

/**
 * 拠点詳細ページ（ポストMVP想定）
 * MVP では最小限の実装（拠点情報とスケジュール表示のプレースホルダー）
 * [02 設計資料](../../../docs/02-design.md) 4.2節を参照
 *
 * 今後の拡張予定:
 * - スケジュールセクション: Instagram埋め込みや月切り替えUIの追加
 * - リンクセクション: 必要に応じてInstagram埋め込みや詳細情報の追加
 *
 * Next.js 15 以降では、動的ルートの params は Promise として渡されるため、
 * プロパティを参照する前に await する必要がある。
 */
export default async function FacilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const facility = await getFacilityById(id);

	if (!facility) {
		notFound();
	}

	return (
		<main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
			<div>
				<Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
					← トップページに戻る
				</Link>
			</div>

			<header>
				<h1 className="text-2xl font-bold text-slate-900">{facility.name}</h1>
				<p className="mt-2 text-sm text-slate-600">
					{getWardName(facility.ward_name)} — {facility.address_full_raw}
				</p>
				{facility.phone && <p className="mt-1 text-sm text-slate-600">電話: {facility.phone}</p>}
			</header>

			{/* スケジュールセクション: 将来はInstagram埋め込みや月切り替えUIを追加 */}
			<section aria-labelledby="schedule-heading">
				<h2 id="schedule-heading" className="text-xl font-semibold mb-4 text-slate-900">
					スケジュール
				</h2>
				<div className="rounded-xl border bg-slate-50 p-8 text-center">
					<p className="text-sm text-slate-600">
						スケジュール表示機能は準備中です。ポストMVPで実装予定です。
					</p>
				</div>
			</section>

			{/* リンクセクション: 外部SNS・公式サイトへのリンク */}
			{(facility.instagram_url || facility.website_url) && (
				<section aria-labelledby="links-heading">
					<h2 id="links-heading" className="text-xl font-semibold mb-4 text-slate-900">
						リンク
					</h2>
					<div className="flex flex-wrap gap-4">
						{facility.instagram_url && (
							<a
								href={facility.instagram_url}
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm text-blue-600 hover:text-blue-800 underline"
							>
								Instagram
							</a>
						)}
						{facility.website_url && (
							<a
								href={facility.website_url}
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm text-blue-600 hover:text-blue-800 underline"
							>
								公式サイト
							</a>
						)}
					</div>
				</section>
			)}
		</main>
	);
}

