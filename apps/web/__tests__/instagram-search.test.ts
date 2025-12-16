import { describe, it, expect } from 'vitest';
import {
	generateSearchQueries,
	normalizeInstagramUrl,
	scoreCandidate,
	processSearchResults,
	processSearchResultsRank,
	processSearchResultsHybrid,
} from '../lib/instagram-search';

describe('generateSearchQueries', () => {
	// Given: 正常な施設名・区名
	// When: generateSearchQueries を実行
	// Then: 4つの優先順位付きクエリが生成される（取りこぼし防止のため複数パターン）
	it('TC-N-01: 正常な施設名・区名でクエリ生成', () => {
		const queries = generateSearchQueries('あおぞらわらばぁ～', '東区');

		expect(queries).toHaveLength(4);
		expect(queries[0]).toContain('site:instagram.com');
		// 波ダッシュの揺れ対策で OR を含む
		expect(queries[0]).toContain('"あおぞらわらばぁ～"');
		expect(queries[0]).toContain('"あおぞらわらばぁ"');
		expect(queries[0]).toContain('子育て拠点');

		expect(queries[1]).toContain('site:instagram.com');
		expect(queries[1]).toContain('"あおぞらわらばぁ～"');
		expect(queries[1]).toContain('子育て');

		expect(queries[2]).toContain('site:instagram.com');
		expect(queries[2]).toContain('"あおぞらわらばぁ～"');

		// 4番目のクエリは区名を含むか、または instagram のみのクエリ
		expect(queries[3]).toMatch(/site:instagram\.com.*"東区"|あおぞらわらばぁ.*instagram/);
	});

	// Given: 区名が null
	// When: generateSearchQueries を実行
	// Then: 区名を含むクエリは生成されず、施設名中心のクエリが生成される（最大4件）
	it('TC-N-02: 区名が null でクエリ生成', () => {
		const queries = generateSearchQueries('あおぞらわらばぁ～', null);

		expect(queries).toHaveLength(4);
		expect(queries[0]).toContain('site:instagram.com');
		expect(queries[0]).toContain('子育て拠点');
		expect(queries[1]).toContain('site:instagram.com');
		expect(queries[1]).toContain('子育て');
		expect(queries[2]).toContain('site:instagram.com');
		expect(queries[3]).toContain('instagram');
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

	// Given: 短い施設名（汎用名）
	// When: generateSearchQueries を実行
	// Then: 名古屋/区/子育て文脈を優先したクエリが生成される（誤検出抑制）
	it('TC-B-07: 短い施設名は名古屋/区/子育てを優先してクエリ生成', () => {
		const queries = generateSearchQueries('いずみ', '東区');
		expect(queries).toHaveLength(4);
		expect(queries[0]).toContain('site:instagram.com');
		expect(queries[0]).toContain('名古屋');
		expect(queries[0]).toContain('"東区"');
		expect(queries[0]).toContain('子育て');
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

	// Given: 短い施設名（いずみ）で、別地域（札幌）キーワードが含まれる候補
	// When: scoreCandidate を実行
	// Then: 誤検出を抑えるため5点未満になる
	it('TC-B-08: 短い施設名 + 別地域キーワードは5点未満（誤検出防止）', () => {
		const item = {
			link: 'https://www.instagram.com/testuser/',
			title: '居酒屋ダイニングいずみの@札幌東区',
			snippet: '普段東区来ない方もこの機会に',
		};
		const { score } = scoreCandidate(item, 'いずみ', '東区');
		expect(score).toBeLessThan(5);
	});

	// Given: 短い施設名（いずみ）で、名古屋/子育て文脈が含まれる候補
	// When: scoreCandidate を実行
	// Then: 5点以上になり得る（採用候補になり得る）
	it('TC-B-09: 短い施設名 + 名古屋/子育て文脈は5点以上になり得る', () => {
		const item = {
			link: 'https://www.instagram.com/testuser/',
			title: 'いずみ',
			snippet: '名古屋市東区の子育て支援施設',
		};
		const { score } = scoreCandidate(item, 'いずみ', '東区');
		expect(score).toBeGreaterThanOrEqual(5);
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

describe('processSearchResultsRank', () => {
	// Given: プロフィールURLが3件含まれる検索結果（順位順）
	// When: processSearchResultsRank を実行
	// Then: 上位3件が順位順で返される（limit=3）
	it('TC-N-10: プロフィールURLが3件以上ある場合、上位3件を返す', () => {
		const items = [
			{
				link: 'https://www.instagram.com/user1/',
				title: '施設名1',
				snippet: '説明1',
			},
			{
				link: 'https://www.instagram.com/user2/',
				title: '施設名2',
				snippet: '説明2',
			},
			{
				link: 'https://www.instagram.com/user3/',
				title: '施設名3',
				snippet: '説明3',
			},
			{
				link: 'https://www.instagram.com/user4/',
				title: '施設名4',
				snippet: '説明4',
			},
		];
		const candidates = processSearchResultsRank(items, '施設名', '東区', 3);
		expect(candidates).toHaveLength(3);
		expect(candidates[0].link).toBe('https://www.instagram.com/user1/');
		expect(candidates[1].link).toBe('https://www.instagram.com/user2/');
		expect(candidates[2].link).toBe('https://www.instagram.com/user3/');
	});

	// Given: 投稿URLが混ざっている検索結果
	// When: processSearchResultsRank を実行
	// Then: 投稿URLは除外され、プロフィールURLのみが返される
	it('TC-A-11: 投稿URLは除外される', () => {
		const items = [
			{
				link: 'https://www.instagram.com/p/ABC123/',
				title: '投稿1',
				snippet: '説明1',
			},
			{
				link: 'https://www.instagram.com/user1/',
				title: '施設名1',
				snippet: '説明1',
			},
			{
				link: 'https://www.instagram.com/p/DEF456/',
				title: '投稿2',
				snippet: '説明2',
			},
			{
				link: 'https://www.instagram.com/user2/',
				title: '施設名2',
				snippet: '説明2',
			},
		];
		const candidates = processSearchResultsRank(items, '施設名', '東区', 3);
		expect(candidates).toHaveLength(2);
		expect(candidates[0].link).toBe('https://www.instagram.com/user1/');
		expect(candidates[1].link).toBe('https://www.instagram.com/user2/');
	});

	// Given: 同じURLが複数回出現する検索結果
	// When: processSearchResultsRank を実行
	// Then: 重複URLは最初の出現のみが採用される
	it('TC-A-12: 重複URLは最初の出現のみ採用される', () => {
		const items = [
			{
				link: 'https://www.instagram.com/user1/',
				title: '施設名1（1回目）',
				snippet: '説明1',
			},
			{
				link: 'https://www.instagram.com/user2/',
				title: '施設名2',
				snippet: '説明2',
			},
			{
				link: 'https://www.instagram.com/user1/',
				title: '施設名1（2回目）',
				snippet: '説明1（重複）',
			},
		];
		const candidates = processSearchResultsRank(items, '施設名', '東区', 3);
		expect(candidates).toHaveLength(2);
		expect(candidates[0].link).toBe('https://www.instagram.com/user1/');
		expect(candidates[0].title).toBe('施設名1（1回目）'); // 最初の出現が採用される
		expect(candidates[1].link).toBe('https://www.instagram.com/user2/');
	});

	// Given: プロフィールURLが1件のみの検索結果
	// When: processSearchResultsRank を実行（limit=3）
	// Then: 1件が返される
	it('TC-N-13: プロフィールURLが1件のみの場合、1件を返す', () => {
		const items = [
			{
				link: 'https://www.instagram.com/user1/',
				title: '施設名1',
				snippet: '説明1',
			},
		];
		const candidates = processSearchResultsRank(items, '施設名', '東区', 3);
		expect(candidates).toHaveLength(1);
		expect(candidates[0].link).toBe('https://www.instagram.com/user1/');
	});

	// Given: プロフィールURLが0件の検索結果（投稿URLのみ）
	// When: processSearchResultsRank を実行
	// Then: 空配列が返される
	it('TC-A-14: プロフィールURLが0件の場合、空配列を返す', () => {
		const items = [
			{
				link: 'https://www.instagram.com/p/ABC123/',
				title: '投稿1',
				snippet: '説明1',
			},
			{
				link: 'https://www.instagram.com/reel/DEF456/',
				title: 'リール1',
				snippet: '説明2',
			},
		];
		const candidates = processSearchResultsRank(items, '施設名', '東区', 3);
		expect(candidates).toHaveLength(0);
	});

	// Given: 空配列
	// When: processSearchResultsRank を実行
	// Then: 空配列が返される
	it('TC-B-15: 空配列の場合、空配列を返す', () => {
		const items: Array<{ link: string; title: string; snippet: string }> = [];
		const candidates = processSearchResultsRank(items, '施設名', '東区', 3);
		expect(candidates).toHaveLength(0);
	});

	// Given: プロフィールURLが5件含まれる検索結果（limit=2）
	// When: processSearchResultsRank を実行
	// Then: 上位2件のみが返される
	it('TC-N-16: limitを超える件数がある場合、limit件まで返す', () => {
		const items = [
			{
				link: 'https://www.instagram.com/user1/',
				title: '施設名1',
				snippet: '説明1',
			},
			{
				link: 'https://www.instagram.com/user2/',
				title: '施設名2',
				snippet: '説明2',
			},
			{
				link: 'https://www.instagram.com/user3/',
				title: '施設名3',
				snippet: '説明3',
			},
		];
		const candidates = processSearchResultsRank(items, '施設名', '東区', 2);
		expect(candidates).toHaveLength(2);
		expect(candidates[0].link).toBe('https://www.instagram.com/user1/');
		expect(candidates[1].link).toBe('https://www.instagram.com/user2/');
	});

	// Given: プロフィールURLが含まれる検索結果
	// When: processSearchResultsRank を実行
	// Then: スコアも算出されて含まれる（参考情報として）
	it('TC-N-17: スコアも算出されて含まれる', () => {
		const items = [
			{
				link: 'https://www.instagram.com/testuser/',
				title: 'あおぞらわらばぁ～',
				snippet: '東区の子育て応援拠点',
			},
		];
		const candidates = processSearchResultsRank(items, 'あおぞらわらばぁ～', '東区', 3);
		expect(candidates).toHaveLength(1);
		expect(candidates[0].score).toBeDefined();
		expect(typeof candidates[0].score).toBe('number');
		expect(candidates[0].reasons).toBeDefined();
		expect(Array.isArray(candidates[0].reasons)).toBe(true);
	});

	// Given: 順位順の検索結果
	// When: processSearchResultsRank を実行
	// Then: 元の順位が維持される（ソートされない）
	it('TC-N-18: 元の順位が維持される', () => {
		const items = [
			{
				link: 'https://www.instagram.com/user1/',
				title: '施設名1',
				snippet: '説明1（スコア低めの可能性）',
			},
			{
				link: 'https://www.instagram.com/user2/',
				title: '施設名2',
				snippet: '説明2（スコア高めの可能性）',
			},
		];
		const candidates = processSearchResultsRank(items, '施設名', '東区', 3);
		expect(candidates).toHaveLength(2);
		// 順位が維持されていることを確認（user1が先、user2が後）
		expect(candidates[0].link).toBe('https://www.instagram.com/user1/');
		expect(candidates[1].link).toBe('https://www.instagram.com/user2/');
		// スコアに関係なく順位順が保たれている
	});
});

describe('processSearchResultsHybrid', () => {
	// Given: プロフィールURLが複数含まれる検索結果（スコアが異なる）
	// When: processSearchResultsHybrid を実行
	// Then: スコア降順で並べ替えられた候補が返される（rankとの違い）
	it('TC-N-20: プロフィールURLが複数ある場合、スコア降順で並べ替えられる', () => {
		const items = [
			{
				link: 'https://www.instagram.com/user1/',
				title: '施設名1',
				snippet: '説明1（スコア低め）',
			},
			{
				link: 'https://www.instagram.com/user2/',
				title: 'あおぞらわらばぁ～',
				snippet: '東区の子育て応援拠点（スコア高め）',
			},
		];
		const candidates = processSearchResultsHybrid(items, 'あおぞらわらばぁ～', '東区', 10);
		expect(candidates.length).toBeGreaterThanOrEqual(2);
		// スコア降順で並べ替えられていることを確認（user2が先、user1が後）
		expect(candidates[0].link).toBe('https://www.instagram.com/user2/');
		expect(candidates[0].score).toBeGreaterThan(candidates[1].score);
	});

	// Given: プロフィールURLが10件以上含まれる検索結果
	// When: processSearchResultsHybrid を実行（limit=10）
	// Then: 上位10件までが抽出され、スコア降順で並べ替えられる
	it('TC-N-21: プロフィールURLが10件以上ある場合、上位10件まで抽出される', () => {
		const items = Array.from({ length: 15 }, (_, i) => ({
			link: `https://www.instagram.com/user${i + 1}/`,
			title: `施設名${i + 1}`,
			snippet: `説明${i + 1}`,
		}));
		const candidates = processSearchResultsHybrid(items, '施設名', '東区', 10);
		expect(candidates).toHaveLength(10);
		// スコア降順で並べ替えられていることを確認
		for (let i = 0; i < candidates.length - 1; i++) {
			expect(candidates[i].score).toBeGreaterThanOrEqual(candidates[i + 1].score);
		}
	});

	// Given: 投稿URLが混ざっている検索結果
	// When: processSearchResultsHybrid を実行
	// Then: 投稿URLは除外され、プロフィールURLのみが返される
	it('TC-A-22: 投稿URLは除外される', () => {
		const items = [
			{
				link: 'https://www.instagram.com/p/ABC123/',
				title: '投稿1',
				snippet: '説明1',
			},
			{
				link: 'https://www.instagram.com/user1/',
				title: '施設名1',
				snippet: '説明1',
			},
			{
				link: 'https://www.instagram.com/p/DEF456/',
				title: '投稿2',
				snippet: '説明2',
			},
			{
				link: 'https://www.instagram.com/user2/',
				title: '施設名2',
				snippet: '説明2',
			},
		];
		const candidates = processSearchResultsHybrid(items, '施設名', '東区', 10);
		expect(candidates).toHaveLength(2);
		expect(candidates.every(c => !c.link.includes('/p/'))).toBe(true);
	});

	// Given: 同じURLが複数回出現する検索結果
	// When: processSearchResultsHybrid を実行
	// Then: 重複URLは最初の出現のみが採用される
	it('TC-A-23: 重複URLは最初の出現のみ採用される', () => {
		const items = [
			{
				link: 'https://www.instagram.com/user1/',
				title: '施設名1（1回目）',
				snippet: '説明1',
			},
			{
				link: 'https://www.instagram.com/user2/',
				title: '施設名2',
				snippet: '説明2',
			},
			{
				link: 'https://www.instagram.com/user1/',
				title: '施設名1（2回目）',
				snippet: '説明1（重複）',
			},
		];
		const candidates = processSearchResultsHybrid(items, '施設名', '東区', 10);
		expect(candidates).toHaveLength(2);
		expect(candidates[0].link).toBe('https://www.instagram.com/user1/');
		expect(candidates[0].title).toBe('施設名1（1回目）'); // 最初の出現が採用される
		expect(candidates[1].link).toBe('https://www.instagram.com/user2/');
	});

	// Given: プロフィールURLが1件のみの検索結果
	// When: processSearchResultsHybrid を実行（limit=10）
	// Then: 1件が返される
	it('TC-N-24: プロフィールURLが1件のみの場合、1件を返す', () => {
		const items = [
			{
				link: 'https://www.instagram.com/user1/',
				title: '施設名1',
				snippet: '説明1',
			},
		];
		const candidates = processSearchResultsHybrid(items, '施設名', '東区', 10);
		expect(candidates).toHaveLength(1);
		expect(candidates[0].link).toBe('https://www.instagram.com/user1/');
	});

	// Given: プロフィールURLが0件の検索結果（投稿URLのみ）
	// When: processSearchResultsHybrid を実行
	// Then: 空配列が返される
	it('TC-A-25: プロフィールURLが0件の場合、空配列を返す', () => {
		const items = [
			{
				link: 'https://www.instagram.com/p/ABC123/',
				title: '投稿1',
				snippet: '説明1',
			},
			{
				link: 'https://www.instagram.com/reel/DEF456/',
				title: 'リール1',
				snippet: '説明2',
			},
		];
		const candidates = processSearchResultsHybrid(items, '施設名', '東区', 10);
		expect(candidates).toHaveLength(0);
	});

	// Given: 空配列
	// When: processSearchResultsHybrid を実行
	// Then: 空配列が返される
	it('TC-B-26: 空配列の場合、空配列を返す', () => {
		const items: Array<{ link: string; title: string; snippet: string }> = [];
		const candidates = processSearchResultsHybrid(items, '施設名', '東区', 10);
		expect(candidates).toHaveLength(0);
	});

	// Given: プロフィールURLが含まれる検索結果
	// When: processSearchResultsHybrid を実行
	// Then: スコアとreasonsが含まれる
	it('TC-N-27: スコアとreasonsが含まれる', () => {
		const items = [
			{
				link: 'https://www.instagram.com/testuser/',
				title: 'あおぞらわらばぁ～',
				snippet: '東区の子育て応援拠点',
			},
		];
		const candidates = processSearchResultsHybrid(items, 'あおぞらわらばぁ～', '東区', 10);
		expect(candidates).toHaveLength(1);
		expect(candidates[0].score).toBeDefined();
		expect(typeof candidates[0].score).toBe('number');
		expect(candidates[0].reasons).toBeDefined();
		expect(Array.isArray(candidates[0].reasons)).toBe(true);
	});

	// Given: スコアが異なる複数の候補
	// When: processSearchResultsHybrid を実行
	// Then: スコア降順で並べ替えられる（rankとの違い: rankは順位維持、hybridはスコア降順）
	it('TC-N-28: スコア降順で並べ替えられる（rankとの違い）', () => {
		const items = [
			{
				link: 'https://www.instagram.com/user1/',
				title: '施設名1',
				snippet: '説明1（スコア低め）',
			},
			{
				link: 'https://www.instagram.com/user2/',
				title: 'あおぞらわらばぁ～',
				snippet: '東区の子育て応援拠点（スコア高め）',
			},
			{
				link: 'https://www.instagram.com/user3/',
				title: '施設名3',
				snippet: '説明3（スコア中程度）',
			},
		];
		const candidates = processSearchResultsHybrid(items, 'あおぞらわらばぁ～', '東区', 10);
		expect(candidates.length).toBeGreaterThanOrEqual(2);
		// スコア降順で並べ替えられていることを確認
		for (let i = 0; i < candidates.length - 1; i++) {
			expect(candidates[i].score).toBeGreaterThanOrEqual(candidates[i + 1].score);
		}
		// 最高スコアの候補が先頭にあることを確認
		const maxScore = Math.max(...candidates.map(c => c.score));
		expect(candidates[0].score).toBe(maxScore);
	});
});

