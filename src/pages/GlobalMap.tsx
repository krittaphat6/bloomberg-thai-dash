import { useState, useEffect, useCallback, useMemo } from 'react';
import { BloombergMap } from '@/components/BloombergMap';
import { TacticalCommandMap } from '@/components/TacticalMap';
import { IntelligencePanel } from '@/components/BloombergMap/IntelligencePanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Crosshair, Globe, Brain, Layers, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WorldStockMarkets from '@/components/WorldStockMarkets';
import { cn } from '@/lib/utils';

type MapMode = 'global' | 'tactical' | 'markets';

const GlobalMap = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>('global');
  const [showIntel, setShowIntel] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {!isFullscreen && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-[#0d1421] border-b border-[#1e3a5f]">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-white/60 hover:text-white hover:bg-white/10 h-7 px-2 text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Terminal
          </Button>
          
          <div className="h-4 w-px bg-[#1e3a5f]" />

          <div className="flex items-center gap-0.5 bg-[#0a1628] rounded-md p-0.5 border border-[#1e3a5f]">
            {[
              { mode: 'global' as MapMode, icon: Globe, label: 'Intel Map', color: 'bg-[#22c55e] text-white' },
              { mode: 'tactical' as MapMode, icon: Crosshair, label: 'Combat Sim', color: 'bg-[#3b82f6] text-white' },
              { mode: 'markets' as MapMode, icon: BarChart3, label: 'Markets', color: 'bg-[#f59e0b] text-white' },
            ].map(({ mode, icon: Icon, label, color }) => (
              <Button
                key={mode}
                variant={mapMode === mode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMapMode(mode)}
                className={cn(
                  "h-6 px-2 text-[10px] gap-1",
                  mapMode === mode ? color : 'text-white/60 hover:text-white hover:bg-white/10'
                )}
              >
                <Icon className="w-3 h-3" /> {label}
              </Button>
            ))}
          </div>

          {mapMode === 'global' && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowIntel(!showIntel)}
              className={cn(
                "h-6 px-2 text-[10px] gap-1",
                showIntel ? 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20' : 'text-white/60 hover:text-white hover:bg-white/10'
              )}
            >
              <Brain className="w-3 h-3" /> AI Intel
            </Button>
          )}
          
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-[10px] font-bold font-mono">LIVE</span>
            </div>
            <span className="text-cyan-400 text-xs font-bold font-mono">
              {mapMode === 'tactical' ? 'ABLE TACTICAL COMMAND' : mapMode === 'markets' ? 'WORLD STOCK MARKETS' : 'ABLE WORLD MONITOR'}
            </span>
          </div>
        </div>
      )}
      
      <div className={isFullscreen ? "h-screen flex" : "h-[calc(100vh-40px)] flex"}>
        {mapMode === 'tactical' ? (
          <TacticalCommandMap isFullscreen={isFullscreen} onToggleFullscreen={() => setIsFullscreen(!isFullscreen)} />
        ) : mapMode === 'markets' ? (
          <WorldStockMarkets />
        ) : (
          <>
            <div className="flex-1">
              <BloombergMap isFullscreen={isFullscreen} onToggleFullscreen={() => setIsFullscreen(!isFullscreen)} />
            </div>
            {showIntel && <IntelligencePanel className="w-80 border-l border-[#1e3a5f]" />}
          </>
        )}
      </div>
    </div>
  );
};

export default GlobalMap;
