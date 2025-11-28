'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

type InstagramEmbedProps = {
	postUrl: string;
	className?: string;
};

/**
 * Instagram投稿を埋め込み表示するコンポーネント
 * Instagram公式のblockquote埋め込み方法を使用（API不要）
 * 投稿URLからblockquoteを生成し、Instagramのembed.jsで自動変換
 */
export function InstagramEmbed({ postUrl, className = '' }: InstagramEmbedProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	// 投稿URLのバリデーション
	const isValidUrl = postUrl.startsWith('https://www.instagram.com/p/') || 
	                   postUrl.startsWith('https://instagram.com/p/');

	useEffect(() => {
		// Instagram SDKが読み込まれた後に埋め込みを処理
		const processEmbed = () => {
			// @ts-expect-error - Instagram SDKのグローバル関数
			if (window.instgrm?.Embeds?.process && containerRef.current) {
				// @ts-expect-error
				window.instgrm.Embeds.process(containerRef.current);
			}
		};

		// 既にSDKが読み込まれている場合は即座に処理
		// @ts-expect-error
		if (window.instgrm?.Embeds?.process) {
			processEmbed();
		} else {
			// SDK読み込み後に処理
			const checkInterval = setInterval(() => {
				// @ts-expect-error
				if (window.instgrm?.Embeds?.process) {
					clearInterval(checkInterval);
					processEmbed();
				}
			}, 100);

			return () => clearInterval(checkInterval);
		}
	}, [postUrl]);

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

