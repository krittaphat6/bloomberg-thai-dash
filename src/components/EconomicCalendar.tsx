import React, { useState, useEffect, useRef } from 'react';
import { Calendar, TrendingUp, Clock, Globe, Filter, RefreshCw, ExternalLink, AlertCircle, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  event: string;
  country: string;
  currency: string;
  importance: 'high' | 'medium' | 'low';
  forecast: string;
  previous: string;
  actual?: string;
  impact: 'positive' | 'negative' | 'neutral';
  category: string;
  source?: string;
  sourceUrl?: string;
}

interface DataSource {
  [key: string]: string;
}

const EconomicCalendar = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EconomicEvent[]>([]);
  const [dataSources, setDataSources] = useState<DataSource>({});
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all');
  const [selectedImportance, setSelectedImportance] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTradingViewWidget, setShowTradingViewWidget] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  const tradingViewRef = useRef<HTMLDivElement>(null);

  // Fetch from backend
  const fetchEconomicData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('economic-calendar', {
        body: { filter: selectedCurrency === 'USD' ? 'us' : 'all' }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setEvents(data.events);
        setFilteredEvents(data.events);
        setDataSources(data.dataSources || {});
        setLastUpdated(data.lastUpdated);
        
        toast({
          title: '✅ อัพเดทข้อมูลแล้ว',
          description: `พบ ${data.events.length} events จากแหล่งข้อมูลรัฐบาล US`
        });
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถดึงข้อมูลได้',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEconomicData();
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initialize TradingView Economic Calendar Widget
  useEffect(() => {
    if (showTradingViewWidget && tradingViewRef.current) {
      tradingViewRef.current.innerHTML = '';
      
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        "width": "100%",
        "height": "400",
        "colorTheme": "dark",
        "isTransparent": true,
        "locale": "en",
        "importanceFilter": "0,1",
        "countryFilter": "us,eu,jp,gb,ca,au,ch"
      });
      
      tradingViewRef.current.appendChild(script);
    }
  }, [showTradingViewWidget]);

  useEffect(() => {
    let filtered = events;
    
    if (selectedCurrency !== 'all') {
      filtered = filtered.filter(event => event.currency === selectedCurrency);
    }
    
    if (selectedImportance !== 'all') {
      filtered = filtered.filter(event => event.importance === selectedImportance);
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(event => event.category === selectedCategory);
    }
    
    setFilteredEvents(filtered);
  }, [events, selectedCurrency, selectedImportance, selectedCategory]);

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getCurrencyFlag = (currency: string) => {
    const flags: { [key: string]: string } = {
      'USD': '🇺🇸',
      'EUR': '🇪🇺',
      'GBP': '🇬🇧',
      'JPY': '🇯🇵',
      'CAD': '🇨🇦',
      'AUD': '🇦🇺',
      'CHF': '🇨🇭'
    };
    return flags[currency] || '🌍';
  };

  const getDateLabel = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Past';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const uniqueCategories = [...new Set(events.map(e => e.category))];

  return (
    <div className="w-full h-full flex flex-col bg-background p-4 space-y-4 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-primary flex items-center gap-2">
              Economic Calendar
              <Badge variant="outline" className="text-[10px] bg-terminal-green/10 text-terminal-green border-terminal-green/30">
                <Database className="h-3 w-3 mr-1" />
                Official Data
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              ข้อมูลจาก BLS, BEA, Fed, Treasury, Census • {currentTime.toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowTradingViewWidget(!showTradingViewWidget)}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            {showTradingViewWidget ? 'Hide' : 'Show'} TV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchEconomicData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Data Sources Info */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        <span className="text-muted-foreground">Official Sources:</span>
        {Object.entries(dataSources).map(([name, url]) => (
          <a 
            key={name}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-terminal-cyan hover:underline"
          >
            {name}
          </a>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="USD">🇺🇸 USD</SelectItem>
            <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
            <SelectItem value="GBP">🇬🇧 GBP</SelectItem>
            <SelectItem value="JPY">🇯🇵 JPY</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedImportance} onValueChange={setSelectedImportance}>
          <SelectTrigger className="w-24 h-8 text-xs">
            <SelectValue placeholder="Impact" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="high">🔴 High</SelectItem>
            <SelectItem value="medium">🟡 Medium</SelectItem>
            <SelectItem value="low">🟢 Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <span className="text-xs text-muted-foreground ml-2">
          {filteredEvents.length} events
        </span>
      </div>

      {/* TradingView Widget */}
      {showTradingViewWidget && (
        <Card className="flex-shrink-0">
          <CardHeader className="py-2">
            <CardTitle className="flex items-center gap-2 text-sm text-primary">
              <TrendingUp className="h-4 w-4" />
              TradingView Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div ref={tradingViewRef} className="w-full min-h-[400px]" />
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-2">
          {filteredEvents.map((event) => {
            const dateLabel = getDateLabel(event.date);
            const isToday = dateLabel === 'Today';
            const isPast = dateLabel === 'Past';
            
            return (
              <Card 
                key={event.id} 
                className={`transition-all duration-200 hover:shadow-lg border-l-4 ${
                  event.importance === 'high' ? 'border-l-red-500' :
                  event.importance === 'medium' ? 'border-l-amber-500' : 'border-l-green-500'
                } ${isPast ? 'opacity-60' : ''} ${isToday ? 'bg-primary/5' : ''}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-lg">{getCurrencyFlag(event.currency)}</span>
                        <Badge className={`text-[10px] ${getImportanceColor(event.importance)}`}>
                          {event.importance.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {event.category}
                        </Badge>
                        {event.source && (
                          <Badge variant="outline" className="text-[10px] bg-terminal-cyan/10 text-terminal-cyan">
                            {event.source}
                          </Badge>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {event.event}
                      </h3>
                      
                      <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {event.time} ET
                        </span>
                        <span>{dateLabel}</span>
                        <span>Prev: {event.previous}</span>
                        <span>Forecast: {event.forecast}</span>
                        {event.actual && (
                          <span className="text-terminal-green font-bold">
                            Actual: {event.actual}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {event.sourceUrl && (
                      <a 
                        href={event.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-terminal-cyan hover:text-terminal-cyan/80"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {filteredEvents.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No events found</p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Footer */}
      {lastUpdated && (
        <div className="text-[10px] text-muted-foreground text-center">
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default EconomicCalendar;
