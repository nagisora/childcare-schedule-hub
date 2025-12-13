import { describe, it, expect } from 'vitest';
import {
	generateSearchQueries,
	normalizeInstagramUrl,
	scoreCandidate,
	processSearchResults,
} from '../lib/instagram-search';

describe('generateSearchQueries', () => {
	// Given: 正常な施設名・区名
	// When: generateSearchQueries を実行
	// Then: 4つの優先順位付きクエリが生成される（取りこぼし防止のため複数パターン）
	it('TC-N-01: 正常な施設名・区名でクエリ生成', () => {
		const queries = generateSearchQueries('あおぞらわらばぁ～', '東区');

		expect(queries).toHaveLength(4);
		expect(queries[0]).toContain('site:instagram.com');
		expect(queries[0]).toContain('instagram');
		// 波ダッシュの揺れ対策で OR を含む
		expect(queries[0]).toContain('"あおぞらわらばぁ～"');
		expect(queries[0]).toContain('"あおぞらわらばぁ"');

		expect(queries[1]).toContain('site:instagram.com');
		expect(queries[1]).toContain('"あおぞらわらばぁ～"');

		expect(queries[2]).toContain('site:instagram.com');
		expect(queries[2]).toContain('"東区"');

		expect(queries[3]).toContain('instagram');
	});

	// Given: 区名が null
	// When: generateSearchQueries を実行
	// Then: 区名を含むクエリは生成されず、施設名中心のクエリが生成される
	it('TC-N-02: 区名が null でクエリ生成', () => {
		const queries = generateSearchQueries('あおぞらわらばぁ～', null);

		expect(queries).toHaveLength(3);
		expect(queries[0]).toContain('site:instagram.com');
		expect(queries[0]).toContain('instagram');
		expect(queries[1]).toContain('site:instagram.com');
		expect(queries[2]).toContain('instagram');
		expect(queries.every(q => !q.includes('"東区"'))).toBe(true);
	});

	// Given: 特殊文字（括弧・記号）を含む施設名
	// When: generateSearchQueries を実行
	// Then: エスケープされたクエリが生成される
	it('TC-N-06: 特殊文字（括弧・記号）を含む施設名でクエリ生成', () => {
		const queries = generateSearchQueries('施設名（テスト）', '東区');

		expect(queries).toHaveLength(4);
		expect(queries[0]).toContain('site:instagram.com');
		expect(queries[0]).toContain('"施設名（テスト）"');
	});
});

describe('normalizeInstagramUrl', () => {
	// Given: 正常なプロフィールURL
	// When: normalizeInstagramUrl を実行
	// Then: https://www.instagram.com/<username>/ 形式に統一される
	it('TC-N-03: 正常なプロフィールURLを正規化', () => {
		const result = normalizeInstagramUrl('https://www.instagram.com/testuser/');
		expect(result).toBe('https://www.instagram.com/testuser/');
	});

	// Given: m.instagram.com のURL
	// When: normalizeInstagramUrl を実行
	// Then: www.instagram.com に変換される
	it('TC-N-04: m.instagram.com のURLを正規化', () => {
		const result = normalizeInstagramUrl('https://m.instagram.com/testuser');
		expect(result).toBe('https://www.instagram.com/testuser/');
	});

	// Given: http:// のURL
	// When: normalizeInstagramUrl を実行
	// Then: https:// に変換される
	it('TC-N-05: http:// のURLを正規化', () => {
		const result = normalizeInstagramUrl('http://www.instagram.com/testuser');
		expect(result).toBe('https://www.instagram.com/testuser/');
	});

	// Given: 投稿URL（/p/）
	// When: normalizeInstagramUrl を実行
	// Then: null を返す（除外）
	it('TC-A-01: 投稿URL（/p/）を正規化', () => {
		const result = normalizeInstagramUrl('https://www.instagram.com/p/ABC123/');
		expect(result).toBeNull();
	});

	// Given: リールURL（/reel/）
	// When: normalizeInstagramUrl を実行
	// Then: null を返す（除外）
	it('TC-A-02: リールURL（/reel/）を正規化', () => {
		const result = normalizeInstagramUrl('https://www.instagram.com/reel/ABC123/');
		expect(result).toBeNull();
	});

	// Given: クエリパラメータ付きURL（?igsh=）
	// When: normalizeInstagramUrl を実行
	// Then: クエリパラメータが除去される
	it('TC-A-03: クエリパラメータ付きURL（?igsh=）を正規化', () => {
		const result = normalizeInstagramUrl('https://www.instagram.com/testuser/?igsh=ABC123');
		expect(result).toBe('https://www.instagram.com/testuser/');
	});

	// Given: フラグメント付きURL（#）
	// When: normalizeInstagramUrl を実行
	// Then: フラグメントが除去される
	it('TC-A-04: フラグメント付きURL（#）を正規化', () => {
		const result = normalizeInstagramUrl('https://www.instagram.com/testuser/#section');
		expect(result).toBe('https://www.instagram.com/testuser/');
	});

	// Given: Instagram以外のドメイン
	// When: normalizeInstagramUrl を実行
	// Then: null を返す（除外）
	it('TC-A-05: Instagram以外のドメインを正規化', () => {
		const result = normalizeInstagramUrl('https://example.com/testuser/');
		expect(result).toBeNull();
	});

	// Given: 空文字列
	// When: normalizeInstagramUrl を実行
	// Then: null を返す
	it('TC-A-06: 空文字列を正規化', () => {
		const result = normalizeInstagramUrl('');
		expect(result).toBeNull();
	});

	// Given: null
	// When: normalizeInstagramUrl を実行
	// Then: null を返す
	it('TC-A-07: null を正規化', () => {
		// @ts-expect-error - null を渡してテスト
		const result = normalizeInstagramUrl(null);
		expect(result).toBeNull();
	});
});

describe('scoreCandidate', () => {
	// Given: 施設名一致（+4点）+ 区名一致（+2点）+ 子育て（+1点）+ プロフィールURL（+1点）= 8点
	// When: scoreCandidate を実行
	// Then: スコア8点以上が返される
	it('TC-B-03: 施設名一致 + 区名一致 + 子育て + プロフィールURL >= 8点', () => {
		const item = {
			link: 'https://www.instagram.com/testuser/',
			title: 'あおぞらわらばぁ～',
			snippet: '東区の子育て応援拠点',
		};
		const { score } = scoreCandidate(item, 'あおぞらわらばぁ～', '東区');
		expect(score).toBeGreaterThanOrEqual(8);
	});

	// Given: 施設名一致なし（-2点）+ 名古屋（+1点）+ プロフィールURL（+1点）= 0点
	// When: scoreCandidate を実行
	// Then: スコア5点未満が返される
	it('TC-B-04: 施設名一致なし + 名古屋 + プロフィールURL < 5点', () => {
		const item = {
			link: 'https://www.instagram.com/testuser/',
			title: 'あおぞら',
			snippet: '名古屋の施設',
		};
		const { score } = scoreCandidate(item, 'あおぞらわらばぁ～', null);
		expect(score).toBeLessThan(5);
	});

	// Given: 施設名一致なしでも区名+子育て等でそれっぽく見える候補
	// When: scoreCandidate を実行
	// Then: 誤検出を抑えるため5点未満になる
	it('TC-B-06: 施設名一致なしの候補は5点未満（誤検出防止）', () => {
		const item = {
			link: 'https://www.instagram.com/someother/',
			title: '東区 子育て支援',
			snippet: '名古屋 東区の子育て応援拠点',
		};
		const { score } = scoreCandidate(item, 'あおぞらわらばぁ～', '東区');
		expect(score).toBeLessThan(5);
	});

	// Given: 投稿URLを含む候補
	// When: scoreCandidate を実行
	// Then: スコアに関係なく除外される（-10点）
	it('TC-B-05: 投稿URLを含む候補', () => {
		const item = {
			link: 'https://www.instagram.com/p/ABC123/',
			title: 'あおぞらわらばぁ～',
			snippet: '東区の子育て応援拠点',
		};
		const { score } = scoreCandidate(item, 'あおぞらわらばぁ～', '東区');
		expect(score).toBeLessThan(0); // -10点で除外
	});
});

describe('processSearchResults', () => {
	// Given: スコア5点の候補
	// When: processSearchResults を実行
	// Then: 採用される（5点以上）
	it('TC-B-01: スコア5点の候補', () => {
		const items = [
			{
				link: 'https://www.instagram.com/testuser/',
				title: 'あおぞらわらばぁ～',
				snippet: '東区の子育て応援拠点',
			},
		];
		const candidates = processSearchResults(items, 'あおぞらわらばぁ～', '東区');
		expect(candidates.length).toBeGreaterThan(0);
		if (candidates.length > 0) {
			expect(candidates[0].score).toBeGreaterThanOrEqual(5);
		}
	});

	// Given: スコア4点の候補
	// When: processSearchResults を実行
	// Then: 採用されない（5点未満）
	it('TC-B-02: スコア4点の候補', () => {
		const items = [
			{
				link: 'https://www.instagram.com/testuser/',
				title: 'あおぞら',
				snippet: '名古屋の施設',
			},
		];
		const candidates = processSearchResults(items, 'あおぞらわらばぁ～', null);
		// スコア4点の候補は採用されない（5点未満）
		expect(candidates.every(c => c.score >= 5)).toBe(true);
	});

	// Given: 投稿URLを含む候補
	// When: processSearchResults を実行
	// Then: 除外される
	it('TC-B-05: 投稿URLを含む候補', () => {
		const items = [
			{
				link: 'https://www.instagram.com/p/ABC123/',
				title: 'あおぞらわらばぁ～',
				snippet: '東区の子育て応援拠点',
			},
		];
		const candidates = processSearchResults(items, 'あおぞらわらばぁ～', '東区');
		expect(candidates.length).toBe(0);
	});
});

