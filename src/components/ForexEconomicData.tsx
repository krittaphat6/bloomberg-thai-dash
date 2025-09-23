import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Globe, Calendar, DollarSign } from 'lucide-react';

const ForexEconomicData = () => {
  const [activeTab, setActiveTab] = useState('forex');
  const [loading, setLoading] = useState(false);

  const refreshData = () => {
    setLoading(true);
    const iframes = document.querySelectorAll('.forex-iframe') as NodeListOf<HTMLIFrameElement>;
    iframes.forEach(iframe => {
      iframe.src = iframe.src;
    });
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <Card className="w-full h-full bg-card border-terminal-green/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-terminal-green">
            <Globe className="h-5 w-5" />
            FOREX & ECONOMIC DATA - Global Markets Hub
          </CardTitle>
          <Button
            onClick={refreshData}
            size="sm"
            variant="outline"
            className="border-terminal-green text-terminal-green hover:bg-terminal-green/10"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="text-xs text-terminal-amber">
          Major currency pairs • Economic calendar • Central bank rates • Commodity prices
        </div>
      </CardHeader>
      <CardContent className="h-full p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 bg-background border-terminal-green/30">
            <TabsTrigger value="forex" className="text-terminal-green data-[state=active]:bg-terminal-green data-[state=active]:text-black">
              Forex Pairs
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-terminal-green data-[state=active]:bg-terminal-green data-[state=active]:text-black">
              Economic Calendar
            </TabsTrigger>
            <TabsTrigger value="commodities" className="text-terminal-green data-[state=active]:bg-terminal-green data-[state=active]:text-black">
              Commodities
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="forex" className="flex-1 mt-0">
            <div className="h-full flex flex-col">
              <iframe
                className="flex-1 w-full border border-terminal-green/30 rounded bg-background forex-iframe"
                src="https://www.forexfactory.com/calendar"
                title="Forex Factory Live Rates"
                allow="fullscreen"
                style={{ minHeight: '500px' }}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="calendar" className="flex-1 mt-0">
            <div className="h-full flex flex-col">
              <iframe
                className="flex-1 w-full border border-terminal-green/30 rounded bg-background forex-iframe"
                src="https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&features=datepicker,timezone,timeselector,filters&countries=5,25,54,145,36,110,178,113,107,55,24,59,89,22,17,51,39,14,10,35,92,57,4,12&calType=week&timeZone=15&lang=1"
                title="Economic Calendar"
                allow="fullscreen"
                style={{ minHeight: '500px' }}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="commodities" className="flex-1 mt-0">
            <div className="h-full flex flex-col">
              <iframe
                className="flex-1 w-full border border-terminal-green/30 rounded bg-background forex-iframe"
                src="https://www.investing.com/commodities/"
                title="Commodities Live Prices"
                allow="fullscreen"
                style={{ minHeight: '500px' }}
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="p-4 text-xs text-terminal-green bg-card border-t border-terminal-green/30">
          🌍 Global markets • 📅 Economic events • 💱 Live forex rates • 🥇 Commodity prices
        </div>
      </CardContent>
    </Card>
  );
};

export default ForexEconomicData;