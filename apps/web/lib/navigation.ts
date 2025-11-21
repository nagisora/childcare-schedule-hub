/**
 * ナビゲーション関連のユーティリティ関数
 */

/**
 * クッキー更新後にページを再読み込みする（簡易実装）
 * 将来的には Route Handler 経由で revalidateTag を呼び出す
 */
export function reloadAfterCookieUpdate(): void {
	window.location.reload();
}

