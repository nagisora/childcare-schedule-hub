export function uniqueStrings(values: string[]): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	for (const value of values) {
		const normalized = value.trim();
		if (!normalized || seen.has(normalized)) {
			continue;
		}
		seen.add(normalized);
		out.push(normalized);
	}
	return out;
}

export function normalizeFacilityNameForSearch(name: string): string {
	return name
		.replace(/[〜～]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

export function normalizeFacilityNameDropParentheticalContent(
	name: string,
): string {
	return name
		.replace(/（[^）]*）/g, " ")
		.replace(/\([^)]*\)/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function normalizeFacilityNameExpandParentheticalContent(
	name: string,
): string {
	return name
		.replace(/[（）()]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function buildFacilityNameVariantsForSearch(name: string): string[] {
	const raw = name.trim();
	if (!raw) {
		return [];
	}

	const normalized = normalizeFacilityNameForSearch(raw);
	const withoutParenContent =
		normalizeFacilityNameDropParentheticalContent(normalized);
	const expandedParenContent =
		normalizeFacilityNameExpandParentheticalContent(normalized);

	return uniqueStrings([
		raw,
		normalized,
		withoutParenContent,
		expandedParenContent,
	]).slice(0, 3);
}

export function buildOrQuotedTerm(variants: string[]): string {
	if (variants.length === 0) {
		return '""';
	}
	if (variants.length === 1) {
		return `"${variants[0]}"`;
	}
	return `(${variants.map((variant) => `"${variant}"`).join(" OR ")})`;
}

export function isGenericFacilityName(facilityName: string): boolean {
	const normalized = normalizeFacilityNameForSearch(facilityName);
	return normalized.length <= 3;
}
