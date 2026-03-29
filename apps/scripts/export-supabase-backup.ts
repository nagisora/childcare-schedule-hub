#!/usr/bin/env tsx

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '../..');

dotenv.config({ path: join(__dirname, '../web/.env.local') });

const args = process.argv.slice(2);

function readOption(name: string): string | null {
	const prefix = `--${name}=`;
	const matched = args.find((arg) => arg.startsWith(prefix));
	return matched ? matched.slice(prefix.length) : null;
}

function hasFlag(name: string): boolean {
	return args.includes(`--${name}`);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const defaultSeedFilePath = join(repoRoot, 'supabase/seed.sql');
const defaultBackupFilePath = join(repoRoot, `apps/scripts/logs/supabase-backup-${timestamp}.json`);
const defaultAuditFilePath = join(repoRoot, `apps/scripts/logs/supabase-audit-${timestamp}.json`);

const seedFilePath = resolve(readOption('seed-file') ?? defaultSeedFilePath);
const backupFilePath = resolve(readOption('backup-file') ?? defaultBackupFilePath);
const auditFilePath = resolve(readOption('audit-file') ?? defaultAuditFilePath);
const skipSeed = hasFlag('skip-seed');

type FacilityRow = {
	id: string;
	name: string;
	address: string | null;
	phone: string | null;
	instagram_url: string | null;
	website_url: string | null;
	created_at: string | null;
	updated_at: string | null;
	facility_type: string | null;
	detail_page_url: string | null;
	prefecture_code: string | null;
	municipality_code: string | null;
	ward_code: string | null;
	postal_code: string | null;
	prefecture_name: string | null;
	city_name: string | null;
	ward_name: string | null;
	address_rest: string | null;
	address_full_raw: string | null;
	latitude: number | null;
	longitude: number | null;
};

type ScheduleRow = {
	id: string;
	facility_id: string;
	image_url: string;
	instagram_post_url: string | null;
	embed_html: string | null;
	published_month: string;
	status: string | null;
	notes: string | null;
	created_at: string | null;
	updated_at: string | null;
};

type FacilityScheduleRow = {
	id: string;
	facility_id: string;
	open_time: string;
	close_time: string;
	monday: boolean;
	tuesday: boolean;
	wednesday: boolean;
	thursday: boolean;
	friday: boolean;
	saturday: boolean;
	sunday: boolean;
	holiday: boolean;
	created_at: string | null;
	updated_at: string | null;
};

type AuditSummary = {
	generated_at: string;
	public_repo_safe_tables: string[];
	non_public_resources: {
		auth_user_count: number;
		storage_bucket_count: number;
		storage_bucket_names: string[];
	};
	row_counts: {
		facilities: number;
		schedules: number;
		facility_schedules: number;
	};
	notes: string[];
};

function compareNullableString(a: string | null, b: string | null): number {
	return (a ?? '').localeCompare(b ?? '');
}

const FACILITY_COLUMNS: Array<keyof FacilityRow> = [
	'id',
	'name',
	'address',
	'phone',
	'instagram_url',
	'website_url',
	'created_at',
	'updated_at',
	'facility_type',
	'detail_page_url',
	'prefecture_code',
	'municipality_code',
	'ward_code',
	'postal_code',
	'prefecture_name',
	'city_name',
	'ward_name',
	'address_rest',
	'address_full_raw',
	'latitude',
	'longitude',
];

const SCHEDULE_COLUMNS: Array<keyof ScheduleRow> = [
	'id',
	'facility_id',
	'image_url',
	'instagram_post_url',
	'embed_html',
	'published_month',
	'status',
	'notes',
	'created_at',
	'updated_at',
];

const FACILITY_SCHEDULE_COLUMNS: Array<keyof FacilityScheduleRow> = [
	'id',
	'facility_id',
	'open_time',
	'close_time',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday',
	'holiday',
	'created_at',
	'updated_at',
];

function assertRequiredEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function ensureParentDirectory(filePath: string): void {
	mkdirSync(dirname(filePath), { recursive: true });
}

function sqlLiteral(value: string | number | boolean | null): string {
	if (value === null) return 'NULL';
	if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
	if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
	return `'${value.replace(/'/g, "''")}'`;
}

function buildInsertStatement<T extends Record<string, string | number | boolean | null>>(
	tableName: string,
	columns: Array<keyof T>,
	rows: T[],
): string[] {
	if (rows.length === 0) {
		return [`-- ${tableName}: no rows`];
	}

	const columnList = columns.join(', ');
	const values = rows.map((row) => {
		const rowValues = columns.map((column) => sqlLiteral(row[column] ?? null)).join(', ');
		return `  (${rowValues})`;
	});

	return [
		`INSERT INTO public.${tableName} (${columnList}) VALUES`,
		`${values.join(',\n')};`,
	];
}

async function fetchAllRows<T extends Record<string, unknown>>(
	supabase: SupabaseClient,
	table: string,
	orderColumn: string,
	ascending = true,
	pageSize = 1000,
): Promise<T[]> {
	const allRows: T[] = [];
	let from = 0;

	while (true) {
		const to = from + pageSize - 1;
		const { data, error } = await supabase
			.from(table)
			.select('*')
			.order(orderColumn, { ascending })
			.range(from, to);

		if (error) {
			throw new Error(`Failed to fetch ${table}: ${error.message}`);
		}

		const rows = (data ?? []) as T[];
		allRows.push(...rows);

		if (rows.length < pageSize) {
			return allRows;
		}

		from += pageSize;
	}
}

async function main(): Promise<void> {
	const supabaseUrl = assertRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
	const serviceRoleKey = assertRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	});

	const [facilities, schedules, facilitySchedules] = await Promise.all([
		fetchAllRows<FacilityRow>(supabase, 'facilities', 'id'),
		fetchAllRows<ScheduleRow>(supabase, 'schedules', 'id'),
		fetchAllRows<FacilityScheduleRow>(supabase, 'facility_schedules', 'id'),
	]);

	facilities.sort((left, right) => compareNullableString(left.id, right.id));
	schedules.sort((left, right) => {
		const byFacility = compareNullableString(left.facility_id, right.facility_id);
		if (byFacility !== 0) return byFacility;
		const byMonth = compareNullableString(left.published_month, right.published_month);
		if (byMonth !== 0) return byMonth;
		return compareNullableString(left.id, right.id);
	});
	facilitySchedules.sort((left, right) => {
		const byFacility = compareNullableString(left.facility_id, right.facility_id);
		if (byFacility !== 0) return byFacility;
		const byOpen = compareNullableString(left.open_time, right.open_time);
		if (byOpen !== 0) return byOpen;
		const byClose = compareNullableString(left.close_time, right.close_time);
		if (byClose !== 0) return byClose;
		return compareNullableString(left.id, right.id);
	});

	const authUsersResponse = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
	if (authUsersResponse.error) {
		throw new Error(`Failed to list auth users: ${authUsersResponse.error.message}`);
	}

	const storageBucketsResponse = await supabase.storage.listBuckets();
	if (storageBucketsResponse.error) {
		throw new Error(`Failed to list storage buckets: ${storageBucketsResponse.error.message}`);
	}

	const storageBucketNames = (storageBucketsResponse.data ?? []).map((bucket) => bucket.name).sort();
	const auditSummary: AuditSummary = {
		generated_at: new Date().toISOString(),
		public_repo_safe_tables: ['public.facilities', 'public.schedules', 'public.facility_schedules'],
		non_public_resources: {
			auth_user_count: authUsersResponse.data.users.length,
			storage_bucket_count: storageBucketNames.length,
			storage_bucket_names: storageBucketNames,
		},
		row_counts: {
			facilities: facilities.length,
			schedules: schedules.length,
			facility_schedules: facilitySchedules.length,
		},
		notes: [
			'This backup is designed for a public GitHub repository.',
			'Public tables are exported to supabase/seed.sql for reproducible restores.',
			'Local JSON backup is gitignored and intended to remain on the operator machine only.',
		],
	};

	const backupPayload = {
		...auditSummary,
		tables: {
			facilities,
			schedules,
			facility_schedules: facilitySchedules,
		},
		auth_users: authUsersResponse.data.users,
		storage_buckets: storageBucketsResponse.data ?? [],
	};

	ensureParentDirectory(backupFilePath);
	ensureParentDirectory(auditFilePath);
	writeFileSync(backupFilePath, `${JSON.stringify(backupPayload, null, 2)}\n`, 'utf8');
	writeFileSync(auditFilePath, `${JSON.stringify(auditSummary, null, 2)}\n`, 'utf8');

	if (!skipSeed) {
		const seedLines = [
			'-- Generated by apps/scripts/export-supabase-backup.ts',
			`-- Generated at: ${auditSummary.generated_at}`,
			'-- Intended for repository-safe restoration of public application data only.',
			'BEGIN;',
			'',
			'TRUNCATE TABLE public.facility_schedules, public.schedules, public.facilities RESTART IDENTITY CASCADE;',
			'',
			`-- facilities (${facilities.length} rows)`,
			...buildInsertStatement<FacilityRow>('facilities', FACILITY_COLUMNS, facilities),
			'',
			`-- facility_schedules (${facilitySchedules.length} rows)`,
			...buildInsertStatement<FacilityScheduleRow>('facility_schedules', FACILITY_SCHEDULE_COLUMNS, facilitySchedules),
			'',
			`-- schedules (${schedules.length} rows)`,
			...buildInsertStatement<ScheduleRow>('schedules', SCHEDULE_COLUMNS, schedules),
			'',
			'COMMIT;',
			'',
		];

		ensureParentDirectory(seedFilePath);
		writeFileSync(seedFilePath, seedLines.join('\n'), 'utf8');
	}

	console.log(`facilities=${facilities.length}`);
	console.log(`facility_schedules=${facilitySchedules.length}`);
	console.log(`schedules=${schedules.length}`);
	console.log(`auth_users=${authUsersResponse.data.users.length}`);
	console.log(`storage_buckets=${storageBucketNames.length}`);
	console.log(`backup_file=${backupFilePath}`);
	console.log(`audit_file=${auditFilePath}`);
	if (!skipSeed) {
		console.log(`seed_file=${seedFilePath}`);
	}
}

main().catch((error) => {
	console.error('[ERROR] Failed to export Supabase backup:', error instanceof Error ? error.message : String(error));
	process.exit(1);
});
