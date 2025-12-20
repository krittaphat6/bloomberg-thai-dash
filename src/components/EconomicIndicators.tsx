import { useState, useEffect } from 'react';
import { EconomicDataService, CountryEconomicData } from '@/services/EconomicDataService';
import { Table, BarChart3, Globe } from 'lucide-react';
import COTStyleWrapper from '@/components/ui/COTStyleWrapper';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COUNTRIES = [
  { country: 'United States', countryCode: 'USA', flag: '🇺🇸' },
  { country: 'European Union', countryCode: 'EUU', flag: '🇪🇺' },
  { country: 'Japan', countryCode: 'JPN', flag: '🇯🇵' },
  { country: 'China', countryCode: 'CHN', flag: '🇨🇳' },
  { country: 'United Kingdom', countryCode: 'GBR', flag: '🇬🇧' },
  { country: 'Germany', countryCode: 'DEU', flag: '🇩🇪' },
  { country: 'France', countryCode: 'FRA', flag: '🇫🇷' },
  { country: 'Canada', countryCode: 'CAN', flag: '🇨🇦' },
  { country: 'Australia', countryCode: 'AUS', flag: '🇦🇺' },
  { country: 'India', countryCode: 'IND', flag: '🇮🇳' },
  { country: 'Thailand', countryCode: 'THA', flag: '🇹🇭' },
];

const EconomicIndicators = () => {
  const [selectedCountry, setSelectedCountry] = useState('United States');
  const [data, setData] = useState<CountryEconomicData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await EconomicDataService.fetchAllCountries();
      setData(results);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching economic data:', err);
      setError('Failed to fetch economic data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const selectedCountryData = data.find(d => d.country === selectedCountry);
  const countryInfo = COUNTRIES.find(c => c.country === selectedCountry);

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-emerald-400';
    if (change < 0) return 'text-red-400';
    return 'text-amber-400';
  };

  const formatValue = (value: number | string | null) => {
    if (value === null) return 'N/A';
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return value;
  };

  const TableContent = () => (
    <div className="space-y-1">
      <div className="grid grid-cols-6 gap-1 text-xs mb-2 text-amber-400 border-b border-green-500/30 pb-2 sticky top-0 bg-background">
        <div>Indicator</div>
        <div className="text-right">Latest</div>
        <div className="text-right">Previous</div>
        <div className="text-right">Highest</div>
        <div className="text-right">Lowest</div>
        <div className="text-right">Date</div>
      </div>
      
      {selectedCountryData?.indicators.map((indicator, index) => (
        <div 
          key={index} 
          className="grid grid-cols-6 gap-1 text-xs py-1.5 border-b border-border/10 hover:bg-accent/50 transition-colors"
        >
          <div className="text-foreground">{indicator.name}</div>
          <div className={`text-right ${getChangeColor(indicator.change)}`}>
            {formatValue(indicator.last)}
            {indicator.unit && <span className="text-muted-foreground text-[10px] ml-1">{indicator.unit}</span>}
          </div>
          <div className="text-muted-foreground text-right">{formatValue(indicator.previous)}</div>
          <div className="text-cyan-400 text-right">{formatValue(indicator.highest)}</div>
          <div className="text-cyan-400 text-right">{formatValue(indicator.lowest)}</div>
          <div className="text-muted-foreground text-right">{indicator.date}</div>
        </div>
      ))}

      {(!selectedCountryData || selectedCountryData.indicators.length === 0) && (
        <div className="text-center py-4 text-muted-foreground">
          No data available for this country
        </div>
      )}
    </div>
  );

  const ChartContent = () => {
    const chartData = selectedCountryData?.indicators.slice(0, 8).map(i => ({
      name: i.name.length > 10 ? i.name.substring(0, 10) + '...' : i.name,
      value: typeof i.last === 'number' ? i.last : 0,
      change: i.change
    })) || [];

    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={80} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            />
            <Bar dataKey="value" name="Value">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.change >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <COTStyleWrapper
      title="ECONOMIC INDICATORS"
      icon="📊"
      lastUpdate={lastUpdate}
      selectOptions={COUNTRIES.map(c => ({ value: c.country, label: `${c.flag} ${c.country}` }))}
      selectedValue={selectedCountry}
      onSelectChange={setSelectedCountry}
      onRefresh={fetchData}
      loading={loading}
      error={error}
      onErrorDismiss={() => setError(null)}
      tabs={[
        {
          id: 'table',
          label: 'Data',
          icon: <Table className="w-3 h-3" />,
          content: <TableContent />
        },
        {
          id: 'chart',
          label: 'Chart',
          icon: <BarChart3 className="w-3 h-3" />,
          content: <ChartContent />
        }
      ]}
      footerLeft={`${countryInfo?.flag || ''} ${selectedCountry}`}
      footerStats={[
        { label: '📊 Indicators', value: selectedCountryData?.indicators.length || 0 }
      ]}
      footerRight={lastUpdate?.toLocaleDateString() || ''}
    />
  );
};

export default EconomicIndicators;
