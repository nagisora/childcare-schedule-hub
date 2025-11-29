'use client';

import { useEffect, useRef } from 'react';
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
 */
export function InstagramEmbed({ postUrl, className = '' }: InstagramEmbedProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	// 投稿URLのバリデーション
	const isValidUrl = isInstagramPostUrl(postUrl);

	useEffect(() => {
		if (!containerRef.current) {
			return;
		}

		// Instagram SDKが読み込まれた後に埋め込みを処理
		const processEmbed = () => {
			if (containerRef.current) {
				processInstagramEmbed(containerRef.current);
			}
		};

		// 既にSDKが読み込まれている場合は即座に処理
		// Script コンポーネントの strategy="lazyOnload" により、SDK の読み込みタイミングが
		// 遅延する可能性があるため、ポーリングで待機する
		if (isInstagramSDKLoaded()) {
			processEmbed();
		} else {
			// SDK読み込み後に処理（100ms間隔でポーリング）
			const checkInterval = setInterval(() => {
				if (isInstagramSDKLoaded()) {
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

