import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, ChevronDown, ChevronRight, Building2, X, FileText, Presentation, FileCheck, TrendingUp, TrendingDown, BarChart3, DollarSign, PieChart, LayoutList, Calculator, Globe, Users, ExternalLink, Info } from 'lucide-react';
import {
  PieChart as RechartPie, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ComposedChart, Area,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
// FinancialStatementsView is defined inline below

// ─── Types ────────────────────────────────────────────────────────────────────

type FilingTypeFilter = 'all' | 'annual' | 'quarterly' | 'interim' | 'slides';
type ViewMode = 'choose' | 'statements' | 'filings';

interface SymbolSuggestion {
  symbol: string;
  description: string;
  type: string;
  exchange: string;
  country: string;
  logo_id: string;
  market_cap?: number;
  sector?: string;
}

interface FilingDocument {
  type: string;
  label: string;
  icon: string;
  url?: string;
}

interface FilingItem {
  id: string;
  symbol: string;
  title: string;
  titleTh?: string;
  type: string;
  form?: string;
  date: string;
  quarter?: string;
  year: number;
  documents: FilingDocument[];
}

interface Financials {
  [key: string]: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (val: any, d = 2): string => {
  if (val == null || isNaN(val)) return '—';
  const n = Number(val);
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(d) + 'T';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(d) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(d) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(d) + 'K';
  return n.toFixed(d);
};

const fmtPct = (val: any): string => {
  if (val == null || isNaN(val)) return '—';
  return Number(val).toFixed(2) + '%';
};

const fmtPrice = (val: any): string => {
  if (val == null || isNaN(val)) return '—';
  return Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtRatio = (val: any): string => {
  if (val == null || isNaN(val)) return '—';
  return Number(val).toFixed(2);
};

const colorVal = (val: any) => {
  if (val == null || isNaN(val)) return 'text-muted-foreground';
  return Number(val) > 0 ? 'text-terminal-green' : Number(val) < 0 ? 'text-red-400' : 'text-foreground';
};

const getExchangeFlag = (exchange: string) => {
  const flags: Record<string, string> = {
    SET: '🇹🇭', BKK: '🇹🇭', TFEX: '🇹🇭',
    NASDAQ: '🇺🇸', NYSE: '🇺🇸', AMEX: '🇺🇸', OTC: '🇺🇸',
    TSE: '🇯🇵', HKEX: '🇭🇰', LSE: '🇬🇧',
    XETR: '🇩🇪', FRA: '🇩🇪',
    SSE: '🇨🇳', SZSE: '🇨🇳',
    BSE: '🇮🇳', NSE: '🇮🇳',
    ASX: '🇦🇺', SGX: '🇸🇬',
    BURSA: '🇲🇾', MYX: '🇲🇾',
    KRX: '🇰🇷', TWSE: '🇹🇼',
    IDX: '🇮🇩', PSE: '🇵🇭',
  };
  return flags[exchange] || '🏳️';
};

// ─── Financial Statements View (TradingView-style Dashboard) ─────────────────

type StatementTab = 'overview' | 'income' | 'balance' | 'cashflow' | 'ratios' | 'revenue';

const PIE_COLORS = ['#d4a843', '#4ade80', '#38bdf8', '#f87171', '#a78bfa'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg">
      <p className="text-[10px] font-mono text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-[11px] font-mono" style={{ color: entry.color }}>
          {entry.name}: {fmt(entry.value)}
        </p>
      ))}
    </div>
  );
};

const KeyFact = ({ label, value, suffix }: { label: string; value: string; suffix?: string }) => (
  <div className="space-y-0.5">
    <div className="text-[10px] font-mono text-muted-foreground/60">{label}</div>
    <div className="text-[14px] font-mono font-bold text-foreground">
      {value}
      {suffix && <span className="text-[10px] text-muted-foreground/50 ml-1">{suffix}</span>}
    </div>
  </div>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-3">
    <h3 className="text-sm font-mono font-bold text-foreground">{title}</h3>
    {subtitle && <p className="text-[10px] font-mono text-muted-foreground/60">{subtitle}</p>}
  </div>
);

const MetricRow = ({ label, value, format = 'number' }: { label: string; value: any; format?: string }) => {
  if (value == null || isNaN(value)) return null;
  const display = format === 'currency' ? fmtPrice(value) : format === 'growth' || format === 'percent' ? fmtPct(value) : format === 'ratio' ? fmtRatio(value) : fmt(value);
  const color = format === 'growth' || format === 'percent' ? colorVal(value) : 'text-foreground';
  return (
    <div className="grid grid-cols-2 py-2 px-3 border-b border-border/20 last:border-b-0 hover:bg-muted/10 transition-colors">
      <span className="text-[11px] font-mono text-muted-foreground/70">{label}</span>
      <span className={`text-[11px] font-mono font-medium text-right ${color}`}>{display}</span>
    </div>
  );
};

const FinancialStatementsView = ({ financials, symbol }: { financials: Financials; symbol: SymbolSuggestion }) => {
  const [tab, setTab] = useState<StatementTab>('overview');

  const chartData = useMemo(() => {
    if (!financials) return [];
    const periods: string[] = [];
    const now = new Date();
    const currentQ = Math.floor(now.getMonth() / 3) + 1;
    for (let i = 4; i >= 0; i--) {
      const offset = currentQ - 1 - i;
      const yearOff = Math.floor(offset / 4);
      const qBase = ((offset % 4) + 4) % 4 + 1;
      const yr = now.getFullYear() + yearOff;
      periods.push(`Q${qBase} '${String(yr).slice(-2)}`);
    }
    return periods.map((period, idx) => {
      const lookback = 4 - idx;
      const getVal = (field: string) => lookback === 0 ? financials[field] ?? null : financials[`${field}[${lookback}]`] ?? null;
      return {
        period,
        revenue: getVal('total_revenue'),
        grossProfit: getVal('gross_profit'),
        netIncome: getVal('net_income'),
        ebitda: getVal('ebitda'),
        eps: getVal('earnings_per_share_diluted_ttm'),
        pe: getVal('price_earnings_ttm'),
        ps: getVal('price_sales_ratio'),
        netMargin: financials['net_margin'] ?? null,
      };
    });
  }, [financials]);

  // Real ownership data from API
  const ownershipData = useMemo(() => {
    if (!financials) return null;
    const totalShares = financials['total_shares_outstanding'] || financials['total_shares_outstanding_fundamental'] || 0;
    const floatShares = financials['float_shares_outstanding'] || 0;
    if (totalShares > 0 && floatShares > 0) {
      const floatPct = floatShares / totalShares * 100;
      const insiderPct = 100 - floatPct;
      return [
        { name: 'หุ้นที่ถูกถือเฉพาะกลุ่ม (Insider)', value: insiderPct, amount: totalShares - floatShares },
        { name: 'หุ้นหมุนเวียน (Float)', value: floatPct, amount: floatShares },
      ];
    }
    return null;
  }, [financials]);

  if (!financials) return <div className="p-8 text-center text-muted-foreground text-[11px] font-mono">ไม่มีข้อมูล</div>;

  const tabDefs: { value: StatementTab; label: string; icon: React.ReactNode }[] = [
    { value: 'overview', label: 'ภาพรวม', icon: <PieChart className="w-3 h-3" /> },
    { value: 'income', label: 'งบการเงิน', icon: <BarChart3 className="w-3 h-3" /> },
    { value: 'balance', label: 'สถิติ', icon: <Calculator className="w-3 h-3" /> },
    { value: 'cashflow', label: 'เงินปันผล', icon: <DollarSign className="w-3 h-3" /> },
    { value: 'ratios', label: 'ผลประกอบการ', icon: <TrendingUp className="w-3 h-3" /> },
    { value: 'revenue', label: 'รายได้', icon: <BarChart3 className="w-3 h-3" /> },
  ];

  const marketCap = financials['market_cap_basic'] ?? 0;
  const totalDebt = financials['total_debt'] ?? 0;
  const cashEquiv = financials['cash_n_equivalents_fq'] ?? 0;
  const totalRevenue = financials['total_revenue'] ?? null;
  const grossProfit = financials['gross_profit'] ?? null;
  const operIncome = financials['oper_income'] ?? null;
  const netIncome = financials['net_income'] ?? null;
  const netDebt = financials['net_debt'] ?? null;
  const fundHoldingPct = financials['fund_holding_percent'] ?? null;

  // Real capital structure - only real data
  const capitalData = [
    { name: 'มูลค่าตามราคาตลาด', value: marketCap },
    { name: 'หนี้สินรวม', value: totalDebt },
    { name: 'เงินสดและรายการเทียบเท่าเงินสด', value: cashEquiv },
  ].filter(d => d.value > 0);

  const waterfallData = [
    { name: 'รายได้', value: totalRevenue },
    { name: 'COGS', value: financials['cost_of_goods'] ? -Math.abs(financials['cost_of_goods']) : null },
    { name: 'กำไรขั้นต้น', value: grossProfit },
    { name: 'ค่าใช้จ่ายดำเนินงาน', value: operIncome && grossProfit ? -(grossProfit - operIncome) : null },
    { name: 'กำไรดำเนินงาน', value: operIncome },
    { name: 'รายได้สุทธิ', value: netIncome },
  ].filter(d => d.value != null).map(d => ({ ...d, value: d.value as number }));

  // Determine currency from data
  const currency = financials['currency'] || (symbol.exchange === 'SET' || symbol.exchange === 'BKK' ? 'THB' : 'USD');

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-muted/40 border border-border/50 flex items-center justify-center">
          <Building2 className="w-3.5 h-3.5 text-foreground/70" />
        </div>
        <span className="text-sm font-mono font-bold text-foreground">{symbol.description || symbol.symbol}</span>
        <span className="text-[10px] font-mono text-muted-foreground/60">• การเงิน</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {tabDefs.map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono border transition-colors whitespace-nowrap ${
              tab === t.value ? 'bg-foreground/10 border-foreground/30 text-foreground font-medium' : 'border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/20'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div>
            <SectionTitle title="ข้อเท็จจริงที่มีนัยยะ" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KeyFact label="มูลค่าตามราคาตลาด" value={fmt(marketCap)} suffix={currency} />
              <KeyFact label="อัตราผลตอบแทนจากเงินปันผล ›" value={fmtPct(financials['dividends_yield'])} />
              <KeyFact label="อัตราส่วนราคาต่อกำไรสุทธิ (12 เดือนล่าสุด) ›" value={fmtRatio(financials['price_earnings_ttm'])} />
              <KeyFact label="กำไรต่อหุ้นขั้นพื้นฐาน (12 เดือนล่าสุด) ›" value={fmtPrice(financials['earnings_per_share_basic_ttm'])} suffix={currency} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              <KeyFact label="พนักงาน (ปีงบประมาณ) ›" value={financials['number_of_employees'] ? fmt(financials['number_of_employees'], 0) : '—'} />
              <KeyFact label="Industry" value={financials['industry'] || '—'} />
              <KeyFact label="เว็บไซต์" value={financials['web_url'] || '—'} />
              <KeyFact label="Sector" value={financials['sector'] || '—'} />
            </div>
          </div>

          {/* Ownership + Capital Structure */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border/30 bg-card/30 p-4">
              <SectionTitle title="ความเป็นเจ้าของ" />
              {ownershipData ? (
                <div className="flex items-center gap-6">
                  <div className="w-28 h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartPie>
                        <Pie data={ownershipData.map(d => ({ name: d.name, value: d.value }))}
                          cx="50%" cy="50%" innerRadius={25} outerRadius={45} dataKey="value" stroke="none">
                          <Cell fill="#d4a843" />
                          <Cell fill="#38bdf8" />
                        </Pie>
                      </RechartPie>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-[11px] font-mono">
                    {ownershipData.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: i === 0 ? '#d4a843' : '#38bdf8' }} />
                        <span className="text-muted-foreground/70">{item.name}</span>
                        <span className="text-foreground font-medium ml-auto">{item.value.toFixed(1)}%</span>
                      </div>
                    ))}
                    {fundHoldingPct != null && (
                      <div className="flex items-center gap-2 pt-1 border-t border-border/20">
                        <span className="text-muted-foreground/70">กองทุนถือ</span>
                        <span className="text-foreground font-medium ml-auto">{fmtPct(fundHoldingPct)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] font-mono text-muted-foreground/50 py-4 text-center">ไม่มีข้อมูลสัดส่วนการถือหุ้น</div>
              )}
            </div>

            <div className="rounded-lg border border-border/30 bg-card/30 p-4">
              <SectionTitle title="โครงสร้างเงินทุน" />
              {capitalData.length > 0 && (
                <div className="space-y-3">
                  <div className="h-8 rounded-md overflow-hidden flex">
                    {capitalData.map((d, i) => {
                      const total = capitalData.reduce((s, x) => s + x.value, 0);
                      const pct = total > 0 ? (d.value / total * 100) : 0;
                      return pct > 2 ? (
                        <div key={i} style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} className="flex items-center justify-center">
                          {pct > 10 && <span className="text-[8px] font-mono text-background font-bold">{pct.toFixed(0)}%</span>}
                        </div>
                      ) : null;
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    {capitalData.map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-muted-foreground/70 truncate">{d.name}</span>
                        <span className="text-foreground font-medium ml-auto">{fmt(d.value)}</span>
                      </div>
                    ))}
                    {netDebt != null && !isNaN(netDebt) && (
                      <div className="flex items-center gap-1.5 col-span-2 pt-1 border-t border-border/20">
                        <span className="text-muted-foreground/70">หนี้สินสุทธิ</span>
                        <span className={`font-medium ml-auto ${Number(netDebt) > 0 ? 'text-red-400' : 'text-terminal-green'}`}>{fmt(netDebt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Valuation */}
          <div>
            <SectionTitle title="การประเมินมูลค่า ›" subtitle="ตัวชี้วัดทางพื้นฐานเพื่อกำหนดมูลค่ายุติธรรมของหุ้น" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border/30 bg-card/30 p-4">
                <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">สรุป <Info className="w-3 h-3" /></div>
                <div className="flex items-center gap-6">
                  <div className="w-28 h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartPie>
                        <Pie data={[{ name: 'MCap', value: marketCap }, { name: 'Revenue', value: totalRevenue || 1 }, { name: 'Net Inc', value: Math.abs(netIncome || 1) }]}
                          cx="50%" cy="50%" innerRadius={25} outerRadius={45} dataKey="value" stroke="none">
                          <Cell fill="#d4a843" />
                          <Cell fill="#4ade80" />
                          <Cell fill="#38bdf8" />
                        </Pie>
                      </RechartPie>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-[11px] font-mono">
                    <div><span className="text-muted-foreground">P/E</span> <span className="text-foreground font-bold ml-3">{fmtRatio(financials['price_earnings_ttm'])}x</span></div>
                    <div><span className="text-muted-foreground">P/S</span> <span className="text-foreground font-bold ml-3">{fmtRatio(financials['price_sales_ratio'])}x</span></div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border/30 bg-card/30 p-4">
                <div className="text-[10px] font-mono text-muted-foreground mb-2">อัตราส่วนการประเมินมูลค่า</div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis dataKey="period" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                      <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line yAxisId="left" dataKey="ps" name="P/S" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
                      <Line yAxisId="right" dataKey="pe" name="P/E" stroke="#d4a843" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Growth & Profitability */}
          <div>
            <SectionTitle title="ความเติบโตและการทำกำไร ›" subtitle="ประสิทธิภาพและมาร์จิ้นล่าสุดของบริษัท" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-terminal-amber/20 bg-card/30 p-4">
                <div className="text-[10px] font-mono text-muted-foreground mb-2">ประสิทธิภาพ</div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis dataKey="period" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                      <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Bar yAxisId="left" dataKey="revenue" name="รายได้" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                      <Bar yAxisId="left" dataKey="netIncome" name="รายได้สุทธิ" fill="#22c55e" radius={[3, 3, 0, 0]} />
                      <Line yAxisId="right" dataKey="netMargin" name="อัตรากำไรสุทธิ %" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-lg border border-terminal-amber/20 bg-card/30 p-4">
                <div className="text-[10px] font-mono text-muted-foreground mb-2">อัตรารายได้ต่อกำไร</div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={waterfallData}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} interval={0} angle={-20} textAnchor="end" height={50} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Value" radius={[3, 3, 0, 0]}>
                        {waterfallData.map((entry, index) => (
                          <Cell key={index} fill={entry.value >= 0 ? '#22c55e' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Key Ratios Grid */}
          <div>
            <SectionTitle title="อัตราส่วนสำคัญ" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'P/E (TTM)', value: fmtRatio(financials['price_earnings_ttm']) },
                { label: 'P/B', value: fmtRatio(financials['price_book_ratio']) },
                { label: 'P/S', value: fmtRatio(financials['price_sales_ratio']) },
                { label: 'EV/EBITDA', value: fmtRatio(financials['enterprise_value_to_ebit']) },
                { label: 'ROE %', value: fmtPct(financials['return_on_equity']), clr: colorVal(financials['return_on_equity']) },
                { label: 'ROA %', value: fmtPct(financials['return_on_assets']), clr: colorVal(financials['return_on_assets']) },
                { label: 'Debt/Equity', value: fmtRatio(financials['debt_to_equity']) },
                { label: 'Current Ratio', value: fmtRatio(financials['current_ratio']) },
                { label: 'Gross Margin', value: fmtPct(financials['gross_margin']), clr: colorVal(financials['gross_margin']) },
                { label: 'Net Margin', value: fmtPct(financials['net_margin']), clr: colorVal(financials['net_margin']) },
                { label: 'Div Yield', value: fmtPct(financials['dividends_yield']), clr: colorVal(financials['dividends_yield']) },
                { label: 'RSI (14)', value: fmtRatio(financials['RSI']) },
              ].map((item) => (
              <div key={item.label} className="rounded-md border border-border/30 bg-card/20 px-3 py-2 hover:border-terminal-amber/30 transition-colors">
                  <div className="text-[9px] font-mono text-muted-foreground/70">{item.label}</div>
                  <div className={`text-[13px] font-mono font-bold ${item.clr || 'text-terminal-cyan'}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ INCOME ═══ */}
      {tab === 'income' && (
        <div className="space-y-4">
          <SectionTitle title="งบกำไรขาดทุน" subtitle="รายได้ ต้นทุน และกำไรของบริษัท" />
           <div className="rounded-lg border border-terminal-amber/20 bg-card/30 p-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="grossProfit" name="Gross Profit" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="netIncome" name="Net Income" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-lg border border-border/30 overflow-hidden">
            <MetricRow label="รายได้รวม (FY)" value={financials['total_revenue']} />
            <MetricRow label="กำไรขั้นต้น" value={financials['gross_profit']} />
            <MetricRow label="EBITDA (TTM)" value={financials['ebitda']} />
            <MetricRow label="รายได้จากดำเนินงาน" value={financials['oper_income']} />
            <MetricRow label="กำไรสุทธิ" value={financials['net_income']} />
            <MetricRow label="EPS Basic (TTM)" value={financials['earnings_per_share_basic_ttm']} format="currency" />
            <MetricRow label="EPS Diluted (TTM)" value={financials['earnings_per_share_diluted_ttm']} format="currency" />
            <MetricRow label="Revenue Growth YoY" value={financials['total_revenue_yoy_growth_fy']} format="growth" />
            <MetricRow label="EPS Growth YoY" value={financials['earnings_per_share_diluted_yoy_growth_fy']} format="growth" />
          </div>
        </div>
      )}

      {/* ═══ STATS ═══ */}
      {tab === 'balance' && (
        <div className="space-y-4">
          <SectionTitle title="สถิติและอัตราส่วน" subtitle="Valuation, Margins, Returns" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Valuation', items: [
                { label: 'P/E (TTM)', value: financials['price_earnings_ttm'], format: 'ratio' },
                { label: 'P/B', value: financials['price_book_ratio'], format: 'ratio' },
                { label: 'P/S', value: financials['price_sales_ratio'], format: 'ratio' },
                { label: 'PEG', value: financials['peg_ratio'], format: 'ratio' },
                { label: 'EV/EBIT', value: financials['enterprise_value_to_ebit'], format: 'ratio' },
              ]},
              { title: 'Margins', items: [
                { label: 'Gross Margin', value: financials['gross_margin'], format: 'percent' },
                { label: 'Operating Margin', value: financials['operating_margin'], format: 'percent' },
                { label: 'Net Margin', value: financials['net_margin'], format: 'percent' },
                { label: 'EBITDA Margin', value: financials['ebitda_margin'], format: 'percent' },
              ]},
              { title: 'Returns', items: [
                { label: 'ROE', value: financials['return_on_equity'], format: 'percent' },
                { label: 'ROA', value: financials['return_on_assets'], format: 'percent' },
                { label: 'ROIC', value: financials['return_on_invested_capital'], format: 'percent' },
              ]},
              { title: 'Solvency', items: [
                { label: 'Debt/Equity', value: financials['debt_to_equity'], format: 'ratio' },
                { label: 'Current Ratio', value: financials['current_ratio'], format: 'ratio' },
                { label: 'Quick Ratio', value: financials['quick_ratio'], format: 'ratio' },
              ]},
            ].map(section => (
              <div key={section.title} className="rounded-lg border border-terminal-amber/20 overflow-hidden">
                <div className="px-3 py-2 bg-terminal-amber/5 border-b border-terminal-amber/20">
                  <span className="text-[10px] font-mono font-bold text-terminal-amber uppercase">{section.title}</span>
                </div>
                {section.items.filter(i => i.value != null && !isNaN(i.value)).map(item => (
                  <MetricRow key={item.label} label={item.label} value={item.value} format={item.format} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ DIVIDEND ═══ */}
      {tab === 'cashflow' && (
        <div className="space-y-4">
          <SectionTitle title="เงินปันผล" subtitle="ผลตอบแทนปันผลและความต่อเนื่อง" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Dividend Yield', value: fmtPct(financials['dividends_yield']) },
              { label: 'Yield (Current)', value: fmtPct(financials['dividends_yield_current']) },
              { label: 'จ่ายต่อเนื่อง (ปี)', value: fmtRatio(financials['continuous_dividend_payout']) },
              { label: 'เติบโตต่อเนื่อง (ปี)', value: fmtRatio(financials['continuous_dividend_growth']) },
            ].map(s => (
              <div key={s.label} className="rounded-md border border-terminal-amber/20 bg-card/20 px-3 py-3 hover:border-terminal-amber/40 transition-colors">
                <div className="text-[9px] font-mono text-muted-foreground/70">{s.label}</div>
                <div className="text-lg font-mono font-bold text-terminal-amber">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border/30 overflow-hidden">
            <MetricRow label="เงินปันผลจ่าย (FY)" value={financials['dividends_paid']} />
            <MetricRow label="Free Cash Flow" value={financials['free_cash_flow']} />
            <MetricRow label="Free Cash Flow (TTM)" value={financials['free_cash_flow_ttm']} />
            <MetricRow label="Cash from Operations (TTM)" value={financials['cash_f_operating_activities_ttm']} />
          </div>
        </div>
      )}

      {/* ═══ EARNINGS ═══ */}
      {tab === 'ratios' && (
        <div className="space-y-4">
          <SectionTitle title="ผลประกอบการ" subtitle="EPS และการเติบโต" />
          <div className="grid grid-cols-3 gap-3">
             <div className="rounded-md border border-terminal-amber/20 bg-card/20 px-3 py-3">
               <div className="text-[9px] font-mono text-muted-foreground/70">EPS (TTM)</div>
               <div className="text-lg font-mono font-bold text-terminal-green">{fmtPrice(financials['earnings_per_share_diluted_ttm'])}</div>
             </div>
             <div className="rounded-md border border-terminal-amber/20 bg-card/20 px-3 py-3">
               <div className="text-[9px] font-mono text-muted-foreground/70">EPS ล่าสุด (MRQ)</div>
               <div className="text-lg font-mono font-bold text-terminal-cyan">{fmtPrice(financials['earnings_per_share_fq'])}</div>
             </div>
             <div className="rounded-md border border-terminal-amber/20 bg-card/20 px-3 py-3">
               <div className="text-[9px] font-mono text-muted-foreground/70">รอบประกาศถัดไป</div>
               <div className="text-sm font-mono font-bold text-terminal-amber">
                 {financials['earnings_release_next_date'] ? new Date(Number(financials['earnings_release_next_date']) * 1000).toLocaleDateString('th-TH') : '—'}
               </div>
             </div>
          </div>
          <div className="rounded-lg border border-terminal-amber/20 bg-card/30 p-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="eps" name="EPS" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-lg border border-border/30 overflow-hidden">
            <MetricRow label="EPS Growth YoY (FY)" value={financials['earnings_per_share_diluted_yoy_growth_fy']} format="growth" />
            <MetricRow label="Revenue Growth YoY (FY)" value={financials['total_revenue_yoy_growth_fy']} format="growth" />
            <MetricRow label="EBITDA Growth YoY" value={financials['ebitda_yoy_growth_fy']} format="growth" />
            <MetricRow label="Net Income Growth YoY" value={financials['net_income_yoy_growth_fy']} format="growth" />
          </div>
        </div>
      )}

      {/* ═══ REVENUE ═══ */}
      {tab === 'revenue' && (
        <div className="space-y-4">
          <SectionTitle title="รายได้" subtitle="Revenue, Gross Profit และแนวโน้ม" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             <div className="rounded-lg border border-terminal-amber/20 bg-card/30 p-4">
              <div className="text-[10px] font-mono text-muted-foreground mb-2">Revenue vs Gross Profit</div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="grossProfit" name="Gross Profit" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-lg border border-terminal-amber/20 bg-card/30 p-4">
              <div className="text-[10px] font-mono text-muted-foreground mb-2">Revenue Breakdown</div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterfallData}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {waterfallData.map((entry, index) => (
                        <Cell key={index} fill={entry.value >= 0 ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border/30 overflow-hidden">
            <MetricRow label="Total Revenue (FY)" value={financials['total_revenue']} />
            <MetricRow label="Gross Profit" value={financials['gross_profit']} />
            <MetricRow label="Net Income" value={financials['net_income']} />
            <MetricRow label="EBITDA" value={financials['ebitda']} />
            <MetricRow label="Free Cash Flow" value={financials['free_cash_flow']} />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const ScreenerFilings = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [selectedSymbol, setSelectedSymbol] = useState<SymbolSuggestion | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('choose');
  const [filingType, setFilingType] = useState<FilingTypeFilter>('all');
  const [filings, setFilings] = useState<FilingItem[]>([]);
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [statementSeries, setStatementSeries] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedFiling, setExpandedFiling] = useState<string | null>(null);

  // ─── Symbol Search ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!searchQuery.trim() || selectedSymbol) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const { data, error } = await supabase.functions.invoke('tv-symbol-search', {
          body: { text: searchQuery.trim(), lang: 'en' },
        });
        if (!error && data?.symbols) {
          setSuggestions(data.symbols);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Symbol search error:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, selectedSymbol]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ─── Select symbol → show chooser ───────────────────────────────────────

  const handleSelectSymbol = useCallback((sym: SymbolSuggestion) => {
    setSelectedSymbol(sym);
    setSearchQuery(`${sym.exchange}:${sym.symbol}`);
    setShowSuggestions(false);
    setSuggestions([]);
    setViewMode('choose');
    setFilings([]);
    setFinancials(null);
    setStatementSeries(null);
  }, []);

  // ─── Load data based on mode ────────────────────────────────────────────

  const loadStatements = useCallback(async () => {
    if (!selectedSymbol) return;
    setLoadingData(true);
    try {
      const { data, error } = await supabase.functions.invoke('tv-filings', {
        body: { symbol: selectedSymbol.symbol, exchange: selectedSymbol.exchange, mode: 'statements' },
      });
      if (!error && data) {
        setFinancials(data.financials || null);
        setStatementSeries(data.statementSeries || null);
      }
    } catch (err) {
      console.error('Statements fetch error:', err);
    } finally {
      setLoadingData(false);
    }
  }, [selectedSymbol]);

  const loadFilings = useCallback(async () => {
    if (!selectedSymbol) return;
    setLoadingData(true);
    try {
      const { data, error } = await supabase.functions.invoke('tv-filings', {
        body: { symbol: selectedSymbol.symbol, exchange: selectedSymbol.exchange, type: filingType, mode: 'filings' },
      });
      if (!error && data) {
        setFilings(data.filings || []);
        setFinancials(data.financials || null);
        setStatementSeries(data.statementSeries || null);
        const years: number[] = [...new Set((data.filings || []).map((f: FilingItem) => f.year))] as number[];
        years.sort((a, b) => b - a);
        setExpandedYears(new Set(years.slice(0, 2)));
      }
    } catch (err) {
      console.error('Filings fetch error:', err);
    } finally {
      setLoadingData(false);
    }
  }, [selectedSymbol, filingType]);

  const handleChooseMode = (mode: 'statements' | 'filings') => {
    setViewMode(mode);
    if (mode === 'statements') loadStatements();
    else loadFilings();
  };

  useEffect(() => {
    if (viewMode === 'filings' && selectedSymbol) loadFilings();
  }, [filingType]);

  const handleClear = () => {
    setSelectedSymbol(null);
    setSearchQuery('');
    setFilings([]);
    setFinancials(null);
    setStatementSeries(null);
    setSuggestions([]);
    setExpandedFiling(null);
    setViewMode('choose');
    inputRef.current?.focus();
  };

  // ─── Filings grouping ──────────────────────────────────────────────────

  const grouped = filings.reduce<Record<number, FilingItem[]>>((acc, item) => {
    if (!acc[item.year]) acc[item.year] = [];
    acc[item.year].push(item);
    return acc;
  }, {});
  const sortedYears = Object.keys(grouped).map(Number).sort((a, b) => b - a);

  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'annual': return <FileCheck className="w-3.5 h-3.5 text-terminal-green" />;
      case 'interim': case 'quarterly': return <FileText className="w-3.5 h-3.5 text-terminal-cyan" />;
      case 'slides': return <Presentation className="w-3.5 h-3.5 text-terminal-amber" />;
      default: return <FileText className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const FILTER_TABS: { value: FilingTypeFilter; label: string }[] = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'annual', label: 'รายงานประจำปี' },
    { value: 'quarterly', label: 'รายงานรายไตรมาส' },
    { value: 'interim', label: 'รายงานระหว่างกาล' },
    { value: 'slides', label: 'กิจกรรมของบริษัท' },
  ];

  const getFallbackDocumentUrl = (sym: SymbolSuggestion | null) => {
    if (!sym) return 'https://www.set.or.th';
    const ex = sym.exchange?.toUpperCase();
    if (ex === 'SET' || ex === 'BKK' || ex === 'TFEX') {
      return `https://www.set.or.th/th/market/product/stock/quote/${sym.symbol}/financial-statement/company-highlights`;
    }
    return `https://www.tradingview.com/symbols/${sym.exchange}-${sym.symbol}/`;
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Search Bar */}
      <div className="p-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground z-10" />
          {(loadingSuggestions || loadingData) && (
            <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin z-10" />
          )}
          {selectedSymbol && (
            <button onClick={handleClear} className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <Input
            ref={inputRef}
            placeholder="ค้นหาตัวย่อ... เช่น PTT, GULF, AAPL"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              if (selectedSymbol) {
                setSelectedSymbol(null);
                setFilings([]);
                setFinancials(null);
                setStatementSeries(null);
                setViewMode('choose');
              }
            }}
            onFocus={() => { if (suggestions.length > 0 && !selectedSymbol) setShowSuggestions(true); }}
            className="pl-8 pr-8 h-9 border-border font-mono text-[12px] bg-background focus-visible:ring-1 focus-visible:ring-primary/30"
            autoFocus
          />

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div ref={dropdownRef} className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-[400px] overflow-y-auto">
              {suggestions.map((sym, i) => (
                <button
                  key={`${sym.exchange}-${sym.symbol}-${i}`}
                  onClick={() => handleSelectSymbol(sym)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 text-left border-b border-border/30 last:border-b-0 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center shrink-0 text-[10px]">
                    {getExchangeFlag(sym.exchange)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-mono font-bold text-cyan-400">{sym.symbol}</span>
                      <span className="text-[11px] font-mono text-foreground truncate">{sym.description}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground">{sym.type}</span>
                    <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">{sym.exchange}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Company Header */}
      {selectedSymbol && (
        <div className="px-3 py-2 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-terminal-amber/10 border border-terminal-amber/30 flex items-center justify-center text-[11px]">
              {getExchangeFlag(selectedSymbol.exchange)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-mono font-bold text-terminal-amber">{selectedSymbol.symbol}</span>
                <span className="text-[11px] font-mono text-muted-foreground truncate">{selectedSymbol.description}</span>
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">• {selectedSymbol.exchange}</span>
            </div>
            {viewMode !== 'choose' && (
              <button
                onClick={() => { setViewMode('choose'); setFilings([]); setFinancials(null); }}
                className="text-[10px] font-mono text-terminal-amber hover:text-terminal-amber/80 transition-colors px-2 py-1 rounded border border-terminal-amber/30 hover:bg-terminal-amber/5"
              >
                ← เลือกใหม่
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        {/* Empty state */}
        {!selectedSymbol && !showSuggestions && (
          <div className="flex items-center justify-center p-12">
            <div className="text-center space-y-3 max-w-xs">
              <Building2 className="w-10 h-10 mx-auto text-terminal-amber/40" />
              <div>
                <h3 className="text-sm font-mono font-bold text-terminal-amber mb-1">ค้นหาข้อมูลบริษัท</h3>
                <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                  พิมพ์ชื่อหรือตัวย่อหุ้นเพื่อดูงบการเงินขั้นต้น หรือเอกสารการเงินของบริษัท
                </p>
              </div>
              <div className="flex items-center gap-1.5 justify-center flex-wrap">
                {['PTT', 'GULF', 'AAPL', 'ADVANC', 'NVDA'].map(s => (
                  <button key={s} onClick={() => setSearchQuery(s)}
                    className="px-2 py-0.5 rounded border border-terminal-amber/30 text-[10px] font-mono text-terminal-amber hover:bg-terminal-amber/10 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mode Chooser */}
        {selectedSymbol && viewMode === 'choose' && (
          <div className="p-6 space-y-4">
            <p className="text-[11px] font-mono text-muted-foreground text-center">เลือกประเภทข้อมูลที่ต้องการดู</p>
            <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
              <button
                onClick={() => handleChooseMode('statements')}
                 className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-terminal-cyan/50 hover:bg-terminal-cyan/5 transition-all text-left group"
               >
                 <div className="w-12 h-12 rounded-lg bg-terminal-cyan/10 border border-terminal-cyan/20 flex items-center justify-center shrink-0 group-hover:bg-terminal-cyan/20 transition-colors">
                   <Calculator className="w-6 h-6 text-terminal-cyan" />
                </div>
                <div>
                  <h4 className="text-[13px] font-mono font-bold text-foreground">📊 งบการเงินขั้นต้น</h4>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    งบกำไรขาดทุน, งบดุล, กระแสเงินสด, อัตราส่วนทางการเงิน
                  </p>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {['ภาพรวม', 'งบกำไรขาดทุน', 'งบดุล', 'กระแสเงินสด', 'อัตราส่วน'].map(t => (
                      <Badge key={t} variant="outline" className="text-[8px] font-mono px-1 py-0">{t}</Badge>
                    ))}
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleChooseMode('filings')}
                 className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-terminal-amber/50 hover:bg-terminal-amber/5 transition-all text-left group"
               >
                 <div className="w-12 h-12 rounded-lg bg-terminal-amber/10 border border-terminal-amber/20 flex items-center justify-center shrink-0 group-hover:bg-terminal-amber/20 transition-colors">
                   <FileText className="w-6 h-6 text-terminal-amber" />
                </div>
                <div>
                  <h4 className="text-[13px] font-mono font-bold text-foreground">📋 เอกสารการเงินบริษัท</h4>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    รายงานประจำปี, รายงานไตรมาส, สไลด์นักลงทุน, หนังสือรับรอง
                  </p>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {['Annual', 'Quarterly', 'Interim', 'Slides'].map(t => (
                      <Badge key={t} variant="outline" className="text-[8px] font-mono px-1 py-0">{t}</Badge>
                    ))}
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loadingData && (
          <div className="flex items-center justify-center p-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[11px] font-mono">กำลังโหลดข้อมูล...</span>
            </div>
          </div>
        )}

        {/* Financial Statements View */}
        {viewMode === 'statements' && !loadingData && selectedSymbol && financials && (
          <FinancialStatementsView financials={financials} symbol={selectedSymbol} />
        )}
        {viewMode === 'statements' && !loadingData && selectedSymbol && !financials && (
          <div className="p-8 text-center text-muted-foreground text-[11px] font-mono">ไม่มีข้อมูลงบการเงิน</div>
        )}

        {/* Filings View */}
        {viewMode === 'filings' && !loadingData && selectedSymbol && (
          <>
            {/* Filter Tabs */}
            <div className="px-3 py-2 border-b border-border flex items-center gap-1 flex-wrap">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setFilingType(tab.value)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-mono border transition-colors ${
                    filingType === tab.value
                      ? 'bg-muted/60 border-border text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Financial Summary */}
            {financials && (
              <div className="border-b border-border">
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-mono font-bold text-foreground">{fmtPrice(financials['close'])}</span>
                    {financials['change'] != null && (
                     <span className={`text-sm font-mono font-medium ${financials['change'] > 0 ? 'text-terminal-green' : 'text-red-400'}`}>
                        {financials['change'] > 0 ? '▲' : '▼'} {Math.abs(financials['change']).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {financials['market_cap_basic'] && (
                      <Badge variant="outline" className="text-[10px] font-mono">MCap {fmt(financials['market_cap_basic'])}</Badge>
                    )}
                    {financials['price_earnings_ttm'] && (
                      <Badge variant="outline" className="text-[10px] font-mono">P/E {fmtRatio(financials['price_earnings_ttm'])}</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Filings List */}
            {filings.length > 0 ? (
              <div className="w-full">
                <div className="grid grid-cols-[1fr_auto_auto] px-4 py-2 border-b border-border/50 sticky top-0 bg-background z-10">
                  <span className="text-[10px] font-mono text-muted-foreground">เหตุการณ์/รายงาน</span>
                  <span className="text-[10px] font-mono text-muted-foreground text-center w-32">วันที่</span>
                  <span className="text-[10px] font-mono text-muted-foreground text-right w-32">ประเภท</span>
                </div>

                {sortedYears.map(year => {
                  const isExpanded = expandedYears.has(year);
                  const items = grouped[year];
                  return (
                    <div key={year}>
                      <button onClick={() => toggleYear(year)}
                        className="w-full flex items-center gap-2 px-4 py-2 bg-muted/20 hover:bg-muted/30 text-left border-b border-border/30 transition-colors">
                        {isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                        <span className="text-[12px] font-mono font-bold text-foreground">{year}</span>
                        <Badge variant="outline" className="text-[9px] ml-auto">{items.length}</Badge>
                      </button>

                      {isExpanded && items.map((item, idx) => (
                        <div key={item.id}>
                          <div
                            className={`grid grid-cols-[1fr_auto_auto] px-4 py-2.5 border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-muted/5'}`}
                            onClick={() => setExpandedFiling(expandedFiling === item.id ? null : item.id)}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {getTypeIcon(item.type)}
                              <span className="text-[11px] font-mono text-foreground">
                                {item.quarter || item.titleTh || item.title}
                              </span>
                            </div>
                            <div className="w-32 text-center">
                              <span className="text-[11px] font-mono text-muted-foreground">{item.date}</span>
                            </div>
                            <div className="w-32 flex items-center justify-end gap-1.5">
                              {item.documents.map((doc, di) => {
                                const fallbackUrl = getFallbackDocumentUrl(selectedSymbol);
                                return (
                                  <a
                                    key={di}
                                    href={doc.url || fallbackUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 hover:bg-primary/10 hover:border-primary/30 cursor-pointer">
                                      {doc.icon} {doc.label}
                                    </Badge>
                                  </a>
                                );
                              })}
                            </div>
                          </div>

                          {expandedFiling === item.id && (
                            <div className="px-6 py-3 bg-muted/10 border-b border-border/20 space-y-2">
                              <div className="text-[10px] font-mono text-muted-foreground">
                                📋 <span className="text-foreground font-medium">{item.title}</span>
                                {item.form && <span className="ml-2 text-muted-foreground">({item.form})</span>}
                              </div>
                              <div className="text-[10px] font-mono text-muted-foreground">
                                📅 วันที่เผยแพร่: <span className="text-foreground">{item.date}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.documents.map((doc, di) => {
                                  const href = doc.url || getFallbackDocumentUrl(selectedSymbol);
                                  return (
                                    <a
                                      key={di}
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-1 px-2 py-1 rounded bg-muted/30 border border-border/30 hover:bg-muted/50 hover:border-primary/30 transition-colors"
                                    >
                                      <span className="text-[11px]">{doc.icon}</span>
                                      <span className="text-[10px] font-mono text-foreground">{doc.label}</span>
                                    </a>
                                  );
                                })}
                              </div>
                              <p className="text-[9px] font-mono text-muted-foreground/70 mt-1">
                                ℹ️ ข้อมูลการเงินแสดงด้านบน — ดึงจาก TradingView Scanner API โดยตรง
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center p-12">
                <p className="text-[11px] font-mono text-muted-foreground">
                  ไม่พบเอกสารสำหรับ {selectedSymbol.exchange}:{selectedSymbol.symbol}
                </p>
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
};

export default ScreenerFilings;