// DeepCharts Pro V4.1 - Settings Panel with full color/setting customization
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, BarChart2, AlertTriangle, TrendingUp, Eye, Palette } from 'lucide-react';
import { DeepChartsConfig, DEFAULT_DEEPCHARTS_CONFIG } from './DeepChartsEngine';

interface DeepChartsSettingsPanelProps {
  config: DeepChartsConfig;
  onUpdate: (config: Partial<DeepChartsConfig>) => void;
}

const COLOR_PRESETS = [
  '#00BCD4', '#E91E63', '#FFD700', '#4CAF50', '#FF6B00', '#F44336',
  '#9C27B0', '#2196F3', '#FF9800', '#00E676', '#FF5252', '#FFFFFF',
];

const ColorPicker: React.FC<{ value: string; onChange: (color: string) => void; label: string }> = ({ value, onChange, label }) => (
  <div className="space-y-1">
    <label className="text-[10px] text-muted-foreground">{label}</label>
    <div className="flex gap-1 flex-wrap">
      {COLOR_PRESETS.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`w-5 h-5 rounded-full border-2 transition-all ${value === c ? 'border-white scale-110' : 'border-transparent'}`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  </div>
);

const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}> = ({ label, value, min, max, step, onChange, suffix = '' }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[10px] font-mono text-terminal-cyan">{value}{suffix}</span>
    </div>
    <Slider
      value={[value]}
      onValueChange={v => onChange(v[0])}
      min={min}
      max={max}
      step={step}
      className="w-full"
    />
  </div>
);

const DeepChartsSettingsPanel: React.FC<DeepChartsSettingsPanelProps> = ({ config, onUpdate }) => {
  return (
    <ScrollArea className="max-h-[500px] pr-2">
      <div className="space-y-4">
        {/* Colors Section */}
        <div className="p-3 rounded-lg border border-purple-500/30 bg-muted/20">
          <h4 className="text-xs font-bold text-purple-400 mb-3 flex items-center gap-1">
            <Palette className="w-3 h-3" /> Colors
          </h4>
          <div className="space-y-3">
            <ColorPicker label="Buy Color" value={config.buyColor} onChange={c => onUpdate({ buyColor: c })} />
            <ColorPicker label="Sell Color" value={config.sellColor} onChange={c => onUpdate({ sellColor: c })} />
            <ColorPicker label="Anomaly Color" value={config.anomalyColor} onChange={c => onUpdate({ anomalyColor: c })} />
            <ColorPicker label="POC Line" value={config.pocColor} onChange={c => onUpdate({ pocColor: c })} />
            <ColorPicker label="VAH Line" value={config.vahColor} onChange={c => onUpdate({ vahColor: c })} />
            <ColorPicker label="VAL Line" value={config.valColor} onChange={c => onUpdate({ valColor: c })} />
          </div>
        </div>

        {/* Big Trades Detection */}
        <div className="p-3 rounded-lg border border-terminal-cyan/30 bg-muted/20">
          <h4 className="text-xs font-bold text-terminal-cyan mb-3 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Big Trades Detection
          </h4>
          <div className="space-y-3">
            <SliderRow label="Sensitivity (Sigma)" value={config.sigma} min={1.0} max={5.0} step={0.5} onChange={v => onUpdate({ sigma: v })} />
            <SliderRow label="Tier 2 Multiplier" value={config.tier2Mult} min={1.1} max={3.0} step={0.1} onChange={v => onUpdate({ tier2Mult: v })} suffix="x" />
            <SliderRow label="Tier 3 Multiplier" value={config.tier3Mult} min={1.5} max={4.0} step={0.1} onChange={v => onUpdate({ tier3Mult: v })} suffix="x" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Show Tier 2</span>
              <Switch checked={config.showTier2} onCheckedChange={v => onUpdate({ showTier2: v })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Show Tier 3</span>
              <Switch checked={config.showTier3} onCheckedChange={v => onUpdate({ showTier3: v })} />
            </div>
          </div>
        </div>

        {/* Volume Price Map */}
        <div className="p-3 rounded-lg border border-orange-500/30 bg-muted/20">
          <h4 className="text-xs font-bold text-orange-400 mb-3 flex items-center gap-1">
            <BarChart2 className="w-3 h-3" /> Volume Price Map
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Enable</span>
              <Switch checked={config.enablePriceMap} onCheckedChange={v => onUpdate({ enablePriceMap: v })} />
            </div>
            {config.enablePriceMap && (
              <>
                <SliderRow label="Lookback Bars" value={config.profileLookback} min={50} max={500} step={50} onChange={v => onUpdate({ profileLookback: v })} />
                <SliderRow label="Price Bins" value={config.profileBins} min={10} max={100} step={10} onChange={v => onUpdate({ profileBins: v })} />
                <SliderRow label="Profile Width" value={config.profileWidth} min={50} max={300} step={10} onChange={v => onUpdate({ profileWidth: v })} suffix="px" />
                <SliderRow label="Value Area %" value={config.vaPercent} min={50} max={90} step={5} onChange={v => onUpdate({ vaPercent: v })} suffix="%" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Show POC</span>
                  <Switch checked={config.showPOC} onCheckedChange={v => onUpdate({ showPOC: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Show VAH</span>
                  <Switch checked={config.showVAH} onCheckedChange={v => onUpdate({ showVAH: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Show VAL</span>
                  <Switch checked={config.showVAL} onCheckedChange={v => onUpdate({ showVAL: v })} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Anomaly Detection */}
        <div className="p-3 rounded-lg border border-yellow-500/30 bg-muted/20">
          <h4 className="text-xs font-bold text-yellow-400 mb-3 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Anomaly Detection
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Enable</span>
              <Switch checked={config.enableAnomaly} onCheckedChange={v => onUpdate({ enableAnomaly: v })} />
            </div>
            {config.enableAnomaly && (
              <>
                <SliderRow label="Threshold" value={config.anomalyThreshold} min={2.0} max={5.0} step={0.5} onChange={v => onUpdate({ anomalyThreshold: v })} />
                <SliderRow label="Extend Bars" value={config.anomalyExtendBars} min={3} max={30} step={1} onChange={v => onUpdate({ anomalyExtendBars: v })} />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Show Labels</span>
                  <Switch checked={config.showAnomalyLabel} onCheckedChange={v => onUpdate({ showAnomalyLabel: v })} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* OI Filter */}
        <div className="p-3 rounded-lg border border-green-500/30 bg-muted/20">
          <h4 className="text-xs font-bold text-green-400 mb-3 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> OI Filter (Order Book)
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Enable</span>
              <Switch checked={config.enableOIFilter} onCheckedChange={v => onUpdate({ enableOIFilter: v })} />
            </div>
            {config.enableOIFilter && (
              <>
                <SliderRow label="Sensitivity" value={config.oiSensitivity} min={0.5} max={5.0} step={0.1} onChange={v => onUpdate({ oiSensitivity: v })} />
                <SliderRow label="Boost %" value={config.oiBoostPercent} min={0} max={100} step={5} onChange={v => onUpdate({ oiBoostPercent: v })} suffix="%" />
              </>
            )}
          </div>
        </div>

        {/* Display Options */}
        <div className="p-3 rounded-lg border border-border bg-muted/20">
          <h4 className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-1">
            <Eye className="w-3 h-3" /> Display
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Glow Circles</span>
              <Switch checked={config.showGlowCircles} onCheckedChange={v => onUpdate({ showGlowCircles: v })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Stats Panel</span>
              <Switch checked={config.showStats} onCheckedChange={v => onUpdate({ showStats: v })} />
            </div>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-[8px]">Volume Profile</Badge>
          <Badge variant="secondary" className="text-[8px]">POC/VAH/VAL</Badge>
          <Badge variant="secondary" className="text-[8px]">Big Trades</Badge>
          <Badge variant="secondary" className="text-[8px]">Anomaly Detect</Badge>
          <Badge variant="secondary" className="text-[8px]">OI Filter</Badge>
          <Badge variant="secondary" className="text-[8px]">Glow Signals</Badge>
        </div>
      </div>
    </ScrollArea>
  );
};

export default DeepChartsSettingsPanel;
