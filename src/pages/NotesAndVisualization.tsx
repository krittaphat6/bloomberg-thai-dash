import { NetworkNotesGraph } from '@/components/NetworkNotesGraph';
import { Enhanced3DSurfacePlot } from '@/components/Enhanced3DSurfacePlot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Hash, TrendingUp, BarChart3 } from 'lucide-react';

// Sample trade data for demonstration
const sampleTrades = [
  {
    id: '1',
    date: '2024-01-15',
    symbol: 'AAPL',
    side: 'LONG' as const,
    type: 'STOCK' as const,
    entryPrice: 150.25,
    exitPrice: 158.75,
    quantity: 100,
    pnl: 850,
    pnlPercentage: 5.66,
    status: 'CLOSED' as const,
    strategy: 'Momentum'
  },
  {
    id: '2',
    date: '2024-01-18',
    symbol: 'GOOGL',
    side: 'LONG' as const,
    type: 'STOCK' as const,
    entryPrice: 142.50,
    exitPrice: 145.20,
    quantity: 50,
    pnl: 135,
    pnlPercentage: 1.89,
    status: 'CLOSED' as const,
    strategy: 'Value'
  },
  {
    id: '3',
    date: '2024-01-20',
    symbol: 'TSLA',
    side: 'SHORT' as const,
    type: 'CFD' as const,
    entryPrice: 245.80,
    exitPrice: 238.50,
    quantity: 25,
    pnl: 182.50,
    pnlPercentage: 2.97,
    status: 'CLOSED' as const,
    strategy: 'Technical'
  },
  {
    id: '4',
    date: '2024-02-01',
    symbol: 'MSFT',
    side: 'LONG' as const,
    type: 'STOCK' as const,
    entryPrice: 390.25,
    exitPrice: 410.50,
    quantity: 30,
    pnl: 607.50,
    pnlPercentage: 5.19,
    status: 'CLOSED' as const,
    strategy: 'Growth'
  }
];

const NotesAndVisualization = () => {
  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Hash className="w-6 h-6 text-primary" />
            Notes & 3D Visualization Dashboard
          </CardTitle>
          <p className="text-muted-foreground">
            Interactive network notes and advanced 3D surface plotting for trading analysis
          </p>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="notes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Network Notes
          </TabsTrigger>
          <TabsTrigger value="surface" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            3D Surface Plot
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="space-y-4">
          <NetworkNotesGraph />
          
          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                How to Use Network Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Creating Notes:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Add hashtag-style titles (e.g., #wave4, #strategy)</li>
                    <li>• Include content describing your analysis</li>
                    <li>• Add relevant tags for automatic linking</li>
                    <li>• Notes with same tags will connect automatically</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Navigation:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Click nodes to view note details</li>
                    <li>• Drag nodes to reposition them</li>
                    <li>• Zoom in/out with scroll wheel</li>
                    <li>• White lines = direct links, Purple = tag connections</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surface" className="space-y-4">
          <Enhanced3DSurfacePlot trades={sampleTrades} />
          
          {/* Surface Type Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-green-400">Allocation Surface</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Visualizes portfolio efficiency by mapping diversification against strategic positioning. Higher peaks indicate optimal allocation zones.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base text-blue-400">Performance Surface</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Shows return landscapes across time periods and asset classes. Peaks represent high-return regions, valleys show underperformance.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base text-orange-400">Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Displays volatility patterns and correlation structures. Blue areas indicate lower risk, red areas show high-risk zones.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotesAndVisualization;