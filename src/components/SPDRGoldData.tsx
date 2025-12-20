import { useState, useEffect } from 'react';
import { GoldDataService, goldDataService, GoldData, CentralBankData } from '@/services/GoldDataService';
import { RefreshCw, Table, BarChart3, Globe } from 'lucide-react';
import { COTStyleWrapper } from '@/components/ui/COTStyleWrapper';
import { ScrollArea } from '@/components/ui/scroll-area';

const SPDRGoldData = () => {
  const [goldData, setGoldData] = useState<GoldData[]>([]);
  const [centralBankData, setCentralBankData] = useState<CentralBankData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prices, centralBanks] = await Promise.all([
        GoldDataService.fetchGLDData(),
        GoldDataService.fetchCentralBankHoldings()
      ]);
      setGoldData(prices);
      setCentralBankData(centralBanks);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Error fetching gold data:', err);
      setError(err.message || 'Failed to fetch gold data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-amber-400';
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const latestGoldData = goldData[goldData.length - 1];

  // SPDR Holdings Content
  const SPDRContent = () => (
    <div className="space-y-3">
      {latestGoldData && (
        <>
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2 rounded border border-border bg-background/50">
              <div className="text-[10px] text-amber-400">Gold Price (USD)</div>
              <div className="text-sm font-bold text-foreground">${latestGoldData.priceUSD.toFixed(2)}</div>
              <div className={`text-[10px] ${getChangeColor(latestGoldData.changePercent)}`}>
                {latestGoldData.changePercent >= 0 ? '+' : ''}{latestGoldData.changePercent.toFixed(2)}%
              </div>
            </div>
            <div className="p-2 rounded border border-border bg-background/50">
              <div className="text-[10px] text-amber-400">Price (EUR)</div>
              <div className="text-sm font-bold text-foreground">€{latestGoldData.priceEUR.toFixed(2)}</div>
            </div>
            <div className="p-2 rounded border border-border bg-background/50">
              <div className="text-[10px] text-amber-400">Price (GBP)</div>
              <div className="text-sm font-bold text-foreground">£{latestGoldData.priceGBP.toFixed(2)}</div>
            </div>
            <div className="p-2 rounded border border-border bg-background/50">
              <div className="text-[10px] text-amber-400">Volume</div>
              <div className="text-sm font-bold text-foreground">{formatNumber(latestGoldData.volume)}</div>
            </div>
          </div>

          <ScrollArea className="h-48">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background border-b border-green-500/30">
                <tr className="text-amber-400">
                  <th className="text-left py-1 px-2">Date</th>
                  <th className="text-right py-1 px-2">USD</th>
                  <th className="text-right py-1 px-2">EUR</th>
                  <th className="text-right py-1 px-2">GBP</th>
                  <th className="text-right py-1 px-2">Change</th>
                </tr>
              </thead>
              <tbody>
                {goldData.slice(-10).reverse().map((item, index) => (
                  <tr key={index} className="border-b border-border/10 hover:bg-accent/50">
                    <td className="py-1 px-2 text-foreground">{item.date}</td>
                    <td className="py-1 px-2 text-right text-cyan-400">${item.priceUSD.toFixed(2)}</td>
                    <td className="py-1 px-2 text-right text-muted-foreground">€{item.priceEUR.toFixed(2)}</td>
                    <td className="py-1 px-2 text-right text-muted-foreground">£{item.priceGBP.toFixed(2)}</td>
                    <td className={`py-1 px-2 text-right ${getChangeColor(item.changePercent)}`}>
                      {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </>
      )}
    </div>
  );

  // Central Bank Content
  const CentralBankContent = () => (
    <ScrollArea className="h-64">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-background border-b border-green-500/30">
          <tr className="text-amber-400">
            <th className="text-left py-1 px-2">Country</th>
            <th className="text-right py-1 px-2">Reserves (t)</th>
            <th className="text-right py-1 px-2">Change</th>
            <th className="text-right py-1 px-2">Value (M)</th>
            <th className="text-right py-1 px-2">% Reserves</th>
          </tr>
        </thead>
        <tbody>
          {centralBankData.map((country, index) => (
            <tr key={index} className="border-b border-border/10 hover:bg-accent/50">
              <td className="py-1 px-2 text-foreground">
                <span className="mr-1">{country.flag}</span>
                {country.country}
              </td>
              <td className="py-1 px-2 text-right text-cyan-400 font-medium">{formatNumber(country.goldReserves)}</td>
              <td className={`py-1 px-2 text-right font-medium ${getChangeColor(country.monthlyChange)}`}>
                {country.monthlyChange >= 0 ? '+' : ''}{country.monthlyChange}
              </td>
              <td className="py-1 px-2 text-right text-foreground">{formatNumber(Math.round(country.totalValue))}</td>
              <td className="py-1 px-2 text-right text-muted-foreground">{country.percentOfReserves}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );

  // Historical Content
  const HistoricalContent = () => (
    <ScrollArea className="h-64">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-background border-b border-green-500/30">
          <tr className="text-amber-400">
            <th className="text-left py-1 px-2">Date</th>
            <th className="text-right py-1 px-2">USD</th>
            <th className="text-right py-1 px-2">EUR</th>
            <th className="text-right py-1 px-2">GBP</th>
            <th className="text-right py-1 px-2">Change</th>
          </tr>
        </thead>
        <tbody>
          {goldData.map((item, index) => (
            <tr key={index} className="border-b border-border/10 hover:bg-accent/50">
              <td className="py-1 px-2 text-foreground">{item.date}</td>
              <td className="py-1 px-2 text-right text-cyan-400">${item.priceUSD.toFixed(2)}</td>
              <td className="py-1 px-2 text-right text-muted-foreground">€{item.priceEUR.toFixed(2)}</td>
              <td className="py-1 px-2 text-right text-muted-foreground">£{item.priceGBP.toFixed(2)}</td>
              <td className={`py-1 px-2 text-right ${getChangeColor(item.changePercent)}`}>
                {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );

  return (
    <COTStyleWrapper
      title="GOLD MARKET DATA"
      icon="🥇"
      lastUpdate={lastUpdate}
      onRefresh={fetchData}
      loading={loading}
      error={error}
      onErrorDismiss={() => setError(null)}
      tabs={[
        {
          id: 'spdr',
          label: 'SPDR GLD',
          icon: <Table className="w-3 h-3" />,
          content: <SPDRContent />
        },
        {
          id: 'centralbanks',
          label: 'Central Banks',
          icon: <Globe className="w-3 h-3" />,
          content: <CentralBankContent />
        },
        {
          id: 'historical',
          label: 'Historical',
          icon: <BarChart3 className="w-3 h-3" />,
          content: <HistoricalContent />
        }
      ]}
      footerLeft={`Total: ${goldData.length} records`}
      footerStats={[
        { label: '💰 Price', value: latestGoldData ? `$${latestGoldData.priceUSD.toFixed(2)}` : '-' },
        { label: '📊 Change', value: latestGoldData ? `${latestGoldData.changePercent >= 0 ? '+' : ''}${latestGoldData.changePercent.toFixed(2)}%` : '-' }
      ]}
    />
  );
};

export default SPDRGoldData;
