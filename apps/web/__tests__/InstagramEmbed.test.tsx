import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { InstagramEmbed } from '../components/InstagramEmbed';

// Instagram SDK のモック
const mockInstgrm = {
	Embeds: {
		process: vi.fn(),
	},
};

describe('InstagramEmbed', () => {
	beforeEach(() => {
		// window.instgrm をモック
		(global as any).window = {
			...global.window,
			instgrm: mockInstgrm,
		};
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// Given: 有効なInstagram投稿URL
	// When: InstagramEmbed をレンダリング
	// Then: blockquote要素が表示される
	it('TC-N-01: 有効なInstagram投稿URLを表示できる', () => {
		const postUrl = 'https://www.instagram.com/p/ABC123/';
		render(<InstagramEmbed postUrl={postUrl} />);

		const blockquote = screen.getByRole('link', { name: /この投稿をInstagramで表示/i });
		expect(blockquote).toBeInTheDocument();
		expect(blockquote.closest('blockquote')).toHaveAttribute('data-instgrm-permalink', postUrl);
	});

	// Given: 無効なURL
	// When: InstagramEmbed をレンダリング
	// Then: エラーメッセージとフォールバックリンクが表示される
	it('TC-A-01: 無効なURLの場合、エラーメッセージとフォールバックリンクを表示する', () => {
		const invalidUrl = 'https://example.com/not-instagram';
		render(<InstagramEmbed postUrl={invalidUrl} />);

		expect(screen.getByText(/無効なInstagram投稿URLです/i)).toBeInTheDocument();
		const fallbackLink = screen.getByRole('link', { name: /Instagramで開く/i });
		expect(fallbackLink).toBeInTheDocument();
		expect(fallbackLink).toHaveAttribute('href', invalidUrl);
	});

	// Given: 空文字列
	// When: InstagramEmbed をレンダリング
	// Then: エラーメッセージとフォールバックリンクが表示される
	it('TC-A-02: 空文字列の場合、エラーメッセージとフォールバックリンクを表示する', () => {
		render(<InstagramEmbed postUrl="" />);

		expect(screen.getByText(/無効なInstagram投稿URLです/i)).toBeInTheDocument();
		const fallbackLink = screen.getByRole('link', { name: /Instagramで開く/i });
		expect(fallbackLink).toBeInTheDocument();
	});

	// Given: 有効なURLだが、埋め込み処理が失敗
	// When: タイムアウト後に埋め込み失敗を検知
	// Then: フォールバック表示（投稿URLへの直接リンク）が表示される
	it('TC-A-03: 埋め込み処理が失敗した場合、フォールバック表示を表示する', async () => {
		vi.useFakeTimers();
		const postUrl = 'https://www.instagram.com/p/ABC123/';
		mockInstgrm.Embeds.process.mockReturnValue(false);
		// window.instgrm を undefined にして、SDK未読み込み状態をシミュレート
		Object.defineProperty(global, 'window', {
			value: {
				...global.window,
				instgrm: undefined,
			},
			writable: true,
		});

		render(<InstagramEmbed postUrl={postUrl} />);

		// タイムアウトまで待機（10秒 + ポーリング時間）
		vi.advanceTimersByTime(11000);

		await waitFor(() => {
			expect(screen.getByText(/Instagram投稿の埋め込みに失敗しました/i)).toBeInTheDocument();
		});

		const fallbackLink = screen.getByRole('link', { name: /Instagram投稿を新しいタブで開く/i });
		expect(fallbackLink).toBeInTheDocument();
		expect(fallbackLink).toHaveAttribute('href', postUrl);

		vi.useRealTimers();
	});

	// Given: 有効なURL
	// When: Instagram SDKが読み込まれていない状態でレンダリング
	// Then: blockquote要素は表示されるが、埋め込み処理は後で実行される
	it('TC-N-02: Instagram SDKが未読み込みでもblockquote要素を表示する', () => {
		Object.defineProperty(global, 'window', {
			value: {
				...global.window,
				instgrm: undefined,
			},
			writable: true,
		});
		const postUrl = 'https://www.instagram.com/p/ABC123/';
		render(<InstagramEmbed postUrl={postUrl} />);

		const blockquote = screen.getByRole('link', { name: /この投稿をInstagramで表示/i });
		expect(blockquote).toBeInTheDocument();
	});
});

