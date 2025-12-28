import './globals.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="ja">
			<body className="min-h-screen bg-primary-50">
				<div className="min-h-screen">
					{children}
				</div>
			</body>
		</html>
	);
}


