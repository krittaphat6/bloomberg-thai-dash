import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import { TacticalUnit, TacticalZone } from './types';
import { createUnitIcon, getZoneStyle, getRangeCircleStyle, formatUnitPopup } from './mapUtils';
import 'leaflet/dist/leaflet.css';

interface TacticalMapCanvasProps {
  units: TacticalUnit[];
  zones: TacticalZone[];
  selectedUnitId?: string;
  onSelectUnit: (unit: TacticalUnit | null) => void;
  showRangeCircles?: boolean;
  className?: string;
}

export const TacticalMapCanvas = ({
  units,
  zones,
  selectedUnitId,
  onSelectUnit,
  showRangeCircles = true,
  className,
}: TacticalMapCanvasProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const unitMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const zoneLayersRef = useRef<Map<string, L.Polygon>>(new Map());
  const rangeCirclesRef = useRef<Map<string, L.Circle>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [14.9, 102.8],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark military-style tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Add labels on top
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Zoom controls
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update zones
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing zones
    zoneLayersRef.current.forEach(layer => layer.remove());
    zoneLayersRef.current.clear();

    // Add new zones
    zones.forEach(zone => {
      const polygon = L.polygon(zone.polygon as L.LatLngExpression[], {
        ...getZoneStyle(zone.type),
      }).addTo(map);

      polygon.bindTooltip(zone.name, {
        permanent: false,
        direction: 'center',
        className: 'tactical-zone-tooltip',
      });

      zoneLayersRef.current.set(zone.id, polygon);
    });
  }, [zones]);

  // Update units
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers that are no longer in units
    const currentUnitIds = new Set(units.map(u => u.id));
    unitMarkersRef.current.forEach((marker, id) => {
      if (!currentUnitIds.has(id)) {
        marker.remove();
        unitMarkersRef.current.delete(id);
      }
    });

    // Remove old range circles
    rangeCirclesRef.current.forEach((circle, id) => {
      if (!currentUnitIds.has(id)) {
        circle.remove();
        rangeCirclesRef.current.delete(id);
      }
    });

    // Update or create markers
    units.forEach(unit => {
      const existingMarker = unitMarkersRef.current.get(unit.id);
      
      if (existingMarker) {
        // Update position
        existingMarker.setLatLng(unit.position as L.LatLngExpression);
        existingMarker.setIcon(createUnitIcon(unit));
      } else {
        // Create new marker
        const marker = L.marker(unit.position as L.LatLngExpression, {
          icon: createUnitIcon(unit),
        }).addTo(map);

        marker.bindPopup(formatUnitPopup(unit), {
          className: 'tactical-unit-popup',
          maxWidth: 300,
        });

        marker.on('click', () => {
          onSelectUnit(unit);
        });

        unitMarkersRef.current.set(unit.id, marker);
      }

      // Update range circles
      if (showRangeCircles && unit.effectiveRange && unit.effectiveRange > 0) {
        const existingCircle = rangeCirclesRef.current.get(unit.id);
        const radiusInMeters = unit.effectiveRange * 1000;

        if (existingCircle) {
          existingCircle.setLatLng(unit.position as L.LatLngExpression);
          existingCircle.setRadius(radiusInMeters);
        } else {
          const circle = L.circle(unit.position as L.LatLngExpression, {
            radius: radiusInMeters,
            ...getRangeCircleStyle(unit),
          }).addTo(map);

          rangeCirclesRef.current.set(unit.id, circle);
        }
      }
    });
  }, [units, showRangeCircles, onSelectUnit]);

  // Highlight selected unit
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    unitMarkersRef.current.forEach((marker, id) => {
      const element = marker.getElement();
      if (element) {
        if (id === selectedUnitId) {
          element.classList.add('selected-unit');
          element.style.zIndex = '1000';
        } else {
          element.classList.remove('selected-unit');
          element.style.zIndex = '';
        }
      }
    });

    // Pan to selected unit
    if (selectedUnitId) {
      const unit = units.find(u => u.id === selectedUnitId);
      if (unit) {
        map.panTo(unit.position as L.LatLngExpression);
      }
    }
  }, [selectedUnitId, units]);

  return (
    <div 
      ref={mapContainerRef} 
      className={className}
      style={{ 
        width: '100%', 
        height: '100%',
        backgroundColor: '#0a1628',
      }}
    />
  );
};
