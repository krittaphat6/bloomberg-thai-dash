import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";

import type { LayerConfig } from "./MapLayers";
import type { AISShipData } from "@/services/AISStreamService";
import type { FlightData } from "@/services/FlightTrackingService";
import type { StormData } from "@/services/StormTrackingService";
import type { MarketData } from "@/services/GeoDataService";
import { stormService } from "@/services/StormTrackingService";

type LatLng = [number, number];

interface HasCoordinates {
  id: string;
  coordinates: [number, number]; // [lng, lat]
}

interface LeafletMapCanvasProps {
  className?: string;
  background: string;

  center: LatLng;
  zoom: number;
  minZoom: number;
  maxZoom: number;

  baseUrl: string;
  labelUrl: string | null;
  attribution: string;

  layers: LayerConfig[];
  isLayerEnabled: (layerId: string) => boolean;

  markets: MarketData[];
  earthquakes: Array<{ id: string; coordinates: [number, number]; magnitude: number; place: string }>;
  banks: Array<{ id: string; coordinates: [number, number]; name: string }>;
  ports: Array<{ id: string; coordinates: [number, number]; name: string }>;
  oilGas: Array<{ id: string; coordinates: [number, number]; name: string }>;
  wildfires: Array<{ id: string; coordinates: [number, number] }>;
  aisShips: AISShipData[];
  flights: FlightData[];
  storms: StormData[];

  onSelectItem: (item: any) => void;
  onZoomChange: (zoom: number) => void;
  onTilesLoadingChange: (loading: boolean) => void;
  onMapReady: (map: L.Map) => void;

  getMarketColor: (market: MarketData) => string;
  getEarthquakeRadius: (magnitude: number) => number;
  createShipIcon: (shipType: string, heading: number) => L.DivIcon;
}

function toLatLng([lng, lat]: [number, number]): LatLng {
  return [lat, lng];
}

export function LeafletMapCanvas({
  className,
  background,
  center,
  zoom,
  minZoom,
  maxZoom,
  baseUrl,
  labelUrl,
  attribution,
  layers,
  isLayerEnabled,
  markets,
  earthquakes,
  banks,
  ports,
  oilGas,
  wildfires,
  aisShips,
  flights,
  storms,
  onSelectItem,
  onZoomChange,
  onTilesLoadingChange,
  onMapReady,
  getMarketColor,
  getEarthquakeRadius,
  createShipIcon,
}: LeafletMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const labelLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const tileKey = useMemo(() => `${baseUrl}::${labelUrl ?? ""}::${attribution}`, [baseUrl, labelUrl, attribution]);

  // Init map
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      zoomControl: false,
      minZoom,
      maxZoom,
      worldCopyJump: true,
    }).setView(center, zoom);

    mapRef.current = map;
    setMapReady(true);
    onMapReady(map);
    onZoomChange(map.getZoom());

    const invalidate = () => map.invalidateSize();
    // Ensure the map renders correctly inside flex/resizeable containers
    requestAnimationFrame(invalidate);
    setTimeout(invalidate, 100);

    const onZoomEnd = () => onZoomChange(map.getZoom());
    map.on("zoomend", onZoomEnd);

    const onWindowResize = () => invalidate();
    window.addEventListener("resize", onWindowResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => invalidate());
      ro.observe(el);
    }

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onWindowResize);
      map.off("zoomend", onZoomEnd);
      map.remove();
      mapRef.current = null;
      baseLayerRef.current = null;
      labelLayerRef.current = null;
      markersLayerRef.current = null;
      setMapReady(false);
    };
  }, [center, zoom, minZoom, maxZoom, onMapReady, onZoomChange]);

  // Update tile layers
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    // Remove previous layers
    if (baseLayerRef.current) {
      baseLayerRef.current.off();
      map.removeLayer(baseLayerRef.current);
      baseLayerRef.current = null;
    }
    if (labelLayerRef.current) {
      labelLayerRef.current.off();
      map.removeLayer(labelLayerRef.current);
      labelLayerRef.current = null;
    }

    const base = L.tileLayer(baseUrl, {
      attribution,
      minZoom,
      maxZoom,
    });

    const handleLoading = () => onTilesLoadingChange(true);
    const handleLoad = () => onTilesLoadingChange(false);
    const handleTileError = () => onTilesLoadingChange(false);

    base.on("loading", handleLoading);
    base.on("load", handleLoad);
    base.on("tileerror", handleTileError);

    base.addTo(map);
    baseLayerRef.current = base;

    if (labelUrl) {
      const labels = L.tileLayer(labelUrl, {
        attribution: "",
        maxZoom,
        zIndex: 650,
        opacity: 1,
      });
      labels.addTo(map);
      labelLayerRef.current = labels;
    }

    return () => {
      base.off("loading", handleLoading);
      base.off("load", handleLoad);
      base.off("tileerror", handleTileError);
    };
  }, [mapReady, tileKey, baseUrl, labelUrl, attribution, minZoom, maxZoom, onTilesLoadingChange]);

  // Update markers
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const group = markersLayerRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (isLayerEnabled("markets")) {
      markets.forEach((m) => {
        const marker = L.circleMarker(toLatLng(m.coordinates), {
          radius: 6,
          color: "#ffffff",
          weight: 1,
          fillColor: getMarketColor(m),
          fillOpacity: 0.8,
        });
        marker.on("click", () => onSelectItem(m));
        marker.addTo(group);
      });
    }

    if (isLayerEnabled("earthquakes")) {
      earthquakes.forEach((q) => {
        const marker = L.circleMarker(toLatLng(q.coordinates), {
          radius: getEarthquakeRadius(q.magnitude),
          color: "#ff4444",
          weight: 2,
          fillColor: "#ff4444",
          fillOpacity: 0.35,
        });
        marker.on("click", () => onSelectItem(q));
        marker.addTo(group);
      });
    }

    if (isLayerEnabled("banking")) {
      banks.forEach((b) => {
        const marker = L.circleMarker(toLatLng(b.coordinates), {
          radius: 8,
          color: "#ffffff",
          weight: 1,
          fillColor: "#00a0ff",
          fillOpacity: 0.8,
        });
        marker.on("click", () => onSelectItem(b));
        marker.addTo(group);
      });
    }

    if (isLayerEnabled("shipping")) {
      ports.forEach((p) => {
        const marker = L.circleMarker(toLatLng(p.coordinates), {
          radius: 5,
          color: "#ffffff",
          weight: 1,
          fillColor: "#4169e1",
          fillOpacity: 0.8,
        });
        marker.on("click", () => onSelectItem(p));
        marker.addTo(group);
      });
    }

    if (isLayerEnabled("oil_gas")) {
      oilGas.forEach((o) => {
        const marker = L.circleMarker(toLatLng(o.coordinates), {
          radius: 5,
          color: "#ffffff",
          weight: 1,
          fillColor: "#8b4513",
          fillOpacity: 0.8,
        });
        marker.on("click", () => onSelectItem(o));
        marker.addTo(group);
      });
    }

    if (isLayerEnabled("wildfires")) {
      wildfires.forEach((f) => {
        const marker = L.circleMarker(toLatLng(f.coordinates), {
          radius: 4,
          color: "#ff0000",
          weight: 1,
          fillColor: "#ff6600",
          fillOpacity: 0.8,
        });
        marker.addTo(group);
      });
    }

    if (isLayerEnabled("ais_ships")) {
      aisShips.forEach((s) => {
        const marker = L.marker([s.lat, s.lng], {
          icon: createShipIcon(s.shipTypeName, s.heading || s.course || 0),
        });
        marker.on("click", () =>
          onSelectItem({
            id: s.mmsi,
            name: s.name,
            type: "ship",
            shipType: s.shipTypeName,
            flag: s.flag,
            speed: s.speed,
            course: s.course,
            destination: s.destination,
            coordinates: [s.lng, s.lat],
          })
        );
        marker.addTo(group);
      });
    }

    // Flights layer
    if (isLayerEnabled("flights")) {
      flights.forEach((f) => {
        const color = f.onGround ? "#6b7280" : "#f59e0b";
        const heading = f.heading || 0;
        
        const icon = L.divIcon({
          className: 'custom-flight-icon',
          html: `<div style="transform: rotate(${heading}deg); filter: drop-shadow(0 0 2px ${color});">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
          </div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([f.lat, f.lng], { icon });
        marker.on("click", () =>
          onSelectItem({
            id: f.icao24,
            name: f.callsign || f.icao24,
            type: "flight",
            callsign: f.callsign,
            originCountry: f.originCountry,
            altitude: f.altitude,
            velocity: f.velocity,
            heading: f.heading,
            onGround: f.onGround,
            coordinates: [f.lng, f.lat],
          })
        );
        marker.addTo(group);
      });
    }

    // Storms layer
    if (isLayerEnabled("storms")) {
      storms.forEach((s) => {
        const color = stormService.getStormColor(s);
        const radius = stormService.getStormRadius(s);
        
        // Pulsing circle for active storms
        const marker = L.circleMarker([s.lat, s.lng], {
          radius,
          color: color,
          weight: 3,
          fillColor: color,
          fillOpacity: 0.4,
          className: 'storm-marker-pulse',
        });
        
        marker.on("click", () =>
          onSelectItem({
            id: s.id,
            name: s.name,
            type: "storm",
            stormType: s.type,
            category: s.category,
            windSpeed: s.windSpeed,
            windSpeedMph: s.windSpeedMph,
            pressure: s.pressure,
            movement: s.movement,
            basin: s.basin,
            headline: s.headline,
            coordinates: [s.lng, s.lat],
          })
        );
        marker.addTo(group);

        // Add storm name label for hurricanes
        if (s.type === 'hurricane' || s.category >= 1) {
          const nameLabel = L.divIcon({
            className: 'storm-name-label',
            html: `<div style="
              color: white;
              font-size: 10px;
              font-weight: bold;
              text-shadow: 0 0 4px ${color}, 0 0 2px black;
              white-space: nowrap;
            ">${s.name}</div>`,
            iconSize: [60, 16],
            iconAnchor: [30, -radius - 4],
          });
          L.marker([s.lat, s.lng], { icon: nameLabel }).addTo(group);
        }
      });
    }
  }, [
    mapReady,
    layers,
    isLayerEnabled,
    markets,
    earthquakes,
    banks,
    ports,
    oilGas,
    wildfires,
    aisShips,
    flights,
    storms,
    onSelectItem,
    getMarketColor,
    getEarthquakeRadius,
    createShipIcon,
  ]);

  return <div ref={containerRef} className={className} style={{ background }} />;
}
