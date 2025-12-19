import '@testing-library/jest-dom/vitest';

// テスト実行時に Supabase 環境変数が未設定だと import 時点で落ちるため、
// ダミー値をセットしてユニットテストを安定させる（ネットワークアクセスはしない）。
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';

