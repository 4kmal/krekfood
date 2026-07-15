import {
  missingConfigurationDiagnostic,
  networkDiagnostic,
  providerFailureDiagnostic,
  type ApiDiagnosticPayload,
} from "../_shared/api-diagnostics.ts";

export interface RestaurantFilters {
  budget?: string;
  cuisine?: string;
}

export interface RestaurantLocation {
  lat: number;
  lon: number;
}

interface ProviderResult<T> {
  data: T;
  diagnostics: ApiDiagnosticPayload[];
}

type UnknownRecord = Record<string, unknown>;

const BUDGET_PRICE_MAP: Record<string, string[]> = {
  cheap: ['$', '$$'],
  moderate: ['$$', '$$$'],
  expensive: ['$$$', '$$$$'],
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radius = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
      * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distanceKm: number): string {
  return distanceKm < 1
    ? `${Math.round(distanceKm * 1000)}m`
    : `${distanceKm.toFixed(1)}km`;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? value as UnknownRecord : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

async function readJson(response: Response): Promise<UnknownRecord> {
  return asRecord(await response.json().catch(() => ({})));
}

async function fetchPlaceReviews(dataId: string): Promise<ProviderResult<UnknownRecord[]>> {
  const apiKey = Deno.env.get('SERPAPI_KEY')?.trim();
  if (!dataId) return { data: [], diagnostics: [] };
  if (!apiKey) {
    return {
      data: [],
      diagnostics: [missingConfigurationDiagnostic('serpapi', 'place-reviews', 'SERPAPI_KEY', 'warning')],
    };
  }

  try {
    const url = `https://serpapi.com/search.json?engine=google_maps_reviews&data_id=${encodeURIComponent(dataId)}&hl=en&sort_by=qualityScore&api_key=${apiKey}`;
    const response = await fetch(url);
    const body = await readJson(response);
    if (!response.ok || body.error) {
      return {
        data: [],
        diagnostics: [providerFailureDiagnostic('serpapi', 'place-reviews', response.status, body, 'warning')],
      };
    }

    const reviews = Array.isArray(body.reviews) ? body.reviews.slice(0, 5) : [];
    return {
      data: reviews.map((review) => {
        const value = asRecord(review);
        const user = asRecord(value.user);
        return {
          name: asString(user.name, 'Anonymous'),
          rating: asNumber(value.rating, 5),
          text: asString(value.snippet, asString(value.text, 'Great food!')),
          date: asString(value.date),
          likes: asNumber(value.likes),
        };
      }),
      diagnostics: [],
    };
  } catch {
    return {
      data: [],
      diagnostics: [networkDiagnostic('serpapi', 'place-reviews', 'warning')],
    };
  }
}

function coordinates(place: UnknownRecord): { lat: number; lon: number } | null {
  const gps = asRecord(place.gps_coordinates);
  const lat = asNumber(gps.latitude, Number.NaN);
  const lon = asNumber(gps.longitude, Number.NaN);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function areaFromAddress(address: unknown): string {
  if (typeof address !== 'string') return 'Malaysia';
  return address.split(',')[1]?.trim() || 'Malaysia';
}

async function normalizePlace(
  place: UnknownRecord,
  location?: RestaurantLocation | null,
): Promise<ProviderResult<UnknownRecord>> {
  const placeCoordinates = coordinates(place);
  const reviewResult = await fetchPlaceReviews(asString(place.data_id));
  const distance = location && placeCoordinates
    ? calculateDistance(location.lat, location.lon, placeCoordinates.lat, placeCoordinates.lon)
    : undefined;

  return {
    data: {
      id: asString(place.place_id, asString(place.data_id)),
      name: asString(place.title, asString(place.name, 'Restaurant')),
      area: areaFromAddress(place.address),
      signature: asString(place.type, 'Restaurant'),
      price_level: asString(place.price, '$$'),
      lat: placeCoordinates?.lat || 0,
      lon: placeCoordinates?.lon || 0,
      tags: Array.isArray(place.types) ? place.types : [],
      reviews: reviewResult.data,
      rating: asOptionalNumber(place.rating),
      totalReviews: asOptionalNumber(place.reviews),
      hasRealReviews: reviewResult.data.length > 0,
      thumbnail: asString(place.thumbnail) || undefined,
      distance,
      distanceFormatted: distance === undefined ? undefined : formatDistance(distance),
    },
    diagnostics: reviewResult.diagnostics,
  };
}

export async function searchRestaurants(
  query: string,
  filters?: RestaurantFilters,
  location?: RestaurantLocation | null,
): Promise<ProviderResult<UnknownRecord[]>> {
  const apiKey = Deno.env.get('SERPAPI_KEY')?.trim();
  if (!apiKey) {
    return {
      data: [],
      diagnostics: [missingConfigurationDiagnostic('serpapi', 'restaurant-search', 'SERPAPI_KEY', 'warning')],
    };
  }

  const searchQuery = `${filters?.cuisine ? `${filters.cuisine} ` : ''}${query} restaurant`.trim();
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google_maps');
  url.searchParams.set('q', searchQuery);
  url.searchParams.set('hl', 'en');
  url.searchParams.set('type', 'search');
  url.searchParams.set('api_key', apiKey);
  if (location) url.searchParams.set('ll', `@${location.lat},${location.lon},15z`);
  else url.searchParams.set('gl', 'my');

  try {
    const response = await fetch(url);
    const body = await readJson(response);
    if (!response.ok || body.error) {
      return {
        data: [],
        diagnostics: [providerFailureDiagnostic('serpapi', 'restaurant-search', response.status, body, 'warning')],
      };
    }

    let places = (Array.isArray(body.local_results) ? body.local_results : [])
      .map(asRecord);
    if (filters?.budget && BUDGET_PRICE_MAP[filters.budget]) {
      const allowed = BUDGET_PRICE_MAP[filters.budget];
      places = places.filter((place) => !place.price || allowed.includes(asString(place.price)));
    }

    places.sort((left, right) => {
      if (location) {
        const leftCoordinates = coordinates(left);
        const rightCoordinates = coordinates(right);
        const leftDistance = leftCoordinates
          ? calculateDistance(location.lat, location.lon, leftCoordinates.lat, leftCoordinates.lon)
          : Number.POSITIVE_INFINITY;
        const rightDistance = rightCoordinates
          ? calculateDistance(location.lat, location.lon, rightCoordinates.lat, rightCoordinates.lon)
          : Number.POSITIVE_INFINITY;
        return leftDistance - rightDistance;
      }
      const leftScore = asNumber(left.rating) * Math.log(asNumber(left.reviews, 1));
      const rightScore = asNumber(right.rating) * Math.log(asNumber(right.reviews, 1));
      return rightScore - leftScore;
    });

    const normalized = await Promise.all(places.slice(0, 5).map((place) => normalizePlace(place, location)));
    return {
      data: normalized.map((result) => result.data),
      diagnostics: normalized.flatMap((result) => result.diagnostics),
    };
  } catch {
    return {
      data: [],
      diagnostics: [networkDiagnostic('serpapi', 'restaurant-search', 'warning')],
    };
  }
}

export async function enrichDatabaseMatches(
  kedaiList: UnknownRecord[],
  recommendations: string[],
  location?: RestaurantLocation | null,
): Promise<ProviderResult<UnknownRecord[]>> {
  const matches = kedaiList.filter((kedai) => {
    const name = asString(kedai.name).toLowerCase();
    return recommendations.some((recommended) => {
      const normalized = recommended.toLowerCase();
      return name.includes(normalized) || normalized.includes(name);
    });
  });

  const apiKey = Deno.env.get('SERPAPI_KEY')?.trim();
  if (!apiKey) {
    return {
      data: matches.map((kedai) => ({ ...kedai, hasRealReviews: false })),
      diagnostics: matches.length > 0
        ? [missingConfigurationDiagnostic('serpapi', 'database-place-enrichment', 'SERPAPI_KEY', 'warning')]
        : [],
    };
  }

  const diagnostics: ApiDiagnosticPayload[] = [];
  const enriched = await Promise.all(matches.map(async (kedai) => {
    const query = `${asString(kedai.name)} ${asString(kedai.area)} Malaysia`;
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_maps');
    url.searchParams.set('q', query);
    url.searchParams.set('api_key', apiKey);

    try {
      const response = await fetch(url);
      const body = await readJson(response);
      if (!response.ok || body.error) {
        diagnostics.push(providerFailureDiagnostic('serpapi', 'database-place-enrichment', response.status, body, 'warning'));
        return { ...kedai, hasRealReviews: false };
      }

      const place = asRecord(Array.isArray(body.local_results) ? body.local_results[0] : null);
      const dataId = asString(place.data_id);
      if (!dataId) return { ...kedai, hasRealReviews: false };
      const reviews = await fetchPlaceReviews(dataId);
      diagnostics.push(...reviews.diagnostics);
      const placeCoordinates = coordinates(place);
      const distance = location && placeCoordinates
        ? calculateDistance(location.lat, location.lon, placeCoordinates.lat, placeCoordinates.lon)
        : undefined;
      return {
        ...kedai,
        reviews: reviews.data.length > 0 ? reviews.data : kedai.reviews,
        hasRealReviews: reviews.data.length > 0,
        rating: place.rating,
        totalReviews: place.reviews,
        distance,
        distanceFormatted: distance === undefined ? undefined : formatDistance(distance),
      };
    } catch {
      diagnostics.push(networkDiagnostic('serpapi', 'database-place-enrichment', 'warning'));
      return { ...kedai, hasRealReviews: false };
    }
  }));

  return { data: enriched, diagnostics };
}
