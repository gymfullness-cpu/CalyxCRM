type Property = {
  id: number;
  title: string;
  city: string;
  district: string;
  price: number;
  rooms: number;
};

type MatchResult = Property & {
  score: number;
};

export function matchProperties(
  preferences: string,
  properties: Property[]
): Property[] {
  const pref = preferences.toLowerCase();

  const results: MatchResult[] = properties.map((p) => {
    let score = 0;

    if (pref.includes(p.city.toLowerCase())) score += 3;
    if (pref.includes(p.district.toLowerCase())) score += 3;
    if (pref.includes(`${p.rooms}`)) score += 2;
    if (pref.includes(p.title.toLowerCase())) score += 1;

    const priceMatch = pref.match(/(\d{3,7})/g);
    if (priceMatch) {
      const max = Math.max(...priceMatch.map(Number));
      if (p.price <= max) score += 2;
    }

    return { ...p, score };
  });

  return results
    .filter((r) => r.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

