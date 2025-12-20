import { useState } from 'react';
import { Globe, DollarSign, Calendar, Table } from 'lucide-react';
import COTStyleWrapper from '@/components/ui/COTStyleWrapper';

const ForexEconomicData = () => {
  const [activeTab, setActiveTab] = useState('forex');
  const [loading, setLoading] = useState(false);
  const [lastUpdate] = useState(new Date());

  const refreshData = () => {
    setLoading(true);
    const iframes = document.querySelectorAll('.forex-iframe') as NodeListOf<HTMLIFrameElement>;
    iframes.forEach(iframe => {
      iframe.src = iframe.src;
    });
    setTimeout(() => setLoading(false), 2000);
  };

  const ForexContent = () => (
    <div className="h-full min-h-[400px]">
      <iframe
        className="w-full h-full border border-green-500/30 rounded bg-background forex-iframe"
        src="https://www.forexfactory.com/calendar"
        title="Forex Factory Live Rates"
        allow="fullscreen"
        style={{ minHeight: '400px' }}
      />
    </div>
  );

  const CalendarContent = () => (
    <div className="h-full min-h-[400px]">
      <iframe
        className="w-full h-full border border-green-500/30 rounded bg-background forex-iframe"
        src="https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&features=datepicker,timezone,timeselector,filters&countries=5,25,54,145,36,110,178,113,107,55,24,59,89,22,17,51,39,14,10,35,92,57,4,12&calType=week&timeZone=15&lang=1"
        title="Economic Calendar"
        allow="fullscreen"
        style={{ minHeight: '400px' }}
      />
    </div>
  );

  const CommoditiesContent = () => (
    <div className="h-full min-h-[400px]">
      <iframe
        className="w-full h-full border border-green-500/30 rounded bg-background forex-iframe"
        src="https://www.investing.com/commodities/"
        title="Commodities Live Prices"
        allow="fullscreen"
        style={{ minHeight: '400px' }}
      />
    </div>
  );

  return (
    <COTStyleWrapper
      title="FOREX & ECONOMIC DATA"
      icon="🌍"
      lastUpdate={lastUpdate}
      onRefresh={refreshData}
      loading={loading}
      tabs={[
        {
          id: 'forex',
          label: 'Forex Pairs',
          icon: <DollarSign className="w-3 h-3" />,
          content: <ForexContent />
        },
        {
          id: 'calendar',
          label: 'Economic Calendar',
          icon: <Calendar className="w-3 h-3" />,
          content: <CalendarContent />
        },
        {
          id: 'commodities',
          label: 'Commodities',
          icon: <Globe className="w-3 h-3" />,
          content: <CommoditiesContent />
        }
      ]}
      footerLeft="Global Markets Hub"
      footerStats={[
        { label: '💱 Forex', value: 'Live' },
        { label: '📅 Events', value: 'Live' },
        { label: '🥇 Commodities', value: 'Live' }
      ]}
      footerRight={lastUpdate.toLocaleDateString()}
    />
  );
};

export default ForexEconomicData;
