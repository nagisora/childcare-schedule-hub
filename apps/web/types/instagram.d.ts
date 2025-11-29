/**
 * Instagram SDK のグローバル型定義
 * Instagram公式の embed.js が提供するグローバルオブジェクト
 */

interface InstagramEmbeds {
	/**
	 * Instagram埋め込みを処理する
	 * @param element 処理対象のHTMLElement（省略時は全要素）
	 */
	process: (element?: HTMLElement) => void;
}

interface InstagramGlobal {
	Embeds: InstagramEmbeds;
}

declare global {
	interface Window {
		instgrm?: InstagramGlobal;
	}
}

export {};

