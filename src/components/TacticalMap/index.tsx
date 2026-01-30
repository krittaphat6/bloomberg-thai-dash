import { useState, useCallback, useMemo } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  Layers, 
  Radio, 
  Eye, 
  EyeOff,
  Save,
  Share2,
  Settings,
  Target,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { TacticalMapCanvas } from './TacticalMapCanvas';
import { TacticalAIChat } from './TacticalAIChat';
import { UnitListPanel } from './UnitListPanel';
import { useTacticalAI } from './useTacticalAI';
import { generateMockUnits, generateMockZones, getInitialMessages } from './mockData';
import { TacticalUnit, TacticalZone } from './types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TacticalCommandMapProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  className?: string;
}

export const TacticalCommandMap = ({
  isFullscreen,
  onToggleFullscreen,
  className,
}: TacticalCommandMapProps) => {
  // State
  const [units, setUnits] = useState<TacticalUnit[]>(() => generateMockUnits());
  const [zones, setZones] = useState<TacticalZone[]>(() => generateMockZones());
  const [selectedUnit, setSelectedUnit] = useState<TacticalUnit | null>(null);
  const [showRangeCircles, setShowRangeCircles] = useState(true);
  const [showUnitList, setShowUnitList] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  // AI Chat
  const initialMessages = useMemo(() => getInitialMessages(), []);
  const {
    messages,
    isLoading,
    sendMessage,
    activeProposal,
    approveProposal,
    rejectProposal,
  } = useTacticalAI(initialMessages);

  const handleSelectUnit = useCallback((unit: TacticalUnit | null) => {
    setSelectedUnit(unit);
  }, []);

  const handleSendMessage = useCallback((content: string) => {
    sendMessage(content, units);
  }, [sendMessage, units]);

  const handleRefresh = useCallback(() => {
    setUnits(generateMockUnits());
    setZones(generateMockZones());
    toast.success('Battlefield data refreshed');
  }, []);

  const handleStartSimulation = useCallback(() => {
    setIsSimulating(true);
    toast.info('Starting tactical simulation...');
    
    // Simulate unit movements
    const interval = setInterval(() => {
      setUnits(prev => prev.map(unit => {
        if (unit.status === 'moving' && Math.random() > 0.7) {
          const newLat = unit.position[0] + (Math.random() - 0.5) * 0.02;
          const newLng = unit.position[1] + (Math.random() - 0.5) * 0.02;
          return {
            ...unit,
            position: [newLat, newLng] as [number, number],
            heading: (unit.heading + Math.random() * 20 - 10 + 360) % 360,
          };
        }
        return unit;
      }));
    }, 2000);

    // Stop after 30 seconds
    setTimeout(() => {
      clearInterval(interval);
      setIsSimulating(false);
      toast.success('Simulation complete');
    }, 30000);
  }, []);

  const friendlyCount = units.filter(u => u.affiliation === 'friendly').length;
  const hostileCount = units.filter(u => u.affiliation === 'hostile').length;

  return (
    <div className={cn(
      "flex flex-col bg-[#0a1628] text-foreground overflow-hidden",
      isFullscreen ? "fixed inset-0 z-50" : "h-full",
      className
    )}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d1421] border-b border-[#1e3a5f]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#00a0ff]" />
            <span className="text-[#00a0ff] font-bold text-sm font-mono">ABLE TACTICAL COMMAND</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/20 text-primary border-primary/50 text-[10px]">
              🔵 {friendlyCount} Friendly
            </Badge>
            <Badge className="bg-destructive/20 text-destructive border-destructive/50 text-[10px]">
              🔴 {hostileCount} Hostile
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4">
            <span className="text-[10px] text-muted-foreground">Range Circles</span>
            <Switch
              checked={showRangeCircles}
              onCheckedChange={setShowRangeCircles}
              className="h-4 w-7"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUnitList(!showUnitList)}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            {showUnitList ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartSimulation}
            disabled={isSimulating}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <Radio className={cn("w-3 h-3", isSimulating && "animate-pulse text-[#22c55e]")} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Unit List Panel */}
        {showUnitList && (
          <div className="w-64">
            <UnitListPanel
              units={units}
              selectedUnitId={selectedUnit?.id}
              onSelectUnit={handleSelectUnit}
            />
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          <TacticalMapCanvas
            units={units}
            zones={zones}
            selectedUnitId={selectedUnit?.id}
            onSelectUnit={handleSelectUnit}
            showRangeCircles={showRangeCircles}
            className="w-full h-full"
          />

          {/* Simulation Indicator */}
          {isSimulating && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/50">
              <Radio className="w-3 h-3 text-[#22c55e] animate-pulse" />
              <span className="text-[10px] font-mono text-[#22c55e]">SIMULATION RUNNING</span>
            </div>
          )}

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-[#0d1421]/90 backdrop-blur-sm rounded-lg p-3 border border-[#1e3a5f]">
            <div className="text-[10px] font-mono text-muted-foreground mb-2">LEGEND</div>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary/20 border border-primary rounded" />
                <span>Control Zone</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#f59e0b]/20 border border-[#f59e0b] rounded" />
                <span>Contested</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-destructive/20 border border-destructive rounded" />
                <span>Hostile</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#8b5cf6]/20 border border-[#8b5cf6] rounded" />
                <span>Objective</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Chat Panel */}
        <div className="w-96">
          <TacticalAIChat
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            activeProposal={activeProposal}
            onApproveProposal={approveProposal}
            onRejectProposal={rejectProposal}
            selectedUnit={selectedUnit ?? undefined}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#0d1421] border-t border-[#1e3a5f] text-[10px] font-mono text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>📍 Thailand Theater</span>
          <span>⏱️ {new Date().toLocaleTimeString('th-TH')}</span>
          <span>🎯 {zones.length} zones</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[#22c55e]">● SYSTEM ONLINE</span>
          <span>ABLE TACTICAL v2.0</span>
        </div>
      </div>
    </div>
  );
};

export default TacticalCommandMap;
