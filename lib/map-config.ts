/**
 * Default map view for single-city MVP.
 * Format: `lat,lng,zoom` (Pune example: 18.5204,73.8567,11)
 */
export function getDefaultMapView(): {
  latitude: number;
  longitude: number;
  zoom: number;
} {
  const raw =
    process.env.NEXT_PUBLIC_MAP_DEFAULT_CENTER ?? "18.5204,73.8567,11";
  const parts = raw.split(",").map((s) => s.trim());
  const latitude = parseFloat(parts[0] ?? "18.5204");
  const longitude = parseFloat(parts[1] ?? "73.8567");
  const zoom = parseFloat(parts[2] ?? "11");
  return {
    latitude: Number.isFinite(latitude) ? latitude : 18.5204,
    longitude: Number.isFinite(longitude) ? longitude : 73.8567,
    zoom: Number.isFinite(zoom) ? zoom : 11,
  };
}
