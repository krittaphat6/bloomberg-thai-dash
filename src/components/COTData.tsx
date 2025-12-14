import { useState, useEffect } from 'react';
import { RefreshCw, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface COTPosition {
  asset: string;
  exchange: string;
  commercialLong: number;
  commercialShort: number;
  commercialNet: number;
  nonCommercialLong: number;
  nonCommercialShort: number;
  nonCommercialNet: number;
  nonReportableLong: number;
  nonReportableShort: number;
  nonReportableNet: number;
  openInterest: number;
  change: number;
  changeInOI: number;
  date: string;
  category: string;
}

const COTData = () => {
  const [cotData, setCOTData] = useState<COTPosition[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'futures' | 'combined' | 'disaggregated'>('futures');
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCFTCData = async (reportType: 'futures' | 'combined' | 'disaggregated') => {
    setLoading(true);
    setError(null);

    try {
      const datasets = {
        futures: 'jun7-fc8e',
        combined: '6dca-aqww',
        disaggregated: '72hh-3qpy'
      };

      const dataset = datasets[reportType];
      const apiUrl = `https://publicreporting.cftc.gov/resource/${dataset}.json?$order=report_date_as_yyyy_mm_dd DESC&$limit=100`;

      console.log('Fetching from:', apiUrl);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`CFTC API Error: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        throw new Error('No data received from CFTC');
      }

      const assetMap = new Map<string, any>();
      
      data.forEach((item: any) => {
        const assetName = item.market_and_exchange_names;
        if (!assetMap.has(assetName)) {
          assetMap.set(assetName, item);
        }
      });

      const positions: COTPosition[] = Array.from(assetMap.values()).map((item: any) => {
        const commLong = parseInt(item.comm_positions_long_all || item.prod_merc_positions_long_all || 0);
        const commShort = parseInt(item.comm_positions_short_all || item.prod_merc_positions_short_all || 0);
        const nonCommLong = parseInt(item.noncomm_positions_long_all || item.m_money_positions_long_all || 0);
        const nonCommShort = parseInt(item.noncomm_positions_short_all || item.m_money_positions_short_all || 0);
        const nonReptLong = parseInt(item.nonrept_positions_long_all || item.other_rept_positions_long_all || 0);
        const nonReptShort = parseInt(item.nonrept_positions_short_all || item.other_rept_positions_short_all || 0);

        let category = 'Other';
        const assetName = item.market_and_exchange_names.toUpperCase();
        
        if (assetName.includes('DOLLAR') || assetName.includes('EURO') || assetName.includes('YEN') || 
            assetName.includes('POUND') || assetName.includes('FRANC') || assetName.includes('PESO') ||
            assetName.includes('REAL')) {
          category = 'Currency';
        } else if (assetName.includes('GOLD') || assetName.includes('SILVER') || assetName.includes('COPPER') || 
                   assetName.includes('PLATINUM') || assetName.includes('PALLADIUM') || assetName.includes('OIL') || 
                   assetName.includes('GAS') || assetName.includes('GASOLINE')) {
          category = 'Commodity';
        } else if (assetName.includes('S&P') || assetName.includes('DOW') || assetName.includes('NASDAQ') || 
                   assetName.includes('RUSSELL') || assetName.includes('NIKKEI') || assetName.includes('INDEX')) {
          category = 'Index';
        } else if (assetName.includes('WHEAT') || assetName.includes('CORN') || assetName.includes('SOYBEAN') || 
                   assetName.includes('COTTON') || assetName.includes('SUGAR') || assetName.includes('COFFEE') ||
                   assetName.includes('COCOA') || assetName.includes('CATTLE') || assetName.includes('HOG')) {
          category = 'Agriculture';
        }

        return {
          asset: item.market_and_exchange_names,
          exchange: extractExchange(item.market_and_exchange_names),
          commercialLong: commLong,
          commercialShort: commShort,
          commercialNet: commLong - commShort,
          nonCommercialLong: nonCommLong,
          nonCommercialShort: nonCommShort,
          nonCommercialNet: nonCommLong - nonCommShort,
          nonReportableLong: nonReptLong,
          nonReportableShort: nonReptShort,
          nonReportableNet: nonReptLong - nonReptShort,
          openInterest: parseInt(item.open_interest_all || 0),
          change: parseFloat(item.change_in_comm_long_all || item.change_in_prod_merc_long_all || 0),
          changeInOI: parseFloat(item.change_in_open_interest_all || 0),
          date: item.report_date_as_yyyy_mm_dd,
          category
        };
      });

      positions.sort((a, b) => {
        if (a.category !== b.category) {
          const order = ['Currency', 'Commodity', 'Index', 'Agriculture', 'Other'];
          return order.indexOf(a.category) - order.indexOf(b.category);
        }
        return a.asset.localeCompare(b.asset);
      });

      setCOTData(positions);
      setLastUpdate(new Date());
      
      console.log(`✅ Loaded ${positions.length} COT positions`);

    } catch (err) {
      console.error('COT fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load COT data');
    } finally {
      setLoading(false);
    }
  };

  const extractExchange = (assetName: string): string => {
    if (assetName.includes('CHICAGO MERCANTILE')) return 'CME';
    if (assetName.includes('CHICAGO BOARD')) return 'CBOT';
    if (assetName.includes('NEW YORK MERCANTILE')) return 'NYMEX';
    if (assetName.includes('COMMODITY EXCHANGE')) return 'COMEX';
    if (assetName.includes('ICE')) return 'ICE';
    return 'OTHER';
  };

  useEffect(() => {
    fetchCFTCData(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCFTCData(selectedCategory);
    }, 3600000);

    return () => clearInterval(interval);
  }, [selectedCategory]);

  const formatNumber = (num: number) => num.toLocaleString();

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-amber-400';
  };

  const getNetColor = (net: number) => {
    return net >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const exportCSV = () => {
    const headers = [
      'Category', 'Asset', 'Exchange', 'Date',
      'Comm Long', 'Comm Short', 'Comm Net',
      'Large Long', 'Large Short', 'Large Net',
      'Small Long', 'Small Short', 'Small Net',
      'Open Interest', 'OI Change', 'Change %'
    ];

    const rows = cotData.map(d => [
      d.category,
      `"${d.asset}"`,
      d.exchange,
      d.date,
      d.commercialLong,
      d.commercialShort,
      d.commercialNet,
      d.nonCommercialLong,
      d.nonCommercialShort,
      d.nonCommercialNet,
      d.nonReportableLong,
      d.nonReportableShort,
      d.nonReportableNet,
      d.openInterest,
      d.changeInOI,
      d.change.toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `COT_${selectedCategory}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col text-xs bg-background p-2">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-green-500/30">
        <div className="flex flex-col">
          <span className="font-bold text-green-400">📋 COT REPORT - COMMITMENT OF TRADERS</span>
          {lastUpdate && (
            <span className="text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdate.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="bg-background border border-border text-green-400 text-xs px-2 py-1 rounded"
            disabled={loading}
          >
            <option value="futures">📊 Futures Only</option>
            <option value="combined">📈 Futures & Options</option>
            <option value="disaggregated">🔬 Disaggregated</option>
          </select>

          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchCFTCData(selectedCategory)}
            disabled={loading}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={exportCSV}
            disabled={loading || cotData.length === 0}
          >
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-2 mb-2 flex items-center gap-2 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-green-400" />
          <span className="ml-2 text-green-400">Loading COT data from CFTC...</span>
        </div>
      )}

      {/* Data Table */}
      {!loading && cotData.length > 0 && (
        <div className="flex-1 overflow-auto mt-2">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-background border-b border-green-500/30 z-10">
              <tr>
                <th className="text-left py-2 px-2 text-amber-400">Category</th>
                <th className="text-left py-2 px-2 text-amber-400">Asset</th>
                <th className="text-left py-2 px-2 text-amber-400">Exchange</th>
                <th className="text-right py-2 px-2 text-amber-400">Comm Long</th>
                <th className="text-right py-2 px-2 text-amber-400">Comm Short</th>
                <th className="text-right py-2 px-2 text-amber-400">Comm Net</th>
                <th className="text-right py-2 px-2 text-amber-400">Large Long</th>
                <th className="text-right py-2 px-2 text-amber-400">Large Short</th>
                <th className="text-right py-2 px-2 text-amber-400">Large Net</th>
                <th className="text-right py-2 px-2 text-amber-400">Small Net</th>
                <th className="text-right py-2 px-2 text-amber-400">Open Int</th>
                <th className="text-right py-2 px-2 text-amber-400">OI Δ</th>
                <th className="text-right py-2 px-2 text-amber-400">Change %</th>
              </tr>
            </thead>
            <tbody>
              {cotData.map((item, i) => (
                <tr
                  key={i}
                  className="border-b border-border/10 hover:bg-accent/50 transition-colors"
                >
                  <td className="py-2 px-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        item.category === 'Currency' ? 'bg-blue-500/20 text-blue-400' :
                        item.category === 'Commodity' ? 'bg-amber-500/20 text-amber-400' :
                        item.category === 'Index' ? 'bg-purple-500/20 text-purple-400' :
                        item.category === 'Agriculture' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {item.category}
                    </span>
                  </td>

                  <td className="py-2 px-2 text-foreground font-medium max-w-xs truncate" title={item.asset}>
                    {item.asset.split(' - ')[0]}
                  </td>

                  <td className="py-2 px-2 text-muted-foreground">{item.exchange}</td>

                  <td className="text-right py-2 px-2 text-cyan-400">
                    {formatNumber(item.commercialLong)}
                  </td>
                  <td className="text-right py-2 px-2 text-cyan-400">
                    {formatNumber(item.commercialShort)}
                  </td>
                  <td className={`text-right py-2 px-2 font-bold ${getNetColor(item.commercialNet)}`}>
                    {item.commercialNet >= 0 ? '+' : ''}{formatNumber(item.commercialNet)}
                  </td>

                  <td className="text-right py-2 px-2 text-blue-400">
                    {formatNumber(item.nonCommercialLong)}
                  </td>
                  <td className="text-right py-2 px-2 text-blue-400">
                    {formatNumber(item.nonCommercialShort)}
                  </td>
                  <td className={`text-right py-2 px-2 font-bold ${getNetColor(item.nonCommercialNet)}`}>
                    {item.nonCommercialNet >= 0 ? '+' : ''}{formatNumber(item.nonCommercialNet)}
                  </td>

                  <td className={`text-right py-2 px-2 font-bold ${getNetColor(item.nonReportableNet)}`}>
                    {item.nonReportableNet >= 0 ? '+' : ''}{formatNumber(item.nonReportableNet)}
                  </td>

                  <td className="text-right py-2 px-2 text-muted-foreground">
                    {formatNumber(item.openInterest)}
                  </td>

                  <td className={`text-right py-2 px-2 ${getChangeColor(item.changeInOI)}`}>
                    {item.changeInOI >= 0 ? '+' : ''}{formatNumber(item.changeInOI)}
                  </td>

                  <td className={`text-right py-2 px-2 font-bold ${getChangeColor(item.change)}`}>
                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats Footer */}
      {!loading && cotData.length > 0 && (
        <div className="border-t border-green-500/30 pt-2 mt-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Total Assets: {cotData.length}</span>
            <span>
              📊 Currency: {cotData.filter(d => d.category === 'Currency').length} | 
              💎 Commodity: {cotData.filter(d => d.category === 'Commodity').length} | 
              📈 Index: {cotData.filter(d => d.category === 'Index').length} | 
              🌾 Agriculture: {cotData.filter(d => d.category === 'Agriculture').length}
            </span>
            <span>Report Date: {cotData[0]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default COTData;
