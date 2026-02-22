import type { FacilitySchedule } from "../lib/types";
import {
	formatTimeRangeLabel,
	WEEKDAY_COLUMNS,
} from "./facilities-table-utils";

type FacilityScheduleMatrixProps = {
	rows: FacilitySchedule[];
};

export function FacilityScheduleMatrix({ rows }: FacilityScheduleMatrixProps) {
	return (
		<div className="min-w-0 flex-1 overflow-x-auto">
			{rows.length === 0 ? (
				<p className="text-xs text-slate-500">
					開所曜日・開所時間の情報は準備中です。
				</p>
			) : (
				<table className="facility-schedule-table w-max min-w-[424px] table-fixed text-xs">
					<colgroup>
						<col className="w-36" />
						{WEEKDAY_COLUMNS.map((column) => (
							<col key={column.key} className="w-8" />
						))}
					</colgroup>
					<thead className="bg-slate-50 text-slate-700">
						<tr>
							<th
								scope="col"
								className="whitespace-nowrap border border-primary-100 px-2 py-1.5 text-left font-medium align-middle"
							>
								時間
							</th>
							{WEEKDAY_COLUMNS.map((column) => (
								<th
									key={column.key}
									scope="col"
									className="border border-primary-100 px-2 py-1.5 text-center font-medium align-middle"
								>
									{column.label}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="text-slate-700">
						{rows.map((row) => (
							<tr key={row.id}>
								<th
									scope="row"
									className="whitespace-nowrap border border-primary-100 px-2 py-1.5 text-left font-medium align-middle"
								>
									{formatTimeRangeLabel(row.open_time, row.close_time)}
								</th>
								{WEEKDAY_COLUMNS.map((column) => {
									const isOpen = row[column.key];
									return (
										<td
											key={column.key}
											className="border border-primary-100 px-2 py-1.5 text-center align-middle"
										>
											<span className="sr-only">
												{isOpen ? "開所" : "休み"}
											</span>
											<span aria-hidden="true">{isOpen ? "●" : "－"}</span>
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
