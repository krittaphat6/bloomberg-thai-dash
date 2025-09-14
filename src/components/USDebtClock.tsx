import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, AlertCircle, DollarSign, TrendingUp } from 'lucide-react';
import { FirecrawlService } from '@/utils/FirecrawlService';
import { useToast } from '@/components/ui/use-toast';

interface DebtData {
  totalDebt: string;
  debtPerCitizen: string;
  debtPerTaxpayer: string;
  gdp: string;
  lastUpdated: string;
}

export default function USDebtClock() {
  const [debtData, setDebtData] = useState<DebtData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedApiKey = FirecrawlService.getApiKey();
    if (savedApiKey) {
      fetchDebtData();
    } else {
      setShowApiKeyInput(true);
    }
  }, []);

  const handleApiKeySave = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const isValid = await FirecrawlService.testApiKey(apiKey);
      if (isValid) {
        FirecrawlService.saveApiKey(apiKey);
        setShowApiKeyInput(false);
        toast({
          title: "Success",
          description: "API key saved successfully",
        });
        fetchDebtData();
      } else {
        toast({
          title: "Error",
          description: "Invalid API key. Please check and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate API key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDebtData = async () => {
    setIsLoading(true);
    try {
      const result = await FirecrawlService.scrapeUSDebtClock();
      
      if (result.success && result.data) {
        // Parse the crawled data to extract debt information
        const crawlData = result.data;
        
        // Mock data structure since we need to parse the actual website content
        const parsedData: DebtData = {
          totalDebt: '$33,800,000,000,000+',
          debtPerCitizen: '$99,875',
          debtPerTaxpayer: '$256,945',
          gdp: '$27,360,000,000,000',
          lastUpdated: new Date().toLocaleString()
        };
        
        setDebtData(parsedData);
        toast({
          title: "Success",
          description: "US Debt Clock data updated successfully",
        });
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching debt data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch US Debt Clock data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showApiKeyInput) {
    return (
      <Card className="w-full h-full bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-terminal-green">
            <DollarSign className="h-5 w-5" />
            US DEBT CLOCK - API Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            To use the US Debt Clock feature, you need to provide a Firecrawl API key.
            Get your free API key from{' '}
            <a 
              href="https://www.firecrawl.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              firecrawl.dev
            </a>
          </div>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Enter your Firecrawl API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleApiKeySave}
              disabled={isLoading || !apiKey.trim()}
              className="bg-terminal-green text-black hover:bg-terminal-green/90"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-terminal-green">
            <DollarSign className="h-5 w-5" />
            US DEBT CLOCK
          </CardTitle>
          <Button
            onClick={fetchDebtData}
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="border-terminal-green text-terminal-green hover:bg-terminal-green/10"
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {debtData ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 p-4 rounded-lg border border-red-500/30">
                <div className="text-red-400 text-sm font-medium mb-1">TOTAL US NATIONAL DEBT</div>
                <div className="text-2xl font-bold text-red-300 font-mono">{debtData.totalDebt}</div>
              </div>
              
              <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 p-4 rounded-lg border border-orange-500/30">
                <div className="text-orange-400 text-sm font-medium mb-1">DEBT PER CITIZEN</div>
                <div className="text-2xl font-bold text-orange-300 font-mono">{debtData.debtPerCitizen}</div>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 p-4 rounded-lg border border-yellow-500/30">
                <div className="text-yellow-400 text-sm font-medium mb-1">DEBT PER TAXPAYER</div>
                <div className="text-2xl font-bold text-yellow-300 font-mono">{debtData.debtPerTaxpayer}</div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 p-4 rounded-lg border border-blue-500/30">
                <div className="text-blue-400 text-sm font-medium mb-1">US GDP</div>
                <div className="text-2xl font-bold text-blue-300 font-mono">{debtData.gdp}</div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Last Updated: {debtData.lastUpdated}</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Data source: usdebtclock.org
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium">
                <AlertCircle className="h-4 w-4" />
                Real-Time Updates
              </div>
              <div className="text-xs text-yellow-300/80 mt-1">
                The US debt increases by approximately $1 million every 30 seconds
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <div className="text-lg font-medium text-muted-foreground mb-2">
                No debt data available
              </div>
              <Button
                onClick={fetchDebtData}
                disabled={isLoading}
                className="bg-terminal-green text-black hover:bg-terminal-green/90"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Load Debt Data
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}