const DISALLOWED_PROFILE_SEGMENTS = new Set([
	"explore",
	"about",
	"accounts",
	"direct",
	"reels",
	"stories",
	"p",
	"reel",
	"tv",
]);

export function normalizeInstagramUrl(url: string): string | null {
	if (!url) {
		return null;
	}

	try {
		const urlObj = new URL(url);

		if (!urlObj.hostname.includes("instagram.com")) {
			return null;
		}

		urlObj.search = "";
		urlObj.hash = "";

		if (urlObj.protocol === "http:") {
			urlObj.protocol = "https:";
		}

		if (
			urlObj.hostname === "m.instagram.com" ||
			urlObj.hostname === "instagram.com"
		) {
			urlObj.hostname = "www.instagram.com";
		}

		const segments = urlObj.pathname.split("/").filter(Boolean);
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

export function normalizeInstagramPostUrl(
	url: string,
): { normalized: string; type: "p" | "reel" } | null {
	if (!url) {
		return null;
	}

	try {
		const urlObj = new URL(url);
		if (!urlObj.hostname.includes("instagram.com")) {
			return null;
		}

		urlObj.search = "";
		urlObj.hash = "";

		if (urlObj.protocol === "http:") {
			urlObj.protocol = "https:";
		}

		if (
			urlObj.hostname === "m.instagram.com" ||
			urlObj.hostname === "instagram.com"
		) {
			urlObj.hostname = "www.instagram.com";
		}

		const segments = urlObj.pathname.split("/").filter(Boolean);
		if (segments.length !== 2) {
			return null;
		}

		const [kind, shortcode] = segments;
		if ((kind !== "p" && kind !== "reel") || !shortcode) {
			return null;
		}
		if (!/^[A-Za-z0-9_-]+$/.test(shortcode)) {
			return null;
		}

		urlObj.pathname = `/${kind}/${shortcode}/`;
		return {
			normalized: urlObj.toString(),
			type: kind === "p" ? "p" : "reel",
		};
	} catch {
		return null;
	}
}

export function extractInstagramUsername(
	instagramUrl: string | null,
): string | null {
	if (!instagramUrl) {
		return null;
	}
	const normalized = normalizeInstagramUrl(instagramUrl);
	if (!normalized) {
		return null;
	}

	const urlObj = new URL(normalized);
	const segments = urlObj.pathname.split("/").filter(Boolean);
	return segments[0] ?? null;
}
