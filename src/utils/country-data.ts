export const ALL_COUNTRIES = [
    "United States", "United Kingdom", "Canada", "Australia", "Germany", "France",
    "Spain", "Italy", "China", "Japan", "Brazil", "Mexico", "India", "Netherlands",
    "Switzerland", "Sweden", "Belgium", "Austria", "Norway", "Denmark", "Ireland",
    "New Zealand", "Singapore", "South Korea", "Russia", "South Africa", "Argentina",
    "Chile", "Colombia", "Peru", "Portugal", "Greece", "Poland", "Turkey", "Egypt",
    "Saudi Arabia", "United Arab Emirates", "Israel", "Thailand", "Vietnam", "Malaysia",
    "Indonesia", "Philippines", "Pakistan", "Bangladesh", "Nigeria", "Kenya",
    "Finland", "Ukraine", "Czech Republic", "Hungary", "Romania", "Morocco"
].sort();

// Pre-compute lowercase values to avoid repetitive .toLowerCase() calls during filtering
const SEARCH_INDEX = ALL_COUNTRIES.map(country => ({
    original: country,
    lower: country.toLowerCase()
}));

export function filterCountries(query: string): string[] {
    if (!query) return ALL_COUNTRIES;

    const normalizedQuery = query.toLowerCase();
    const result: string[] = [];

    // Use a simple for loop for maximum performance (avoids filter().map() double allocation)
    for (let i = 0; i < SEARCH_INDEX.length; i++) {
        if (SEARCH_INDEX[i].lower.includes(normalizedQuery)) {
            result.push(SEARCH_INDEX[i].original);
        }
    }

    return result;
}
