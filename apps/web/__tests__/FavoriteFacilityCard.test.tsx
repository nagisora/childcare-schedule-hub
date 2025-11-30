import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FavoriteFacilityCard } from '../components/FavoriteFacilityCard';
import { createTestFacility } from './test-helpers';
import type { FavoriteFacility } from '../lib/favorites';
import type { Schedule } from '../lib/types';

// 日付ユーティリティのモック
vi.mock('../lib/date-utils', () => ({
	getCurrentYearMonth: () => ({ year: 2025, month: 1 }),
	getMonthFirstDay: (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}-01`,
	getMonthLabel: (monthStr: string) => {
		const [year, month] = monthStr.split('-');
		return `${year}年${parseInt(month)}月`;
	},
	getWardName: (wardName: string | null) => wardName || 'エリア不明',
}));

// InstagramEmbed のモック
vi.mock('../components/InstagramEmbed', () => ({
	InstagramEmbed: ({ postUrl }: { postUrl: string }) => (
		<div data-testid="instagram-embed">{postUrl}</div>
	),
}));

// MonthSelector のモック
vi.mock('../components/MonthSelector', () => ({
	MonthSelector: ({ selectedMonth, onChange }: { selectedMonth: string; onChange: (year: number, month: number) => void }) => (
		<div data-testid="month-selector">
			<span>{selectedMonth}</span>
			<button onClick={() => onChange(2025, 1)}>月変更</button>
		</div>
	),
}));

describe('FavoriteFacilityCard', () => {
	afterEach(() => {
		cleanup();
	});

	const mockFavorite: FavoriteFacility = {
		facility: createTestFacility({ id: 'facility-1', name: 'テスト拠点' }),
		sortOrder: 1,
	};

	const mockSchedule: Schedule = {
		id: 'schedule-1',
		facility_id: 'facility-1',
		image_url: 'https://example.com/image.jpg',
		instagram_post_url: 'https://www.instagram.com/p/ABC123/',
		embed_html: null,
		published_month: '2025-01-01',
		status: 'published',
		notes: null,
	};

	const defaultProps = {
		favorite: mockFavorite,
		schedule: undefined,
		selectedMonth: '2025-01-01',
		onRemove: vi.fn(),
		onMonthChange: vi.fn(),
	};

	// Given: スケジュールが登録されている
	// When: FavoriteFacilityCard をレンダリング
	// Then: Instagram埋め込みが表示される
	it('TC-N-01: スケジュールが登録されている場合、Instagram埋め込みを表示する', () => {
		render(<FavoriteFacilityCard {...defaultProps} schedule={mockSchedule} />);

		expect(screen.getByTestId('instagram-embed')).toBeInTheDocument();
		expect(screen.getByText(mockSchedule.instagram_post_url!)).toBeInTheDocument();
	});

	// Given: スケジュールが未登録
	// When: FavoriteFacilityCard をレンダリング
	// Then: 「スケジュールが登録されていません」メッセージが表示される
	it('TC-N-02: スケジュールが未登録の場合、空状態メッセージを表示する', () => {
		render(<FavoriteFacilityCard {...defaultProps} />);

		expect(screen.getByText(/2025年1月のスケジュールが登録されていません/i)).toBeInTheDocument();
		const detailLink = screen.getByRole('link', { name: /詳細ページを見る/i });
		expect(detailLink).toBeInTheDocument();
		expect(detailLink).toHaveAttribute('href', '/facilities/facility-1');
	});

	// Given: ローディング状態
	// When: FavoriteFacilityCard をレンダリング（isLoading=true）
	// Then: ローディングスピナーが表示される
	it('TC-N-03: ローディング状態の場合、ローディングスピナーを表示する', () => {
		const { container } = render(<FavoriteFacilityCard {...defaultProps} isLoading={true} />);

		expect(container.textContent).toContain('スケジュールを読み込み中');
		expect(container.querySelector('[data-testid="instagram-embed"]')).not.toBeInTheDocument();
		expect(container.textContent).not.toContain('スケジュールが登録されていません');
	});

	// Given: エラー状態
	// When: FavoriteFacilityCard をレンダリング（errorが設定されている）
	// Then: エラーメッセージが表示される
	it('TC-A-01: エラー状態の場合、エラーメッセージを表示する', () => {
		const error = new Error('スケジュールの取得に失敗しました');
		const { container } = render(<FavoriteFacilityCard {...defaultProps} error={error} />);

		expect(container.textContent).toContain('スケジュールの取得に失敗しました');
		expect(container.querySelector('[data-testid="instagram-embed"]')).not.toBeInTheDocument();
		expect(container.textContent).not.toContain('スケジュールが登録されていません');
	});

	// Given: ローディングとエラーが両方設定されている
	// When: FavoriteFacilityCard をレンダリング
	// Then: ローディングが優先される
	it('TC-N-04: ローディングとエラーが両方設定されている場合、ローディングを優先表示する', () => {
		const error = new Error('スケジュールの取得に失敗しました');
		const { container } = render(<FavoriteFacilityCard {...defaultProps} isLoading={true} error={error} />);

		expect(container.textContent).toContain('スケジュールを読み込み中');
		expect(container.textContent).not.toContain('スケジュールの取得に失敗しました');
	});

	// Given: スケジュールが登録されているが、ローディング中
	// When: FavoriteFacilityCard をレンダリング（isLoading=true, scheduleあり）
	// Then: ローディングスピナーが表示される（スケジュールは非表示）
	it('TC-N-05: ローディング中は既存のスケジュールを非表示にする', () => {
		const { container } = render(<FavoriteFacilityCard {...defaultProps} schedule={mockSchedule} isLoading={true} />);

		expect(container.textContent).toContain('スケジュールを読み込み中');
		expect(container.querySelector('[data-testid="instagram-embed"]')).not.toBeInTheDocument();
	});
});

