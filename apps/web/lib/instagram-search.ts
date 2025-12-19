export interface Candidate {
	link: string;
	title: string;
	snippet: string;
	score: number;
	reasons?: string[];
}

interface GoogleCSEItem {
	link: string;
	title: string;
	snippet: string;
}

export function generateSearchQueries(facilityName: string, wardName: string | null): string[] {
	const queries: string[] = [];

	const facilityVariants = uniqueStrings(buildFacilityNameVariantsForSearch(facilityName));
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
		// 1. 最優先: site:instagram.com <施設名> 子育て拠点（精度向上のため「子育て拠点」を追加）
		queries.push(`site:instagram.com ${facilityTerm} 子育て拠点`);

		// 2. 第2優先: site:instagram.com <施設名> 子育て（フォールバック）
		queries.push(`site:instagram.com ${facilityTerm} 子育て`);

		// 3. 第3優先: site:instagram.com <施設名>（キーワードなし）
		queries.push(`site:instagram.com ${facilityTerm}`);

		// 4. 第4優先: site:instagram.com <施設名> "<区名>"（区名は補助）
		if (wardName) {
			queries.push(`site:instagram.com ${facilityTerm} "${wardName}"`);
		}

		// 5. 第5優先: <施設名> instagram（site 制約を外して拾う）
		// 施設名は OR にせず、最初の表記をそのまま使う（クエリが長くなりすぎないように）
		queries.push(`${facilityVariants[0]} instagram`);
	}

	return uniqueStrings(queries).slice(0, 4);
}

function uniqueStrings(values: string[]): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	for (const v of values) {
		const s = v.trim();
		if (!s) continue;
		if (seen.has(s)) continue;
		seen.add(s);
		out.push(s);
	}
	return out;
}

function buildFacilityNameVariantsForSearch(name: string): string[] {
	const raw = name.trim();
	if (!raw) return [];

	const normalized = normalizeFacilityNameForSearch(raw);
	const withoutParenContent = normalizeFacilityNameDropParentheticalContent(normalized);
	const expandedParenContent = normalizeFacilityNameExpandParentheticalContent(normalized);

	return uniqueStrings([
		raw,
		normalized,
		withoutParenContent,
		expandedParenContent,
	]).slice(0, 3);
}

function normalizeFacilityNameForSearch(name: string): string {
	return name
		.replace(/[〜～]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function normalizeFacilityNameDropParentheticalContent(name: string): string {
	return name
		.replace(/（[^）]*）/g, ' ')
		.replace(/\([^)]*\)/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function normalizeFacilityNameExpandParentheticalContent(name: string): string {
	return name
		.replace(/[（）()]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function buildOrQuotedTerm(variants: string[]): string {
	if (variants.length === 0) return '""';
	if (variants.length === 1) return `"${variants[0]}"`;
	return `(${variants.map(v => `"${v}"`).join(' OR ')})`;
}

function normalizeTextForMatch(text: string): string {
	return text
		.toLowerCase()
		.replace(/[〜～]/g, '')
		.replace(/[・\s]+/g, ' ')
		.trim();
}

function isGenericFacilityName(facilityName: string): boolean {
	const normalized = normalizeFacilityNameForSearch(facilityName);
	if (normalized.length <= 3) return true;
	return false;
}

export function normalizeInstagramUrl(url: string): string | null {
	if (!url) return null;

	try {
		const urlObj = new URL(url);

		if (!urlObj.hostname.includes('instagram.com')) {
			return null;
		}

		urlObj.search = '';
		urlObj.hash = '';

		if (urlObj.protocol === 'http:') {
			urlObj.protocol = 'https:';
		}

		if (urlObj.hostname === 'm.instagram.com') {
			urlObj.hostname = 'www.instagram.com';
		}

		const rawPath = urlObj.pathname || '/';
		const segments = rawPath.split('/').filter(Boolean);
		if (segments.length !== 1) {
			return null;
		}
		const username = segments[0];
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
		return null;
	}
}

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
		score += genericFacilityName ? 2 : 4;
		reasons.push(genericFacilityName ? '施設名一致（短い名称のため低め）' : '施設名一致');
	} else {
		const facilityNameParts = normalizeTextForMatch(facilityName)
			.split(' ')
			.map(s => s.trim())
			.filter(s => s.length > 1);
		const hasPartialMatch = facilityNameParts.some(part => titleAndSnippet.includes(part));
		if (hasPartialMatch) {
			score += genericFacilityName ? 1 : 3;
			reasons.push('施設名部分一致');
		} else {
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
	const nagoyaKeywords = ['名古屋市', '名古屋', '愛知'];
	const hasNagoyaContext = nagoyaKeywords.some(k => titleAndSnippet.includes(k));
	if (hasNagoyaContext) {
		score += 1;
		reasons.push('名古屋/愛知が含まれる');
	} else if (genericFacilityName && wardName) {
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
			score += 1;
			reasons.push(`子育て拠点関連ワード（${keyword}）`);
			hasChildcareKeyword = true;
			break; // 1つ見つかれば十分
		}
	}
	if (genericFacilityName && !hasChildcareKeyword) {
		score -= 1;
		reasons.push('子育て文脈がない（短い名称の誤検出抑制）');
	}
	
	// 4. プロフィールURL形式の確認
	const normalizedUrl = normalizeInstagramUrl(item.link);
	if (normalizedUrl) {
		score += 1;
		reasons.push('プロフィールURL形式');
	} else {
		score -= 10;
		reasons.push('投稿URL/共有リンク（除外）');
	}
	
	return { score, reasons };
}

export function processSearchResults(
	items: GoogleCSEItem[],
	facilityName: string,
	wardName: string | null
): Candidate[] {
	const candidates: Candidate[] = [];
	
	for (const item of items) {
		const normalizedUrl = normalizeInstagramUrl(item.link);
		if (!normalizedUrl) {
			continue;
		}

		const { score, reasons } = scoreCandidate(item, facilityName, wardName);

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

	candidates.sort((a, b) => b.score - a.score);

	return candidates;
}

export function processSearchResultsRank(
	items: GoogleCSEItem[],
	facilityName: string,
	wardName: string | null,
	limit: number = 3
): Candidate[] {
	const candidates: Candidate[] = [];
	const seenUrls = new Set<string>();

	for (const item of items) {
		if (candidates.length >= limit) {
			break;
		}

		const normalizedUrl = normalizeInstagramUrl(item.link);
		if (!normalizedUrl) {
			continue;
		}

		if (seenUrls.has(normalizedUrl)) {
			continue;
		}
		seenUrls.add(normalizedUrl);

		const { score, reasons } = scoreCandidate(item, facilityName, wardName);

		candidates.push({
			link: normalizedUrl,
			title: item.title,
			snippet: item.snippet,
			score,
			reasons,
		});
	}

	return candidates;
}

export function processSearchResultsHybrid(
	items: GoogleCSEItem[],
	facilityName: string,
	wardName: string | null,
	limit: number = 10
): Candidate[] {
	const candidates: Candidate[] = [];
	const seenUrls = new Set<string>();

	for (const item of items) {
		if (candidates.length >= limit) {
			break;
		}

		const normalizedUrl = normalizeInstagramUrl(item.link);
		if (!normalizedUrl) {
			continue;
		}

		if (seenUrls.has(normalizedUrl)) {
			continue;
		}
		seenUrls.add(normalizedUrl);

		const { score, reasons } = scoreCandidate(item, facilityName, wardName);

		candidates.push({
			link: normalizedUrl,
			title: item.title,
			snippet: item.snippet,
			score,
			reasons,
		});
	}

	candidates.sort((a, b) => b.score - a.score);

	return candidates;
}

