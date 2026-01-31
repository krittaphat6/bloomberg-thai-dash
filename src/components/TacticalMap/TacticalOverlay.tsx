import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Target, 
  Play, 
  Pause, 
  SkipForward,
  Crosshair,
  Radio,
  Shield,
  Zap,
  MapPin,
  ArrowRight,
  RotateCcw,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TacticalUnit, TacticalZone, TacticalOrder, UNIT_CONFIGS } from './types';
import { 
  simulateCombat, 
  applyCombatResults, 
  moveUnit, 
  applyJammingEffect,
  calculateDistance,
  canEngage,
  generateTacticalSuggestion 
} from './CombatSimulator';
import { cn } from '@/lib/utils';

interface TacticalOverlayProps {
  units: TacticalUnit[];
  zones: TacticalZone[];
  selectedUnit: TacticalUnit | null;
  onUnitsUpdate: (units: TacticalUnit[]) => void;
  onSelectUnit: (unit: TacticalUnit | null) => void;
  isSimulating: boolean;
  onSimulationToggle: (running: boolean) => void;
}

type ActionMode = 'select' | 'move' | 'attack' | 'jam' | 'defend';

export const TacticalOverlay = ({
  units,
  zones,
  selectedUnit,
  onUnitsUpdate,
  onSelectUnit,
  isSimulating,
  onSimulationToggle,
}: TacticalOverlayProps) => {
  const [actionMode, setActionMode] = useState<ActionMode>('select');
  const [pendingOrders, setPendingOrders] = useState<TacticalOrder[]>([]);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const simulationRef = useRef<NodeJS.Timeout | null>(null);

  // Clear simulation on unmount
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
    };
  }, []);

  // Run simulation loop
  useEffect(() => {
    if (isSimulating) {
      simulationRef.current = setInterval(() => {
        runSimulationStep();
      }, 2000 / simulationSpeed);
    } else {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
    }
    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
    };
  }, [isSimulating, simulationSpeed, units]);

  const runSimulationStep = useCallback(() => {
    let updatedUnits = [...units];
    const newLogs: string[] = [];

    // Process moving units
    updatedUnits = updatedUnits.map(unit => {
      if (unit.status === 'moving' && unit.affiliation === 'hostile') {
        // Hostile units move towards objectives
        const objective = zones.find(z => z.type === 'objective');
        if (objective && objective.polygon.length > 0) {
          const center: [number, number] = [
            objective.polygon.reduce((sum, p) => sum + p[0], 0) / objective.polygon.length,
            objective.polygon.reduce((sum, p) => sum + p[1], 0) / objective.polygon.length,
          ];
          return moveUnit(unit, center, 0.5 + Math.random() * 0.5);
        }
      }
      return unit;
    });

    // Auto-combat: units in range engage
    const friendly = updatedUnits.filter(u => u.affiliation === 'friendly' && u.status !== 'destroyed');
    const hostile = updatedUnits.filter(u => u.affiliation === 'hostile' && u.status !== 'destroyed');

    for (const attacker of friendly) {
      if (attacker.type === 'artillery' || attacker.type === 'armor') {
        for (const target of hostile) {
          if (canEngage(attacker, target) && Math.random() > 0.7) {
            const result = simulateCombat(attacker, target);
            updatedUnits = applyCombatResults(updatedUnits, attacker.id, target.id, result);
            newLogs.push(`⚔️ ${result.description}`);
            break;
          }
        }
      }
    }

    // Hostile counter-attacks
    for (const attacker of hostile) {
      if (Math.random() > 0.8) {
        const targets = friendly.filter(t => canEngage(attacker, t));
        if (targets.length > 0) {
          const target = targets[Math.floor(Math.random() * targets.length)];
          const result = simulateCombat(attacker, target);
          updatedUnits = applyCombatResults(updatedUnits, attacker.id, target.id, result);
          newLogs.push(`🔴 ${result.description}`);
        }
      }
    }

    if (newLogs.length > 0) {
      setCombatLog(prev => [...newLogs, ...prev].slice(0, 20));
    }
    onUnitsUpdate(updatedUnits);
  }, [units, zones, onUnitsUpdate]);

  const handleExecuteOrder = useCallback((order: TacticalOrder) => {
    let updatedUnits = [...units];
    
    switch (order.type) {
      case 'attack':
        if (order.targetUnit && selectedUnit) {
          const target = units.find(u => u.id === order.targetUnit);
          if (target) {
            const result = simulateCombat(selectedUnit, target);
            updatedUnits = applyCombatResults(updatedUnits, selectedUnit.id, target.id, result);
            setCombatLog(prev => [`⚔️ ${result.description}`, ...prev].slice(0, 20));
          }
        }
        break;
      
      case 'jam':
        if (selectedUnit && selectedUnit.type === 'comms_jammer') {
          const { units: jammedUnits, jammed } = applyJammingEffect(units, selectedUnit);
          updatedUnits = jammedUnits;
          if (jammed.length > 0) {
            setCombatLog(prev => [`📡 Jamming: ${jammed.join(', ')}`, ...prev].slice(0, 20));
          }
        }
        break;

      case 'move':
        if (selectedUnit && order.targetPosition) {
          updatedUnits = updatedUnits.map(u => 
            u.id === selectedUnit.id 
              ? moveUnit(u, order.targetPosition!, 5)
              : u
          );
        }
        break;
    }
    
    onUnitsUpdate(updatedUnits);
  }, [units, selectedUnit, onUnitsUpdate]);

  const handleQuickAction = useCallback((action: ActionMode) => {
    if (!selectedUnit) return;
    
    if (action === 'jam' && selectedUnit.type === 'comms_jammer') {
      handleExecuteOrder({
        id: `order-${Date.now()}`,
        type: 'jam',
        issuedAt: new Date(),
        issuedBy: 'USER',
        status: 'executing',
        priority: 'high',
        description: 'Execute jamming',
      });
    } else if (action === 'attack') {
      // Find nearest hostile
      const hostiles = units.filter(u => u.affiliation === 'hostile' && u.status !== 'destroyed');
      if (hostiles.length > 0) {
        const nearest = hostiles.reduce((closest, h) => {
          const d1 = calculateDistance(selectedUnit.position, h.position);
          const d2 = calculateDistance(selectedUnit.position, closest.position);
          return d1 < d2 ? h : closest;
        }, hostiles[0]);
        
        handleExecuteOrder({
          id: `order-${Date.now()}`,
          type: 'attack',
          targetUnit: nearest.id,
          issuedAt: new Date(),
          issuedBy: 'USER',
          status: 'executing',
          priority: 'high',
          description: `Attack ${nearest.callsign}`,
        });
      }
    }
    
    setActionMode('select');
  }, [selectedUnit, units, handleExecuteOrder]);

  const resetSimulation = useCallback(() => {
    onSimulationToggle(false);
    setCombatLog([]);
  }, [onSimulationToggle]);

  const suggestion = generateTacticalSuggestion(units, zones);
  const friendlyCount = units.filter(u => u.affiliation === 'friendly' && u.status !== 'destroyed').length;
  const hostileCount = units.filter(u => u.affiliation === 'hostile' && u.status !== 'destroyed').length;

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 max-w-xs">
      {/* Control Panel */}
      <div className="bg-[#0d1421]/95 backdrop-blur-sm rounded-lg border border-[#1e3a5f] p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono text-[#00a0ff] font-bold">COMBAT CONTROL</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-5 w-5 p-0 text-muted-foreground"
          >
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-primary/10 rounded px-2 py-1 text-center">
            <div className="text-lg font-bold text-primary">{friendlyCount}</div>
            <div className="text-[8px] text-muted-foreground">FRIENDLY</div>
          </div>
          <div className="bg-destructive/10 rounded px-2 py-1 text-center">
            <div className="text-lg font-bold text-destructive">{hostileCount}</div>
            <div className="text-[8px] text-muted-foreground">HOSTILE</div>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="flex gap-1 mb-3">
          <Button
            size="sm"
            onClick={() => onSimulationToggle(!isSimulating)}
            className={cn(
              "flex-1 h-8 text-xs font-mono",
              isSimulating 
                ? "bg-destructive hover:bg-destructive/80" 
                : "bg-[#22c55e] hover:bg-[#16a34a]"
            )}
          >
            {isSimulating ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
            {isSimulating ? 'PAUSE' : 'SIMULATE'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={resetSimulation}
            className="h-8 px-2"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>

        {showAdvanced && (
          <>
            {/* Speed Control */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">Speed</span>
                <span className="font-mono">{simulationSpeed}x</span>
              </div>
              <Slider
                value={[simulationSpeed]}
                onValueChange={([val]) => setSimulationSpeed(val)}
                min={0.5}
                max={3}
                step={0.5}
                className="w-full"
              />
            </div>

            {/* Action Mode */}
            <div className="grid grid-cols-4 gap-1 mb-3">
              {[
                { mode: 'select' as const, icon: Target, label: 'SELECT' },
                { mode: 'move' as const, icon: ArrowRight, label: 'MOVE' },
                { mode: 'attack' as const, icon: Crosshair, label: 'ATTACK' },
                { mode: 'jam' as const, icon: Radio, label: 'JAM' },
              ].map(({ mode, icon: Icon, label }) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={actionMode === mode ? 'default' : 'outline'}
                  onClick={() => setActionMode(mode)}
                  className="h-10 flex-col gap-0.5 p-1"
                >
                  <Icon className="w-3 h-3" />
                  <span className="text-[8px]">{label}</span>
                </Button>
              ))}
            </div>

            {/* Quick Actions for Selected Unit */}
            {selectedUnit && (
              <div className="bg-[#1e3a5f]/30 rounded p-2 mb-3">
                <div className="text-[10px] text-[#00a0ff] font-mono mb-2">
                  {selectedUnit.callsign} ({selectedUnit.type})
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={() => handleQuickAction('attack')}
                    className="flex-1 h-7 text-[10px] bg-destructive/80 hover:bg-destructive"
                  >
                    <Crosshair className="w-3 h-3 mr-1" />
                    ATTACK
                  </Button>
                  {selectedUnit.type === 'comms_jammer' && (
                    <Button
                      size="sm"
                      onClick={() => handleQuickAction('jam')}
                      className="flex-1 h-7 text-[10px] bg-purple-600 hover:bg-purple-700"
                    >
                      <Radio className="w-3 h-3 mr-1" />
                      JAM
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* AI Suggestion */}
        <div className="bg-[#1e3a5f]/20 rounded p-2 text-[10px] text-muted-foreground">
          <Zap className="w-3 h-3 inline mr-1 text-[#f59e0b]" />
          {suggestion}
        </div>
      </div>

      {/* Combat Log */}
      {combatLog.length > 0 && (
        <div className="bg-[#0d1421]/95 backdrop-blur-sm rounded-lg border border-[#1e3a5f] p-2 max-h-32 overflow-y-auto">
          <div className="text-[10px] font-mono text-[#f59e0b] mb-1">COMBAT LOG</div>
          {combatLog.slice(0, 5).map((log, i) => (
            <div key={i} className="text-[9px] text-muted-foreground leading-tight">
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
