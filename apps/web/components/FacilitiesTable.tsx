type FacilityMock = {
	name: string;
	area: string;
	address: string;
	phone: string;
};

type FacilitiesTableProps = {
	areas: string[];
	facilitiesByArea: Record<string, FacilityMock[]>;
};

export function FacilitiesTable({ areas, facilitiesByArea }: FacilitiesTableProps) {
	return (
		<section aria-labelledby="facilities-heading" className="max-w-6xl mx-auto">
			<h2 id="facilities-heading" className="text-xl font-semibold mb-4 text-slate-900">
				拠点一覧
			</h2>
			<nav className="mb-3 flex flex-wrap gap-2 text-xs text-slate-600">
				{areas.map((area) => (
					<a key={area} className="rounded-full border px-2 py-0.5 hover:bg-slate-50" href={`#area-${area}`}>
						{area}へ
					</a>
				))}
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
						{areas.map((area) => (
							<>
								<tr key={`hdr-${area}`} className="bg-slate-50/70 border-t">
									<td colSpan={5} className="px-3 py-2 font-semibold text-slate-700" id={`area-${area}`}>
										{area}
									</td>
								</tr>
								{(facilitiesByArea[area] || []).map((f, idx) => (
									<tr key={`${area}-${idx}`} className="border-t">
										<td className="px-3 py-2 font-medium text-slate-900">{f.name}</td>
										<td className="px-3 py-2 text-slate-700 whitespace-nowrap">{f.area}</td>
										<td className="px-3 py-2 text-slate-700">{f.address}</td>
										<td className="px-3 py-2 text-slate-700 whitespace-nowrap">{f.phone}</td>
										<td className="px-3 py-2">
											<button
												aria-label="お気に入りに追加"
												className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
											>
												＋
											</button>
										</td>
									</tr>
								))}
							</>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}


