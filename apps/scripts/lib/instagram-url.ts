const DISALLOWED_PROFILE_SEGMENTS = new Set([
	'explore',
	'about',
	'accounts',
	'direct',
	'reels',
	'stories',
	'p',
	'reel',
	'tv',
]);

export function normalizeInstagramUrl(url: string): string | null {
	if (!url) {
		return null;
	}

	try {
		const urlObj = new URL(url);
		if (!urlObj.hostname.includes('instagram.com')) {
			return null;
		}

		urlObj.search = '';
		urlObj.hash = '';

		if (urlObj.protocol === 'http:') {
			urlObj.protocol = 'https:';
		}

		if (urlObj.hostname === 'm.instagram.com' || urlObj.hostname === 'instagram.com') {
			urlObj.hostname = 'www.instagram.com';
		}

		const segments = urlObj.pathname.split('/').filter(Boolean);
		if (segments.length !== 1) {
			return null;
		}
		const username = segments[0];
		if (DISALLOWED_PROFILE_SEGMENTS.has(username.toLowerCase())) {
			return null;
		}

		urlObj.pathname = `/${username}/`;
		return urlObj.toString();
	} catch {
		return null;
	}
}
