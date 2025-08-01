import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Map as MapIcon, Activity } from 'lucide-react';

const LiveMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sample conflict/event data inspired by liveuamap
  const mockEvents = [
    { id: 1, lng: 30.5234, lat: 50.4501, type: 'conflict', title: 'Military Activity', severity: 'high' },
    { id: 2, lng: 37.6173, lat: 55.7558, type: 'political', title: 'Political Event', severity: 'medium' },
    { id: 3, lng: 2.3522, lat: 48.8566, type: 'economic', title: 'Economic Summit', severity: 'low' },
    { id: 4, lng: 139.6917, lat: 35.6895, type: 'trade', title: 'Trade Agreement', severity: 'medium' },
    { id: 5, lng: -74.0059, lat: 40.7128, type: 'financial', title: 'Market Activity', severity: 'high' },
  ];

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        zoom: 2,
        center: [30, 45],
        pitch: 0,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: false,
        }),
        'top-right'
      );

      map.current.on('load', () => {
        setIsLoaded(true);
        
        // Add event markers
        mockEvents.forEach(event => {
          const el = document.createElement('div');
          el.className = `marker-${event.type}`;
          el.style.width = '12px';
          el.style.height = '12px';
          el.style.borderRadius = '50%';
          el.style.cursor = 'pointer';
          el.style.border = '2px solid';
          
          switch (event.severity) {
            case 'high':
              el.style.backgroundColor = '#ef4444';
              el.style.borderColor = '#fca5a5';
              break;
            case 'medium':
              el.style.backgroundColor = '#f59e0b';
              el.style.borderColor = '#fcd34d';
              break;
            case 'low':
              el.style.backgroundColor = '#10b981';
              el.style.borderColor = '#86efac';
              break;
          }

          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="text-sm">
              <strong class="text-terminal-amber">${event.title}</strong><br/>
              <span class="text-terminal-cyan">Type: ${event.type}</span><br/>
              <span class="text-terminal-gray">Severity: ${event.severity}</span>
            </div>`
          );

          new mapboxgl.Marker(el)
            .setLngLat([event.lng, event.lat])
            .setPopup(popup)
            .addTo(map.current!);
        });
      });

    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [mapboxToken]);

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      setShowTokenInput(false);
    }
  };

  if (!mapboxToken) {
    return (
      <div className="terminal-panel">
        <div className="panel-header flex justify-between items-center">
          <span>LIVE GEOPOLITICAL MAP</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="text-terminal-cyan hover:text-terminal-white"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <div className="panel-content">
          {showTokenInput ? (
            <div className="space-y-3">
              <p className="text-terminal-cyan text-sm">
                Enter your Mapbox public token to view the live map:
              </p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="pk.eyJ1..."
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                  className="bg-terminal-bg border-terminal-border text-terminal-white"
                />
                <Button
                  onClick={handleTokenSubmit}
                  size="sm"
                  className="bg-terminal-cyan text-terminal-bg hover:bg-terminal-white"
                >
                  Connect
                </Button>
              </div>
              <p className="text-terminal-gray text-xs">
                Get your token at <span className="text-terminal-amber">mapbox.com</span>
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <MapIcon className="h-16 w-16 text-terminal-gray mx-auto mb-4" />
              <p className="text-terminal-cyan">Live Geopolitical Events Map</p>
              <p className="text-terminal-gray text-sm mt-2">Click settings to configure</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-panel">
      <div className="panel-header flex justify-between items-center">
        <span className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-terminal-red animate-pulse" />
          LIVE GEOPOLITICAL MAP
        </span>
        <div className="flex items-center gap-2 text-xs text-terminal-gray">
          <span className="w-2 h-2 bg-terminal-red rounded-full"></span> High
          <span className="w-2 h-2 bg-terminal-amber rounded-full"></span> Medium  
          <span className="w-2 h-2 bg-terminal-green rounded-full"></span> Low
        </div>
      </div>
      <div className="panel-content p-0">
        <div 
          ref={mapContainer} 
          className="w-full h-64 rounded-lg"
          style={{ minHeight: '256px' }}
        />
        {isLoaded && (
          <div className="absolute bottom-2 left-2 bg-terminal-bg/80 backdrop-blur-sm rounded px-2 py-1">
            <span className="text-xs text-terminal-cyan">
              {mockEvents.length} events tracked
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveMap;