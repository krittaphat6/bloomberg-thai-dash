import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, DollarSign } from 'lucide-react';

export default function USDebtClock() {
  const refreshPage = () => {
    const iframe = document.querySelector('#debt-clock-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  return (
    <Card className="w-full h-full bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-terminal-green">
            <DollarSign className="h-5 w-5" />
            U.S. NATIONAL DEBT CLOCK - REAL TIME
          </CardTitle>
          <Button
            onClick={refreshPage}
            size="sm"
            variant="outline"
            className="border-terminal-green text-terminal-green hover:bg-terminal-green/10"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          Real-time US National Debt tracking and financial data
        </div>
      </CardHeader>
      <CardContent className="h-full p-0">
        <div className="h-full flex flex-col">
          <iframe
            id="debt-clock-iframe"
            src="https://www.usdebtclock.org/"
            className="flex-1 w-full border border-border rounded bg-background"
            title="US National Debt Clock - Real Time"
            allow="geolocation"
            style={{ minHeight: '600px' }}
          />
          <div className="p-4 text-xs text-terminal-amber bg-card border-t border-border">
            💰 Real-time debt tracking • 📊 Economic indicators • 🇺🇸 National statistics
          </div>
        </div>
      </CardContent>
    </Card>
  );
}