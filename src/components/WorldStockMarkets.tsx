import { useState, useEffect, useMemo } from 'react';

interface StockMarket {
  name: string;
  flag: string;
  fullName: string;
  lat: number;
  lon: number;
  utcOffset: number;
  openHour: number;
  openMin: number;
  closeHour: number;
  closeMin: number;
  indexSymbol: string;
  isOpen: boolean;
  localHour: number;
  localMin: number;
  localSec: number;
}

const MARKETS_DATA: Omit<StockMarket, 'isOpen' | 'localHour' | 'localMin' | 'localSec'>[] = [
  { name: "NYSE", flag: "🇺🇸", fullName: "New York", lat: 40.7, lon: -74.0, utcOffset: -5, openHour: 9, openMin: 30, closeHour: 16, closeMin: 0, indexSymbol: "S&P500" },
  { name: "NASDAQ", flag: "🇺🇸", fullName: "New York", lat: 40.75, lon: -73.9, utcOffset: -5, openHour: 9, openMin: 30, closeHour: 16, closeMin: 0, indexSymbol: "NASDAQ" },
  { name: "TSX", flag: "🇨🇦", fullName: "Toronto", lat: 43.65, lon: -79.4, utcOffset: -5, openHour: 9, openMin: 30, closeHour: 16, closeMin: 0, indexSymbol: "TSX" },
  { name: "BMV", flag: "🇲🇽", fullName: "Mexico", lat: 19.4, lon: -99.1, utcOffset: -6, openHour: 8, openMin: 30, closeHour: 15, closeMin: 0, indexSymbol: "MXX" },
  { name: "B3", flag: "🇧🇷", fullName: "São Paulo", lat: -23.5, lon: -46.6, utcOffset: -3, openHour: 10, openMin: 0, closeHour: 17, closeMin: 0, indexSymbol: "IBOV" },
  { name: "LSE", flag: "🇬🇧", fullName: "London", lat: 51.5, lon: -0.1, utcOffset: 0, openHour: 8, openMin: 0, closeHour: 16, closeMin: 30, indexSymbol: "FTSE" },
  { name: "EURONEXT", flag: "🇫🇷", fullName: "Paris", lat: 48.9, lon: 2.3, utcOffset: 1, openHour: 9, openMin: 0, closeHour: 17, closeMin: 30, indexSymbol: "CAC40" },
  { name: "XETRA", flag: "🇩🇪", fullName: "Frankfurt", lat: 50.1, lon: 8.7, utcOffset: 1, openHour: 9, openMin: 0, closeHour: 17, closeMin: 30, indexSymbol: "DAX" },
  { name: "SIX", flag: "🇨🇭", fullName: "Zurich", lat: 47.4, lon: 8.5, utcOffset: 1, openHour: 9, openMin: 0, closeHour: 17, closeMin: 30, indexSymbol: "SMI" },
  { name: "MOEX", flag: "🇷🇺", fullName: "Moscow", lat: 55.8, lon: 37.6, utcOffset: 3, openHour: 10, openMin: 0, closeHour: 18, closeMin: 50, indexSymbol: "IMOEX" },
  { name: "TADAWUL", flag: "🇸🇦", fullName: "Riyadh", lat: 24.7, lon: 46.7, utcOffset: 3, openHour: 10, openMin: 0, closeHour: 15, closeMin: 0, indexSymbol: "TASI" },
  { name: "JSE", flag: "🇿🇦", fullName: "Johannesburg", lat: -26.2, lon: 28.0, utcOffset: 2, openHour: 9, openMin: 0, closeHour: 17, closeMin: 0, indexSymbol: "SA40" },
  { name: "NSE", flag: "🇮🇳", fullName: "Mumbai", lat: 19.1, lon: 72.9, utcOffset: 5.5, openHour: 9, openMin: 15, closeHour: 15, closeMin: 30, indexSymbol: "NIFTY" },
  { name: "SSE", flag: "🇨🇳", fullName: "Shanghai", lat: 31.2, lon: 121.5, utcOffset: 8, openHour: 9, openMin: 30, closeHour: 15, closeMin: 0, indexSymbol: "SSE" },
  { name: "HKEX", flag: "🇭🇰", fullName: "Hong Kong", lat: 22.3, lon: 114.2, utcOffset: 8, openHour: 9, openMin: 30, closeHour: 16, closeMin: 0, indexSymbol: "HSI" },
  { name: "TSE", flag: "🇯🇵", fullName: "Tokyo", lat: 35.7, lon: 139.8, utcOffset: 9, openHour: 9, openMin: 0, closeHour: 15, closeMin: 0, indexSymbol: "N225" },
  { name: "KRX", flag: "🇰🇷", fullName: "Seoul", lat: 37.5, lon: 127.0, utcOffset: 9, openHour: 9, openMin: 0, closeHour: 15, closeMin: 30, indexSymbol: "KOSPI" },
  { name: "SGX", flag: "🇸🇬", fullName: "Singapore", lat: 1.3, lon: 103.8, utcOffset: 8, openHour: 9, openMin: 0, closeHour: 17, closeMin: 0, indexSymbol: "STI" },
  { name: "ASX", flag: "🇦🇺", fullName: "Sydney", lat: -33.9, lon: 151.2, utcOffset: 11, openHour: 10, openMin: 0, closeHour: 16, closeMin: 0, indexSymbol: "ASX200" },
  { name: "SET", flag: "🇹🇭", fullName: "Bangkok", lat: 13.7, lon: 100.5, utcOffset: 7, openHour: 10, openMin: 0, closeHour: 16, closeMin: 30, indexSymbol: "SET" },
];

const WorldStockMarkets = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Auto rotate based on UTC time (sun-synchronous)
    const utcHours = currentTime.getUTCHours() + currentTime.getUTCMinutes() / 60;
    setRotation((utcHours - 12) * 15);
  }, [currentTime]);

  const getLocalTime = (utcOffset: number): { hour: number; min: number; sec: number } => {
    const utcHour = currentTime.getUTCHours();
    const utcMin = currentTime.getUTCMinutes();
    const utcSec = currentTime.getUTCSeconds();
    let totalMin = utcHour * 60 + utcMin + utcOffset * 60;
    if (totalMin < 0) totalMin += 1440;
    if (totalMin >= 1440) totalMin -= 1440;
    return { hour: Math.floor(totalMin / 60), min: totalMin % 60, sec: utcSec };
  };

  const isMarketOpen = (market: typeof MARKETS_DATA[0]): boolean => {
    const { hour, min } = getLocalTime(market.utcOffset);
    const dayOfWeek = currentTime.getUTCDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const currentMins = hour * 60 + min;
    const openMins = market.openHour * 60 + market.openMin;
    const closeMins = market.closeHour * 60 + market.closeMin;
    return isWeekday && currentMins >= openMins && currentMins < closeMins;
  };

  const markets: StockMarket[] = useMemo(() => {
    return MARKETS_DATA.map(m => {
      const localTime = getLocalTime(m.utcOffset);
      return {
        ...m,
        isOpen: isMarketOpen(m),
        localHour: localTime.hour,
        localMin: localTime.min,
        localSec: localTime.sec
      };
    });
  }, [currentTime]);

  const openMarkets = markets.filter(m => m.isOpen);
  const closedMarkets = markets.filter(m => !m.isOpen);
  const sortedMarkets = [...openMarkets, ...closedMarkets];

  const formatTime = (h: number, m: number, s?: number) => {
    const hStr = h.toString().padStart(2, '0');
    const mStr = m.toString().padStart(2, '0');
    if (s !== undefined) {
      return `${hStr}:${mStr}:${s.toString().padStart(2, '0')}`;
    }
    return `${hStr}:${mStr}`;
  };

  const formatDuration = (totalSecs: number) => {
    const h = Math.floor(Math.abs(totalSecs) / 3600);
    const m = Math.floor(Math.abs(totalSecs) / 60) % 60;
    const s = Math.abs(totalSecs) % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  const getTimeToOpen = (market: StockMarket) => {
    const currentSecs = market.localHour * 3600 + market.localMin * 60 + market.localSec;
    const openSecs = market.openHour * 3600 + market.openMin * 60;
    let diff = openSecs - currentSecs;
    if (diff < 0) diff += 86400;
    return diff;
  };

  const getSinceOpen = (market: StockMarket) => {
    const currentSecs = market.localHour * 3600 + market.localMin * 60 + market.localSec;
    const openSecs = market.openHour * 3600 + market.openMin * 60;
    return currentSecs - openSecs;
  };

  const getTimeToClose = (market: StockMarket) => {
    const currentSecs = market.localHour * 3600 + market.localMin * 60 + market.localSec;
    const closeSecs = market.closeHour * 3600 + market.closeMin * 60;
    return closeSecs - currentSecs;
  };

  // Simple 2D globe projection
  const projectToGlobe = (lat: number, lon: number, radius: number) => {
    const adjustedLon = lon - rotation;
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (adjustedLon * Math.PI) / 180;
    
    const x = Math.cos(latRad) * Math.sin(lonRad);
    const y = Math.sin(latRad);
    const z = Math.cos(latRad) * Math.cos(lonRad);
    
    // Simple rotation around X axis (tilt)
    const tilt = 18 * Math.PI / 180;
    const rotY = y * Math.cos(tilt) - z * Math.sin(tilt);
    const rotZ = y * Math.sin(tilt) + z * Math.cos(tilt);
    
    const screenX = x * radius;
    const screenY = rotY * radius;
    const visible = rotZ > -0.05;
    
    return { x: screenX, y: screenY, visible, depth: rotZ };
  };

  const globeRadius = 120;
  const globeCenterX = 150;
  const globeCenterY = 150;

  return (
    <div className="h-full w-full bg-[#000814] text-white overflow-auto p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Globe Visualization */}
        <div className="flex-shrink-0">
          <svg width="300" height="300" className="mx-auto">
            {/* Ocean */}
            <circle 
              cx={globeCenterX} 
              cy={globeCenterY} 
              r={globeRadius} 
              fill="#001d3d" 
              stroke="#48cae4" 
              strokeWidth="2"
            />
            
            {/* Grid lines - simplified */}
            {[-60, -30, 0, 30, 60].map(lat => {
              const points: string[] = [];
              for (let lon = -180; lon <= 180; lon += 15) {
                const { x, y, visible } = projectToGlobe(lat, lon, globeRadius);
                if (visible) {
                  points.push(`${globeCenterX + x},${globeCenterY - y}`);
                }
              }
              return points.length > 1 ? (
                <polyline
                  key={`lat-${lat}`}
                  points={points.join(' ')}
                  fill="none"
                  stroke="#3d5a80"
                  strokeWidth="0.5"
                  opacity="0.5"
                />
              ) : null;
            })}
            
            {/* Meridians */}
            {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180].map(lon => {
              const points: string[] = [];
              for (let lat = -80; lat <= 80; lat += 10) {
                const { x, y, visible } = projectToGlobe(lat, lon, globeRadius);
                if (visible) {
                  points.push(`${globeCenterX + x},${globeCenterY - y}`);
                }
              }
              return points.length > 1 ? (
                <polyline
                  key={`lon-${lon}`}
                  points={points.join(' ')}
                  fill="none"
                  stroke="#3d5a80"
                  strokeWidth="0.5"
                  opacity="0.5"
                />
              ) : null;
            })}
            
            {/* Market dots */}
            {markets.map(market => {
              const { x, y, visible, depth } = projectToGlobe(market.lat, market.lon, globeRadius);
              if (!visible) return null;
              
              const dotSize = market.isOpen ? 8 : 5;
              const color = market.isOpen ? '#00ff88' : '#ff6b6b';
              const opacity = Math.max(0.3, (depth + 1) / 2);
              
              return (
                <g key={market.name}>
                  {market.isOpen && (
                    <circle
                      cx={globeCenterX + x}
                      cy={globeCenterY - y}
                      r={dotSize + 4}
                      fill={color}
                      opacity={0.2}
                    />
                  )}
                  <circle
                    cx={globeCenterX + x}
                    cy={globeCenterY - y}
                    r={dotSize}
                    fill={market.isOpen ? color : 'transparent'}
                    stroke={color}
                    strokeWidth="2"
                    opacity={opacity}
                  />
                </g>
              );
            })}
          </svg>
          
          {/* Title and Status */}
          <div className="text-center mt-2">
            <h2 className="text-lg font-bold text-white">WORLD STOCK MARKETS</h2>
            <p className={`text-sm ${openMarkets.length > 0 ? 'text-terminal-green' : 'text-red-400'}`}>
              {openMarkets.length > 0 
                ? `${openMarkets.length} MARKET${openMarkets.length > 1 ? 'S' : ''} OPEN` 
                : 'ALL MARKETS CLOSED'}
            </p>
            <p className="text-xs text-white/50">
              UTC {formatTime(currentTime.getUTCHours(), currentTime.getUTCMinutes(), currentTime.getUTCSeconds())}
            </p>
          </div>
        </div>

        {/* Market Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-[#1a365d] sticky top-0">
              <tr>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Exchange</th>
                <th className="p-2 text-left">Country</th>
                <th className="p-2 text-center">Local</th>
                <th className="p-2 text-center">Opens</th>
                <th className="p-2 text-center">To Open</th>
                <th className="p-2 text-center">Since Open</th>
                <th className="p-2 text-center">To Close</th>
                <th className="p-2 text-center">Index</th>
              </tr>
            </thead>
            <tbody>
              {sortedMarkets.map(market => {
                const toOpenSecs = getTimeToOpen(market);
                const sinceOpenSecs = getSinceOpen(market);
                const toCloseSecs = getTimeToClose(market);
                const rowBg = market.isOpen ? 'bg-[#0d3320]/50' : 'bg-[#1a1a2e]/50';
                
                return (
                  <tr key={market.name} className={`${rowBg} border-b border-[#3d5a80]/30`}>
                    <td className="p-2 text-center">
                      <span className={market.isOpen ? 'text-terminal-green' : 'text-gray-500'}>
                        {market.isOpen ? '●' : '○'}
                      </span>
                    </td>
                    <td className={`p-2 font-mono ${market.isOpen ? 'text-white' : 'text-gray-500'}`}>
                      {market.name}
                    </td>
                    <td className={`p-2 ${market.isOpen ? 'text-white' : 'text-gray-500'}`}>
                      {market.flag} {market.fullName}
                    </td>
                    <td className={`p-2 text-center font-mono ${market.isOpen ? 'text-terminal-green' : 'text-gray-500'}`}>
                      {formatTime(market.localHour, market.localMin, market.localSec)}
                    </td>
                    <td className="p-2 text-center text-white/40 font-mono">
                      {formatTime(market.openHour, market.openMin)}
                    </td>
                    <td className="p-2 text-center font-mono">
                      {market.isOpen ? (
                        <span className="text-gray-500">—</span>
                      ) : (
                        <span className={toOpenSecs < 3600 ? 'text-yellow-400' : 'text-white/40'}>
                          {formatDuration(toOpenSecs)}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-center font-mono">
                      {market.isOpen ? (
                        <span className="text-terminal-green/70">{formatDuration(sinceOpenSecs)}</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="p-2 text-center font-mono">
                      {market.isOpen ? (
                        <span className={toCloseSecs < 3600 ? 'text-red-400' : 'text-yellow-400/70'}>
                          {formatDuration(toCloseSecs)}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="p-2 text-center text-white/40">
                      {market.indexSymbol}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WorldStockMarkets;
