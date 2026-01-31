import { useState, useCallback, useMemo } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  Radio, 
  Eye, 
  EyeOff,
  Target,
  Play,
  Pause,
  Crosshair,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { TacticalMapCanvas } from './TacticalMapCanvas';
import { TacticalAIChat } from './TacticalAIChat';
import { UnitListPanel } from './UnitListPanel';
import { TacticalOverlay } from './TacticalOverlay';
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


  const handleResetBattlefield = useCallback(() => {
    setUnits(generateMockUnits());
    setZones(generateMockZones());
    setIsSimulating(false);
    toast.success('Battlefield reset to initial state');
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
            onClick={() => setIsSimulating(!isSimulating)}
            className={cn(
              "h-7 px-2",
              isSimulating ? "text-[#22c55e]" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetBattlefield}
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

          {/* Combat Control Overlay */}
          <TacticalOverlay
            units={units}
            zones={zones}
            selectedUnit={selectedUnit}
            onUnitsUpdate={setUnits}
            onSelectUnit={handleSelectUnit}
            isSimulating={isSimulating}
            onSimulationToggle={setIsSimulating}
          />

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
