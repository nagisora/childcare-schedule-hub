import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { EmptyState } from '../components/EmptyState';

describe('EmptyState', () => {
	afterEach(() => {
		cleanup();
	});

	// Given: メッセージのみ
	// When: EmptyState をレンダリング
	// Then: メッセージが表示される
	it('TC-N-01: メッセージを表示できる', () => {
		const message = 'データが登録されていません';
		const { container } = render(<EmptyState message={message} />);

		expect(container.textContent).toContain(message);
	});

	// Given: メッセージと説明文
	// When: EmptyState をレンダリング
	// Then: メッセージと説明文が表示される
	it('TC-N-02: メッセージと説明文を表示できる', () => {
		const message = 'データが登録されていません';
		const description = 'データがまだ投入されていない可能性があります。';
		const { container } = render(<EmptyState message={message} description={description} />);

		expect(container.textContent).toContain(message);
		expect(container.textContent).toContain(description);
	});

	// Given: メッセージとアクション（リンク）
	// When: EmptyState をレンダリング
	// Then: メッセージとアクションが表示される
	it('TC-N-03: メッセージとアクションを表示できる', () => {
		const message = 'データが登録されていません';
		const action = <a href="/">トップページに戻る</a>;
		const { container } = render(<EmptyState message={message} action={action} />);

		expect(container.textContent).toContain(message);
		const link = screen.getByRole('link', { name: /トップページに戻る/i });
		expect(link).toHaveAttribute('href', '/');
	});
});

