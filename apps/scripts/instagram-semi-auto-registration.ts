#!/usr/bin/env tsx
/**
 * InstagramアカウントURLの半自動登録ツール（PoC）
 * 
 * 対象施設に対して `/api/instagram-search` を呼び出し、候補を提示して
 * 人間が採用/スキップを選ぶフローを実現する
 * 
 * 使用方法:
 *   - DRY-RUN モード（デフォルト、JSON出力のみ）: pnpm tsx instagram-semi-auto-registration.ts
 *   - 更新モード（実際にDBを更新）: pnpm tsx instagram-semi-auto-registration.ts --apply --yes
 * 
 * 参照: docs/05-09-instagram-account-url-coverage.md（タスク5）
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import * as readline from 'readline';

// 環境変数の読み込み（.env.local から）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../web/.env.local') });

// コマンドライン引数の解析
const args = process.argv.slice(2);
const isApply = args.includes('--apply');
const isYes = args.includes('--yes');
const targetWard = args.find(arg => arg.startsWith('--ward='))?.split('=')[1] || '東区'; // デフォルトは東区
const strategy = args.find(arg => arg.startsWith('--strategy='))?.split('=')[1] || 'score'; // デフォルトは score
const compareStrategies = args.includes('--compare-strategies');

// 型定義
interface Facility {
	id: string;
	name: string;
	ward_name: string | null;
	instagram_url: string | null;
}

interface Candidate {
	link: string;
	title: string;
	snippet: string;
	score: number;
	reasons?: string[];
}

interface SearchResult {
	candidates: Candidate[];
	triedQueries: string[];
}

interface RegistrationResult {
	facilityId: string;
	facilityName: string;
	wardName: string | null;
	action: 'adopted' | 'skipped' | 'not_found';
	instagramUrl: string | null;
	candidates: Candidate[];
	triedQueries: string[];
	reason?: string;
}

/**
 * readline インターフェースを作成
 */
function createReadlineInterface(): readline.Interface {
	return readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
}

/**
 * ユーザーに質問して回答を得る
 */
function askQuestion(rl: readline.Interface, question: string): Promise<string> {
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			resolve(answer.trim());
		});
	});
}

/**
 * Supabase から対象施設を取得
 */
async function fetchTargetFacilities(supabase: ReturnType<typeof createClient>): Promise<Facility[]> {
	const { data, error } = await supabase
		.from('facilities')
		.select('id,name,ward_name,instagram_url')
		.eq('ward_name', targetWard)
		.is('instagram_url', null)
		.order('name', { ascending: true });

	if (error) {
		throw new Error(`Failed to fetch facilities: ${error.message}`);
	}

	return (data || []) as Facility[];
}

/**
 * `/api/instagram-search` を呼び出す
 */
async function searchInstagramAccount(facilityId: string, searchStrategy: string = 'score'): Promise<SearchResult> {
	const apiUrl = new URL('http://localhost:3000/api/instagram-search');
	apiUrl.searchParams.set('facilityId', facilityId);
	apiUrl.searchParams.set('strategy', searchStrategy);
	
	const adminToken = process.env.ADMIN_API_TOKEN;
	if (!adminToken) {
		throw new Error('ADMIN_API_TOKEN is not configured');
	}

	const response = await fetch(apiUrl.toString(), {
		method: 'GET',
		headers: {
			'x-admin-token': adminToken,
		},
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(`API error: ${response.status} ${errorData.error?.message || response.statusText}`);
	}

	return await response.json() as SearchResult;
}

/**
 * 候補を表示してユーザーに選択を求める
 */
async function promptForSelection(
	rl: readline.Interface,
	facilityName: string,
	candidates: Candidate[],
	searchStrategy: string = 'score'
): Promise<'adopt' | 'skip' | 'not_found'> {
	if (candidates.length === 0) {
		console.log(`\n[${facilityName}] 候補が見つかりませんでした。`);
		return 'not_found';
	}

	if (searchStrategy === 'rank') {
		console.log(`\n[${facilityName}] 候補が見つかりました（rank戦略: 上位1〜3件）:`);
	} else {
		console.log(`\n[${facilityName}] 候補が見つかりました（スコア5点以上、最大9点）:`);
	}
	candidates.forEach((candidate, index) => {
		console.log(`  ${index + 1}. ${candidate.link}`);
		if (searchStrategy === 'rank') {
			console.log(`     スコア: ${candidate.score}点（参考情報）`);
		} else {
			console.log(`     スコア: ${candidate.score}点 / 最大9点`);
		}
		if (candidate.reasons && candidate.reasons.length > 0) {
			console.log(`     理由: ${candidate.reasons.join(', ')}`);
		}
		console.log(`     タイトル: ${candidate.title}`);
		console.log(`     スニペット: ${candidate.snippet.substring(0, 100)}...`);
	});

	try {
		const answer = await askQuestion(
			rl,
			`\n採用する候補の番号を入力（1-${candidates.length}）、または 's' でスキップ、'n' で未特定: `
		);

		if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'skip') {
			return 'skip';
		}

		if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'not_found') {
			return 'not_found';
		}

		const index = parseInt(answer, 10) - 1;
		if (index >= 0 && index < candidates.length) {
			return 'adopt';
		}

		// 無効な入力の場合はスキップ
		console.log('無効な入力です。スキップします。');
		return 'skip';
	} catch (error) {
		// readlineが閉じられた場合（非対話環境など）の処理
		if (error instanceof Error && error.message.includes('closed')) {
			if (searchStrategy === 'rank') {
				// rank戦略の場合は自動採用を禁止（安全装置）
				console.log('\n[注意] 非対話環境では rank 戦略の自動採用を行いません。スキップします。');
				return 'skip';
			} else {
				// score戦略の場合は従来通り自動採用候補として扱う
				console.log('\n[注意] 対話型入力が利用できないため、最初の候補（最高スコア）を採用候補として記録します。');
				return 'adopt';
			}
		}
		throw error;
	}
}

/**
 * 候補を比較表示する（score/rankの両方を表示）
 */
function displayComparison(
	facilityName: string,
	scoreResult: SearchResult,
	rankResult: SearchResult
): void {
	console.log(`\n[${facilityName}] 戦略比較:`);
	
	console.log('\n--- Strategy: score ---');
	if (scoreResult.candidates.length === 0) {
		console.log('  候補なし');
	} else {
		scoreResult.candidates.forEach((candidate, index) => {
			console.log(`  ${index + 1}. ${candidate.link}`);
			console.log(`     スコア: ${candidate.score}点`);
			if (candidate.reasons && candidate.reasons.length > 0) {
				console.log(`     理由: ${candidate.reasons.join(', ')}`);
			}
		});
	}
	console.log(`  試したクエリ: ${scoreResult.triedQueries.length}件`);
	
	console.log('\n--- Strategy: rank ---');
	if (rankResult.candidates.length === 0) {
		console.log('  候補なし');
	} else {
		rankResult.candidates.forEach((candidate, index) => {
			console.log(`  ${index + 1}. ${candidate.link}`);
			console.log(`     スコア: ${candidate.score}点（参考情報）`);
			if (candidate.reasons && candidate.reasons.length > 0) {
				console.log(`     理由: ${candidate.reasons.join(', ')}`);
			}
		});
	}
	console.log(`  試したクエリ: ${rankResult.triedQueries.length}件`);
}

/**
 * 施設の instagram_url を更新
 */
async function updateFacilityInstagramUrl(
	supabase: ReturnType<typeof createClient>,
	facilityId: string,
	instagramUrl: string
): Promise<void> {
	const { error } = await supabase
		.from('facilities')
		.update({ instagram_url: instagramUrl })
		.eq('id', facilityId);

	if (error) {
		throw new Error(`Failed to update facility: ${error.message}`);
	}
}

/**
 * バックアップファイルに書き込む
 */
function writeBackup(facilities: Facility[]): string {
	const logsDir = join(__dirname, 'logs');
	try {
		mkdirSync(logsDir, { recursive: true });
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code !== 'EEXIST') {
			console.warn(`[WARN] Failed to create logs directory: ${error}`);
			return '';
		}
	}

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, -5);
	const backupFilename = join(logsDir, `instagram-backup-${timestamp}.json`);
	const backupData = {
		timestamp: new Date().toISOString(),
		facilities: facilities.map(f => ({
			id: f.id,
			name: f.name,
			ward_name: f.ward_name,
			instagram_url: f.instagram_url,
		})),
	};

	try {
		writeFileSync(backupFilename, JSON.stringify(backupData, null, 2), 'utf-8');
		console.log(`[INFO] Backup file written: ${backupFilename}`);
		return backupFilename;
	} catch (error) {
		console.warn(`[WARN] Failed to write backup file: ${error}`);
		return '';
	}
}

/**
 * 結果ファイルに書き込む
 */
function writeResults(results: RegistrationResult[]): string {
	const logsDir = join(__dirname, 'logs');
	try {
		mkdirSync(logsDir, { recursive: true });
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code !== 'EEXIST') {
			console.warn(`[WARN] Failed to create logs directory: ${error}`);
			return '';
		}
	}

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, -5);
	const resultFilename = join(logsDir, `instagram-registration-${timestamp}.json`);
	const resultData = {
		timestamp: new Date().toISOString(),
		targetWard,
		isDryRun: !isApply,
		results,
	};

	try {
		writeFileSync(resultFilename, JSON.stringify(resultData, null, 2), 'utf-8');
		console.log(`[INFO] Result file written: ${resultFilename}`);
		return resultFilename;
	} catch (error) {
		console.warn(`[WARN] Failed to write result file: ${error}`);
		return '';
	}
}

/**
 * メイン処理
 */
async function main() {
	const logger = {
		info: (message: string) => console.log(`[INFO] ${message}`),
		warn: (message: string) => console.warn(`[WARN] ${message}`),
		error: (message: string, error?: unknown) => {
			const errorMessage = error instanceof Error ? `${message}: ${error.message}` : `${message}: ${String(error)}`;
			console.error(`[ERROR] ${errorMessage}`);
		},
	};

		try {
			logger.info('Starting Instagram semi-auto registration...');
			logger.info(`Target ward: ${targetWard}`);
			logger.info(`Mode: ${isApply ? 'APPLY' : 'DRY-RUN'}`);
			logger.info(`Strategy: ${strategy}`);
			if (compareStrategies) {
				logger.info('Compare strategies: enabled (DRY-RUN only)');
			}
			
			// --compare-strategies と --apply は同時指定不可
			if (compareStrategies && isApply) {
				logger.error('--compare-strategies cannot be used with --apply (DRY-RUN only)');
				process.exit(1);
			}
			
			// strategy のバリデーション
			if (strategy !== 'score' && strategy !== 'rank') {
				logger.error(`Invalid strategy: ${strategy}. Must be "score" or "rank"`);
				process.exit(1);
			}

		// Supabase クライアントの初期化
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

		if (!supabaseUrl || !supabaseServiceKey) {
			throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
		}

		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		// 対象施設を取得
		logger.info(`Fetching facilities with ward_name='${targetWard}' AND instagram_url IS NULL...`);
		const facilities = await fetchTargetFacilities(supabase);
		logger.info(`Found ${facilities.length} facilities`);

		if (facilities.length === 0) {
			logger.info('No facilities to process. Exiting.');
			return;
		}

		// 更新モードの場合、バックアップを作成
		if (isApply) {
			if (!isYes) {
				logger.error('--apply mode requires --yes flag for confirmation');
				process.exit(1);
			}
			logger.info('Creating backup...');
			writeBackup(facilities);
		}

		// readline インターフェースを作成
		const rl = createReadlineInterface();

		const results: RegistrationResult[] = [];

		// 各施設を処理
		for (const facility of facilities) {
			try {
				logger.info(`\nProcessing: ${facility.name} (${facility.id})`);

				let searchResult: SearchResult;
				
				if (compareStrategies) {
					// 比較モード: score/rank の両方を取得して表示
					const [scoreResult, rankResult] = await Promise.all([
						searchInstagramAccount(facility.id, 'score'),
						searchInstagramAccount(facility.id, 'rank'),
					]);
					
					displayComparison(facility.name, scoreResult, rankResult);
					
					// 比較モードでは score の結果を使って選択を求める
					searchResult = scoreResult;
				} else {
					// 通常モード: 指定された strategy で検索
					searchResult = await searchInstagramAccount(facility.id, strategy);
				}
				
				logger.info(`  Tried queries: ${searchResult.triedQueries.length}`);

				// 候補を提示して選択を求める
				const selection = await promptForSelection(rl, facility.name, searchResult.candidates, strategy);

				let result: RegistrationResult;
				if (selection === 'adopt' && searchResult.candidates.length > 0) {
					// 最初の候補（最高スコア）を採用
					const selectedCandidate = searchResult.candidates[0];
					result = {
						facilityId: facility.id,
						facilityName: facility.name,
						wardName: facility.ward_name,
						action: 'adopted',
						instagramUrl: selectedCandidate.link,
						candidates: searchResult.candidates,
						triedQueries: searchResult.triedQueries,
					};

					// 更新モードの場合、実際に更新
					if (isApply) {
						await updateFacilityInstagramUrl(supabase, facility.id, selectedCandidate.link);
						logger.info(`  Updated: ${selectedCandidate.link}`);
					} else {
						logger.info(`  [DRY-RUN] Would update: ${selectedCandidate.link}`);
					}
				} else if (selection === 'skip') {
					result = {
						facilityId: facility.id,
						facilityName: facility.name,
						wardName: facility.ward_name,
						action: 'skipped',
						instagramUrl: null,
						candidates: searchResult.candidates,
						triedQueries: searchResult.triedQueries,
						reason: 'User skipped',
					};
					logger.info('  Skipped');
				} else {
					result = {
						facilityId: facility.id,
						facilityName: facility.name,
						wardName: facility.ward_name,
						action: 'not_found',
						instagramUrl: null,
						candidates: searchResult.candidates,
						triedQueries: searchResult.triedQueries,
						reason: 'No candidates found or user marked as not found',
					};
					logger.info('  Not found');
				}

				results.push(result);
			} catch (error) {
				logger.error(`Failed to process facility ${facility.name}`, error);
				results.push({
					facilityId: facility.id,
					facilityName: facility.name,
					wardName: facility.ward_name,
					action: 'not_found',
					instagramUrl: null,
					candidates: [],
					triedQueries: [],
					reason: error instanceof Error ? error.message : String(error),
				});
			}
		}

		rl.close();

		// 結果をファイルに保存
		writeResults(results);

		// サマリーを表示
		const adopted = results.filter(r => r.action === 'adopted').length;
		const skipped = results.filter(r => r.action === 'skipped').length;
		const notFound = results.filter(r => r.action === 'not_found').length;

		logger.info('\n=== Summary ===');
		logger.info(`Total: ${results.length}`);
		logger.info(`Adopted: ${adopted}`);
		logger.info(`Skipped: ${skipped}`);
		logger.info(`Not found: ${notFound}`);
		logger.info(`Mode: ${isApply ? 'APPLY (updated)' : 'DRY-RUN (no updates)'}`);

		logger.info('Completed successfully');
	} catch (error) {
		logger.error('Failed to run registration tool', error);
		process.exit(1);
	}
}

// スクリプト実行
main();

