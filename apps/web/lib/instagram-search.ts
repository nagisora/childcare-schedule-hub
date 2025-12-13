/**
 * Instagram検索関連のユーティリティ関数
 * Google Custom Search API を使用した検索クエリ生成・URL正規化・スコアリング
 * 
 * 参照: docs/instagram-integration/03-design-decisions.md（検索クエリ設計と判定ルール）
 */

/**
 * 検索結果の候補（正規化済み）
 */
export interface Candidate {
	/** 正規化済みプロフィールURL（https://www.instagram.com/<username>/） */
	link: string;
	/** 検索結果のタイトル */
	title: string;
	/** 検索結果のスニペット */
	snippet: string;
	/** スコア（5点以上が採用候補） */
	score: number;
	/** デバッグ用: スコア算出理由（任意） */
	reasons?: string[];
}

/**
 * Google Custom Search API のレスポンス項目
 */
interface GoogleCSEItem {
	link: string;
	title: string;
	snippet: string;
}

/**
 * 検索クエリの優先順位（4パターン）
 * docs/instagram-integration/03-design-decisions.md の優先順位に従う
 */
export function generateSearchQueries(facilityName: string, wardName: string | null): string[] {
	const queries: string[] = [];
	
	// 施設名と区名をエスケープ（特殊文字を含む可能性があるため）
	const escapedFacilityName = `"${facilityName}"`;
	const escapedWardName = wardName ? `"${wardName}"` : null;
	
	// 1. 最優先: site:instagram.com "<施設名>" "<区名>" 子育て
	if (escapedWardName) {
		queries.push(`site:instagram.com ${escapedFacilityName} ${escapedWardName} 子育て`);
	}
	
	// 2. 第2優先: site:instagram.com "<施設名>" "<区名>"
	if (escapedWardName) {
		queries.push(`site:instagram.com ${escapedFacilityName} ${escapedWardName}`);
	}
	
	// 3. 第3優先: site:instagram.com "<施設名>" 名古屋
	queries.push(`site:instagram.com ${escapedFacilityName} 名古屋`);
	
	// 4. 第4優先: site:instagram.com "<施設名>"
	queries.push(`site:instagram.com ${escapedFacilityName}`);
	
	return queries;
}

/**
 * Instagram URLを正規化する
 * - http → https
 * - m.instagram.com → www.instagram.com
 * - 末尾に / を付与
 * - クエリパラメータ・フラグメントを除去
 * 
 * @param url 元のURL
 * @returns 正規化済みURL（プロフィールURLのみ。投稿URL等は null を返す）
 */
export function normalizeInstagramUrl(url: string): string | null {
	if (!url || typeof url !== 'string') {
		return null;
	}
	
	// 除外パターン: 投稿URL・リールURLなど
	const excludedPatterns = [
		/\/p\//,      // 投稿
		/\/reel\//,  // リール
		/\/tv\//,    // IGTV
		/\/stories\//, // ストーリーズ
	];
	
	for (const pattern of excludedPatterns) {
		if (pattern.test(url)) {
			return null; // 除外
		}
	}
	
	try {
		const urlObj = new URL(url);
		
		// Instagram以外のドメインは除外
		if (!urlObj.hostname.includes('instagram.com')) {
			return null;
		}
		
		// クエリパラメータ・フラグメントを除去
		urlObj.search = '';
		urlObj.hash = '';
		
		// http → https
		if (urlObj.protocol === 'http:') {
			urlObj.protocol = 'https:';
		}
		
		// m.instagram.com → www.instagram.com
		if (urlObj.hostname === 'm.instagram.com') {
			urlObj.hostname = 'www.instagram.com';
		}
		
		// パスが空または / のみの場合は / を付与
		let path = urlObj.pathname;
		if (!path || path === '/') {
			path = '/';
		} else if (!path.endsWith('/')) {
			path += '/';
		}
		urlObj.pathname = path;
		
		return urlObj.toString();
	} catch {
		// URL解析エラー時は null を返す
		return null;
	}
}

/**
 * 検索結果のスコアを算出する
 * docs/instagram-integration/03-design-decisions.md のスコアリング観点に従う
 * 
 * @param item 検索結果項目
 * @param facilityName 施設名
 * @param wardName 区名（null可）
 * @returns スコアと理由
 */
export function scoreCandidate(
	item: GoogleCSEItem,
	facilityName: string,
	wardName: string | null
): { score: number; reasons: string[] } {
	let score = 0;
	const reasons: string[] = [];
	
	// 1. 施設名の一致度
	const titleAndSnippet = `${item.title} ${item.snippet}`.toLowerCase();
	const facilityNameLower = facilityName.toLowerCase();
	
	if (titleAndSnippet.includes(facilityNameLower)) {
		score += 3;
		reasons.push('施設名完全一致または部分一致');
	} else {
		// 類似名称チェック（ひらがな/カタカナ/漢字の違いのみ）
		// 簡易実装: 施設名の一部が含まれているか
		const facilityNameParts = facilityNameLower.split(/[・\s]+/);
		const hasPartialMatch = facilityNameParts.some(part => part.length > 1 && titleAndSnippet.includes(part));
		if (hasPartialMatch) {
			score += 2;
			reasons.push('施設名類似（部分一致）');
		}
	}
	
	// 2. エリア情報の一致
	if (wardName) {
		const wardNameLower = wardName.toLowerCase();
		if (titleAndSnippet.includes(wardNameLower)) {
			score += 2;
			reasons.push(`区名一致（${wardName}）`);
		}
	}
	
	if (titleAndSnippet.includes('名古屋')) {
		score += 1;
		reasons.push('名古屋が含まれる');
	}
	
	// 3. 子育て拠点関連のワード
	const childcareKeywords = ['子育て', '応援拠点', '支援拠点', '子育て応援', '地域子育て'];
	for (const keyword of childcareKeywords) {
		if (titleAndSnippet.includes(keyword)) {
			score += 2;
			reasons.push(`子育て拠点関連ワード（${keyword}）`);
			break; // 1つ見つかれば十分
		}
	}
	
	// 4. プロフィールURL形式の確認
	const normalizedUrl = normalizeInstagramUrl(item.link);
	if (normalizedUrl) {
		// 正規化できた = プロフィールURL形式
		score += 1;
		reasons.push('プロフィールURL形式');
	} else {
		// 投稿URLや共有リンクなどは除外（-10点）
		score -= 10;
		reasons.push('投稿URL/共有リンク（除外）');
	}
	
	return { score, reasons };
}

/**
 * Google CSE の検索結果を正規化・スコアリングして候補リストに変換する
 * 
 * @param items Google CSE の検索結果配列
 * @param facilityName 施設名
 * @param wardName 区名（null可）
 * @returns 正規化済み候補リスト（スコア5点以上のみ。スコア降順）
 */
export function processSearchResults(
	items: GoogleCSEItem[],
	facilityName: string,
	wardName: string | null
): Candidate[] {
	const candidates: Candidate[] = [];
	
	for (const item of items) {
		// URL正規化
		const normalizedUrl = normalizeInstagramUrl(item.link);
		if (!normalizedUrl) {
			// 除外パターン（投稿URL等）はスキップ
			continue;
		}
		
		// スコアリング
		const { score, reasons } = scoreCandidate(item, facilityName, wardName);
		
		// スコア5点以上のみを候補として採用
		if (score >= 5) {
			candidates.push({
				link: normalizedUrl,
				title: item.title,
				snippet: item.snippet,
				score,
				reasons,
			});
		}
	}
	
	// スコア降順でソート（同点の場合は元の順序を維持）
	candidates.sort((a, b) => b.score - a.score);
	
	return candidates;
}

