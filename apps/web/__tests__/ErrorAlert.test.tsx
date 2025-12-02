import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ErrorAlert } from '../components/ErrorAlert';

describe('ErrorAlert', () => {
	afterEach(() => {
		cleanup();
	});

	// Given: エラーメッセージ
	// When: ErrorAlert をレンダリング
	// Then: エラーメッセージが表示され、role="alert" と aria-live="polite" が設定される
	it('TC-N-01: エラーメッセージを表示できる', () => {
		const message = 'データの取得に失敗しました';
		const { container } = render(<ErrorAlert message={message} />);

		const alert = screen.getByRole('alert');
		expect(alert).toHaveAttribute('aria-live', 'polite');
		expect(container.textContent).toContain('エラーが発生しました');
		expect(container.textContent).toContain(message);
	});

	// Given: エラーメッセージと再試行ハンドラ
	// When: ErrorAlert をレンダリングして再試行ボタンをクリック
	// Then: 再試行ハンドラが呼ばれる
	it('TC-N-02: 再試行ボタンをクリックすると、onRetryが呼ばれる', () => {
		const onRetry = vi.fn();
		const { container } = render(<ErrorAlert message="エラーメッセージ" onRetry={onRetry} />);

		const retryButton = container.querySelector('button[aria-label="再試行"]');
		expect(retryButton).toBeInTheDocument();
		if (retryButton) {
			fireEvent.click(retryButton);
			expect(onRetry).toHaveBeenCalledTimes(1);
		}
	});

	// Given: エラーメッセージ（再試行ハンドラなし）
	// When: ErrorAlert をレンダリング
	// Then: 再試行ボタンが表示される
	it('TC-N-03: 再試行ハンドラが未指定の場合、再試行ボタンが表示される', () => {
		const { container } = render(<ErrorAlert message="エラーメッセージ" />);

		const retryButton = container.querySelector('button[aria-label="再試行"]');
		expect(retryButton).toBeInTheDocument();
	});

	// Given: showRetry=false
	// When: ErrorAlert をレンダリング
	// Then: 再試行ボタンが表示されない
	it('TC-N-04: showRetry=falseの場合、再試行ボタンを表示しない', () => {
		const { container } = render(<ErrorAlert message="エラーメッセージ" showRetry={false} />);

		const buttons = container.querySelectorAll('button');
		expect(buttons.length).toBe(0);
	});
});

