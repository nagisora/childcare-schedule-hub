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
import { mkdirSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'fs';
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
const autoAdopt = args.includes('--auto-adopt');

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
	selectedIndex?: number; // 採用した候補のインデックス（0始まり）
}

/**
 * 決定アクションの結果
 */
interface DecisionResult {
	action: 'adopt' | 'skip' | 'not_found';
	selectedIndex?: number; // 採用する候補のインデックス（0始まり）
	reason: string; // 機械可読なreasonコード
}

/**
 * 選択/自動採用の判定ロジック（純粋関数）
 */
function decideAction(params: {
	candidates: Candidate[];
	strategy: string;
	isInteractive: boolean;
	autoAdopt: boolean;
	userInput?: string; // 対話モードの場合のユーザー入力（'1', 's', 'n'など）
}): DecisionResult {
	const { candidates, strategy, isInteractive, autoAdopt, userInput } = params;

	// 候補が0件の場合
	if (candidates.length === 0) {
		return {
			action: 'not_found',
			reason: 'no_candidates',
		};
	}

	// 対話モードの場合
	if (isInteractive && userInput !== undefined) {
		const input = userInput.trim().toLowerCase();

		// スキップ
		if (input === 's' || input === 'skip') {
			return {
				action: 'skip',
				reason: 'user_skipped',
			};
		}

		// 未特定としてマーク
		if (input === 'n' || input === 'not_found') {
			return {
				action: 'not_found',
				reason: 'user_marked_not_found',
			};
		}

		// 候補番号の入力
		const index = parseInt(input, 10) - 1;
		if (index >= 0 && index < candidates.length) {
			return {
				action: 'adopt',
				selectedIndex: index,
				reason: 'user_selected',
			};
		}

		// 無効な入力の場合はスキップ
		return {
			action: 'skip',
			reason: 'invalid_input',
		};
	}

	// 非対話モードの場合
	if (!isInteractive) {
		// strategy=rank または strategy=hybrid の場合
		if (strategy === 'rank' || strategy === 'hybrid') {
			if (!autoAdopt) {
				// --auto-adopt が指定されていない場合はスキップ
				return {
					action: 'skip',
					reason: 'auto_adopt_disabled',
				};
			}

			// --auto-adopt が指定されている場合
			if (candidates.length === 1) {
				// 候補1件のみの場合は自動採用
				return {
					action: 'adopt',
					selectedIndex: 0,
					reason: 'auto_adopt_single_candidate',
				};
			} else {
				// 候補が2件以上の場合は未特定として記録
				return {
					action: 'not_found',
					reason: 'auto_adopt_blocked_multiple_candidates',
				};
			}
		} else {
			// strategy=score の場合は従来通り最初の候補を採用
			return {
				action: 'adopt',
				selectedIndex: 0,
				reason: 'non_interactive_score_strategy',
			};
		}
	}

	// 通常はここには到達しないが、念のため
	return {
		action: 'not_found',
		reason: 'unknown_condition',
	};
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
 * 候補を表示してユーザーに選択を求める（対話モード）
 */
async function promptForSelection(
	rl: readline.Interface,
	facilityName: string,
	candidates: Candidate[],
	searchStrategy: string = 'score'
): Promise<DecisionResult> {
	if (candidates.length === 0) {
		console.log(`\n[${facilityName}] 候補が見つかりませんでした。`);
		return {
			action: 'not_found',
			reason: 'no_candidates',
		};
	}

	if (searchStrategy === 'rank') {
		console.log(`\n[${facilityName}] 候補が見つかりました（rank戦略: 上位1〜3件）:`);
	} else if (searchStrategy === 'hybrid') {
		console.log(`\n[${facilityName}] 候補が見つかりました（hybrid戦略: rank主経路+score再評価）:`);
	} else {
		console.log(`\n[${facilityName}] 候補が見つかりました（スコア5点以上、最大9点）:`);
	}
	candidates.forEach((candidate, index) => {
		console.log(`  ${index + 1}. ${candidate.link}`);
		if (searchStrategy === 'rank') {
			console.log(`     スコア: ${candidate.score}点（参考情報）`);
		} else if (searchStrategy === 'hybrid') {
			console.log(`     スコア: ${candidate.score}点（score降順で並べ替え済み）`);
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

		return decideAction({
			candidates,
			strategy: searchStrategy,
			isInteractive: true,
			autoAdopt: false, // 対話モードでは autoAdopt は使用しない
			userInput: answer,
		});
	} catch (error) {
		// readlineが閉じられた場合（非対話環境など）の処理
		if (error instanceof Error && error.message.includes('closed')) {
			// 非対話環境の場合は decideAction を直接呼び出す
			const result = decideAction({
				candidates,
				strategy: searchStrategy,
				isInteractive: false,
				autoAdopt: autoAdopt, // グローバル変数を参照
			});

			// ログメッセージを出力
			if (searchStrategy === 'rank' || searchStrategy === 'hybrid') {
				if (!autoAdopt) {
					console.log(`\n[注意] 非対話環境では ${searchStrategy} 戦略の自動採用を行いません。スキップします。`);
				} else if (result.action === 'adopt') {
					console.log('\n[注意] 対話型入力が利用できないため、候補1件を自動採用します。');
				} else if (result.action === 'not_found' && result.reason === 'auto_adopt_blocked_multiple_candidates') {
					console.log('\n[注意] 候補が複数あるため、未特定として記録します。');
				}
			} else {
				console.log('\n[注意] 対話型入力が利用できないため、最初の候補（最高スコア）を採用候補として記録します。');
			}

			return result;
		}
		throw error;
	}
}

/**
 * 候補を比較表示する（rank/hybridの両方を表示）
 */
function displayComparison(
	facilityName: string,
	rankResult: SearchResult,
	hybridResult: SearchResult
): void {
	console.log(`\n[${facilityName}] 戦略比較:`);
	
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
	
	console.log('\n--- Strategy: hybrid ---');
	if (hybridResult.candidates.length === 0) {
		console.log('  候補なし');
	} else {
		hybridResult.candidates.forEach((candidate, index) => {
			console.log(`  ${index + 1}. ${candidate.link}`);
			console.log(`     スコア: ${candidate.score}点（score降順で並べ替え済み）`);
			if (candidate.reasons && candidate.reasons.length > 0) {
				console.log(`     理由: ${candidate.reasons.join(', ')}`);
			}
		});
	}
	console.log(`  試したクエリ: ${hybridResult.triedQueries.length}件`);
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
		strategy,
		autoAdopt,
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
 * レビュー用サマリファイル（未特定のみ）を書き込む（JSON形式）
 */
function writeReviewSummary(results: RegistrationResult[]): string {
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
	const reviewFilename = join(logsDir, `instagram-review-${timestamp}.json`);
	
	// action: not_found のみを抽出
	const notFoundResults = results.filter(r => r.action === 'not_found');
	
	const reviewData = {
		timestamp: new Date().toISOString(),
		targetWard,
		summary: {
			total: results.length,
			notFound: notFoundResults.length,
		},
		notFoundFacilities: notFoundResults.map(r => ({
			facilityId: r.facilityId,
			facilityName: r.facilityName,
			wardName: r.wardName,
			reason: r.reason,
			candidateLinks: r.candidates.map(c => c.link),
			triedQueries: r.triedQueries,
		})),
	};

	try {
		writeFileSync(reviewFilename, JSON.stringify(reviewData, null, 2), 'utf-8');
		if (notFoundResults.length > 0) {
			console.log(`[INFO] Review summary file (JSON) written: ${reviewFilename} (${notFoundResults.length} facilities marked as not_found)`);
		}
		return reviewFilename;
	} catch (error) {
		console.warn(`[WARN] Failed to write review summary file: ${error}`);
		return '';
	}
}

/**
 * reasonコードを日本語メッセージに変換する
 */
function getReasonMessage(reason: string): string {
	const reasonMap: Record<string, string> = {
		'no_candidates': '候補が見つかりませんでした',
		'user_skipped': 'ユーザーがスキップしました',
		'user_marked_not_found': 'ユーザーが未特定としてマークしました',
		'user_selected': 'ユーザーが選択しました',
		'invalid_input': '無効な入力です',
		'auto_adopt_disabled': '非対話環境では自動採用が無効です（--auto-adopt 未指定）',
		'auto_adopt_single_candidate': '候補1件のみのため自動採用しました',
		'auto_adopt_blocked_multiple_candidates': '候補が複数あるため',
		'non_interactive_score_strategy': '非対話環境でのscore戦略により自動採用しました',
		'error_api_failed': 'API呼び出しに失敗しました',
		'unknown_condition': '不明な条件です',
	};

	const message = reasonMap[reason] || reason;
	// 日本語メッセージ（英語コード）の形式で返す
	return `${message}（${reason}）`;
}

/**
 * レビュー用サマリファイル（未特定のみ）をMarkdown形式で書き込む
 */
function writeReviewSummaryMarkdown(results: RegistrationResult[]): string {
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
	const reviewMarkdownFilename = join(logsDir, `instagram-review-${timestamp}.md`);
	
	// action: not_found のみを抽出
	const notFoundResults = results.filter(r => r.action === 'not_found');
	
	if (notFoundResults.length === 0) {
		// 未特定施設がない場合はファイルを作成しない
		return '';
	}

	const now = new Date();
	const timestampStr = now.toISOString().replace('T', ' ').slice(0, -5);

	// Markdown形式のコンテンツを生成
	let markdown = `# Instagram URL 未特定施設一覧\n\n`;
	markdown += `**実行日時:** ${timestampStr}\n`;
	markdown += `**対象区:** ${targetWard}\n\n`;
	markdown += `## 未特定施設 (${notFoundResults.length}件)\n\n`;

	for (const result of notFoundResults) {
		markdown += `### ${result.facilityName}\n`;
		markdown += `- **理由:** ${result.reason ? getReasonMessage(result.reason) : '不明'}\n`;
		markdown += `- **区名:** ${result.wardName || 'N/A'}\n`;
		markdown += `- **施設ID:** ${result.facilityId}\n\n`;

		if (result.candidates.length > 0) {
			markdown += `#### 候補一覧 (${result.candidates.length}件)\n\n`;
			markdown += `> **使い方:** 正しい候補のチェックボックス（\`- [ ]\`）に \`x\` を入れて（\`- [x]\`）保存してください。保存後、AIに「このMarkdownファイルのチェック済み候補をDB更新して」と依頼すると更新されます。\n\n`;
			result.candidates.forEach((candidate, index) => {
				markdown += `- [ ] **候補${index + 1}:** ${candidate.link}\n`;
				markdown += `  - **タイトル:** ${candidate.title}\n`;
				// スニペットは長い場合は最初の200文字程度に制限
				const snippetPreview = candidate.snippet.length > 200 
					? candidate.snippet.substring(0, 200) + '...'
					: candidate.snippet;
				markdown += `  - **スニペット:** ${snippetPreview}\n`;
				if (candidate.reasons && candidate.reasons.length > 0) {
					markdown += `  - **判定理由:** ${candidate.reasons.join(', ')}\n`;
				}
				markdown += `  - **スコア:** ${candidate.score}点\n\n`;
			});
		}

		if (result.triedQueries && result.triedQueries.length > 0) {
			markdown += `#### 試した検索クエリ\n`;
			result.triedQueries.forEach(query => {
				markdown += `- \`${query}\`\n`;
			});
			markdown += `\n`;
		}

		markdown += `---\n\n`;
	}

	markdown += `## 注意事項\n\n`;
	markdown += `- このファイルは自動生成されたレビュー用サマリです\n`;
	markdown += `- 各候補を確認し、正しいInstagram URLのチェックボックスにチェック（\`- [x]\`）を入れて保存してください\n`;
	markdown += `- チェック済みの候補は、AIに「このMarkdownファイルのチェック済み候補をDB更新して」と依頼すると更新されます\n`;

	try {
		writeFileSync(reviewMarkdownFilename, markdown, 'utf-8');
		console.log(`[INFO] Review summary file (Markdown) written: ${reviewMarkdownFilename}`);
		return reviewMarkdownFilename;
	} catch (error) {
		console.warn(`[WARN] Failed to write review summary Markdown file: ${error}`);
		return '';
	}
}

/**
 * logsディレクトリの古いファイルをクリーンナップする
 * - 各タイプ（registration, review, backup）ごとに最新N件を保持
 * - バックアップファイルは少し長めに保持（重要度が高いため）
 */
function cleanupOldLogFiles() {
	const logsDir = join(__dirname, 'logs');
	
	try {
		const files = readdirSync(logsDir);
		
		// ファイルタイプごとにグループ化
		const fileGroups: Record<string, Array<{ name: string; path: string; mtime: Date }>> = {
			registration: [],
			review: [],
			backup: [],
		};
		
		for (const file of files) {
			const filePath = join(logsDir, file);
			try {
				const stats = statSync(filePath);
				if (!stats.isFile()) continue;
				
				if (file.startsWith('instagram-registration-') && file.endsWith('.json')) {
					fileGroups.registration.push({ name: file, path: filePath, mtime: stats.mtime });
				} else if (file.startsWith('instagram-review-')) {
					if (file.endsWith('.json')) {
						fileGroups.review.push({ name: file, path: filePath, mtime: stats.mtime });
					} else if (file.endsWith('.md')) {
						fileGroups.review.push({ name: file, path: filePath, mtime: stats.mtime });
					}
				} else if (file.startsWith('instagram-backup-') && file.endsWith('.json')) {
					fileGroups.backup.push({ name: file, path: filePath, mtime: stats.mtime });
				}
			} catch (error) {
				// ファイルが削除されたなどでアクセスできない場合はスキップ
				continue;
			}
		}
		
		// 各グループを更新日時でソート（新しい順）
		for (const groupKey of Object.keys(fileGroups)) {
			fileGroups[groupKey].sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
		}
		
		// 保持件数の設定
		const keepCounts = {
			registration: 30, // 最新30件のregistrationファイルを保持
			review: 30,       // 最新30件のreviewファイルを保持（JSON + MD 合わせて）
			backup: 50,       // 最新50件のbackupファイルを保持（重要度が高いため）
		};
		
		// 古いファイルを削除
		let deletedCount = 0;
		for (const [groupKey, groupFiles] of Object.entries(fileGroups)) {
			const keepCount = keepCounts[groupKey as keyof typeof keepCounts];
			const toDelete = groupFiles.slice(keepCount);
			
			for (const file of toDelete) {
				try {
					unlinkSync(file.path);
					deletedCount++;
				} catch (error) {
					// 削除に失敗しても続行（ログだけ出力）
					console.warn(`[WARN] Failed to delete old log file: ${file.name}`);
				}
			}
		}
		
		if (deletedCount > 0) {
			console.log(`[INFO] Cleaned up ${deletedCount} old log files`);
		}
	} catch (error) {
		// クリーンナップに失敗しても処理は続行
		console.warn(`[WARN] Failed to cleanup old log files: ${error}`);
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
			if (autoAdopt) {
				logger.info('Auto-adopt: enabled (non-interactive rank strategy will adopt single candidate)');
			}
			if (compareStrategies) {
				logger.info('Compare strategies: enabled (DRY-RUN only)');
			}
			
			// --compare-strategies と --apply は同時指定不可
			if (compareStrategies && isApply) {
				logger.error('--compare-strategies cannot be used with --apply (DRY-RUN only)');
				process.exit(1);
			}
			
			// strategy のバリデーション
			if (strategy !== 'score' && strategy !== 'rank' && strategy !== 'hybrid') {
				logger.error(`Invalid strategy: ${strategy}. Must be "score", "rank", or "hybrid"`);
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
			// 対象施設がなくても、クリーンナップは実行する
			cleanupOldLogFiles();
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
					// 比較モード: rank/hybrid の両方を取得して表示（rank主経路を維持するため）
					const [rankResult, hybridResult] = await Promise.all([
						searchInstagramAccount(facility.id, 'rank'),
						searchInstagramAccount(facility.id, 'hybrid'),
					]);
					
					displayComparison(facility.name, rankResult, hybridResult);
					
					// 比較モードでは rank の結果を使って選択を求める（rank主経路を維持）
					searchResult = rankResult;
				} else {
					// 通常モード: 指定された strategy で検索
					searchResult = await searchInstagramAccount(facility.id, strategy);
				}
				
				logger.info(`  Tried queries: ${searchResult.triedQueries.length}`);

				// 候補を提示して選択を求める（対話/非対話の判定は promptForSelection 内で行う）
				const decision = await promptForSelection(rl, facility.name, searchResult.candidates, strategy);

				let result: RegistrationResult;
				if (decision.action === 'adopt' && decision.selectedIndex !== undefined && searchResult.candidates.length > 0) {
					// 選択された候補を採用
					const selectedCandidate = searchResult.candidates[decision.selectedIndex];
					result = {
						facilityId: facility.id,
						facilityName: facility.name,
						wardName: facility.ward_name,
						action: 'adopted',
						instagramUrl: selectedCandidate.link,
						candidates: searchResult.candidates,
						triedQueries: searchResult.triedQueries,
						reason: decision.reason,
						selectedIndex: decision.selectedIndex,
					};

					// 更新モードの場合、実際に更新
					if (isApply) {
						await updateFacilityInstagramUrl(supabase, facility.id, selectedCandidate.link);
						logger.info(`  Updated: ${selectedCandidate.link}`);
					} else {
						logger.info(`  [DRY-RUN] Would update: ${selectedCandidate.link}`);
					}
				} else if (decision.action === 'skip') {
					result = {
						facilityId: facility.id,
						facilityName: facility.name,
						wardName: facility.ward_name,
						action: 'skipped',
						instagramUrl: null,
						candidates: searchResult.candidates,
						triedQueries: searchResult.triedQueries,
						reason: decision.reason,
					};
					logger.info(`  Skipped (reason: ${decision.reason})`);
				} else {
					result = {
						facilityId: facility.id,
						facilityName: facility.name,
						wardName: facility.ward_name,
						action: 'not_found',
						instagramUrl: null,
						candidates: searchResult.candidates,
						triedQueries: searchResult.triedQueries,
						reason: decision.reason,
					};
					logger.info(`  Not found (reason: ${decision.reason})`);
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
					reason: `error_api_failed: ${error instanceof Error ? error.message : String(error)}`,
				});
			}
		}

		rl.close();

		// 結果をファイルに保存
		const resultFilename = writeResults(results);
		
		// レビュー用サマリ（未特定のみ）を書き込む（JSON形式）
		const reviewFilename = writeReviewSummary(results);
		if (reviewFilename) {
			logger.info(`Review summary (JSON, not_found only): ${reviewFilename}`);
		}
		
		// レビュー用サマリ（未特定のみ）をMarkdown形式で書き込む
		const reviewMarkdownFilename = writeReviewSummaryMarkdown(results);
		if (reviewMarkdownFilename) {
			logger.info(`Review summary (Markdown, not_found only): ${reviewMarkdownFilename}`);
		}

		// 古いログファイルをクリーンナップ（保持: registration/review 30件、backup 50件）
		cleanupOldLogFiles();

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

