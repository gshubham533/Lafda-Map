/** OpenFreeMap dark vector style — free, no API key (see https://openfreemap.org/). */
export const DEFAULT_MAP_STYLE_URL =
  "https://tiles.openfreemap.org/styles/dark";

export function getMapStyleUrl(): string {
  return (
    process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim() || DEFAULT_MAP_STYLE_URL
  );
}
