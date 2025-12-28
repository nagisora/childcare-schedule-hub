import { NextRequest, NextResponse } from 'next/server';

function unauthorizedResponse() {
	return new NextResponse('Authentication required', {
		status: 401,
		headers: {
			'WWW-Authenticate': 'Basic realm="CSH Admin"',
		},
	});
}

function configErrorResponse() {
	return new NextResponse('Server configuration error', { status: 500 });
}

export function middleware(request: NextRequest) {
	const user = process.env.ADMIN_BASIC_AUTH_USER;
	const password = process.env.ADMIN_BASIC_AUTH_PASSWORD;

	if (!user || !password) {
		// 認証設定が無い場合は安全側に倒す（保護対象を公開しない）
		return configErrorResponse();
	}

	const auth = request.headers.get('authorization') ?? request.headers.get('Authorization');
	if (!auth || !auth.startsWith('Basic ')) {
		return unauthorizedResponse();
	}

	const encoded = auth.slice('Basic '.length).trim();

	let decoded: string;
	try {
		decoded = atob(encoded);
	} catch {
		return unauthorizedResponse();
	}

	const separatorIndex = decoded.indexOf(':');
	if (separatorIndex < 0) {
		return unauthorizedResponse();
	}

	const providedUser = decoded.slice(0, separatorIndex);
	const providedPass = decoded.slice(separatorIndex + 1);

	if (providedUser !== user || providedPass !== password) {
		return unauthorizedResponse();
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/admin/:path*', '/api/admin/:path*'],
};


