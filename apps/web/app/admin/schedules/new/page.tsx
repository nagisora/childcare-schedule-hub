import { getFacilities } from '../../../../lib/facilities';
import { ScheduleUpsertForm } from './schedule-upsert-form';

export default async function AdminScheduleNewPage() {
	const facilities = await getFacilities();

	return (
		<main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
			<header className="space-y-2">
				<h1 className="text-2xl font-bold text-slate-900">スケジュールURL登録（管理）</h1>
				<p className="text-sm text-slate-600">
					施設×月ごとに Instagram の投稿URL（/p/ または /reel/）を登録します。
				</p>
			</header>

			<section className="rounded-2xl border border-primary-100 bg-white shadow-sm p-4">
				<ScheduleUpsertForm facilities={facilities} />
			</section>
		</main>
	);
}


