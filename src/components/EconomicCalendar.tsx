import React from 'react';
import { Calendar, TrendingUp } from 'lucide-react';

const EconomicCalendar = () => {
  const events = [
    { time: '13:30', event: 'USD CPI m/m', importance: 'high', forecast: '0.3%', previous: '0.2%' },
    { time: '15:00', event: 'USD Retail Sales', importance: 'medium', forecast: '0.6%', previous: '0.4%' },
    { time: '16:30', event: 'USD Crude Oil', importance: 'medium', forecast: '', previous: '+2.1M' },
    { time: '22:00', event: 'JPY BOJ Rate', importance: 'high', forecast: '0.1%', previous: '0.1%' },
  ];

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'text-terminal-red';
      case 'medium': return 'text-terminal-amber';
      default: return 'text-terminal-green';
    }
  };

  return (
    <div className="terminal-panel">
      <div className="panel-header flex items-center gap-2">
        <Calendar className="h-3 w-3" />
        ECONOMIC CALENDAR
      </div>
      <div className="panel-content">
        {events.map((event, index) => (
          <div key={index} className="mb-2 p-2 border-b border-border/30">
            <div className="flex justify-between items-start mb-1">
              <span className="text-terminal-cyan text-xs">{event.time}</span>
              <span className={`text-xs ${getImportanceColor(event.importance)}`}>
                {event.importance.toUpperCase()}
              </span>
            </div>
            <div className="text-terminal-white text-xs mb-1">{event.event}</div>
            <div className="flex justify-between text-xs">
              <span className="text-terminal-gray">F: {event.forecast || 'N/A'}</span>
              <span className="text-terminal-gray">P: {event.previous}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EconomicCalendar;