import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, TrendingUp, TrendingDown, ExternalLink, BarChart3, FileText } from 'lucide-react';
import { ScreenerType } from '@/services/screener';

interface ScreenerDetailProps {
  item: any | null;
  type: ScreenerType;
  onClose: () => void;
}

const ScreenerDetail = ({ item, type, onClose }: ScreenerDetailProps) => {
  if (!item) return null;

  const symbol = item.symbol || item.name || '—';
  const shortSymbol = symbol.split(':').pop() || symbol;
  const description = item.description || item.name || shortSymbol;
  const price = item.close;
  const change = item.change;
  const changePercent = typeof change === 'number' ? change : 0;
  const isPositive = changePercent >= 0;
  const recommend = item['Recommend.All'];

  const getSignalInfo = (val: number | null | undefined) => {
    if (val == null || isNaN(val)) return { label: 'N/A', color: 'text-muted-foreground', bg: 'bg-muted/30', pct: 50 };
    if (val >= 0.5) return { label: 'STRONG BUY', color: 'text-terminal-green', bg: 'bg-terminal-green/20', pct: 90 };
    if (val >= 0.1) return { label: 'BUY', color: 'text-terminal-green/80', bg: 'bg-terminal-green/10', pct: 70 };
    if (val > -0.1) return { label: 'NEUTRAL', color: 'text-terminal-amber', bg: 'bg-terminal-amber/10', pct: 50 };
    if (val > -0.5) return { label: 'SELL', color: 'text-destructive/80', bg: 'bg-destructive/10', pct: 30 };
    return { label: 'STRONG SELL', color: 'text-destructive', bg: 'bg-destructive/20', pct: 10 };
  };

  const signal = getSignalInfo(recommend);

  const formatNum = (val: any, suffix = '') => {
    if (val == null || val === undefined) return '—';
    const n = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(n)) return '—';
    if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T${suffix}`;
    if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B${suffix}`;
    if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M${suffix}`;
    return `${n.toFixed(2)}${suffix}`;
  };

  const metrics = [
    { label: 'Market Cap', value: formatNum(item.market_cap_basic) },
    { label: 'P/E Ratio', value: item['price_earnings_ttm'] != null ? `${parseFloat(item['price_earnings_ttm']).toFixed(1)}x` : '—' },
    { label: 'RSI (1D)', value: item.RSI != null ? parseFloat(item.RSI).toFixed(1) : '—' },
    { label: 'Volume', value: formatNum(item.volume) },
    { label: '52W High', value: item['price_52_week_high'] != null ? `$${parseFloat(item['price_52_week_high']).toFixed(2)}` : '—' },
    { label: '52W Low', value: item['price_52_week_low'] != null ? `$${parseFloat(item['price_52_week_low']).toFixed(2)}` : '—' },
    { label: 'EPS (TTM)', value: item['earnings_per_share_basic_ttm'] != null ? formatNum(item['earnings_per_share_basic_ttm']) : '—' },
    { label: 'Beta', value: item['beta_1_year'] != null ? parseFloat(item['beta_1_year']).toFixed(2) : '—' },
  ].filter(m => m.value !== '—');

  const tvLink = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-start justify-between shrink-0">
        <div className="min-w-0">
          <div className="text-sm font-mono font-bold text-terminal-green truncate">{shortSymbol}</div>
          <div className="text-[10px] font-mono text-muted-foreground truncate">{description}</div>
          {item.sector && (
            <div className="text-[9px] font-mono text-muted-foreground/60 mt-0.5">{item.sector}</div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0 shrink-0">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Price */}
      <div className="p-3 border-b border-border shrink-0">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-mono font-bold text-foreground">
            {price != null ? `$${parseFloat(price).toFixed(2)}` : '—'}
          </span>
          <span className={`text-xs font-mono flex items-center gap-0.5 ${isPositive ? 'text-terminal-green' : 'text-destructive'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Key Metrics */}
          {metrics.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono text-muted-foreground font-medium">📊 KEY METRICS</div>
              <div className="space-y-1">
                {metrics.map(m => (
                  <div key={m.label} className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground">{m.label}</span>
                    <span className="text-[11px] font-mono text-foreground">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Signal */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono text-muted-foreground font-medium">🤖 AI SIGNAL</div>
            <div className={`p-2 rounded ${signal.bg} border border-border/50`}>
              <div className={`text-xs font-mono font-bold ${signal.color}`}>{signal.label}</div>
              <div className="mt-1.5 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    signal.pct >= 70 ? 'bg-terminal-green' : signal.pct >= 40 ? 'bg-terminal-amber' : 'bg-destructive'
                  }`}
                  style={{ width: `${signal.pct}%` }}
                />
              </div>
              {recommend != null && (
                <div className="text-[9px] font-mono text-muted-foreground mt-1">
                  Score: {parseFloat(recommend).toFixed(3)}
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono text-muted-foreground font-medium">🔗 QUICK LINKS</div>
            <div className="space-y-1">
              <a href={tvLink} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full justify-start h-7 text-[10px] font-mono border-border gap-1.5">
                  <BarChart3 className="w-3 h-3 text-terminal-green" />
                  Open on TradingView
                  <ExternalLink className="w-2.5 h-2.5 ml-auto text-muted-foreground" />
                </Button>
              </a>
              <Button variant="outline" size="sm" disabled className="w-full justify-start h-7 text-[10px] font-mono border-border gap-1.5">
                <FileText className="w-3 h-3 text-terminal-amber" />
                Financials
                <Badge variant="outline" className="ml-auto text-[7px] px-1 py-0 border-terminal-amber/30 text-terminal-amber">
                  Soon
                </Badge>
              </Button>
            </div>
          </div>

          {/* All Data */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono text-muted-foreground font-medium">📋 ALL DATA</div>
            <div className="space-y-0.5">
              {Object.entries(item).filter(([k, v]) => v != null && k !== 'symbol' && k !== 'name').map(([key, val]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-mono text-muted-foreground truncate">{key}</span>
                  <span className="text-[10px] font-mono text-foreground/80 text-right truncate max-w-[140px]">
                    {typeof val === 'number' ? val.toFixed(4) : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ScreenerDetail;
