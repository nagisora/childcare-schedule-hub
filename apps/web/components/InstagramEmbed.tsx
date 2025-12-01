'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { isInstagramPostUrl, processInstagramEmbed, isInstagramSDKLoaded } from '../lib/instagram-utils';

type InstagramEmbedProps = {
	postUrl: string;
	className?: string;
};

/**
 * Instagram埋め込みの状態
 * - 'loading': SDK読み込み中または埋め込み処理中
 * - 'success': 埋め込み成功（iframe生成済み）
 * - 'failed': 埋め込み失敗（タイムアウトまたはエラー）
 */
type EmbedState = 'loading' | 'success' | 'failed';

/**
 * Instagram投稿を埋め込み表示するコンポーネント
 * Instagram公式のblockquote埋め込み方法を使用（API不要）
 * 投稿URLからblockquoteを生成し、Instagramのembed.jsで自動変換
 * 埋め込み失敗時はフォールバック表示（投稿URLへの直接リンク）を表示
 */
/**
 * Instagram SDKの読み込みを確認し、読み込み完了後に埋め込み処理を実行する
 * @param containerRef 埋め込み先のコンテナ要素のref
 * @param onSuccess 埋め込み成功時のコールバック
 * @param onFailure 埋め込み失敗時のコールバック
 * @returns cleanup関数（タイマー・インターバルのクリア）
 */
function ensureInstagramEmbedScript(
	containerRef: React.RefObject<HTMLDivElement>,
	onSuccess: () => void,
	onFailure: () => void
): () => void {
	let checkInterval: NodeJS.Timeout | null = null;
	let timeout: NodeJS.Timeout | null = null;

	// 既にSDKが読み込まれている場合は即座に処理
	if (isInstagramSDKLoaded()) {
		if (containerRef.current) {
			const success = processInstagramEmbed(containerRef.current);
			if (success) {
				onSuccess();
			} else {
				onFailure();
			}
		}
		return () => {
			// クリーンアップ不要（即座に処理完了）
		};
	}

	// SDK読み込み待機（100ms間隔でポーリング、最大10秒）
	let attempts = 0;
	const maxAttempts = 100;
	checkInterval = setInterval(() => {
		attempts++;
		if (isInstagramSDKLoaded()) {
			if (checkInterval) {
				clearInterval(checkInterval);
				checkInterval = null;
			}
			if (containerRef.current) {
				const success = processInstagramEmbed(containerRef.current);
				if (success) {
					onSuccess();
				} else {
					onFailure();
				}
			}
		} else if (attempts >= maxAttempts) {
			if (checkInterval) {
				clearInterval(checkInterval);
				checkInterval = null;
			}
			onFailure();
		}
	}, 100);

	// タイムアウト（10秒後にフォールバック表示）
	timeout = setTimeout(() => {
		if (checkInterval) {
			clearInterval(checkInterval);
			checkInterval = null;
		}
		onFailure();
	}, 10000);

	// cleanup関数
	return () => {
		if (checkInterval) {
			clearInterval(checkInterval);
		}
		if (timeout) {
			clearTimeout(timeout);
		}
	};
}

export function InstagramEmbed({ postUrl, className = '' }: InstagramEmbedProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [embedState, setEmbedState] = useState<EmbedState>('loading');
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

	// 投稿URLのバリデーション
	const isValidUrl = isInstagramPostUrl(postUrl);

	useEffect(() => {
		if (!containerRef.current || !isValidUrl) {
			return;
		}

		// 埋め込み失敗のタイムアウト（10秒後にフォールバック表示）
		timeoutRef.current = setTimeout(() => {
			// iframe が生成されていない場合は埋め込み失敗とみなす
			const iframe = containerRef.current?.querySelector('iframe');
			if (!iframe) {
				setEmbedState('failed');
			}
		}, 10000);

		// Instagram SDKが読み込まれた後に埋め込みを処理
		const handleEmbedSuccess = () => {
			// 埋め込み成功を確認（iframe が生成されるまで待機）
			checkIntervalRef.current = setInterval(() => {
				const iframe = containerRef.current?.querySelector('iframe');
				if (iframe) {
					if (checkIntervalRef.current) {
						clearInterval(checkIntervalRef.current);
						checkIntervalRef.current = null;
					}
					if (timeoutRef.current) {
						clearTimeout(timeoutRef.current);
						timeoutRef.current = null;
					}
					setEmbedState('success');
				}
			}, 500);

			// 5秒後にタイムアウト
			setTimeout(() => {
				if (checkIntervalRef.current) {
					clearInterval(checkIntervalRef.current);
					checkIntervalRef.current = null;
				}
				if (!containerRef.current?.querySelector('iframe')) {
					setEmbedState('failed');
				}
			}, 5000);
		};

		const handleEmbedFailure = () => {
			setEmbedState('failed');
		};

		// SDK読み込み確認と埋め込み処理の実行
		const cleanup = ensureInstagramEmbedScript(containerRef, handleEmbedSuccess, handleEmbedFailure);

		// cleanup関数（タイマー・インターバルのクリア）
		return () => {
			cleanup();
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
			if (checkIntervalRef.current) {
				clearInterval(checkIntervalRef.current);
				checkIntervalRef.current = null;
			}
		};
	}, [postUrl, isValidUrl]);

	if (!isValidUrl) {
		return (
			<div className={`flex flex-col items-center justify-center h-64 bg-slate-50 rounded-lg p-4 ${className}`}>
				<p className="text-sm text-slate-400 mb-2">無効なInstagram投稿URLです</p>
				<a
					href={postUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="text-sm text-blue-600 hover:text-blue-800 underline"
				>
					Instagramで開く
				</a>
			</div>
		);
	}

	if (embedState === 'failed') {
		return (
			<div className={`flex flex-col items-center justify-center h-64 bg-slate-50 rounded-lg p-4 ${className}`}>
				<p className="text-sm text-slate-600 mb-2">Instagram投稿の埋め込みに失敗しました</p>
				<a
					href={postUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="text-sm text-blue-600 hover:text-blue-800 underline"
					aria-label="Instagram投稿を新しいタブで開く"
				>
					Instagramで開く
				</a>
			</div>
		);
	}

	return (
		<>
			{/* Instagram公式埋め込みスクリプト */}
			<Script
				src="https://www.instagram.com/embed.js"
				strategy="lazyOnload"
				async
			/>
			<div 
				ref={containerRef} 
				className={`w-full instagram-embed-container ${className}`}
				aria-label="Instagram投稿の埋め込み"
			>
				<blockquote
					className="instagram-media"
					data-instgrm-permalink={postUrl}
					data-instgrm-version="14"
				>
					<a href={postUrl} target="_blank" rel="noopener noreferrer">
						この投稿をInstagramで表示
					</a>
				</blockquote>
			</div>
		</>
	);
}

