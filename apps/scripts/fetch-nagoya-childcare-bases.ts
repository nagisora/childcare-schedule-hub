#!/usr/bin/env tsx
/**
 * 名古屋市の子育て応援拠点・地域子育て支援拠点一覧をスクレイピングし、
 * Supabase の `facilities` テーブルに投入するスクリプト
 *
 * 使用方法:
 *   - 通常モード（Supabase に直接書き込み）: pnpm tsx fetch-nagoya-childcare-bases.ts
 *   - dry-run モード（JSON出力のみ）: pnpm tsx fetch-nagoya-childcare-bases.ts --dry-run
 */

import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

// 環境変数の読み込み（.env.local から）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../web/.env.local') });

// コマンドライン引数の解析
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// 施設種別の定義
const FACILITY_TYPES = {
  OUEN: 'childcare_ouen_base' as const,
  SHIEN: 'childcare_support_base' as const,
} as const;

// 対象URL
const TARGET_URLS = {
  OUEN: 'https://www.kosodate.city.nagoya.jp/play/ouenkyoten.html',
  SHIEN: 'https://www.kosodate.city.nagoya.jp/play/supportbases.html',
} as const;

// 名古屋市のコード値（固定値）
const NAGOYA_PREFECTURE_CODE = '23';
const NAGOYA_MUNICIPALITY_CODE = '23100';
const NAGOYA_PREFECTURE_NAME = '愛知県';
const NAGOYA_CITY_NAME = '名古屋市';

// 名古屋市の区コードマッピング
const NAGOYA_WARD_CODE_MAP: Readonly<Record<string, string>> = {
  '中区': '23101',
  '北区': '23102',
  '西区': '23103',
  '中村区': '23104',
  '中川区': '23105',
  '港区': '23106',
  '南区': '23107',
  '守山区': '23108',
  '緑区': '23109',
  '名東区': '23110',
  '天白区': '23111',
  '東区': '23112',
  '瑞穂区': '23113',
  '熱田区': '23114',
  '昭和区': '23115',
  '千種区': '23116',
} as const;

// 型定義
interface FacilityRaw {
  name: string;
  facility_type: typeof FACILITY_TYPES.OUEN | typeof FACILITY_TYPES.SHIEN;
  prefecture_code: string;
  municipality_code: string;
  ward_code: string | null;
  postal_code: string | null;
  prefecture_name: string;
  city_name: string;
  ward_name: string | null;
  address_rest: string | null;
  address_full_raw: string | null;
  phone: string | null;
  instagram_url: string | null;
  website_url: string | null;
  detail_page_url: string | null;
}

/**
 * HTMLページを取得してパースする（リトライ付き）
 * ネットワークエラーやHTTPステータスエラー時に最大3回まで再試行（指数バックオフ）
 * [04 開発ガイド](../docs/04-development.md) 9.5.1 節のスクレイピングガイドラインに準拠
 */
async function fetchAndParse(url: string, retryCount: number = 0): Promise<cheerio.CheerioAPI> {
  const maxRetries = 3;
  const backoffDelays = [500, 1000, 2000]; // 指数バックオフ: 500ms → 1s → 2s

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ChildcareScheduleHub/1.0 (+https://childcare-schedule-hub.example.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    return cheerio.load(html);
  } catch (error) {
    if (retryCount < maxRetries) {
      const delay = backoffDelays[retryCount] || 2000;
      console.log(`[INFO] Retrying fetch ${url} (attempt ${retryCount + 1}/${maxRetries}) after ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchAndParse(url, retryCount + 1);
    }
    // 最終失敗時は既存と同様に Error を投げる
    throw new Error(`Failed to fetch ${url} after ${maxRetries} retries: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 住所文字列から郵便番号を抽出する
 */
function extractPostalCode(address: string): string | null {
  const match = address.match(/〒(\d{3}-\d{4})/);
  return match ? match[1] : null;
}

/**
 * 区名以降の住所を抽出する
 */
function extractAddressRest(address: string, wardName: string, prefix: string = ''): string {
  const pattern = prefix ? new RegExp(`${prefix}${wardName}(.+)`) : new RegExp(`^${wardName}(.+)`);
  const match = address.match(pattern);
  return match ? match[1].trim() : '';
}

/**
 * 住所文字列から区名を抽出する（名古屋市の場合）
 */
function extractWardName(address: string): { wardName: string | null; wardCode: string | null; addressRest: string } {
  // パターン1: 「名古屋市XX区」のパターンを探す
  let match = address.match(/名古屋市([^区]+区)/);
  if (match) {
    const wardName = match[1];
    const wardCode = NAGOYA_WARD_CODE_MAP[wardName] || null;
    const addressRest = extractAddressRest(address, wardName, '名古屋市');
    return { wardName, wardCode, addressRest };
  }

  // パターン2: 「XX区」で始まるパターン（名古屋市が省略されている場合）
  match = address.match(/^([^区]+区)/);
  if (match) {
    const wardName = match[1];
    const wardCode = NAGOYA_WARD_CODE_MAP[wardName] || null;
    if (wardCode) {
      const addressRest = extractAddressRest(address, wardName);
      return { wardName, wardCode, addressRest };
    }
  }

  return { wardName: null, wardCode: null, addressRest: address };
}

/**
 * テーブル行から施設情報を抽出する
 */
function extractFacilityFromRow(
  $: cheerio.CheerioAPI,
  $row: cheerio.Cheerio<cheerio.Element>,
  facilityType: typeof FACILITY_TYPES.OUEN | typeof FACILITY_TYPES.SHIEN
): FacilityRaw | null {
  const cells = $row.find('td').toArray();
  if (cells.length < 3) {
    return null; // 最低限の列がない場合はスキップ
  }

  // 列構成（実際のページ構造に基づく）:
  // 0: 拠点名（リンク付き）
  // 1: 住所（郵便番号含む）
  // 2: エリア（区名）
  // 3: 電話番号（あれば）

  const nameCell = $(cells[0]);
  const nameLink = nameCell.find('a').first();
  const name = nameLink.text().trim() || nameCell.text().trim();
  const detailPageUrl = nameLink.attr('href') || null;
  // 相対URLの場合は絶対URLに変換
  const absoluteDetailPageUrl = detailPageUrl
    ? detailPageUrl.startsWith('http')
      ? detailPageUrl
      : `https://www.kosodate.city.nagoya.jp${detailPageUrl.startsWith('/') ? '' : '/'}${detailPageUrl}`
    : null;

  // セルの内容を確認して適切にマッピング
  // cells[1]とcells[2]のどちらが住所かを判定
  const cell1Text = $(cells[1]).text().trim() || '';
  const cell2Text = $(cells[2]).text().trim() || '';
  
  // 郵便番号（〒）が含まれている方を住所とする
  let addressFull: string | null = null;
  
  if (cell1Text.includes('〒')) {
    addressFull = cell1Text;
  } else if (cell2Text.includes('〒')) {
    addressFull = cell2Text;
  } else {
    // 郵便番号がない場合は、cells[1]を住所とする
    addressFull = cell1Text || null;
  }
  
  const phone = cells.length > 3 ? $(cells[3]).text().trim() || null : null;

  if (!name || !addressFull) {
    return null; // 必須項目が欠けている場合はスキップ
  }

  const postalCode = addressFull ? extractPostalCode(addressFull) : null;
  const { wardName, wardCode, addressRest } = addressFull ? extractWardName(addressFull) : { wardName: null, wardCode: null, addressRest: null };

  return {
    name,
    facility_type: facilityType,
    prefecture_code: NAGOYA_PREFECTURE_CODE,
    municipality_code: NAGOYA_MUNICIPALITY_CODE,
    ward_code: wardCode,
    postal_code: postalCode,
    prefecture_name: NAGOYA_PREFECTURE_NAME,
    city_name: NAGOYA_CITY_NAME,
    ward_name: wardName,
    address_rest: addressRest,
    address_full_raw: addressFull,
    phone,
    instagram_url: null, // 名古屋市ページには含まれない
    website_url: null, // 名古屋市ページには含まれない
    detail_page_url: absoluteDetailPageUrl,
  };
}

/**
 * 応援拠点ページから施設情報を取得する
 */
async function fetchOuenFacilities(): Promise<FacilityRaw[]> {
  console.log(`[INFO] Fetching 子育て応援拠点 from ${TARGET_URLS.OUEN}...`);
  const $ = await fetchAndParse(TARGET_URLS.OUEN);

  // テーブルを探す（実際のページ構造に合わせて調整が必要）
  const facilities: FacilityRaw[] = [];
  const tables = $('table').toArray();

  for (const table of tables) {
    const rows = $(table).find('tbody tr, tr').toArray();
    for (const row of rows) {
      const facility = extractFacilityFromRow($, $(row), FACILITY_TYPES.OUEN);
      if (facility) {
        facilities.push(facility);
      }
    }
  }

  const count = facilities.length;
  console.log(`[INFO] Extracted ${count} facilities from 子育て応援拠点 page`);

  // HTML構造変更の可能性を警告（抽出件数が0件の場合）
  if (count === 0) {
    console.warn(`[WARN] Extracted 0 facilities from ${TARGET_URLS.OUEN}. HTML structure may have changed.`);
  }

  return facilities;
}

/**
 * 支援拠点ページから施設情報を取得する
 */
async function fetchShienFacilities(): Promise<FacilityRaw[]> {
  console.log(`[INFO] Fetching 地域子育て支援拠点 from ${TARGET_URLS.SHIEN}...`);
  const $ = await fetchAndParse(TARGET_URLS.SHIEN);

  // テーブルを探す（実際のページ構造に合わせて調整が必要）
  const facilities: FacilityRaw[] = [];
  const tables = $('table').toArray();

  for (const table of tables) {
    const rows = $(table).find('tbody tr, tr').toArray();
    for (const row of rows) {
      const facility = extractFacilityFromRow($, $(row), FACILITY_TYPES.SHIEN);
      if (facility) {
        facilities.push(facility);
      }
    }
  }

  const count = facilities.length;
  console.log(`[INFO] Extracted ${count} facilities from 地域子育て支援拠点 page`);

  // HTML構造変更の可能性を警告（抽出件数が0件の場合）
  if (count === 0) {
    console.warn(`[WARN] Extracted 0 facilities from ${TARGET_URLS.SHIEN}. HTML structure may have changed.`);
  }

  return facilities;
}

/**
 * Supabase に施設情報を投入する
 */
async function upsertFacilities(facilities: FacilityRaw[]): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`[INFO] Upserting ${facilities.length} facilities to Supabase...`);

  // バッチ処理（Supabase の制限に合わせて分割）
  const batchSize = 100;
  for (let i = 0; i < facilities.length; i += batchSize) {
    const batch = facilities.slice(i, i + batchSize);
    const { error } = await supabase.from('facilities').upsert(batch, {
      onConflict: 'id', // 将来的には name + facility_type + municipality_code の組み合わせで一意制約を追加
      ignoreDuplicates: false,
    });

    if (error) {
      console.error(`[ERROR] Failed to upsert batch ${i / batchSize + 1}:`, error);
      throw error;
    }

    console.log(`[INFO] Upserted batch ${i / batchSize + 1} (${batch.length} facilities)`);
  }

  console.log(`[INFO] Successfully upserted ${facilities.length} facilities to Supabase`);
}

/**
 * ログをファイルに出力する
 * [04 開発ガイド](../docs/04-development.md) 9.5.4 節のログ保存方針に準拠
 */
function writeLogFile(logLines: string[]): void {
  const logsDir = join(__dirname, 'logs');
  try {
    mkdirSync(logsDir, { recursive: true });
  } catch (error) {
    // ディレクトリが既に存在する場合は無視
    if (error && typeof error === 'object' && 'code' in error && error.code !== 'EEXIST') {
      console.warn(`[WARN] Failed to create logs directory: ${error}`);
      return;
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, -5);
  const logFilename = join(logsDir, `fetch-nagoya-${timestamp}.log`);
  const logContent = logLines.join('\n') + '\n';

  try {
    writeFileSync(logFilename, logContent, 'utf-8');
    console.log(`[INFO] Log file written: ${logFilename}`);
  } catch (error) {
    console.warn(`[WARN] Failed to write log file: ${error}`);
  }
}

/**
 * メイン処理
 */
async function main() {
  const logLines: string[] = [];
  const log = (message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(message);
    logLines.push(logMessage);
  };
  const logError = (message: string, error?: unknown) => {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? `${message}: ${error.message}` : `${message}: ${String(error)}`;
    const logMessage = `[${timestamp}] [ERROR] ${errorMessage}`;
    console.error(`[ERROR] ${errorMessage}`);
    logLines.push(logMessage);
  };
  const logWarn = (message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [WARN] ${message}`;
    console.warn(`[WARN] ${message}`);
    logLines.push(logMessage);
  };

  try {
    log('[INFO] Starting facility data fetch...');
    log(`[INFO] Target URLs: ${TARGET_URLS.OUEN}, ${TARGET_URLS.SHIEN}`);
    if (isDryRun) {
      log('[INFO] Running in dry-run mode (JSON output only)');
    }

    // リクエスト間に間隔を設ける（サーバー負荷軽減・最低1秒間隔）
    // [04 開発ガイド](../docs/04-development.md) 9.5.1 節のアクセス頻度制限要件を満たす
    log('[INFO] Fetching 応援拠点 page...');
    const ouenFacilities = await fetchOuenFacilities();
    log(`[INFO] Waiting 1 second before next request (access frequency limit)...`);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機
    log('[INFO] Fetching 支援拠点 page...');
    const shienFacilities = await fetchShienFacilities();

    const allFacilities = [...ouenFacilities, ...shienFacilities];
    log(`[INFO] Total facilities extracted: ${allFacilities.length}`);
    log(`[INFO] Breakdown: 応援拠点 ${ouenFacilities.length}件, 支援拠点 ${shienFacilities.length}件`);

    if (isDryRun) {
      // dry-run モード: JSON を stdout に出力
      console.log(JSON.stringify(allFacilities, null, 2));
      log('[INFO] JSON output completed (dry-run mode)');
    } else {
      // 通常モード: Supabase に投入
      await upsertFacilities(allFacilities);
      log(`[INFO] Successfully upserted ${allFacilities.length} facilities to Supabase`);
    }

    log('[INFO] Completed successfully');
    writeLogFile(logLines);
  } catch (error) {
    logError('Failed to fetch facilities', error);
    writeLogFile(logLines);
    process.exit(1);
  }
}

// スクリプト実行
main();

