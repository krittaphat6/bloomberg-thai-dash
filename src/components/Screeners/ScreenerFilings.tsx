import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, ChevronDown, ChevronRight, Building2, X, FileText, Presentation, FileCheck, TrendingUp, TrendingDown, BarChart3, DollarSign, PieChart, LayoutList, Calculator } from 'lucide-react';
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
  if (val == null || isNaN(val)) return '';
  return Number(val) > 0 ? 'text-green-400' : Number(val) < 0 ? 'text-red-400' : '';
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

// ─── Financial Statements View ───────────────────────────────────────────────

type StatementTab = 'overview' | 'income' | 'balance' | 'cashflow' | 'ratios';

const StatementRow = ({ label, value, format = 'number', indent = false }: { label: string; value: any; format?: string; indent?: boolean }) => {
  let display = '—';
  let color = 'text-foreground';

  if (value != null && !isNaN(value)) {
    switch (format) {
      case 'number': display = fmt(value); break;
      case 'currency': display = fmtPrice(value); break;
      case 'percent': display = fmtPct(value); color = colorVal(value) || 'text-foreground'; break;
      case 'ratio': display = fmtRatio(value); break;
      case 'growth':
        display = fmtPct(value);
        color = Number(value) > 0 ? 'text-green-400' : Number(value) < 0 ? 'text-red-400' : 'text-foreground';
        break;
    }
  }

  return (
    <div className={`flex items-center justify-between py-1.5 px-3 hover:bg-muted/20 ${indent ? 'pl-6' : ''}`}>
      <span className="text-[11px] font-mono text-muted-foreground">{label}</span>
      <span className={`text-[11px] font-mono font-medium ${color}`}>{display}</span>
    </div>
  );
};

const SectionHeader = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-y border-border/30">
    <span className="text-muted-foreground">{icon}</span>
    <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
  </div>
);

const FinancialStatementsView = ({ financials, symbol }: { financials: Financials; symbol: SymbolSuggestion }) => {
  const [tab, setTab] = useState<StatementTab>('overview');

  if (!financials) return <div className="p-8 text-center text-muted-foreground text-[11px] font-mono">ไม่มีข้อมูล</div>;

  const tabs: { value: StatementTab; label: string; icon: React.ReactNode }[] = [
    { value: 'overview', label: 'ภาพรวม', icon: <PieChart className="w-3 h-3" /> },
    { value: 'income', label: 'งบกำไรขาดทุน', icon: <BarChart3 className="w-3 h-3" /> },
    { value: 'balance', label: 'งบดุล', icon: <LayoutList className="w-3 h-3" /> },
    { value: 'cashflow', label: 'กระแสเงินสด', icon: <DollarSign className="w-3 h-3" /> },
    { value: 'ratios', label: 'อัตราส่วน', icon: <Calculator className="w-3 h-3" /> },
  ];

  const change = financials['change'];
  const isUp = change != null && change > 0;
  const rec = financials['Recommend.All'];
  let recLabel = 'Neutral'; let recColor = 'text-muted-foreground';
  if (rec != null) {
    if (rec >= 0.5) { recLabel = 'Strong Buy'; recColor = 'text-green-400'; }
    else if (rec >= 0.1) { recLabel = 'Buy'; recColor = 'text-green-400'; }
    else if (rec <= -0.5) { recLabel = 'Strong Sell'; recColor = 'text-red-400'; }
    else if (rec <= -0.1) { recLabel = 'Sell'; recColor = 'text-red-400'; }
  }

  return (
    <div>
      {/* Price Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/30">
        <div className="flex items-center gap-3">
          <span className="text-lg font-mono font-bold text-foreground">{fmtPrice(financials['close'])}</span>
          {change != null && (
            <span className={`text-sm font-mono font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] font-mono ${recColor} border-current`}>
            {recLabel}
          </Badge>
          {financials['market_cap_basic'] && (
            <Badge variant="outline" className="text-[10px] font-mono">
              MCap {fmt(financials['market_cap_basic'])}
            </Badge>
          )}
        </div>
      </div>

      {/* Statement Tabs */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-mono border transition-colors whitespace-nowrap ${
              tab === t.value
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="divide-y divide-border/20">
        {tab === 'overview' && (
          <>
            <SectionHeader title="ข้อมูลพื้นฐาน" icon={<Building2 className="w-3.5 h-3.5" />} />
            <StatementRow label="ราคาปิด" value={financials['close']} format="currency" />
            <StatementRow label="Market Cap" value={financials['market_cap_basic']} format="number" />
            <StatementRow label="Enterprise Value" value={financials['enterprise_value']} format="number" />
            <StatementRow label="52W High" value={financials['price_52_week_high']} format="currency" />
            <StatementRow label="52W Low" value={financials['price_52_week_low']} format="currency" />
            {financials['sector'] && <div className="flex items-center justify-between py-1.5 px-3"><span className="text-[11px] font-mono text-muted-foreground">Sector</span><span className="text-[11px] font-mono font-medium text-foreground">{financials['sector']}</span></div>}
            {financials['industry'] && <div className="flex items-center justify-between py-1.5 px-3"><span className="text-[11px] font-mono text-muted-foreground">Industry</span><span className="text-[11px] font-mono font-medium text-foreground">{financials['industry']}</span></div>}
            <StatementRow label="จำนวนพนักงาน" value={financials['number_of_employees']} format="number" />

            <SectionHeader title="การประเมินมูลค่า" icon={<Calculator className="w-3.5 h-3.5" />} />
            <StatementRow label="P/E (TTM)" value={financials['price_earnings_ttm']} format="ratio" />
            <StatementRow label="P/B" value={financials['price_book_ratio']} format="ratio" />
            <StatementRow label="P/S" value={financials['price_sales_ratio']} format="ratio" />
            <StatementRow label="P/Revenue (TTM)" value={financials['price_revenue_ttm']} format="ratio" />
            <StatementRow label="EV/EBIT" value={financials['enterprise_value_to_ebit']} format="ratio" />
            <StatementRow label="EV/Revenue" value={financials['enterprise_value_to_revenue']} format="ratio" />
            <StatementRow label="PEG Ratio" value={financials['peg_ratio']} format="ratio" />

            <SectionHeader title="ผลตอบแทนราคา" icon={<TrendingUp className="w-3.5 h-3.5" />} />
            <StatementRow label="สัปดาห์" value={financials['Perf.W']} format="growth" />
            <StatementRow label="1 เดือน" value={financials['Perf.1M']} format="growth" />
            <StatementRow label="3 เดือน" value={financials['Perf.3M']} format="growth" />
            <StatementRow label="6 เดือน" value={financials['Perf.6M']} format="growth" />
            <StatementRow label="YTD" value={financials['Perf.YTD']} format="growth" />
            <StatementRow label="1 ปี" value={financials['Perf.Y']} format="growth" />

            <SectionHeader title="เงินปันผล" icon={<DollarSign className="w-3.5 h-3.5" />} />
            <StatementRow label="Dividend Yield %" value={financials['dividends_yield']} format="percent" />
            <StatementRow label="Dividend Yield Current %" value={financials['dividends_yield_current']} format="percent" />
            <StatementRow label="จ่ายปันผลต่อเนื่อง (ปี)" value={financials['continuous_dividend_payout']} format="ratio" />
            <StatementRow label="เติบโตปันผลต่อเนื่อง (ปี)" value={financials['continuous_dividend_growth']} format="ratio" />

            <SectionHeader title="เทคนิคอล" icon={<BarChart3 className="w-3.5 h-3.5" />} />
            <StatementRow label="RSI (14)" value={financials['RSI']} format="ratio" />
            <StatementRow label="SMA 50" value={financials['SMA50']} format="currency" />
            <StatementRow label="SMA 200" value={financials['SMA200']} format="currency" />
          </>
        )}

        {tab === 'income' && (
          <>
            <SectionHeader title="รายได้" icon={<BarChart3 className="w-3.5 h-3.5" />} />
            <StatementRow label="รายได้รวม (FY)" value={financials['total_revenue']} format="number" />
            <StatementRow label="รายได้ปีที่แล้ว (FY)" value={financials['last_annual_revenue']} format="number" />
            <StatementRow label="รายได้รวม (TTM)" value={financials['revenue_ttm']} format="number" />
            <StatementRow label="ต้นทุนขาย (COGS)" value={financials['cost_of_goods']} format="number" />
            <StatementRow label="รายได้ต่อพนักงาน" value={financials['revenue_per_employee']} format="number" />

            <SectionHeader title="กำไร" icon={<TrendingUp className="w-3.5 h-3.5" />} />
            <StatementRow label="กำไรขั้นต้น (FY)" value={financials['gross_profit']} format="number" />
            <StatementRow label="กำไรขั้นต้น (MRQ)" value={financials['gross_profit_fq']} format="number" />
            <StatementRow label="ค่าใช้จ่ายดำเนินงาน" value={financials['operating_expenses']} format="number" />
            <StatementRow label="รายได้จากการดำเนินงาน (FY)" value={financials['oper_income']} format="number" />
            <StatementRow label="รายได้จากการดำเนินงาน (MRQ)" value={financials['oper_income_fq']} format="number" />
            <StatementRow label="EBITDA (TTM)" value={financials['ebitda']} format="number" />
            <StatementRow label="กำไรสุทธิ (FY)" value={financials['net_income']} format="number" />
            <StatementRow label="กำไรสุทธิ (TTM)" value={financials['net_income_ttm']} format="number" />

            <SectionHeader title="ค่าใช้จ่าย" icon={<LayoutList className="w-3.5 h-3.5" />} />
            <StatementRow label="ดอกเบี้ยจ่าย" value={financials['interest_expense_fq']} format="number" />
            <StatementRow label="ภาษีเงินได้" value={financials['tax_expense_fq']} format="number" />
            <StatementRow label="R&D" value={financials['research_and_dev']} format="number" />
            <StatementRow label="SG&A" value={financials['sell_gen_admin']} format="number" />

            <SectionHeader title="กำไรต่อหุ้น" icon={<DollarSign className="w-3.5 h-3.5" />} />
            <StatementRow label="EPS Basic (FY)" value={financials['basic_eps_net_income']} format="currency" />
            <StatementRow label="EPS Basic (TTM)" value={financials['earnings_per_share_basic_ttm']} format="currency" />
            <StatementRow label="EPS Diluted (FY)" value={financials['last_annual_eps']} format="currency" />
            <StatementRow label="EPS Diluted (TTM)" value={financials['earnings_per_share_diluted_ttm']} format="currency" />
            <StatementRow label="EPS Diluted (MRQ)" value={financials['earnings_per_share_fq']} format="currency" />

            <SectionHeader title="การเติบโต" icon={<TrendingUp className="w-3.5 h-3.5" />} />
            <StatementRow label="Revenue Growth YoY (FY)" value={financials['total_revenue_yoy_growth_fy']} format="growth" />
            <StatementRow label="Revenue Growth QoQ" value={financials['total_revenue_qoq_growth_fq']} format="growth" />
            <StatementRow label="Revenue Growth YoY (TTM)" value={financials['total_revenue_yoy_growth_ttm']} format="growth" />
            <StatementRow label="EPS Growth YoY (FY)" value={financials['earnings_per_share_diluted_yoy_growth_fy']} format="growth" />
            <StatementRow label="EPS Growth YoY (TTM)" value={financials['earnings_per_share_diluted_yoy_growth_ttm']} format="growth" />
            <StatementRow label="EBITDA Growth YoY (FY)" value={financials['ebitda_yoy_growth_fy']} format="growth" />
            <StatementRow label="Net Income Growth YoY (FY)" value={financials['net_income_yoy_growth_fy']} format="growth" />
          </>
        )}

        {tab === 'balance' && (
          <>
            <SectionHeader title="สินทรัพย์" icon={<BarChart3 className="w-3.5 h-3.5" />} />
            <StatementRow label="สินทรัพย์รวม" value={financials['total_assets']} format="number" />
            <StatementRow label="สินทรัพย์หมุนเวียน" value={financials['total_current_assets']} format="number" />
            <StatementRow label="เงินสดและรายการเทียบเท่า" value={financials['cash_n_equivalents_fq']} format="number" indent />
            <StatementRow label="เงินสด + เงินลงทุนระยะสั้น" value={financials['cash_n_short_term_invest_fq']} format="number" indent />
            <StatementRow label="ลูกหนี้การค้า" value={financials['accounts_receivable']} format="number" indent />
            <StatementRow label="สินค้าคงเหลือ" value={financials['inventories_total']} format="number" indent />
            <StatementRow label="ที่ดิน อาคาร อุปกรณ์ (สุทธิ)" value={financials['net_ppe']} format="number" />
            <StatementRow label="ค่าความนิยม" value={financials['goodwill']} format="number" />
            <StatementRow label="สินทรัพย์ไม่มีตัวตน" value={financials['intangibles_total']} format="number" />

            <SectionHeader title="หนี้สิน" icon={<TrendingDown className="w-3.5 h-3.5" />} />
            <StatementRow label="หนี้สินรวม" value={financials['total_liabilities_fq']} format="number" />
            <StatementRow label="หนี้สินหมุนเวียน" value={financials['total_current_liabilities']} format="number" />
            <StatementRow label="เจ้าหนี้การค้า" value={financials['accounts_payable']} format="number" indent />
            <StatementRow label="หนี้สินระยะยาว" value={financials['long_term_debt']} format="number" />
            <StatementRow label="หนี้สินระยะสั้น" value={financials['short_term_debt']} format="number" />
            <StatementRow label="หนี้สินรวมทั้งหมด" value={financials['total_debt']} format="number" />
            <StatementRow label="หนี้สินสุทธิ" value={financials['net_debt']} format="number" />

            <SectionHeader title="ส่วนของผู้ถือหุ้น" icon={<PieChart className="w-3.5 h-3.5" />} />
            <StatementRow label="ส่วนของผู้ถือหุ้นรวม" value={financials['total_equity']} format="number" />
            <StatementRow label="กำไรสะสม" value={financials['retained_earnings']} format="number" />
            <StatementRow label="ส่วนของผู้ถือหุ้นสามัญ" value={financials['common_equity_total']} format="number" />
            <StatementRow label="มูลค่าตามบัญชี/หุ้น" value={financials['book_value_per_share']} format="currency" />
            <StatementRow label="มูลค่าตามบัญชีจับต้องได้/หุ้น" value={financials['tangible_book_value_per_share']} format="currency" />
          </>
        )}

        {tab === 'cashflow' && (
          <>
            <SectionHeader title="กระแสเงินสดจากการดำเนินงาน" icon={<DollarSign className="w-3.5 h-3.5" />} />
            <StatementRow label="กระแสเงินสดจากดำเนินงาน (TTM)" value={financials['cash_f_operating_activities_ttm']} format="number" />
            <StatementRow label="กระแสเงินสดจากดำเนินงาน (FY)" value={financials['cash_f_operating_activities']} format="number" />

            <SectionHeader title="การลงทุน" icon={<BarChart3 className="w-3.5 h-3.5" />} />
            <StatementRow label="ค่าใช้จ่ายลงทุน (TTM)" value={financials['capital_expenditures_ttm']} format="number" />
            <StatementRow label="ค่าใช้จ่ายลงทุน (FY)" value={financials['capital_expenditures']} format="number" />
            <StatementRow label="กระแสเงินสดจากการลงทุน (TTM)" value={financials['cash_f_investing_activities_ttm']} format="number" />

            <SectionHeader title="กระแสเงินสดอิสระ" icon={<TrendingUp className="w-3.5 h-3.5" />} />
            <StatementRow label="Free Cash Flow" value={financials['free_cash_flow']} format="number" />
            <StatementRow label="Free Cash Flow (TTM)" value={financials['free_cash_flow_ttm']} format="number" />
            <StatementRow label="Free Cash Flow (FY)" value={financials['free_cash_flow_fy']} format="number" />

            <SectionHeader title="จัดหาเงินทุน" icon={<LayoutList className="w-3.5 h-3.5" />} />
            <StatementRow label="กระแสเงินสดจากจัดหาเงินทุน (TTM)" value={financials['cash_f_financing_activities_ttm']} format="number" />
            <StatementRow label="เงินปันผลจ่าย (FY)" value={financials['dividends_paid']} format="number" />
            <StatementRow label="เงินปันผลจ่าย (TTM)" value={financials['total_cash_dividends_paid_ttm']} format="number" />
          </>
        )}

        {tab === 'ratios' && (
          <>
            <SectionHeader title="อัตรากำไร (Margins)" icon={<PieChart className="w-3.5 h-3.5" />} />
            <StatementRow label="Gross Margin (TTM)" value={financials['gross_margin']} format="percent" />
            <StatementRow label="Gross Margin (MRQ)" value={financials['gross_margin_fq']} format="percent" />
            <StatementRow label="Operating Margin (TTM)" value={financials['operating_margin']} format="percent" />
            <StatementRow label="Operating Margin (MRQ)" value={financials['operating_margin_fq']} format="percent" />
            <StatementRow label="Net Margin (TTM)" value={financials['net_margin']} format="percent" />
            <StatementRow label="EBITDA Margin (TTM)" value={financials['ebitda_margin']} format="percent" />
            <StatementRow label="FCF Margin" value={financials['free_cash_flow_margin']} format="percent" />
            <StatementRow label="Pre-tax Margin" value={financials['pre_tax_margin']} format="percent" />

            <SectionHeader title="ผลตอบแทน (Returns)" icon={<TrendingUp className="w-3.5 h-3.5" />} />
            <StatementRow label="ROE (TTM)" value={financials['return_on_equity']} format="percent" />
            <StatementRow label="ROA (TTM)" value={financials['return_on_assets']} format="percent" />
            <StatementRow label="ROIC (TTM)" value={financials['return_on_invested_capital']} format="percent" />

            <SectionHeader title="อัตราส่วนหนี้สิน" icon={<LayoutList className="w-3.5 h-3.5" />} />
            <StatementRow label="Debt/Equity" value={financials['debt_to_equity']} format="ratio" />
            <StatementRow label="Current Ratio" value={financials['current_ratio']} format="ratio" />
            <StatementRow label="Quick Ratio" value={financials['quick_ratio']} format="ratio" />

            <SectionHeader title="การประเมินมูลค่า" icon={<Calculator className="w-3.5 h-3.5" />} />
            <StatementRow label="P/E (TTM)" value={financials['price_earnings_ttm']} format="ratio" />
            <StatementRow label="P/Revenue (TTM)" value={financials['price_revenue_ttm']} format="ratio" />
            <StatementRow label="P/Cash Flow" value={financials['price_to_operating_cash_flow']} format="ratio" />
            <StatementRow label="EV/EBIT" value={financials['enterprise_value_to_ebit']} format="ratio" />
            <StatementRow label="EV/Revenue" value={financials['enterprise_value_to_revenue']} format="ratio" />
            <StatementRow label="PEG Ratio" value={financials['peg_ratio']} format="ratio" />
          </>
        )}
      </div>
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
      case 'annual': return <FileCheck className="w-3.5 h-3.5 text-green-400" />;
      case 'interim': case 'quarterly': return <FileText className="w-3.5 h-3.5 text-cyan-400" />;
      case 'slides': return <Presentation className="w-3.5 h-3.5 text-amber-400" />;
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
            <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-[11px]">
              {getExchangeFlag(selectedSymbol.exchange)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-mono font-bold text-foreground">{selectedSymbol.symbol}</span>
                <span className="text-[11px] font-mono text-muted-foreground truncate">{selectedSymbol.description}</span>
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">• {selectedSymbol.exchange}</span>
            </div>
            {viewMode !== 'choose' && (
              <button
                onClick={() => { setViewMode('choose'); setFilings([]); setFinancials(null); }}
                className="text-[10px] font-mono text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded border border-primary/30 hover:bg-primary/5"
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
              <Building2 className="w-10 h-10 mx-auto text-muted-foreground/50" />
              <div>
                <h3 className="text-sm font-mono font-bold text-foreground mb-1">ค้นหาข้อมูลบริษัท</h3>
                <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                  พิมพ์ชื่อหรือตัวย่อหุ้นเพื่อดูงบการเงินขั้นต้น หรือเอกสารการเงินของบริษัท
                </p>
              </div>
              <div className="flex items-center gap-1.5 justify-center flex-wrap">
                {['PTT', 'GULF', 'AAPL', 'ADVANC', 'NVDA'].map(s => (
                  <button key={s} onClick={() => setSearchQuery(s)}
                    className="px-2 py-0.5 rounded border border-border/50 text-[10px] font-mono text-primary hover:bg-muted/30 transition-colors">
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
                className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Calculator className="w-6 h-6 text-primary" />
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
                className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                  <FileText className="w-6 h-6 text-amber-400" />
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
                      <span className={`text-sm font-mono font-medium ${financials['change'] > 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                              {item.documents.map((doc, di) => (
                                <Badge key={di} variant="outline" className="text-[9px] font-mono px-1.5 py-0">
                                  {doc.icon} {doc.label}
                                </Badge>
                              ))}
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
                                {item.documents.map((doc, di) => (
                                  <button
                                    key={di}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const fallbackUrl = `https://www.tradingview.com/symbols/${selectedSymbol.exchange}-${selectedSymbol.symbol}/financials-overview/`;
                                      window.open(doc.url || fallbackUrl, '_blank', 'noopener,noreferrer');
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                                  >
                                    <span className="text-[11px]">{doc.icon}</span>
                                    <span className="text-[10px] font-mono text-foreground">{doc.label}</span>
                                  </button>
                                ))}
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