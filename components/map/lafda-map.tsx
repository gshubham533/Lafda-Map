"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { LiveRoom } from "@/components/live/live-room";
import { FilterChips } from "@/components/map/filter-chips";
import { IncidentDetailSheet } from "@/components/map/incident-detail-sheet";
import { IncidentMarker } from "@/components/map/incident-marker";
import { ReportIncidentSheet } from "@/components/map/report-incident-sheet";
import { Button } from "@/components/ui/button";
import { useIncidentsRealtime } from "@/hooks/use-incidents-realtime";
import { useOpenLiveRoom } from "@/hooks/use-open-live-room";
import { getDefaultMapView } from "@/lib/map-config";
import { getMapStyleUrl } from "@/lib/map-style";
import type { IncidentFilter, IncidentRow } from "@/lib/incidents";

export default function LafdaMap() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = useMemo(() => getDefaultMapView(), []);
  const mapStyle = useMemo(() => getMapStyleUrl(), []);
  const { incidents, loading, error } = useIncidentsRealtime();
  const [filter, setFilter] = useState<IncidentFilter>("all");
  const [userLocation, setUserLocation] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const mapRef = useRef<MapRef>(null);
  const flewToUser = useRef(false);
  const [reportOpen, setReportOpen] = useState(false);
  const {
    liveRoom,
    openLive,
    closeLive,
    actionError: liveActionError,
    clearLiveError,
  } = useOpenLiveRoom();

  const getMapCenter = useCallback(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return null;
    const c = map.getCenter();
    return { lng: c.lng, lat: c.lat };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setUserLocation({
          lng: p.coords.longitude,
          lat: p.coords.latitude,
        }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 12_000 },
    );
  }, []);

  useEffect(() => {
    if (!userLocation || flewToUser.current || !mapRef.current) return;
    flewToUser.current = true;
    mapRef.current.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: Math.max(view.zoom, 13),
      duration: 1400,
    });
  }, [userLocation, view.zoom]);

  const visible = useMemo(() => {
    if (filter === "all") return incidents;
    return incidents.filter((i) => i.type === filter);
  }, [incidents, filter]);

  const incidentId = searchParams.get("incident");
  const selectedIncident = useMemo(() => {
    if (!incidentId) return null;
    return incidents.find((i) => i.id === incidentId) ?? null;
  }, [incidents, incidentId]);

  const focusLng = selectedIncident?.lng;
  const focusLat = selectedIncident?.lat;
  const focusId = selectedIncident?.id;

  const unknownIncidentParam =
    Boolean(incidentId) &&
    !loading &&
    !incidents.some((i) => i.id === incidentId);

  useEffect(() => {
    if (unknownIncidentParam) {
      router.replace("/", { scroll: false });
    }
  }, [unknownIncidentParam, router, incidentId]);

  useEffect(() => {
    if (focusId == null || focusLng == null || focusLat == null || !mapRef.current) {
      return;
    }
    const map = mapRef.current.getMap();
    if (!map) return;
    map.flyTo({
      center: [focusLng, focusLat],
      zoom: Math.max(map.getZoom(), 14),
      duration: 1200,
    });
  }, [focusId, focusLng, focusLat]);

  const openReport = useCallback(() => {
    router.replace("/", { scroll: false });
    setReportOpen(true);
  }, [router]);

  const closeDetail = useCallback(() => {
    router.replace("/", { scroll: false });
  }, [router]);

  const selectIncident = useCallback((inc: IncidentRow) => {
    router.replace(`/?incident=${inc.id}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    clearLiveError();
  }, [selectedIncident?.id, clearLiveError]);

  const handleRequestLive = useCallback(
    async (opts: {
      mode: "host" | "viewer";
      incident: IncidentRow;
      sessionId?: string;
    }) => {
      const ok = await openLive(opts);
      if (ok) closeDetail();
    },
    [openLive, closeDetail],
  );

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[min(100%,calc(100%-7rem))]">
        <FilterChips
          value={filter}
          onChange={setFilter}
          className="pointer-events-auto"
        />
      </div>

      {loading ? (
        <div className="pointer-events-none absolute left-3 top-[4.25rem] z-10 rounded-lg border border-border/80 bg-card/90 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          Loading incidents…
        </div>
      ) : null}

      {error ? (
        <div className="absolute bottom-28 left-3 right-3 z-10 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive-foreground backdrop-blur-sm">
          {error}
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        <Button
          type="button"
          size="lg"
          className="pointer-events-auto h-12 gap-2 rounded-full px-6 shadow-lg touch-manipulation"
          onClick={openReport}
        >
          <Plus className="size-5" aria-hidden />
          Report incident
        </Button>
      </div>

      <ReportIncidentSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        defaultCenter={{ lat: view.latitude, lng: view.longitude }}
        getMapCenter={getMapCenter}
      />

      <IncidentDetailSheet
        incident={selectedIncident}
        onClose={closeDetail}
        onRequestLive={handleRequestLive}
        liveActionError={liveActionError}
      />

      {liveRoom ? (
        <LiveRoom
          incident={liveRoom.incident}
          sessionId={liveRoom.sessionId}
          mode={liveRoom.mode}
          onLeave={() => {
            closeLive();
            clearLiveError();
          }}
        />
      ) : null}

      <Map
        ref={mapRef}
        mapStyle={mapStyle}
        initialViewState={{
          longitude: view.longitude,
          latitude: view.latitude,
          zoom: view.zoom,
        }}
        style={{ width: "100%", height: "100%" }}
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />
        {userLocation ? (
          <Marker
            longitude={userLocation.lng}
            latitude={userLocation.lat}
            anchor="center"
          >
            <div
              className="h-3.5 w-3.5 rounded-full border-2 border-white bg-[#3B82F6] shadow-md ring-2 ring-[#3B82F6]/40"
              title="Your location"
            />
          </Marker>
        ) : null}
        {visible.map((inc) => (
          <IncidentMarker key={inc.id} incident={inc} onSelect={selectIncident} />
        ))}
      </Map>
    </div>
  );
}
