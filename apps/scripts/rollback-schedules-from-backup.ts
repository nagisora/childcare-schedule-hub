#!/usr/bin/env tsx
/**
 * バックアップJSONから schedules をロールバックする補助スクリプト
 *
 * 使用方法:
 *   pnpm tsx rollback-schedules-from-backup.ts <backup-file-path>
 *
 * 注意:
 * - このスクリプトは破壊的操作を含むため、実行前にバックアップファイルの内容を確認すること
 * - バックアップファイルは `apps/scripts/logs/schedules-backup-*.json` 形式
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../web/.env.local') });

type BackupEntry = {
	facility_id: string;
	published_month: string;
	before: {
		id: string;
		facility_id: string;
		published_month: string;
		instagram_post_url: string | null;
		image_url: string;
		status: string;
		embed_html: string | null;
		notes: string | null;
		created_at?: string;
		updated_at?: string;
	} | null;
	after: {
		facility_id: string;
		published_month: string;
		instagram_post_url: string;
		image_url: string;
		status: string;
	};
};

type BackupData = {
	timestamp: string;
	published_month: string;
	entries: BackupEntry[];
};

async function main(): Promise<void> {
	const backupFilePath = process.argv[2];
	if (!backupFilePath) {
		console.error('[ERROR] Backup file path is required');
		console.error('Usage: pnpm tsx rollback-schedules-from-backup.ts <backup-file-path>');
		process.exit(1);
	}

	// バックアップファイルを読み込む
	let backupData: BackupData;
	try {
		const backupContent = readFileSync(backupFilePath, 'utf-8');
		backupData = JSON.parse(backupContent);
	} catch (error) {
		console.error(`[ERROR] Failed to read backup file: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	}

	console.log(`[INFO] Backup file: ${backupFilePath}`);
	console.log(`[INFO] Backup timestamp: ${backupData.timestamp}`);
	console.log(`[INFO] Published month: ${backupData.published_month}`);
	console.log(`[INFO] Entries: ${backupData.entries.length}`);

	// Supabase接続
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!supabaseUrl || !supabaseServiceKey) {
		throw new Error(
			'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'
		);
	}
	const supabase = createClient(supabaseUrl, supabaseServiceKey);

	// 各エントリをロールバック
	let successCount = 0;
	let errorCount = 0;

	for (const entry of backupData.entries) {
		try {
			if (entry.before === null) {
				// 元々存在しなかった場合は削除
				const { error: deleteError } = await supabase
					.from('schedules')
					.delete()
					.eq('facility_id', entry.facility_id)
					.eq('published_month', entry.published_month);

				if (deleteError) {
					console.error(
						`[ERROR] Failed to delete schedule for facility ${entry.facility_id}: ${deleteError.message}`
					);
					errorCount++;
				} else {
					console.log(`[INFO] Deleted schedule for facility ${entry.facility_id}`);
					successCount++;
				}
			} else {
				// 元の値に戻す
				const { error: updateError } = await supabase
					.from('schedules')
					.update({
						instagram_post_url: entry.before.instagram_post_url,
						image_url: entry.before.image_url,
						status: entry.before.status,
						embed_html: entry.before.embed_html,
						notes: entry.before.notes,
					})
					.eq('facility_id', entry.facility_id)
					.eq('published_month', entry.published_month);

				if (updateError) {
					console.error(
						`[ERROR] Failed to restore schedule for facility ${entry.facility_id}: ${updateError.message}`
					);
					errorCount++;
				} else {
					console.log(`[INFO] Restored schedule for facility ${entry.facility_id}`);
					successCount++;
				}
			}
		} catch (error) {
			console.error(
				`[ERROR] Unexpected error for facility ${entry.facility_id}: ${error instanceof Error ? error.message : String(error)}`
			);
			errorCount++;
		}
	}

	console.log(`[INFO] Rollback completed: ${successCount} success, ${errorCount} errors`);
}

main().catch((e) => {
	console.error('[ERROR] Failed to rollback schedules:', e);
	process.exit(1);
});

