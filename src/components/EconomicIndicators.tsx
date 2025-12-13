import { useState, useEffect } from 'react';
import { EconomicDataService, CountryEconomicData } from '@/services/EconomicDataService';
import { RefreshCw } from 'lucide-react';

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const results = await EconomicDataService.fetchAllCountries();
      setData(results);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching economic data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Update every 5 minutes (economic data doesn't change frequently)
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const selectedCountryData = data.find(d => d.country === selectedCountry);

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-terminal-green';
    if (change < 0) return 'text-terminal-red';
    return 'text-terminal-amber';
  };

  const formatValue = (value: number | string | null) => {
    if (value === null) return 'N/A';
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return value;
  };

  return (
    <div className="terminal-panel h-full text-[0.4rem] xs:text-[0.5rem] sm:text-[0.6rem] md:text-xs lg:text-sm xl:text-base">
      <div className="panel-header flex items-center justify-between text-[0.5rem] xs:text-[0.6rem] sm:text-[0.7rem] md:text-sm lg:text-base xl:text-lg">
        <div className="flex items-center gap-2">
          <span>ECONOMIC INDICATORS</span>
          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-1 hover:bg-background/50 rounded transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {lastUpdate && (
            <span className="text-[0.5rem] text-terminal-gray">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        <select 
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="bg-background border border-border text-terminal-green text-[0.6rem] sm:text-xs px-1 sm:px-2 py-1"
        >
          {COUNTRIES.map(country => (
            <option key={country.countryCode} value={country.country}>
              {country.flag} {country.country}
            </option>
          ))}
        </select>
      </div>
      
      <div className="panel-content">
        {loading && data.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-terminal-amber">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Loading economic data...
          </div>
        ) : selectedCountryData ? (
          <div className="space-y-1">
            <div className="grid grid-cols-6 gap-1 sm:gap-2 text-[0.6rem] sm:text-xs mb-2 text-terminal-amber border-b border-border pb-1">
              <div>Indicator</div>
              <div className="text-right">Latest</div>
              <div className="text-right">Previous</div>
              <div className="text-right">Highest</div>
              <div className="text-right">Lowest</div>
              <div className="text-right">Date</div>
            </div>
            
            {selectedCountryData.indicators.map((indicator, index) => (
              <div key={index} className="grid grid-cols-6 gap-1 sm:gap-2 text-[0.6rem] sm:text-xs py-1 border-b border-border/20 hover:bg-background/50">
                <div className="text-terminal-white">{indicator.name}</div>
                <div className={`text-right ${getChangeColor(indicator.change)}`}>
                  {formatValue(indicator.last)}
                  {indicator.unit && <span className="text-terminal-gray text-[0.5rem] ml-1">{indicator.unit}</span>}
                </div>
                <div className="text-terminal-gray text-right">
                  {formatValue(indicator.previous)}
                </div>
                <div className="text-terminal-cyan text-right">
                  {formatValue(indicator.highest)}
                </div>
                <div className="text-terminal-cyan text-right">
                  {formatValue(indicator.lowest)}
                </div>
                <div className="text-terminal-gray text-right text-[0.6rem] sm:text-xs">
                  {indicator.date}
                </div>
              </div>
            ))}

            {selectedCountryData.indicators.length === 0 && (
              <div className="text-center py-4 text-terminal-gray">
                No data available for this country
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-terminal-gray">
            Select a country to view economic indicators
          </div>
        )}
      </div>
    </div>
  );
};

export default EconomicIndicators;
