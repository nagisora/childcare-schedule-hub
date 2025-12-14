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
	// NOTE:
	// - 施設名が「〜/～」等で揺れるケースがあるため、検索クエリには OR を含める
	// - まずは施設名 + instagram を優先し、区名・子育て等で絞りすぎない（取りこぼし防止）
	const queries: string[] = [];

	const facilityVariants = uniqueStrings([
		facilityName,
		normalizeFacilityNameForSearch(facilityName),
	]);
	const facilityTerm = buildOrQuotedTerm(facilityVariants);
	const genericFacilityName = isGenericFacilityName(facilityName);

	if (genericFacilityName) {
		// 「いずみ」等の短い名称は誤検出が多いので、名古屋 + 区 + 子育て文脈を優先
		if (wardName) {
			queries.push(`site:instagram.com ${facilityTerm} 名古屋 "${wardName}" 子育て instagram`);
			queries.push(`site:instagram.com ${facilityTerm} 名古屋 "${wardName}" instagram`);
			queries.push(`site:instagram.com ${facilityTerm} "${wardName}" 子育て instagram`);
		}
		queries.push(`site:instagram.com ${facilityTerm} 名古屋 子育て instagram`);
	} else {
		// 1. 最優先: site:instagram.com <施設名> instagram（Google検索の「施設名 instagram」に寄せる）
		queries.push(`site:instagram.com ${facilityTerm} instagram`);

		// 2. 第2優先: site:instagram.com <施設名>
		queries.push(`site:instagram.com ${facilityTerm}`);

		// 3. 第3優先: site:instagram.com <施設名> "<区名>"（区名は補助）
		if (wardName) {
			queries.push(`site:instagram.com ${facilityTerm} "${wardName}"`);
		}

		// 4. 第4優先: <施設名> instagram（site 制約を外して拾う）
		// 施設名は OR にせず、最初の表記をそのまま使う（クエリが長くなりすぎないように）
		queries.push(`${facilityVariants[0]} instagram`);
	}

	return uniqueStrings(queries).slice(0, 4);
}

function uniqueStrings(values: string[]): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	for (const v of values) {
		const s = (v ?? '').trim();
		if (!s) continue;
		if (seen.has(s)) continue;
		seen.add(s);
		out.push(s);
	}
	return out;
}

function normalizeFacilityNameForSearch(name: string): string {
	// 例: 「あおぞらわらばぁ～」→「あおぞらわらばぁ」
	// - 波ダッシュ系の揺れを除去
	// - 余分な空白を圧縮
	return (name ?? '')
		.replace(/[〜～]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function buildOrQuotedTerm(variants: string[]): string {
	if (variants.length === 0) return '""';
	if (variants.length === 1) return `"${variants[0]}"`;
	return `(${variants.map(v => `"${v}"`).join(' OR ')})`;
}

function normalizeTextForMatch(text: string): string {
	return (text ?? '')
		.toLowerCase()
		// 波ダッシュ系の揺れを統一
		.replace(/[〜～]/g, '')
		// 句読点・記号をある程度除去（マッチの取りこぼし防止）
		.replace(/[・\s]+/g, ' ')
		.trim();
}

function isGenericFacilityName(facilityName: string): boolean {
	const normalized = normalizeFacilityNameForSearch(facilityName);
	// 「いずみ」等、短い名称は誤検出しやすいので“汎用名”として扱う
	if (normalized.length <= 3) return true;
	return false;
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
		
		// プロフィールURLのみ許可（/p/, /reel/ 等は上で除外済み）
		// - /<username>/ 形式（1セグメント）のみを許可
		const rawPath = urlObj.pathname || '/';
		const segments = rawPath.split('/').filter(Boolean);
		if (segments.length !== 1) {
			return null;
		}
		const username = segments[0];
		// 一般的な非プロフィール系パスを除外
		const disallowedFirstSegments = new Set([
			'explore',
			'about',
			'accounts',
			'direct',
			'reels',
			'stories',
		]);
		if (disallowedFirstSegments.has(username.toLowerCase())) {
			return null;
		}
		urlObj.pathname = `/${username}/`;
		
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
	const titleAndSnippetRaw = `${item.title} ${item.snippet}`;
	const titleAndSnippet = normalizeTextForMatch(titleAndSnippetRaw);
	const facilityVariants = uniqueStrings([facilityName, normalizeFacilityNameForSearch(facilityName)])
		.map(v => normalizeTextForMatch(v));
	const genericFacilityName = isGenericFacilityName(facilityName);

	const hasFullMatch = facilityVariants.some(v => v.length >= 2 && titleAndSnippet.includes(v));
	if (hasFullMatch) {
		// 施設名一致を最重要視（取りこぼし防止）
		score += genericFacilityName ? 2 : 4;
		reasons.push(genericFacilityName ? '施設名一致（短い名称のため低め）' : '施設名一致');
	} else {
		// 簡易: 施設名を分割して部分一致（例: 「子育て・支援拠点」等）
		const facilityNameParts = normalizeTextForMatch(facilityName)
			.split(' ')
			.map(s => s.trim())
			.filter(s => s.length > 1);
		const hasPartialMatch = facilityNameParts.some(part => titleAndSnippet.includes(part));
		if (hasPartialMatch) {
			score += genericFacilityName ? 1 : 3;
			reasons.push('施設名部分一致');
		} else {
			// 施設名一致なしは誤検出の温床になるため減点
			score -= genericFacilityName ? 3 : 2;
			reasons.push('施設名一致なし（減点）');
		}
	}
	
	// 2. エリア情報の一致
	if (wardName) {
		const wardNameLower = normalizeTextForMatch(wardName);
		if (wardNameLower && titleAndSnippet.includes(wardNameLower)) {
			score += 2;
			reasons.push(`区名一致（${wardName}）`);
		}
	}

	// 2.5 名古屋（対象ドメインの地理的コンテキスト）
	// NOTE: 本プロジェクトは名古屋市の施設が対象のため、短い施設名の誤検出抑制に使う
	const nagoyaKeywords = ['名古屋市', '名古屋', '愛知'];
	const hasNagoyaContext = nagoyaKeywords.some(k => titleAndSnippet.includes(k));
	if (hasNagoyaContext) {
		score += 1;
		reasons.push('名古屋/愛知が含まれる');
	} else if (genericFacilityName && wardName) {
		// 「いずみ」等の汎用名では、名古屋コンテキストがないと誤検出が多い
		score -= 4;
		reasons.push('名古屋/愛知がない（短い名称の誤検出抑制）');
	}

	// 2.6 明確に別地域っぽいキーワードは強く減点（誤検出抑制）
	const otherAreaKeywords = ['札幌', '北海道', '東京', '大阪', '福岡', '沖縄'];
	const hasOtherArea = otherAreaKeywords.some(k => titleAndSnippet.includes(k));
	if (hasOtherArea && !hasNagoyaContext) {
		score -= 4;
		reasons.push('別地域キーワードが含まれる（減点）');
	}
	
	// 3. 子育て拠点関連のワード
	const childcareKeywords = ['子育て', '応援拠点', '支援拠点', '子育て応援', '地域子育て'];
	let hasChildcareKeyword = false;
	for (const keyword of childcareKeywords) {
		if (titleAndSnippet.includes(keyword)) {
			// 補助要素として扱う（施設名一致より弱め）
			score += 1;
			reasons.push(`子育て拠点関連ワード（${keyword}）`);
			hasChildcareKeyword = true;
			break; // 1つ見つかれば十分
		}
	}
	if (genericFacilityName && !hasChildcareKeyword) {
		// 短い名称は “子育て支援文脈” がないと誤検出しやすい
		score -= 1;
		reasons.push('子育て文脈がない（短い名称の誤検出抑制）');
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

/**
 * rank戦略用: 検索結果からプロフィールURL候補を順位維持して抽出する
 * 
 * クエリ単位の順位を維持しつつ、プロフィールURLに正規化できるもののみを抽出する。
 * 重複URLは最初の出現のみを採用する。
 * 
 * @param items Google CSE の検索結果配列（順位順）
 * @param facilityName 施設名（スコア算出用）
 * @param wardName 区名（null可、スコア算出用）
 * @param limit 最大候補数（デフォルト: 3）
 * @returns 正規化済み候補リスト（順位順、最大limit件）
 */
export function processSearchResultsRank(
	items: GoogleCSEItem[],
	facilityName: string,
	wardName: string | null,
	limit: number = 3
): Candidate[] {
	const candidates: Candidate[] = [];
	const seenUrls = new Set<string>();
	
	for (const item of items) {
		// すでにlimit件に達したら終了
		if (candidates.length >= limit) {
			break;
		}
		
		// URL正規化（プロフィールURLのみ許可）
		const normalizedUrl = normalizeInstagramUrl(item.link);
		if (!normalizedUrl) {
			// 除外パターン（投稿URL等）はスキップ
			continue;
		}
		
		// 重複チェック（同じURLは最初の出現のみ採用）
		if (seenUrls.has(normalizedUrl)) {
			continue;
		}
		seenUrls.add(normalizedUrl);
		
		// スコアも算出して含める（参考情報として。rankでは採用条件に使わない）
		const { score, reasons } = scoreCandidate(item, facilityName, wardName);
		
		candidates.push({
			link: normalizedUrl,
			title: item.title,
			snippet: item.snippet,
			score,
			reasons,
		});
	}
	
	// 順位順を維持（既にitemsの順序を保っているためソート不要）
	return candidates;
}

