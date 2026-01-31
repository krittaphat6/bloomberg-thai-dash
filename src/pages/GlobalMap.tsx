import { useState } from 'react';
import { BloombergMap } from '@/components/BloombergMap';
import { TacticalCommandMap } from '@/components/TacticalMap';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Map, Target, Crosshair, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type MapMode = 'global' | 'tactical';

const GlobalMap = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>('tactical');
  const navigate = useNavigate();

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {!isFullscreen && (
        <div className="flex items-center gap-4 p-2 bg-[#1a2744] border-b border-[#2d4a6f]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Terminal
          </Button>
          
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#0d1421] rounded-lg p-1">
            <Button
              variant={mapMode === 'tactical' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMapMode('tactical')}
              className={mapMode === 'tactical' 
                ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
              }
            >
              <Crosshair className="w-4 h-4 mr-1" />
              Combat Sim
            </Button>
            <Button
              variant={mapMode === 'global' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMapMode('global')}
              className={mapMode === 'global' 
                ? 'bg-[#22c55e] hover:bg-[#16a34a] text-white' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
              }
            >
              <Globe className="w-4 h-4 mr-1" />
              Intel Map
            </Button>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            {mapMode === 'tactical' && (
              <span className="text-[#f59e0b] text-xs font-mono px-2 py-1 bg-[#f59e0b]/10 rounded">
                COMBAT SIMULATION MODE
              </span>
            )}
            <span className="text-[#00a0ff] text-sm font-bold font-mono">
              {mapMode === 'tactical' ? 'ABLE TACTICAL COMMAND' : 'ABLE GLOBAL INTELLIGENCE'}
            </span>
          </div>
        </div>
      )}
      
      <div className={isFullscreen ? "h-screen" : "h-[calc(100vh-48px)]"}>
        {mapMode === 'tactical' ? (
          <TacticalCommandMap 
            isFullscreen={isFullscreen} 
            onToggleFullscreen={handleToggleFullscreen}
          />
        ) : (
          <BloombergMap 
            isFullscreen={isFullscreen} 
            onToggleFullscreen={handleToggleFullscreen}
          />
        )}
      </div>
    </div>
  );
};

export default GlobalMap;
