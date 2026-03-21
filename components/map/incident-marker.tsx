"use client";

import { Marker } from "react-map-gl/maplibre";
import { categoryColor, type IncidentRow } from "@/lib/incidents";

type Props = {
  incident: IncidentRow;
  onSelect: (incident: IncidentRow) => void;
};

export function IncidentMarker({ incident, onSelect }: Props) {
  const color = categoryColor(incident.type);

  return (
    <Marker longitude={incident.lng} latitude={incident.lat} anchor="center">
      <button
        type="button"
        className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`Open incident: ${incident.title}`}
        title={incident.title}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(incident);
        }}
      >
        <span className="relative flex h-5 w-5 items-center justify-center">
          {incident.is_live ? (
            <span
              className="absolute inline-flex h-5 w-5 animate-ping rounded-full opacity-50"
              style={{ backgroundColor: color }}
              aria-hidden
            />
          ) : null}
          <span
            className="relative z-[1] h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow-md"
            style={{ backgroundColor: color }}
            aria-hidden
          />
        </span>
      </button>
    </Marker>
  );
}
