import React, { useEffect, useState } from 'react';
import { Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { aisService, AISShipData } from '@/services/AISStreamService';
import { Ship, Anchor, Navigation, MapPin, Info } from 'lucide-react';

interface ShipRouteLayerProps {
  enabled: boolean;
  showRoutes: boolean;
  selectedShipMMSI?: string;
  onShipSelect?: (ship: AISShipData) => void;
  onShipCountChange?: (count: number) => void;
}

const getShipColor = (type: string): string => {
  const colors: Record<string, string> = {
    'Tanker': '#ef4444',
    'Cargo': '#22c55e',
    'Passenger': '#3b82f6',
    'Fishing': '#f59e0b',
    'Military': '#6b7280',
    'Tug': '#8b5cf6',
    'Sailing': '#06b6d4',
    'High Speed': '#ec4899',
    'Unknown': '#10b981'
  };
  
  return colors[type] || colors.Unknown;
};

const createShipIcon = (ship: AISShipData) => {
  const color = getShipColor(ship.shipTypeName);
  const rotation = ship.heading || ship.course || 0;
  
  return L.divIcon({
    className: 'ship-marker',
    html: `
      <div style="
        transform: rotate(${rotation}deg);
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="${color}" style="filter: drop-shadow(0 0 3px ${color});">
          <path d="M12 2L4 22h16L12 2z"/>
        </svg>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const ShipRouteLayer: React.FC<ShipRouteLayerProps> = ({
  enabled,
  showRoutes,
  selectedShipMMSI,
  onShipSelect,
  onShipCountChange
}) => {
  const [ships, setShips] = useState<AISShipData[]>([]);
  const [selectedShip, setSelectedShip] = useState<AISShipData | null>(null);
  const [shipHistory, setShipHistory] = useState<Map<string, [number, number][]>>(new Map());
  const map = useMap();

  useEffect(() => {
    if (!enabled) {
      aisService.disconnect();
      return;
    }

    // Connect to AIS stream with global coverage
    aisService.connect([[[-90, -180], [90, 180]]]);

    // Subscribe to updates
    aisService.subscribe('ship-layer', (shipData) => {
      setShips(prev => {
        const existing = prev.findIndex(s => s.mmsi === shipData.mmsi);
        let updated: AISShipData[];
        if (existing >= 0) {
          updated = [...prev];
          updated[existing] = shipData;
        } else {
          updated = [...prev, shipData];
        }
        
        // Limit to 500 ships for performance
        if (updated.length > 500) {
          updated = updated.slice(-500);
        }
        
        onShipCountChange?.(updated.length);
        return updated;
      });

      // Update history for route drawing
      setShipHistory(prev => {
        const history = prev.get(shipData.mmsi) || [];
        const newPoint: [number, number] = [shipData.lat, shipData.lng];
        
        // Avoid duplicate points
        const lastPoint = history[history.length - 1];
        if (lastPoint && lastPoint[0] === newPoint[0] && lastPoint[1] === newPoint[1]) {
          return prev;
        }
        
        // Keep last 50 points per ship
        const updated = [...history, newPoint].slice(-50);
        const newMap = new Map(prev);
        newMap.set(shipData.mmsi, updated);
        return newMap;
      });
    });

    return () => {
      aisService.unsubscribe('ship-layer');
    };
  }, [enabled, onShipCountChange]);

  // Update selected ship
  useEffect(() => {
    if (selectedShipMMSI) {
      const ship = ships.find(s => s.mmsi === selectedShipMMSI);
      if (ship) {
        setSelectedShip(ship);
        map.flyTo([ship.lat, ship.lng], 10, { duration: 1 });
      }
    }
  }, [selectedShipMMSI, ships, map]);

  if (!enabled) return null;

  return (
    <>
      {/* Ship Markers */}
      {ships.map(ship => (
        <Marker
          key={ship.mmsi}
          position={[ship.lat, ship.lng]}
          icon={createShipIcon(ship)}
          eventHandlers={{
            click: () => {
              setSelectedShip(ship);
              onShipSelect?.(ship);
            }
          }}
        >
          <Popup>
            <div className="min-w-[250px] p-2 text-xs">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-600">
                <Ship className="w-4 h-4" style={{ color: getShipColor(ship.shipTypeName) }} />
                <span className="font-bold text-sm">{ship.name || 'Unknown Vessel'}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-1">
                <div className="text-gray-400">MMSI:</div>
                <div>{ship.mmsi}</div>
                
                <div className="text-gray-400">IMO:</div>
                <div>{ship.imo || 'N/A'}</div>
                
                <div className="text-gray-400">Flag:</div>
                <div>{ship.flag}</div>
                
                <div className="text-gray-400">Type:</div>
                <div>{ship.shipTypeName}</div>
                
                <div className="text-gray-400">Speed:</div>
                <div>{ship.speed.toFixed(1)} kn</div>
                
                <div className="text-gray-400">Course:</div>
                <div>{ship.course.toFixed(0)}°</div>
                
                <div className="text-gray-400">Destination:</div>
                <div>{ship.destination || 'Unknown'}</div>
                
                <div className="text-gray-400">Size:</div>
                <div>{ship.length}m × {ship.width}m</div>
              </div>
              
              <div className="mt-2 pt-2 border-t border-gray-600 text-gray-400">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {ship.lat.toFixed(5)}, {ship.lng.toFixed(5)}
                </div>
                <div>Updated: {ship.lastUpdate.toLocaleTimeString()}</div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Ship Route Lines */}
      {showRoutes && selectedShip && shipHistory.get(selectedShip.mmsi) && (
        <Polyline
          positions={shipHistory.get(selectedShip.mmsi)!}
          pathOptions={{
            color: getShipColor(selectedShip.shipTypeName),
            weight: 2,
            opacity: 0.7,
            dashArray: '5, 5'
          }}
        />
      )}
    </>
  );
};

export default ShipRouteLayer;
