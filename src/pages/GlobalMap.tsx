import { useState } from 'react';
import { BloombergMap } from '@/components/BloombergMap';
import { TacticalCommandMap } from '@/components/TacticalMap';
import { IntelligencePanel } from '@/components/BloombergMap/IntelligencePanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Crosshair, Globe, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type MapMode = 'global' | 'tactical';

const GlobalMap = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>('global');
  const [showIntel, setShowIntel] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {!isFullscreen && (
        <div className="flex items-center gap-4 p-2 bg-[#1a2744] border-b border-[#2d4a6f]">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Terminal
          </Button>
          <div className="flex items-center gap-1 bg-[#0d1421] rounded-lg p-1">
            <Button variant={mapMode === 'global' ? 'default' : 'ghost'} size="sm" onClick={() => setMapMode('global')}
              className={mapMode === 'global' ? 'bg-[#22c55e] hover:bg-[#16a34a] text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}>
              <Globe className="w-4 h-4 mr-1" /> Intel Map
            </Button>
            <Button variant={mapMode === 'tactical' ? 'default' : 'ghost'} size="sm" onClick={() => setMapMode('tactical')}
              className={mapMode === 'tactical' ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}>
              <Crosshair className="w-4 h-4 mr-1" /> Combat Sim
            </Button>
          </div>
          {mapMode === 'global' && (
            <Button variant="ghost" size="sm" onClick={() => setShowIntel(!showIntel)}
              className={showIntel ? 'text-cyan-400 hover:bg-cyan-500/20' : 'text-white/70 hover:text-white hover:bg-white/10'}>
              <Brain className="w-4 h-4 mr-1" /> AI Intel
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[#00a0ff] text-sm font-bold font-mono">
              {mapMode === 'tactical' ? 'ABLE TACTICAL COMMAND' : 'ABLE WORLD MONITOR'}
            </span>
          </div>
        </div>
      )}
      
      <div className={isFullscreen ? "h-screen flex" : "h-[calc(100vh-48px)] flex"}>
        {mapMode === 'tactical' ? (
          <TacticalCommandMap isFullscreen={isFullscreen} onToggleFullscreen={() => setIsFullscreen(!isFullscreen)} />
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
