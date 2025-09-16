import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp } from 'lucide-react';

export default function ThaiStockStreaming() {
  const refreshPage = () => {
    const iframe = document.querySelector('#thai-stock-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  return (
    <Card className="w-full h-full bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-terminal-green">
            <TrendingUp className="h-5 w-5" />
            THAI STOCK STREAMING - SET INDEX
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
          Live streaming of Thai Stock Exchange (SET) market data
        </div>
      </CardHeader>
      <CardContent className="h-full p-0">
        <div className="h-full flex flex-col">
          <iframe
            id="thai-stock-iframe"
            src="https://www.settrade.com/streaming"
            className="flex-1 w-full border border-border rounded bg-background"
            title="Thai Stock Streaming - SET Index"
            allow="geolocation"
            style={{ minHeight: '600px' }}
          />
          <div className="p-4 text-xs text-terminal-amber bg-card border-t border-border">
            📈 Live SET streaming • 💰 Real-time quotes • 🇹🇭 Thai market data
          </div>
        </div>
      </CardContent>
    </Card>
  );
}