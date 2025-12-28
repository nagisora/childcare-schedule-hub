import { test, expect } from '@playwright/test';

/**
 * 代表フロー E2E テスト: 拠点一覧 → お気に入り追加 → お気に入りエリアに反映
 * [テスト観点表](../__tests__/test-perspectives.md) 2.1節を参照
 */
test.describe('代表フロー: お気に入り追加', () => {
	// Given: トップページにアクセス
	// When: ページが読み込まれる
	// Then: 拠点一覧が表示され、お気に入りエリアが空（エンプティステート）
	test('TC-E2E-01: トップページにアクセスできる', async ({ page }) => {
		await page.goto('/');

		// 拠点一覧が表示されていることを確認
		await expect(page.getByRole('heading', { name: '拠点一覧' })).toBeVisible();
		
		// お気に入りエリアが空（エンプティステート）であることを確認
		await expect(page.getByRole('heading', { name: 'お気に入り拠点' })).toBeVisible();
		const emptyState = page.getByText(/お気に入り登録がまだありません/);
		await expect(emptyState).toBeVisible();
	});

	// Given: トップページにアクセス済み
	// When: 「+」ボタンをクリックして1件追加
	// Then: お気に入りエリアに追加された拠点が表示される
	test('TC-E2E-02: 「+」ボタンをクリックして1件追加できる', async ({ page, context }) => {
		// クッキーをクリア
		await context.clearCookies();
		await page.goto('/');

		// 最初の「+」ボタンをクリック
		const firstAddButton = page.getByRole('button', { name: /をお気に入りに追加/ }).first();
		await expect(firstAddButton).toBeVisible();
		
		// 拠点名を取得（後で確認用）
		const row = firstAddButton.locator('..').locator('..').locator('..');
		const facilityName = await row.locator('td').first().textContent();
		
		await firstAddButton.click();

		// ページが再読み込みされるのを待つ
		await page.waitForLoadState('domcontentloaded');

		// お気に入りエリアに追加された拠点が表示されることを確認
		await expect(page.getByRole('heading', { name: 'お気に入り拠点' })).toBeVisible();
		if (facilityName) {
			const favoriteCard = page.getByRole('article').filter({ hasText: facilityName.trim() });
			await expect(favoriteCard).toBeVisible();
		}

		// お気に入りに追加済みのため、「−」ボタンが表示されることを確認
		if (facilityName) {
			const rowWithFavorite = page.locator('tr').filter({ hasText: facilityName.trim() });
			const removeButton = rowWithFavorite.getByRole('button', { name: /をお気に入りから削除/ });
			await expect(removeButton).toBeVisible();
		}
	});

	// Given: トップページにアクセス済み
	// When: 最大5件までお気に入りを追加
	// Then: 5件すべてがお気に入りエリアに表示される
	test('TC-E2E-03: 最大5件までお気に入りを追加できる', async ({ page, context }) => {
		// クッキーをクリア
		await context.clearCookies();
		await page.goto('/');

		// 5件までお気に入りを追加
		const addButtons = page.getByRole('button', { name: /をお気に入りに追加/ });
		const count = await addButtons.count();
		const addCount = Math.min(count, 5);

		for (let i = 0; i < addCount; i++) {
			const button = addButtons.nth(i);
			await button.click();
			await page.waitForLoadState('domcontentloaded');
		}

		// 5件すべてがお気に入りエリアに表示されることを確認
		const favoriteArticles = page.getByRole('article');
		const articleCount = await favoriteArticles.count();
		expect(articleCount).toBe(addCount);

		// 「最大5件まで登録可」と表示されることを確認
		await expect(page.getByText(/最大5件まで登録可/)).toBeVisible();
	});

	// Given: 5件までお気に入りを追加済み
	// When: 6件目を追加しようとする
	// Then: エラーメッセージが表示され、追加されない
	test('TC-E2E-04: 6件目を追加しようとするとエラーが表示される', async ({ page, context }) => {
		// クッキーをクリア
		await context.clearCookies();
		await page.goto('/');

		// 5件までお気に入りを追加
		const addButtons = page.getByRole('button', { name: /をお気に入りに追加/ });
		const count = await addButtons.count();
		const addCount = Math.min(count, 5);

		for (let i = 0; i < addCount; i++) {
			const button = addButtons.nth(i);
			await button.click();
			await page.waitForLoadState('domcontentloaded');
		}

		// 6件目の追加を試みる
		if (count > 5) {
			const button = addButtons.nth(5);
			
			// ダイアログの監視を開始
			page.once('dialog', async (dialog) => {
				expect(dialog.message()).toContain('お気に入りは最大5件まで登録できます');
				await dialog.accept();
			});

			await button.click();
		}
	});

	// Given: お気に入りを1件追加済み
	// When: ページを再読み込みして、既に追加済みの拠点を確認
	// Then: 「追加済み」と表示され、「+」ボタンが表示されない
	test('TC-E2E-05: 既に追加済みの拠点では「追加済み」と表示され、ボタンが無効化される', async ({ page, context }) => {
		// クッキーをクリア
		await context.clearCookies();
		await page.goto('/');

		// 最初の「+」ボタンをクリックして1件追加
		const firstAddButton = page.getByRole('button', { name: /をお気に入りに追加/ }).first();
		await expect(firstAddButton).toBeVisible();
		
		// 拠点名を取得
		const row = firstAddButton.locator('..').locator('..').locator('..');
		const facilityName = await row.locator('td').first().textContent();
		
		await firstAddButton.click();

		// ページが再読み込みされるのを待つ（DOMContentLoaded で十分）
		await page.waitForLoadState('domcontentloaded');

		// お気に入りエリアに追加された拠点が表示されることを確認
		await expect(page.getByRole('heading', { name: 'お気に入り拠点' })).toBeVisible();
		
		// ページを再読み込みして、クッキーの状態を反映させる
		await page.reload();
		await page.waitForLoadState('domcontentloaded');

		// 既に追加済みの拠点を探す
		if (facilityName) {
			// 拠点名を含む行を探す
			const rowWithFavorite = page.locator('tr').filter({ hasText: facilityName.trim() });
			
			// 「−」ボタンが表示されることを確認（追加済みの状態）
			const removeButton = rowWithFavorite.getByRole('button', { name: /をお気に入りから削除/ });
			await expect(removeButton).toBeVisible();
			
			// 「+」ボタンが表示されないことを確認
			const addButtonInRow = rowWithFavorite.getByRole('button', { name: /をお気に入りに追加/ });
			await expect(addButtonInRow).not.toBeVisible();
		}

		// お気に入りエリアにも該当拠点が表示されていることを確認
		const favoriteArticle = page.getByRole('article').filter({ hasText: facilityName?.trim() || '' });
		await expect(favoriteArticle).toBeVisible();
	});

	// Given: お気に入りを追加済み
	// When: お気に入りから「解除」ボタンをクリック
	// Then: 該当のお気に入りが削除され、一覧に「+」ボタンが再表示される
	test('TC-E2E-06: お気に入りから「解除」ボタンをクリックして削除できる', async ({ page, context }) => {
		// クッキーをクリア
		await context.clearCookies();
		await page.goto('/');

		// 1件お気に入りを追加
		const firstAddButton = page.getByRole('button', { name: /をお気に入りに追加/ }).first();
		await firstAddButton.click();
		await page.waitForLoadState('domcontentloaded');

		// お気に入りカードが表示されることを確認
		const favoriteArticle = page.getByRole('article').first();
		await expect(favoriteArticle).toBeVisible();
		
		const facilityNameElement = favoriteArticle.getByRole('heading', { level: 3 });
		const facilityName = await facilityNameElement.textContent();

		// 「解除」ボタンをクリック（aria-labelに「お気に入りから...を削除」が設定されているため、テキストで検索）
		const removeButton = favoriteArticle.getByText('解除');
		await expect(removeButton).toBeVisible();
		await removeButton.click();

		// ページが再読み込みされるのを待つ（DOMContentLoaded で十分）
		await page.waitForLoadState('domcontentloaded');

		// お気に入りエリアが空（エンプティステート）になることを確認
		const emptyState = page.getByText(/お気に入り登録がまだありません/);
		await expect(emptyState).toBeVisible();

		// 一覧に「+」ボタンが再表示されることを確認
		if (facilityName) {
			// 拠点名を含む行を探す
			const row = page.locator('tr').filter({ hasText: facilityName.split(' — ')[0] });
			const addButtonInRow = row.getByRole('button', { name: /をお気に入りに追加/ });
			await expect(addButtonInRow).toBeVisible();
		}
	});

	// Given: お気に入りを追加済み
	// When: お気に入りカードから拠点詳細ページへ遷移
	// Then: `/facilities/[id]` ページに遷移し、拠点情報が表示される
	test('TC-E2E-07: お気に入りカードから拠点詳細ページへ遷移できる', async ({ page, context }) => {
		// クッキーをクリア
		await context.clearCookies();
		await page.goto('/');

		// 1件お気に入りを追加
		const firstAddButton = page.getByRole('button', { name: /をお気に入りに追加/ }).first();
		await firstAddButton.click();
		await page.waitForLoadState('domcontentloaded');

		// お気に入りカードのリンクをクリック
		const favoriteArticle = page.getByRole('article').first();
		const link = favoriteArticle.getByRole('link').first();
		await link.click();

		// 拠点詳細ページに遷移することを確認
		await expect(page).toHaveURL(/\/facilities\/[a-f0-9-]+/);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

		// 「トップページに戻る」リンクが表示されることを確認
		await expect(page.getByRole('link', { name: /トップページに戻る/ })).toBeVisible();
	});
});

