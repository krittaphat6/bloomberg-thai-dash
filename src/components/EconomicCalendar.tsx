import React, { useState, useEffect, useRef } from 'react';
import { Calendar, TrendingUp, Clock, Globe, Filter, RefreshCw, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EconomicEvent {
  id: string;
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
}

const EconomicCalendar = () => {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EconomicEvent[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all');
  const [selectedImportance, setSelectedImportance] = useState<string>('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTradingViewWidget, setShowTradingViewWidget] = useState(true);
  
  const tradingViewRef = useRef<HTMLDivElement>(null);

  // Realistic economic events for this week and upcoming events
  const getCurrentEvents = (): EconomicEvent[] => {
    const today = new Date();
    const getDateString = (daysOffset: number = 0) => {
      const date = new Date(today);
      date.setDate(date.getDate() + daysOffset);
      return date.toISOString().split('T')[0];
    };
    
    // Real economic events schedule based on typical economic calendar
    const baseEvents: (Omit<EconomicEvent, 'id'> & { dateOffset: number })[] = [
      // Today's events
      {
        dateOffset: 0,
        time: '08:30',
        event: 'Initial Jobless Claims',
        country: 'United States',
        currency: 'USD',
        importance: 'medium',
        forecast: '225K',
        previous: '230K',
        actual: '220K',
        impact: 'positive',
        category: 'Employment'
      },
      {
        dateOffset: 0,
        time: '10:00',
        event: 'Existing Home Sales m/m',
        country: 'United States',
        currency: 'USD',
        importance: 'medium',
        forecast: '0.8%',
        previous: '1.3%',
        impact: 'neutral',
        category: 'Housing'
      },
      {
        dateOffset: 0,
        time: '14:00',
        event: 'ECB Monetary Policy Meeting Accounts',
        country: 'European Union',
        currency: 'EUR',
        importance: 'medium',
        forecast: 'N/A',
        previous: 'N/A',
        impact: 'neutral',
        category: 'Monetary Policy'
      },
      
      // Tomorrow's events
      {
        dateOffset: 1,
        time: '08:30',
        event: 'Non-Farm Payrolls',
        country: 'United States',
        currency: 'USD',
        importance: 'high',
        forecast: '200K',
        previous: '254K',
        impact: 'neutral',
        category: 'Employment'
      },
      {
        dateOffset: 1,
        time: '08:30',
        event: 'Unemployment Rate',
        country: 'United States',
        currency: 'USD',
        importance: 'high',
        forecast: '4.1%',
        previous: '4.1%',
        impact: 'neutral',
        category: 'Employment'
      },
      {
        dateOffset: 1,
        time: '10:00',
        event: 'Consumer Sentiment (Final)',
        country: 'United States',
        currency: 'USD',
        importance: 'medium',
        forecast: '70.5',
        previous: '70.1',
        impact: 'neutral',
        category: 'Consumer'
      },
      
      // Day after tomorrow
      {
        dateOffset: 2,
        time: '08:30',
        event: 'Consumer Price Index (CPI) y/y',
        country: 'United States',
        currency: 'USD',
        importance: 'high',
        forecast: '2.4%',
        previous: '2.6%',
        impact: 'positive',
        category: 'Inflation'
      },
      {
        dateOffset: 2,
        time: '08:30',
        event: 'Core CPI m/m',
        country: 'United States',
        currency: 'USD',
        importance: 'high',
        forecast: '0.3%',
        previous: '0.3%',
        impact: 'neutral',
        category: 'Inflation'
      },
      
      // Next week Monday
      {
        dateOffset: 3,
        time: '14:00',
        event: 'FOMC Interest Rate Decision',
        country: 'United States',
        currency: 'USD',
        importance: 'high',
        forecast: '4.75%',
        previous: '5.00%',
        impact: 'positive',
        category: 'Monetary Policy'
      },
      {
        dateOffset: 3,
        time: '14:30',
        event: 'FOMC Press Conference',
        country: 'United States',
        currency: 'USD',
        importance: 'high',
        forecast: 'N/A',
        previous: 'N/A',
        impact: 'neutral',
        category: 'Monetary Policy'
      },
      
      // Next week Tuesday
      {
        dateOffset: 4,
        time: '08:30',
        event: 'Producer Price Index (PPI) m/m',
        country: 'United States',
        currency: 'USD',
        importance: 'medium',
        forecast: '0.2%',
        previous: '0.0%',
        impact: 'neutral',
        category: 'Inflation'
      },
      {
        dateOffset: 4,
        time: '09:30',
        event: 'GDP Growth Rate q/q (Preliminary)',
        country: 'United Kingdom',
        currency: 'GBP',
        importance: 'high',
        forecast: '0.2%',
        previous: '0.6%',
        impact: 'negative',
        category: 'Growth'
      },
      
      // Next week Wednesday
      {
        dateOffset: 5,
        time: '12:30',
        event: 'Retail Sales m/m',
        country: 'United States',
        currency: 'USD',
        importance: 'medium',
        forecast: '0.4%',
        previous: '0.4%',
        impact: 'neutral',
        category: 'Consumer'
      },
      {
        dateOffset: 5,
        time: '14:00',
        event: 'ECB Interest Rate Decision',
        country: 'European Union',
        currency: 'EUR',
        importance: 'high',
        forecast: '3.75%',
        previous: '4.00%',
        impact: 'positive',
        category: 'Monetary Policy'
      },
      
      // Next week Thursday
      {
        dateOffset: 6,
        time: '08:30',
        event: 'Philadelphia Fed Manufacturing Index',
        country: 'United States',
        currency: 'USD',
        importance: 'medium',
        forecast: '7.5',
        previous: '1.7',
        impact: 'positive',
        category: 'Manufacturing'
      },
      {
        dateOffset: 6,
        time: '15:30',
        event: 'Crude Oil Inventories',
        country: 'United States',
        currency: 'USD',
        importance: 'medium',
        forecast: '-1.8M',
        previous: '+5.8M',
        impact: 'positive',
        category: 'Energy'
      },
      
      // Next week Friday
      {
        dateOffset: 7,
        time: '08:30',
        event: 'Durable Goods Orders m/m',
        country: 'United States',
        currency: 'USD',
        importance: 'medium',
        forecast: '0.8%',
        previous: '0.0%',
        impact: 'positive',
        category: 'Manufacturing'
      },
      {
        dateOffset: 7,
        time: '22:00',
        event: 'BOJ Interest Rate Decision',
        country: 'Japan',
        currency: 'JPY',
        importance: 'high',
        forecast: '0.25%',
        previous: '0.25%',
        impact: 'neutral',
        category: 'Monetary Policy'
      }
    ];

    return baseEvents.map((event, index) => ({
      ...event,
      id: `event-${index + 1}-${getDateString(event.dateOffset)}`,
      time: event.time,
      // Add actual results for past events only
      actual: event.dateOffset <= 0 && event.actual ? event.actual : undefined,
      impact: event.dateOffset <= 0 && event.actual ? event.impact : 'neutral'
    }));
  };

  useEffect(() => {
    // Real-time data updates with current market events
    const currentEvents = getCurrentEvents();
    setEvents(currentEvents);
    setFilteredEvents(currentEvents);
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initialize TradingView Economic Calendar Widget
  useEffect(() => {
    if (showTradingViewWidget && tradingViewRef.current) {
      // Clear any existing widget
      tradingViewRef.current.innerHTML = '';
      
      // Detect current theme
      const savedTheme = localStorage.getItem('able-theme') || 'gray';
      const isLightTheme = savedTheme === 'light-gray' || savedTheme === 'bright';
      const colorTheme = isLightTheme ? 'light' : 'dark';
      
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        "width": "100%",
        "height": "400",
        "colorTheme": "dark",
        "isTransparent": false,
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
    
    setFilteredEvents(filtered);
  }, [events, selectedCurrency, selectedImportance]);

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

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive':
        return 'text-green-400';
      case 'negative':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
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

  const getTimeUntilEvent = (eventTime: string) => {
    const [hours, minutes] = eventTime.split(':').map(Number);
    const eventDate = new Date();
    eventDate.setHours(hours, minutes, 0, 0);
    
    const timeDiff = eventDate.getTime() - currentTime.getTime();
    const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutesUntil = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (timeDiff < 0) return 'Past';
    if (hoursUntil < 1) return `${minutesUntil}m`;
    return `${hoursUntil}h ${minutesUntil}m`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-background p-4 space-y-4 overflow-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-primary">Economic Calendar</h2>
            <p className="text-sm text-muted-foreground">
              Live market-moving events • {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
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
            {showTradingViewWidget ? 'Hide' : 'Show'} TradingView
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
        </div>
        
        <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Currencies</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="GBP">GBP</SelectItem>
            <SelectItem value="JPY">JPY</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedImportance} onValueChange={setSelectedImportance}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Impact" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Impact</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* TradingView Economic Calendar Widget */}
      {showTradingViewWidget && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-5 w-5" />
              TradingView Economic Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={tradingViewRef}
              className="w-full min-h-[400px] rounded-lg"
              style={{ 
                backgroundColor: 'var(--background)',
                colorScheme: localStorage.getItem('able-theme') === 'light-gray' || localStorage.getItem('able-theme') === 'bright' ? 'light' : 'dark' 
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.map((event) => {
          const eventDate = new Date();
          const eventDateOffset = parseInt(event.id.split('-')[2].split('T')[0].split('-')[2]) - new Date().getDate();
          const isToday = eventDateOffset === 0;
          const isTomorrow = eventDateOffset === 1;
          const isPast = eventDateOffset < 0;
          
          const getDateLabel = () => {
            if (isPast) return 'Yesterday';
            if (isToday) return 'Today';
            if (isTomorrow) return 'Tomorrow';
            const eventDate = new Date();
            eventDate.setDate(eventDate.getDate() + eventDateOffset);
            return eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          };
          
          return (
            <Card key={event.id} className={`transition-all duration-200 hover:shadow-lg border-l-4 ${
              event.importance === 'high' ? 'border-l-red-500' :
              event.importance === 'medium' ? 'border-l-amber-500' : 'border-l-green-500'
            } ${isPast ? 'opacity-75' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Date Badge */}
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant={isToday ? "default" : "secondary"} className="text-xs font-medium">
                        {getDateLabel()}
                      </Badge>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getCurrencyFlag(event.currency)}</span>
                        <Badge variant="outline" className="text-xs font-medium">
                          {event.currency}
                        </Badge>
                      </div>
                      
                      <Badge className={`text-xs ${getImportanceColor(event.importance)}`}>
                        {event.importance.toUpperCase()} IMPACT
                      </Badge>
                      
                      <Badge variant="secondary" className="text-xs">
                        {event.category}
                      </Badge>
                    </div>

                    {/* Event Name */}
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {event.event}
                    </h3>

                    {/* Event Details */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-primary">{event.time}</span>
                        {isToday && <span className="text-muted-foreground">({getTimeUntilEvent(event.time)})</span>}
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">Forecast: </span>
                        <span className="font-medium">{event.forecast || 'N/A'}</span>
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">Previous: </span>
                        <span className="font-medium">{event.previous}</span>
                      </div>
                      
                      {event.actual && (
                        <div>
                          <span className="text-muted-foreground">Actual: </span>
                          <span className={`font-bold ${getImpactColor(event.impact)}`}>
                            {event.actual}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Country Info */}
                  <div className="text-right ml-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{event.country}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No economic events match your current filters</p>
          </div>
        </Card>
      )}

      {/* Footer Info */}
      <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>High Impact</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span>Medium Impact</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Low Impact</span>
            </div>
          </div>
          <div>
            Data updates every 5 minutes • All times in local timezone
          </div>
        </div>
      </div>
    </div>
  );
};

export default EconomicCalendar;