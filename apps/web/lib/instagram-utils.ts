/**
 * Instagram関連のユーティリティ関数
 */

/**
 * Instagram投稿URLかどうかを判定する
 * @param url 判定対象のURL
 * @returns Instagram投稿URLの場合 true
 */
export function isInstagramPostUrl(url: string): boolean {
	if (!url || typeof url !== 'string') {
		return false;
	}

	// https://(www.)?instagram.com/p/... 形式をチェック
	const instagramPostPattern = /^https:\/\/(www\.)?instagram\.com\/p\/[A-Za-z0-9_-]+\/?/;
	return instagramPostPattern.test(url);
}

/**
 * Instagram SDK を使って埋め込みを処理する
 * @param container 処理対象のコンテナ要素
 * @returns 処理が成功した場合 true
 */
export function processInstagramEmbed(container: HTMLElement): boolean {
	if (typeof window === 'undefined' || !window.instgrm?.Embeds?.process) {
		return false;
	}

	try {
		window.instgrm.Embeds.process(container);
		return true;
	} catch (error) {
		console.error('Failed to process Instagram embed:', error);
		return false;
	}
}

/**
 * Instagram SDK が読み込まれているかどうかを判定する
 * @returns SDK が読み込まれている場合 true
 */
export function isInstagramSDKLoaded(): boolean {
	return typeof window !== 'undefined' && !!window.instgrm?.Embeds?.process;
}

