import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, BarChart3 } from 'lucide-react';

export default function KoyfinMarkets() {
  const refreshPage = () => {
    const iframe = document.querySelector('#koyfin-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  return (
    <Card className="w-full h-full bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-terminal-green">
            <BarChart3 className="h-5 w-5" />
            KOYFIN MARKETS - FINANCIAL DATA
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
          Professional financial data and market analysis platform
        </div>
      </CardHeader>
      <CardContent className="h-full p-0">
        <div className="h-full flex flex-col">
          <iframe
            id="koyfin-iframe"
            src="https://app.koyfin.com/"
            className="flex-1 w-full border border-border rounded bg-background"
            title="Koyfin Markets - Financial Data"
            allow="geolocation"
            style={{ minHeight: '600px' }}
          />
          <div className="p-4 text-xs text-terminal-amber bg-card border-t border-border">
            📊 Professional analytics • 💹 Market data • 🏦 Financial intelligence
          </div>
        </div>
      </CardContent>
    </Card>
  );
}