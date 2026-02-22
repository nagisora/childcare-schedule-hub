import fetch from "node-fetch";

const DEFAULT_USER_AGENT =
	"ChildcareScheduleHub/1.0 (+https://childcare-schedule-hub.example.com)";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BACKOFF_DELAYS_MS = [500, 1000, 2000];

export interface FetchTextWithRetryOptions {
	maxRetries?: number;
	backoffDelaysMs?: number[];
	userAgent?: string;
	onRetry?: (params: {
		url: string;
		attempt: number;
		maxRetries: number;
		delayMs: number;
		error: unknown;
	}) => void;
	wrapFinalError?: boolean;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchTextWithRetry(
	url: string,
	options: FetchTextWithRetryOptions = {},
	retryCount = 0,
): Promise<string> {
	const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
	const backoffDelaysMs =
		options.backoffDelaysMs ?? DEFAULT_BACKOFF_DELAYS_MS;
	const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;

	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": userAgent,
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status} ${response.statusText}`);
		}

		return await response.text();
	} catch (error) {
		if (retryCount < maxRetries) {
			const delayMs = backoffDelaysMs[retryCount] ?? 2000;
			options.onRetry?.({
				url,
				attempt: retryCount + 1,
				maxRetries,
				delayMs,
				error,
			});
			await sleep(delayMs);
			return fetchTextWithRetry(url, options, retryCount + 1);
		}

		if (options.wrapFinalError) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(
				`Failed to fetch ${url} after ${maxRetries} retries: ${message}`,
			);
		}

		throw error;
	}
}
