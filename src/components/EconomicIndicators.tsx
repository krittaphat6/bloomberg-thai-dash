import { useState, useEffect } from 'react';

interface IndicatorData {
  name: string;
  last: number | string;
  previous: number | string;
  highest: number | string;
  lowest: number | string;
  unit: string;
  date: string;
  change: number;
}

interface CountryData {
  country: string;
  flag: string;
  indicators: IndicatorData[];
}

const EconomicIndicators = () => {
  const [selectedCountry, setSelectedCountry] = useState('United States');
  const [data, setData] = useState<CountryData[]>([]);

  useEffect(() => {
    const generateEconomicData = (): CountryData[] => {
      const countries = [
        { country: 'United States', flag: '🇺🇸' },
        { country: 'European Union', flag: '🇪🇺' },
        { country: 'Japan', flag: '🇯🇵' },
        { country: 'China', flag: '🇨🇳' },
        { country: 'United Kingdom', flag: '🇬🇧' },
        { country: 'Germany', flag: '🇩🇪' },
        { country: 'France', flag: '🇫🇷' },
        { country: 'Canada', flag: '🇨🇦' },
        { country: 'Australia', flag: '🇦🇺' },
        { country: 'India', flag: '🇮🇳' },
      ];

      return countries.map(country => ({
        ...country,
        indicators: [
          {
            name: 'Currency',
            last: country.country === 'United States' ? 98.69 : (95 + Math.random() * 10).toFixed(2),
            previous: country.country === 'United States' ? 99.97 : (94 + Math.random() * 10).toFixed(2),
            highest: country.country === 'United States' ? 165 : (150 + Math.random() * 20).toFixed(0),
            lowest: country.country === 'United States' ? 70.7 : (65 + Math.random() * 15).toFixed(1),
            unit: '',
            date: 'Aug/25',
            change: -0.3 + Math.random() * 0.6
          },
          {
            name: 'Stock Market',
            last: country.country === 'United States' ? 6238 : Math.floor(2000 + Math.random() * 4000),
            previous: country.country === 'United States' ? 6339 : Math.floor(2100 + Math.random() * 4000),
            highest: country.country === 'United States' ? 6427 : Math.floor(6000 + Math.random() * 1000),
            lowest: 4.4,
            unit: 'points',
            date: 'Aug/25',
            change: -1.6 + Math.random() * 3.2
          },
          {
            name: 'GDP Growth Rate',
            last: country.country === 'United States' ? 3 : (1 + Math.random() * 4).toFixed(1),
            previous: country.country === 'United States' ? -0.5 : (-1 + Math.random() * 2).toFixed(1),
            highest: country.country === 'United States' ? 35.2 : (25 + Math.random() * 15).toFixed(1),
            lowest: country.country === 'United States' ? -28.1 : (-30 + Math.random() * 10).toFixed(1),
            unit: 'percent',
            date: 'Jun/25',
            change: 0.5 + Math.random() * 2
          },
          {
            name: 'GDP Annual Growth Rate',
            last: country.country === 'United States' ? 2 : (1.5 + Math.random() * 3).toFixed(1),
            previous: country.country === 'United States' ? 2 : (1.2 + Math.random() * 3).toFixed(1),
            highest: country.country === 'United States' ? 13.4 : (10 + Math.random() * 8).toFixed(1),
            lowest: country.country === 'United States' ? -7.5 : (-10 + Math.random() * 5).toFixed(1),
            unit: 'percent',
            date: 'Jun/25',
            change: -0.2 + Math.random() * 0.8
          },
          {
            name: 'Unemployment Rate',
            last: country.country === 'United States' ? 4.2 : (3 + Math.random() * 8).toFixed(1),
            previous: country.country === 'United States' ? 4.1 : (3.2 + Math.random() * 7).toFixed(1),
            highest: country.country === 'United States' ? 14.9 : (12 + Math.random() * 8).toFixed(1),
            lowest: country.country === 'United States' ? 2.5 : (2 + Math.random() * 3).toFixed(1),
            unit: 'percent',
            date: 'Jul/25',
            change: 0.05 + Math.random() * 0.3
          },
          {
            name: 'Inflation Rate',
            last: country.country === 'United States' ? 2.7 : (1.5 + Math.random() * 4).toFixed(1),
            previous: country.country === 'United States' ? 2.4 : (1.8 + Math.random() * 3).toFixed(1),
            highest: country.country === 'United States' ? 23.7 : (15 + Math.random() * 12).toFixed(1),
            lowest: country.country === 'United States' ? -15.8 : (-10 + Math.random() * 8).toFixed(1),
            unit: 'percent',
            date: 'Jun/25',
            change: 0.2 + Math.random() * 0.5
          },
          {
            name: 'Interest Rate',
            last: country.country === 'United States' ? 4.5 : (2 + Math.random() * 5).toFixed(1),
            previous: country.country === 'United States' ? 4.5 : (2.2 + Math.random() * 4.5).toFixed(1),
            highest: country.country === 'United States' ? 20 : (15 + Math.random() * 8).toFixed(0),
            lowest: country.country === 'United States' ? 0.25 : (0.1 + Math.random() * 1).toFixed(2),
            unit: 'percent',
            date: 'Jul/25',
            change: -0.1 + Math.random() * 0.3
          },
          {
            name: 'Balance of Trade',
            last: country.country === 'United States' ? -71.52 : (-50 + Math.random() * 100).toFixed(2),
            previous: country.country === 'United States' ? -60.26 : (-45 + Math.random() * 90).toFixed(2),
            highest: country.country === 'United States' ? 1.95 : (-5 + Math.random() * 25).toFixed(2),
            lowest: country.country === 'United States' ? -138 : (-150 + Math.random() * 50).toFixed(0),
            unit: 'USD Billion',
            date: 'May/25',
            change: -10 + Math.random() * 20
          },
          {
            name: 'Business Confidence',
            last: country.country === 'United States' ? 48 : Math.floor(40 + Math.random() * 30),
            previous: country.country === 'United States' ? 49 : Math.floor(42 + Math.random() * 28),
            highest: country.country === 'United States' ? 77.5 : Math.floor(70 + Math.random() * 20),
            lowest: country.country === 'United States' ? 29.4 : Math.floor(25 + Math.random() * 15),
            unit: 'points',
            date: 'Jul/25',
            change: -1 + Math.random() * 4
          },
          {
            name: 'Manufacturing PMI',
            last: country.country === 'United States' ? 49.8 : (45 + Math.random() * 15).toFixed(1),
            previous: country.country === 'United States' ? 52 : (46 + Math.random() * 14).toFixed(1),
            highest: country.country === 'United States' ? 63.4 : (58 + Math.random() * 12).toFixed(1),
            lowest: country.country === 'United States' ? 36.1 : (32 + Math.random() * 10).toFixed(1),
            unit: 'points',
            date: 'Jul/25',
            change: -2 + Math.random() * 5
          }
        ]
      }));
    };

    setData(generateEconomicData());

    const interval = setInterval(() => {
      setData(prevData => 
        prevData.map(countryData => ({
          ...countryData,
          indicators: countryData.indicators.map(indicator => ({
            ...indicator,
            last: typeof indicator.last === 'number' 
              ? +(Number(indicator.last) + (-0.5 + Math.random())).toFixed(2)
              : indicator.last,
            change: -1 + Math.random() * 2
          }))
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const selectedCountryData = data.find(d => d.country === selectedCountry);

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-terminal-green';
    if (change < 0) return 'text-terminal-red';
    return 'text-terminal-amber';
  };

  const formatValue = (value: number | string) => {
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return value;
  };

  return (
    <div className="terminal-panel h-full text-[0.4rem] xs:text-[0.5rem] sm:text-[0.6rem] md:text-xs lg:text-sm xl:text-base">
      <div className="panel-header flex items-center justify-between text-[0.5rem] xs:text-[0.6rem] sm:text-[0.7rem] md:text-sm lg:text-base xl:text-lg">
        <span>ECONOMIC INDICATORS</span>
        <select 
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="bg-background border border-border text-terminal-green text-[0.6rem] sm:text-xs px-1 sm:px-2 py-1"
        >
          {data.map(country => (
            <option key={country.country} value={country.country}>
              {country.flag} {country.country}
            </option>
          ))}
        </select>
      </div>
      
      <div className="panel-content">
        {selectedCountryData && (
          <div className="space-y-1">
            <div className="grid grid-cols-6 gap-1 sm:gap-2 text-[0.6rem] sm:text-xs mb-2 text-terminal-amber border-b border-border pb-1">
              <div>Indicator</div>
              <div className="text-right">Last</div>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default EconomicIndicators;