export type Coord = { lat: number; lng: number };

export async function geocode(address: string): Promise<Coord> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'es',
      'User-Agent': 'delivery-route-optimization/0.1 (demo)',
    },
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Adresse introuvable : ${address}`);
  }
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}
