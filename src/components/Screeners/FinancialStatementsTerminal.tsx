import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  Calculator,
  DollarSign,
  FileSpreadsheet,
  LineChart as LineChartIcon,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface StatementSeriesPayload {
  periods: string[];
  metrics: Record<string, (number | null)[]>;
}

interface SymbolLite {
  symbol: string;
  exchange: string;
  description: string;
}

interface FinancialStatementsTerminalProps {
  financials: Record<string, any> | null;
  symbol: SymbolLite;
  statementSeries?: StatementSeriesPayload | null;
}

type TerminalTab = 'overview' | 'income' | 'stats' | 'dividend' | 'earnings' | 'revenue';

const TABS: { value: TerminalTab; label: string; icon: React.ReactNode }[] = [
  { value: 'overview', label: 'ภาพรวม', icon: <PieChart className="h-3.5 w-3.5" /> },
  { value: 'income', label: 'งบการเงิน', icon: <FileSpreadsheet className="h-3.5 w-3.5" /> },
  { value: 'stats', label: 'สถิติ', icon: <Calculator className="h-3.5 w-3.5" /> },
  { value: 'dividend', label: 'เงินปันผล', icon: <DollarSign className="h-3.5 w-3.5" /> },
  { value: 'earnings', label: 'ผลประกอบการ', icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { value: 'revenue', label: 'รายได้', icon: <BarChart3 className="h-3.5 w-3.5" /> },
];

const toNumber = (v: any): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const fmtCompact = (v: number | null, d = 2): string => {
  if (v == null) return '—';
  const n = Math.abs(v);
  if (n >= 1e12) return `${(v / 1e12).toFixed(d)}T`;
  if (n >= 1e9) return `${(v / 1e9).toFixed(d)}B`;
  if (n >= 1e6) return `${(v / 1e6).toFixed(d)}M`;
  return v.toFixed(d);
};

const fmtPrice = (v: number | null): string => (v == null ? '—' : v.toFixed(2));
const fmtPercent = (v: number | null): string => (v == null ? '—' : `${v.toFixed(2)}%`);

const fallbackPeriods = (count = 8): string[] => {
  const labels: string[] = [];
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

  for (let i = count - 1; i >= 0; i--) {
    const offset = currentQuarter - 1 - i;
    const yearOffset = Math.floor(offset / 4);
    const qBase = ((offset % 4) + 4) % 4;
    const quarter = qBase + 1;
    const year = now.getFullYear() + yearOffset;
    labels.push(`Q${quarter} '${String(year).slice(-2)}`);
  }

  return labels;
};

const metricRowClass = (v: number | null) => {
  if (v == null) return 'text-muted-foreground';
  if (v > 0) return 'text-primary';
  if (v < 0) return 'text-destructive';
  return 'text-foreground';
};

interface RowDef {
  label: string;
  field: string;
  format?: 'compact' | 'percent' | 'price';
}

const MetricsTable = ({
  periods,
  values,
  rows,
}: {
  periods: string[];
  values: Record<string, (number | null)[]>;
  rows: RowDef[];
}) => (
  <div className="overflow-x-auto rounded-md border border-border/60">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[220px]">ตัวชี้วัด</TableHead>
          {periods.map((p) => (
            <TableHead key={p} className="text-right min-w-[88px]">{p}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const arr = values[row.field] || [];
          return (
            <TableRow key={row.field}>
              <TableCell className="font-mono text-[11px]">{row.label}</TableCell>
              {periods.map((_, idx) => {
                const v = arr[idx] ?? null;
                const text = row.format === 'percent'
                  ? fmtPercent(v)
                  : row.format === 'price'
                    ? fmtPrice(v)
                    : fmtCompact(v);
                return (
                  <TableCell key={`${row.field}-${idx}`} className={`text-right font-mono text-[11px] ${metricRowClass(v)}`}>
                    {text}
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);

const FinancialStatementsTerminal = ({ financials, symbol, statementSeries }: FinancialStatementsTerminalProps) => {
  const [tab, setTab] = useState<TerminalTab>('overview');

  const periods = statementSeries?.periods?.length ? statementSeries.periods : fallbackPeriods(8);

  const values = useMemo(() => {
    const source = statementSeries?.metrics || {};
    const result: Record<string, (number | null)[]> = { ...source };

    const ensure = (field: string) => {
      if (result[field]?.length === periods.length) return;
      const arr = new Array(periods.length).fill(null) as (number | null)[];
      arr[periods.length - 1] = toNumber(financials?.[field]);
      result[field] = arr;
    };

    [
      'total_revenue',
      'gross_profit',
      'ebitda',
      'net_income',
      'earnings_per_share_diluted_ttm',
      'price_earnings_ttm',
      'price_sales_ratio',
      'dividends_yield',
      'return_on_equity',
      'debt_to_equity',
      'current_ratio',
      'quick_ratio',
      'total_assets',
      'total_liabilities_fq',
      'total_debt',
      'free_cash_flow',
      'cash_f_operating_activities_ttm',
    ].forEach(ensure);

    return result;
  }, [financials, periods.length, statementSeries?.metrics]);

  if (!financials) {
    return <div className="p-8 text-center text-muted-foreground text-xs font-mono">ไม่มีข้อมูลงบการเงิน</div>;
  }

  const chartData = periods.map((period, idx) => ({
    period,
    revenue: values.total_revenue?.[idx] ?? null,
    grossProfit: values.gross_profit?.[idx] ?? null,
    netIncome: values.net_income?.[idx] ?? null,
    eps: values.earnings_per_share_diluted_ttm?.[idx] ?? null,
    pe: values.price_earnings_ttm?.[idx] ?? null,
    ps: values.price_sales_ratio?.[idx] ?? null,
    dividendYield: values.dividends_yield?.[idx] ?? null,
  }));

  const currentPrice = toNumber(financials.close);
  const currentChange = toNumber(financials.change);

  return (
    <div className="space-y-4 pb-4">
      <div className="border-b border-border/60 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-mono">{symbol.exchange}:{symbol.symbol}</div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-mono font-bold">{fmtPrice(currentPrice)}</h3>
            <span className={`text-xs font-mono ${metricRowClass(currentChange)}`}>{fmtPercent(currentChange)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-mono">MCap {fmtCompact(toNumber(financials.market_cap_basic))}</Badge>
          <Badge variant="outline" className="text-[10px] font-mono">P/E {fmtPrice(toNumber(financials.price_earnings_ttm))}</Badge>
          <Badge variant="outline" className="text-[10px] font-mono">Div {fmtPercent(toNumber(financials.dividends_yield))}</Badge>
        </div>
      </div>

      <div className="px-3 flex flex-wrap gap-1.5">
        {TABS.map((item) => (
          <button
            key={item.value}
            onClick={() => setTab(item.value)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-mono transition-colors ${
              tab === item.value
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4 px-3">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-md border border-border/60 p-3"><div className="text-[10px] text-muted-foreground">Market Cap</div><div className="text-sm font-mono">{fmtCompact(toNumber(financials.market_cap_basic))}</div></div>
            <div className="rounded-md border border-border/60 p-3"><div className="text-[10px] text-muted-foreground">Enterprise Value</div><div className="text-sm font-mono">{fmtCompact(toNumber(financials.enterprise_value))}</div></div>
            <div className="rounded-md border border-border/60 p-3"><div className="text-[10px] text-muted-foreground">ROE</div><div className="text-sm font-mono">{fmtPercent(toNumber(financials.return_on_equity))}</div></div>
            <div className="rounded-md border border-border/60 p-3"><div className="text-[10px] text-muted-foreground">Debt/Equity</div><div className="text-sm font-mono">{fmtPrice(toNumber(financials.debt_to_equity))}</div></div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-md border border-border/60 p-3">
              <h4 className="text-xs font-mono mb-3">แนวโน้มรายได้และกำไร</h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="netIncome" name="Net Income" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-md border border-border/60 p-3">
              <h4 className="text-xs font-mono mb-3">Valuation Trend</h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Line dataKey="pe" name="P/E" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line dataKey="ps" name="P/S" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'income' && (
        <div className="space-y-4 px-3">
          <MetricsTable
            periods={periods}
            values={values}
            rows={[
              { label: 'รายได้รวม', field: 'total_revenue' },
              { label: 'กำไรขั้นต้น', field: 'gross_profit' },
              { label: 'EBITDA', field: 'ebitda' },
              { label: 'กำไรสุทธิ', field: 'net_income' },
              { label: 'Free Cash Flow', field: 'free_cash_flow' },
            ]}
          />
        </div>
      )}

      {tab === 'stats' && (
        <div className="space-y-4 px-3">
          <MetricsTable
            periods={periods}
            values={values}
            rows={[
              { label: 'P/E', field: 'price_earnings_ttm', format: 'price' },
              { label: 'P/S', field: 'price_sales_ratio', format: 'price' },
              { label: 'ROE %', field: 'return_on_equity', format: 'percent' },
              { label: 'Debt/Equity', field: 'debt_to_equity', format: 'price' },
              { label: 'Current Ratio', field: 'current_ratio', format: 'price' },
              { label: 'Quick Ratio', field: 'quick_ratio', format: 'price' },
            ]}
          />
        </div>
      )}

      {tab === 'dividend' && (
        <div className="space-y-4 px-3">
          <div className="rounded-md border border-border/60 p-3">
            <h4 className="text-xs font-mono mb-3">Dividend Yield Trend</h4>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <Tooltip />
                  <Line dataKey="dividendYield" name="Dividend %" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <MetricsTable
            periods={periods}
            values={values}
            rows={[
              { label: 'Dividend Yield %', field: 'dividends_yield', format: 'percent' },
            ]}
          />
        </div>
      )}

      {tab === 'earnings' && (
        <div className="space-y-4 px-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border/60 p-3"><div className="text-[10px] text-muted-foreground">EPS (TTM)</div><div className="text-sm font-mono">{fmtPrice(toNumber(financials.earnings_per_share_diluted_ttm))}</div></div>
            <div className="rounded-md border border-border/60 p-3"><div className="text-[10px] text-muted-foreground">EPS ล่าสุด</div><div className="text-sm font-mono">{fmtPrice(toNumber(financials.earnings_per_share_fq))}</div></div>
            <div className="rounded-md border border-border/60 p-3"><div className="text-[10px] text-muted-foreground">รอบประกาศถัดไป</div><div className="text-sm font-mono">{financials.earnings_release_next_date ? new Date(Number(financials.earnings_release_next_date) * 1000).toLocaleDateString('th-TH') : '—'}</div></div>
          </div>

          <MetricsTable
            periods={periods}
            values={values}
            rows={[
              { label: 'EPS Diluted (TTM)', field: 'earnings_per_share_diluted_ttm', format: 'price' },
            ]}
          />
        </div>
      )}

      {tab === 'revenue' && (
        <div className="space-y-4 px-3">
          <div className="rounded-md border border-border/60 p-3">
            <h4 className="text-xs font-mono mb-3">Revenue vs Gross Profit</h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="grossProfit" name="Gross Profit" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <MetricsTable
            periods={periods}
            values={values}
            rows={[
              { label: 'Total Revenue', field: 'total_revenue' },
              { label: 'Gross Profit', field: 'gross_profit' },
              { label: 'Net Income', field: 'net_income' },
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default FinancialStatementsTerminal;
