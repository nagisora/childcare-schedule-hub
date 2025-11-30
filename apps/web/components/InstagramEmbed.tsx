'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { isInstagramPostUrl, processInstagramEmbed, isInstagramSDKLoaded } from '../lib/instagram-utils';

type InstagramEmbedProps = {
	postUrl: string;
	className?: string;
};

/**
 * Instagram投稿を埋め込み表示するコンポーネント
 * Instagram公式のblockquote埋め込み方法を使用（API不要）
 * 投稿URLからblockquoteを生成し、Instagramのembed.jsで自動変換
 * 埋め込み失敗時はフォールバック表示（投稿URLへの直接リンク）を表示
 */
export function InstagramEmbed({ postUrl, className = '' }: InstagramEmbedProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [embedFailed, setEmbedFailed] = useState(false);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
				setEmbedFailed(true);
			}
		}, 10000);

		// Instagram SDKが読み込まれた後に埋め込みを処理
		const processEmbed = () => {
			if (containerRef.current) {
				const success = processInstagramEmbed(containerRef.current);
				if (!success) {
					setEmbedFailed(true);
					return;
				}

				// 埋め込み成功を確認（iframe が生成されるまで待機）
				const checkInterval = setInterval(() => {
					const iframe = containerRef.current?.querySelector('iframe');
					if (iframe) {
						clearInterval(checkInterval);
						if (timeoutRef.current) {
							clearTimeout(timeoutRef.current);
							timeoutRef.current = null;
						}
						setEmbedFailed(false);
					}
				}, 500);

				// 5秒後にタイムアウト
				setTimeout(() => {
					clearInterval(checkInterval);
					if (!containerRef.current?.querySelector('iframe')) {
						setEmbedFailed(true);
					}
				}, 5000);
			}
		};

		// 既にSDKが読み込まれている場合は即座に処理
		// Script コンポーネントの strategy="lazyOnload" により、SDK の読み込みタイミングが
		// 遅延する可能性があるため、ポーリングで待機する
		if (isInstagramSDKLoaded()) {
			processEmbed();
		} else {
			// SDK読み込み後に処理（100ms間隔でポーリング、最大10秒）
			let attempts = 0;
			const maxAttempts = 100;
			const checkInterval = setInterval(() => {
				attempts++;
				if (isInstagramSDKLoaded()) {
					clearInterval(checkInterval);
					processEmbed();
				} else if (attempts >= maxAttempts) {
					clearInterval(checkInterval);
					setEmbedFailed(true);
				}
			}, 100);

			return () => {
				clearInterval(checkInterval);
				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current);
				}
			};
		}

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
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

	if (embedFailed) {
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

