import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp } from 'lucide-react';

export default function GoogleFinance() {
  const refreshPage = () => {
    const iframe = document.querySelector('#google-finance-iframe') as HTMLIFrameElement;
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
            GOOGLE FINANCE - MARKETS
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
          Real-time market data and financial information from Google Finance
        </div>
      </CardHeader>
      <CardContent className="h-full p-0">
        <div className="h-full flex flex-col">
          <iframe
            id="google-finance-iframe"
            src="https://www.google.com/finance"
            className="flex-1 w-full border border-border rounded bg-background"
            title="Google Finance - Markets"
            allow="geolocation"
            style={{ minHeight: '600px' }}
          />
          <div className="p-4 text-xs text-terminal-amber bg-card border-t border-border">
            📈 Global markets • 💹 Real-time quotes • 🌐 Google Finance data
          </div>
        </div>
      </CardContent>
    </Card>
  );
}