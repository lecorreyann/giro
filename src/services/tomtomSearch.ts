import type { Coord } from '../types';

export type AddressSuggestion = {
  id: string;
  address: string;
  coord: Coord;
};

type TomTomSearchResponse = {
  results: Array<{
    id: string;
    address: { freeformAddress: string };
    position: { lat: number; lon: number };
  }>;
};

export async function searchAddresses(
  query: string,
  apiKey: string,
  bias?: Coord,
): Promise<AddressSuggestion[]> {
  if (query.trim().length < 3) return [];
  const params = new URLSearchParams({
    key: apiKey,
    limit: '5',
    language: 'es-ES',
    typeahead: 'true',
  });
  if (bias) {
    params.set('lat', String(bias.lat));
    params.set('lon', String(bias.lng));
    params.set('radius', '30000');
  }
  const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as TomTomSearchResponse;
  return (data.results ?? []).map((r) => ({
    id: r.id,
    address: r.address.freeformAddress,
    coord: { lat: r.position.lat, lng: r.position.lon },
  }));
}
