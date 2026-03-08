// DeepCharts Pro V4.1 - Settings Panel (Full PineScript Port)
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, BarChart2, AlertTriangle, TrendingUp, Eye, Palette, Target, Activity, Circle } from 'lucide-react';
import { DeepChartsConfig, DEFAULT_DEEPCHARTS_CONFIG } from './DeepChartsEngine';

interface DeepChartsSettingsPanelProps {
  config: DeepChartsConfig;
  onUpdate: (config: Partial<DeepChartsConfig>) => void;
}

const COLOR_PRESETS = [
  '#00BCD4', '#E91E63', '#FFD700', '#4CAF50', '#FF6B00', '#F44336',
  '#9C27B0', '#2196F3', '#FF9800', '#00E676', '#FF5252', '#FFFFFF',
  '#FF1744', '#76FF03', '#555555', '#888888',
];

const ColorPicker: React.FC<{ value: string; onChange: (color: string) => void; label: string }> = ({ value, onChange, label }) => (
  <div className="space-y-1">
    <label className="text-[10px] text-muted-foreground">{label}</label>
    <div className="flex gap-1 flex-wrap">
      {COLOR_PRESETS.map(c => (
        <button key={c} onClick={() => onChange(c)}
          className={`w-4 h-4 rounded-full border-2 transition-all ${value === c ? 'border-white scale-110' : 'border-transparent'}`}
          style={{ backgroundColor: c }} />
      ))}
    </div>
  </div>
);

const SliderRow: React.FC<{
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; suffix?: string;
}> = ({ label, value, min, max, step, onChange, suffix = '' }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[10px] font-mono text-terminal-cyan">{value}{suffix}</span>
    </div>
    <Slider value={[value]} onValueChange={v => onChange(v[0])} min={min} max={max} step={step} className="w-full" />
  </div>
);

const ToggleRow: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-[10px] text-muted-foreground">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; color: string }> = ({ icon, title, color }) => (
  <h4 className={`text-xs font-bold mb-3 flex items-center gap-1`} style={{ color }}>
    {icon} {title}
  </h4>
);

const DeepChartsSettingsPanel: React.FC<DeepChartsSettingsPanelProps> = ({ config, onUpdate }) => {
  return (
    <ScrollArea className="max-h-[600px] pr-2">
      <div className="space-y-3">

        {/* Colors */}
        <div className="p-3 rounded-lg border border-purple-500/30 bg-muted/20">
          <SectionHeader icon={<Palette className="w-3 h-3" />} title="Colors" color="#9C27B0" />
          <div className="space-y-2">
            <ColorPicker label="Buy" value={config.buyColor} onChange={c => onUpdate({ buyColor: c })} />
            <ColorPicker label="Sell" value={config.sellColor} onChange={c => onUpdate({ sellColor: c })} />
            <ColorPicker label="Anomaly" value={config.anomalyColor} onChange={c => onUpdate({ anomalyColor: c })} />
            <ColorPicker label="POC" value={config.pocColor} onChange={c => onUpdate({ pocColor: c })} />
            <ColorPicker label="VAH" value={config.vahColor} onChange={c => onUpdate({ vahColor: c })} />
            <ColorPicker label="VAL" value={config.valColor} onChange={c => onUpdate({ valColor: c })} />
          </div>
        </div>

        {/* Big Trades Detection */}
        <div className="p-3 rounded-lg border border-terminal-cyan/30 bg-muted/20">
          <SectionHeader icon={<Zap className="w-3 h-3" />} title="Big Trades (ATR Intensity)" color="hsl(var(--terminal-cyan))" />
          <div className="space-y-2">
            <SliderRow label="Sigma" value={config.sigma} min={1.0} max={5.0} step={0.5} onChange={v => onUpdate({ sigma: v })} />
            <SliderRow label="T2 Mult" value={config.tier2Mult} min={1.0} max={3.0} step={0.1} onChange={v => onUpdate({ tier2Mult: v })} suffix="x" />
            <SliderRow label="T3 Mult" value={config.tier3Mult} min={1.5} max={4.0} step={0.1} onChange={v => onUpdate({ tier3Mult: v })} suffix="x" />
            <ToggleRow label="Show Tier 2" checked={config.showTier2} onChange={v => onUpdate({ showTier2: v })} />
            <ToggleRow label="Show Tier 3" checked={config.showTier3} onChange={v => onUpdate({ showTier3: v })} />
          </div>
        </div>

        {/* Volume Price Map */}
        <div className="p-3 rounded-lg border border-orange-500/30 bg-muted/20">
          <SectionHeader icon={<BarChart2 className="w-3 h-3" />} title="Volume Price Map" color="#FF9800" />
          <div className="space-y-2">
            <ToggleRow label="Enable" checked={config.enablePriceMap} onChange={v => onUpdate({ enablePriceMap: v })} />
            {config.enablePriceMap && (
              <>
                <SliderRow label="Lookback" value={config.profileLookback} min={50} max={500} step={50} onChange={v => onUpdate({ profileLookback: v })} />
                <SliderRow label="Bins" value={config.profileBins} min={10} max={100} step={10} onChange={v => onUpdate({ profileBins: v })} />
                <SliderRow label="Width" value={config.profileWidth} min={50} max={300} step={10} onChange={v => onUpdate({ profileWidth: v })} suffix="px" />
                <SliderRow label="VA %" value={config.vaPercent} min={50} max={90} step={5} onChange={v => onUpdate({ vaPercent: v })} suffix="%" />
                <ToggleRow label="POC" checked={config.showPOC} onChange={v => onUpdate({ showPOC: v })} />
                <ToggleRow label="VAH" checked={config.showVAH} onChange={v => onUpdate({ showVAH: v })} />
                <ToggleRow label="VAL" checked={config.showVAL} onChange={v => onUpdate({ showVAL: v })} />
              </>
            )}
          </div>
        </div>

        {/* Dynamic Profile */}
        <div className="p-3 rounded-lg border border-blue-500/30 bg-muted/20">
          <SectionHeader icon={<Activity className="w-3 h-3" />} title="Dynamic Profile" color="#2196F3" />
          <div className="space-y-2">
            <ToggleRow label="Enable" checked={config.enableDynProfile} onChange={v => onUpdate({ enableDynProfile: v })} />
            {config.enableDynProfile && (
              <SliderRow label="Lookback" value={config.dynLookback} min={30} max={300} step={10} onChange={v => onUpdate({ dynLookback: v })} />
            )}
          </div>
        </div>

        {/* Anomaly Detection */}
        <div className="p-3 rounded-lg border border-yellow-500/30 bg-muted/20">
          <SectionHeader icon={<AlertTriangle className="w-3 h-3" />} title="Anomaly Detection" color="#FFD700" />
          <div className="space-y-2">
            <ToggleRow label="Enable" checked={config.enableAnomaly} onChange={v => onUpdate({ enableAnomaly: v })} />
            {config.enableAnomaly && (
              <>
                <SliderRow label="Threshold" value={config.anomalyThreshold} min={2.0} max={5.0} step={0.5} onChange={v => onUpdate({ anomalyThreshold: v })} />
                <SliderRow label="Extend Bars" value={config.anomalyExtendBars} min={3} max={30} step={1} onChange={v => onUpdate({ anomalyExtendBars: v })} />
                <ToggleRow label="Show Labels" checked={config.showAnomalyLabel} onChange={v => onUpdate({ showAnomalyLabel: v })} />
              </>
            )}
          </div>
        </div>

        {/* OI Filter */}
        <div className="p-3 rounded-lg border border-green-500/30 bg-muted/20">
          <SectionHeader icon={<TrendingUp className="w-3 h-3" />} title="OI Filter (Order Book)" color="#4CAF50" />
          <div className="space-y-2">
            <ToggleRow label="Enable" checked={config.enableOIFilter} onChange={v => onUpdate({ enableOIFilter: v })} />
            {config.enableOIFilter && (
              <>
                <SliderRow label="Sensitivity" value={config.oiSensitivity} min={0.5} max={5.0} step={0.1} onChange={v => onUpdate({ oiSensitivity: v })} />
                <SliderRow label="Boost %" value={config.oiBoostPercent} min={0} max={100} step={5} onChange={v => onUpdate({ oiBoostPercent: v })} suffix="%" />
              </>
            )}
          </div>
        </div>

        {/* Smart SL/TP */}
        <div className="p-3 rounded-lg border border-red-500/30 bg-muted/20">
          <SectionHeader icon={<Target className="w-3 h-3" />} title="Smart SL/TP Zones" color="#FF1744" />
          <div className="space-y-2">
            <ToggleRow label="Enable" checked={config.enableSLTP} onChange={v => onUpdate({ enableSLTP: v })} />
            {config.enableSLTP && (
              <>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Trigger Source</span>
                  <div className="flex gap-1">
                    {(['close', 'hl2', 'hlc3'] as const).map(src => (
                      <button key={src} onClick={() => onUpdate({ sltpSource: src })}
                        className={`px-2 py-0.5 rounded text-[9px] font-mono ${config.sltpSource === src ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {src}
                      </button>
                    ))}
                  </div>
                </div>
                <SliderRow label="Min Dist (ATR)" value={config.minDistATR} min={0.1} max={2.0} step={0.1} onChange={v => onUpdate({ minDistATR: v })} />
                <SliderRow label="SL Buffer (ATR)" value={config.slBufferATR} min={0.1} max={1.0} step={0.1} onChange={v => onUpdate({ slBufferATR: v })} />
                <SliderRow label="HVN Multiplier" value={config.hvnMultiplier} min={1.0} max={3.0} step={0.1} onChange={v => onUpdate({ hvnMultiplier: v })} suffix="x" />
                <SliderRow label="ATR Fallback" value={config.sltpAtrFallback} min={0.5} max={3.0} step={0.1} onChange={v => onUpdate({ sltpAtrFallback: v })} />
                <SliderRow label="TP2 ATR Fallback" value={config.tp2AtrFallback} min={1.0} max={5.0} step={0.5} onChange={v => onUpdate({ tp2AtrFallback: v })} />
                <ToggleRow label="Show Labels" checked={config.showSLTPLabels} onChange={v => onUpdate({ showSLTPLabels: v })} />
                <ToggleRow label="Show TP2" checked={config.showTP2} onChange={v => onUpdate({ showTP2: v })} />
                <ToggleRow label="Show Stats" checked={config.showSLTPStats} onChange={v => onUpdate({ showSLTPStats: v })} />
                <ColorPicker label="SL Color" value={config.slColor} onChange={c => onUpdate({ slColor: c })} />
                <ColorPicker label="TP1 Color" value={config.tp1Color} onChange={c => onUpdate({ tp1Color: c })} />
                <ColorPicker label="TP2 Color" value={config.tp2Color} onChange={c => onUpdate({ tp2Color: c })} />
              </>
            )}
          </div>
        </div>

        {/* Volume Bubbles */}
        <div className="p-3 rounded-lg border border-cyan-500/30 bg-muted/20">
          <SectionHeader icon={<Circle className="w-3 h-3" />} title="Volume Bubbles" color="#00BCD4" />
          <div className="space-y-2">
            <ToggleRow label="Enable" checked={config.showMapBubbles} onChange={v => onUpdate({ showMapBubbles: v })} />
            {config.showMapBubbles && (
              <>
                <SliderRow label="Z Threshold" value={config.mapBubbleThreshold} min={1.0} max={4.0} step={0.5} onChange={v => onUpdate({ mapBubbleThreshold: v })} />
                <ToggleRow label="Project Levels" checked={config.projectLevels} onChange={v => onUpdate({ projectLevels: v })} />
                {config.projectLevels && (
                  <SliderRow label="Max Levels" value={config.maxProjectedLevels} min={1} max={10} step={1} onChange={v => onUpdate({ maxProjectedLevels: v })} />
                )}
              </>
            )}
          </div>
        </div>

        {/* Display */}
        <div className="p-3 rounded-lg border border-border bg-muted/20">
          <SectionHeader icon={<Eye className="w-3 h-3" />} title="Display" color="hsl(var(--muted-foreground))" />
          <div className="space-y-2">
            <ToggleRow label="Glow Circles" checked={config.showGlowCircles} onChange={v => onUpdate({ showGlowCircles: v })} />
            <ToggleRow label="Volume Bars" checked={config.showVolBars} onChange={v => onUpdate({ showVolBars: v })} />
            <ToggleRow label="Stats Panel" checked={config.showStats} onChange={v => onUpdate({ showStats: v })} />
          </div>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-[8px]">ATR Intensity</Badge>
          <Badge variant="secondary" className="text-[8px]">Volume Profile</Badge>
          <Badge variant="secondary" className="text-[8px]">POC/VAH/VAL</Badge>
          <Badge variant="secondary" className="text-[8px]">Big Trades</Badge>
          <Badge variant="secondary" className="text-[8px]">Anomaly 3-Type</Badge>
          <Badge variant="secondary" className="text-[8px]">Smart SL/TP</Badge>
          <Badge variant="secondary" className="text-[8px]">Volume Bubbles</Badge>
          <Badge variant="secondary" className="text-[8px]">Dynamic Profile</Badge>
          <Badge variant="secondary" className="text-[8px]">OI Filter</Badge>
        </div>
      </div>
    </ScrollArea>
  );
};

export default DeepChartsSettingsPanel;
