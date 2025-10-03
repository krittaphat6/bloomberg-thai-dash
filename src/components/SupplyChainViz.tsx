import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, BarChart3, Users, Building2, FileText, Calendar, DollarSign } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SupplyChainVizProps {
  data: Record<string, any>;
  columns: string[];
}

export function SupplyChainViz({ data, columns }: SupplyChainVizProps) {
  const [stockData] = useState([
    { name: 'RLV', value: 125.4, change: 2.3 },
    { name: 'SPX12', value: 4582.2, change: -0.5 },
    { name: 'SPR', value: 892.1, change: 1.2 },
    { name: 'RIY', value: 3241.5, change: 0.8 },
  ]);

  const [newsData] = useState([
    { title: "Lilly Aims Experimental", date: "4/20" },
    { title: "Alzheimer's Drug at Earl...", date: "4/20" },
    { title: "Bayer, Merck, J&J Among", date: "4/19" },
    { title: "Pharma Guidance Tracks...", date: "4/18" },
  ]);

  const [eventsList] = useState([
    "PSA The Pharmaceutical Strategy Conference",
    "Clinical Trial Supply USA",
    "16th Annual Asian Shared Services & Outsourcing",
    "Q2 2013 Earnings Call"
  ]);

  const [holdersList] = useState([
    { name: "Vanguard Group Inc", pct: 8.2 },
    { name: "BlackRock Inc", pct: 7.1 },
    { name: "State Street Corp", pct: 4.5 },
    { name: "Capital Group", pct: 3.9 },
  ]);

  const [analystsList] = useState([
    { name: "JPMorgan", rating: "Buy" },
    { name: "Goldman Sachs", rating: "Neutral" },
    { name: "Morgan Stanley", rating: "Buy" },
    { name: "Citi", rating: "Hold" },
  ]);

  const [boardMembers] = useState([
    "Leslie A. Brun - Chairman",
    "Kenneth C. Frazier - CEO",
    "Thomas R. Cech",
    "Pamela J. Craig",
    "Kenneth C. Frazier",
    "Thomas H. Glocer",
  ]);

  const [priceHistory] = useState([
    { month: 'Jan', price: 45 },
    { month: 'Feb', price: 48 },
    { month: 'Mar', price: 52 },
    { month: 'Apr', price: 49 },
    { month: 'May', price: 53 },
    { month: 'Jun', price: 51 },
  ]);

  const [balanceData] = useState([
    { name: 'Assets', value: 105 },
    { name: 'Liabilities', value: 65 },
    { name: 'Equity', value: 40 },
  ]);

  return (
    <div className="w-full h-full bg-black text-white overflow-auto">
      {/* Header */}
      <div className="bg-red-600 px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-4">
          <span className="font-bold text-sm">MRK US Equity</span>
          <Button size="sm" variant="destructive" className="h-6 text-xs">
            1) Refresh
          </Button>
          <Button size="sm" variant="default" className="h-6 text-xs bg-blue-600">
            90 Feedback
          </Button>
        </div>
        <span className="text-sm font-mono text-white">Relationship Map</span>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-1 p-1 bg-gray-900">
        
        {/* Left Column - Indices, News, Events */}
        <div className="col-span-2 space-y-1">
          
          {/* Indices Section */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="p-2 bg-gray-900 border-b border-gray-700">
              <CardTitle className="text-xs font-mono text-green-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Indices (11/50)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {stockData.map((stock, i) => (
                <div key={i} className="flex justify-between text-xs font-mono">
                  <span className="text-white">{stock.name}</span>
                  <span className={stock.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {stock.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* News Section */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="p-2 bg-gray-900 border-b border-gray-700">
              <CardTitle className="text-xs font-mono text-green-400 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                News (4/40)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {newsData.map((news, i) => (
                <div key={i} className="text-xs">
                  <div className="text-white">{news.title}</div>
                  <div className="text-gray-500 text-[10px]">{news.date}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Events Section */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="p-2 bg-gray-900 border-b border-gray-700">
              <CardTitle className="text-xs font-mono text-green-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Events (4/7)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {eventsList.map((event, i) => (
                <div key={i} className="text-xs text-white">
                  {event.substring(0, 30)}...
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Center Column - Main Chart & Widgets */}
        <div className="col-span-7 space-y-1">
          
          {/* Top Row - Small Widgets */}
          <div className="grid grid-cols-4 gap-1">
            
            {/* Options */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="p-2 bg-gray-900 border-b border-gray-700">
                <CardTitle className="text-xs font-mono text-gray-400">Options</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-gray-600 h-12"></div>
                  <div className="border border-gray-600 h-12 bg-green-900/20"></div>
                  <div className="border border-gray-600 h-12"></div>
                  <div className="border border-gray-600 h-12"></div>
                </div>
              </CardContent>
            </Card>

            {/* Exchanges */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="p-2 bg-gray-900 border-b border-gray-700">
                <CardTitle className="text-xs font-mono text-gray-400">Exchanges (9/23)</CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                <div className="text-xs text-gray-400 font-mono">MRK EU</div>
                <div className="text-xs text-gray-400 font-mono">MRK US</div>
                <div className="text-xs text-gray-400 font-mono">MRVGEN</div>
              </CardContent>
            </Card>

            {/* CDSs */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="p-2 bg-gray-900 border-b border-gray-700">
                <CardTitle className="text-xs font-mono text-gray-400">CDSs</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ResponsiveContainer width="100%" height={60}>
                  <LineChart data={[{v:100},{v:102},{v:98},{v:105}]}>
                    <Line type="monotone" dataKey="v" stroke="#22c55e" dot={false} strokeWidth={1} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Balance Sheet */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="p-2 bg-gray-900 border-b border-gray-700">
                <CardTitle className="text-xs font-mono text-gray-400">Balance Sheet</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ResponsiveContainer width="100%" height={60}>
                  <BarChart data={balanceData}>
                    <Bar dataKey="value" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Main Chart */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="p-2 bg-green-900 border-b border-green-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  MRK US Equity - Merck & Co Inc
                  <span className="text-green-400">51.82</span>
                  <span className="text-xs">1 PC Chg +2.05%</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#22c55e' }}
                  />
                  <Line type="monotone" dataKey="price" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Executives */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="p-2 bg-gray-900 border-b border-gray-700">
              <CardTitle className="text-xs font-mono text-gray-400 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Executives (15/15)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="grid grid-cols-3 gap-2">
                {Array.from({length: 9}).map((_, i) => (
                  <div key={i} className="bg-orange-600 text-white text-center py-1 text-xs rounded">
                    Executive {i+1}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Holders, Analysts, Board */}
        <div className="col-span-3 space-y-1">
          
          {/* Holders */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="p-2 bg-gray-900 border-b border-gray-700">
              <CardTitle className="text-xs font-mono text-green-400 flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Holders (17/120)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {holdersList.map((holder, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-white">{holder.name}</span>
                  <span className="text-green-400">{holder.pct}%</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Analysts */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="p-2 bg-gray-900 border-b border-gray-700">
              <CardTitle className="text-xs font-mono text-green-400 flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                Analysts (11/21)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {analystsList.map((analyst, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-white">{analyst.name}</span>
                  <span className={
                    analyst.rating === 'Buy' ? 'text-green-400' :
                    analyst.rating === 'Hold' ? 'text-yellow-400' :
                    'text-gray-400'
                  }>
                    {analyst.rating}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Board */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="p-2 bg-gray-900 border-b border-gray-700">
              <CardTitle className="text-xs font-mono text-orange-400 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Board (13/13)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {boardMembers.map((member, i) => (
                <div key={i} className="bg-orange-600 text-white text-center py-1 text-xs rounded">
                  {member.split(' - ')[0]}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
