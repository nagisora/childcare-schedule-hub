export interface GoogleCseItem {
	link: string;
	title: string;
	snippet: string;
}

interface GoogleCseApiError {
	message?: string;
}

interface GoogleCseResponse {
	items?: unknown[];
	error?: GoogleCseApiError;
}

export type GoogleCseSearchResult =
	| { kind: 'success'; items: GoogleCseItem[] }
	| { kind: 'http_error' }
	| { kind: 'network_error' }
	| { kind: 'api_error'; message: string };

function isGoogleCseItem(value: unknown): value is GoogleCseItem {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const item = value as Record<string, unknown>;
	return (
		typeof item.link === 'string' &&
		typeof item.title === 'string' &&
		typeof item.snippet === 'string'
	);
}

export async function searchGoogleCse(params: {
	apiKey: string;
	cx: string;
	query: string;
}): Promise<GoogleCseSearchResult> {
	const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
	searchUrl.searchParams.set('key', params.apiKey);
	searchUrl.searchParams.set('cx', params.cx);
	searchUrl.searchParams.set('q', params.query);
	searchUrl.searchParams.set('num', '10');
	searchUrl.searchParams.set('hl', 'ja');
	searchUrl.searchParams.set('gl', 'jp');

	try {
		const response = await fetch(searchUrl.toString(), {
			method: 'GET',
			headers: {
				'User-Agent': 'ChildcareScheduleHub/1.0',
			},
		});

		if (!response.ok) {
			return { kind: 'http_error' };
		}

		const data = (await response.json()) as GoogleCseResponse;
		if (data.error) {
			return {
				kind: 'api_error',
				message: data.error.message || 'Google CSE API error',
			};
		}

		const items = Array.isArray(data.items)
			? data.items.filter(isGoogleCseItem)
			: [];
		return { kind: 'success', items };
	} catch {
		return { kind: 'network_error' };
	}
}
