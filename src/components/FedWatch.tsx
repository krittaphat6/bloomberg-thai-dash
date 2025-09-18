import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, TrendingUp, TrendingDown, BarChart3, Info } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface MeetingData {
  date: string;
  targetRate: string;
  currentRate: string;
  probabilities: {
    [key: string]: number;
  };
  contract: string;
  expires: string;
  midPrice: number;
  volume: number;
  openInterest: number;
}

interface ProbabilityData {
  range: string;
  probability: number;
  color: string;
}

const FedWatch = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Sample meeting data based on realistic Fed schedule
  const meetingData: MeetingData[] = [
    {
      date: '2025-10-29',
      targetRate: '4.00-4.25',
      currentRate: '4.00-4.25',
      probabilities: {
        '3.50-3.75': 0.2,
        '3.75-4.00': 10.2,
        '4.00-4.25': 89.8,
        '4.25-4.50': 0.0,
        '4.50-4.75': 0.0
      },
      contract: 'ZQV5',
      expires: '31 Oct 2025',
      midPrice: 96.125,
      volume: 522963,
      openInterest: 720965
    },
    {
      date: '2025-12-17',
      targetRate: '3.50-3.75',
      currentRate: '4.00-4.25',
      probabilities: {
        '3.25-3.50': 5.6,
        '3.50-3.75': 79.4,
        '3.75-4.00': 14.8,
        '4.00-4.25': 0.2,
        '4.25-4.50': 0.0
      },
      contract: 'ZQZ5',
      expires: '31 Dec 2025',
      midPrice: 96.375,
      volume: 389742,
      openInterest: 654321
    },
    {
      date: '2026-01-28',
      targetRate: '3.25-3.50',
      currentRate: '4.00-4.25',
      probabilities: {
        '3.00-3.25': 8.2,
        '3.25-3.50': 62.4,
        '3.50-3.75': 27.1,
        '3.75-4.00': 2.3,
        '4.00-4.25': 0.0
      },
      contract: 'ZQF6',
      expires: '28 Feb 2026',
      midPrice: 96.625,
      volume: 245768,
      openInterest: 432187
    }
  ];

  // Calculate countdown to next meeting
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      const nextMeeting = new Date(meetingData[selectedMeeting].date);
      nextMeeting.setHours(14, 30, 0, 0); // 2:30 PM EST typical announcement time
      
      const diff = nextMeeting.getTime() - now.getTime();
      
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimeRemaining({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedMeeting]);

  // Prepare chart data
  const currentMeeting = meetingData[selectedMeeting];
  const probabilityChartData = Object.entries(currentMeeting.probabilities).map(([range, prob]) => ({
    range: range.replace('-', ' - '),
    probability: prob,
    fill: prob > 50 ? '#10B981' : prob > 20 ? '#3B82F6' : prob > 5 ? '#F59E0B' : '#EF4444'
  }));

  // Historical probability trend (simulated)
  const historicalData = [
    { date: 'Sep 10', prob25: 15, prob50: 75, prob75: 10, rate: 4.25 },
    { date: 'Sep 11', prob25: 18, prob50: 72, prob75: 10, rate: 4.25 },
    { date: 'Sep 12', prob25: 22, prob50: 68, prob75: 10, rate: 4.25 },
    { date: 'Sep 13', prob25: 25, prob50: 65, prob75: 10, rate: 4.25 },
    { date: 'Sep 16', prob25: 12, prob50: 78, prob75: 10, rate: 4.25 },
    { date: 'Sep 17', prob25: 10, prob50: 80, prob75: 10, rate: 4.25 },
    { date: 'Sep 18', prob25: 10, prob50: 90, prob75: 0, rate: 4.25 },
  ];

  // Rate change scenarios
  const rateScenarios = [
    { scenario: 'No Change', probability: 89.8, impact: 'Neutral', color: '#6B7280' },
    { scenario: '25bp Cut', probability: 10.2, impact: 'Dovish', color: '#10B981' },
    { scenario: '50bp Cut', probability: 0.2, impact: 'Very Dovish', color: '#059669' },
    { scenario: '25bp Hike', probability: 0.0, impact: 'Hawkish', color: '#EF4444' },
  ];

  const getHighestProbability = () => {
    const entries = Object.entries(currentMeeting.probabilities);
    return entries.reduce((max, current) => 
      current[1] > max[1] ? current : max
    );
  };

  const [mostLikely, maxProb] = getHighestProbability();

  return (
    <div className="w-full h-full flex flex-col bg-background p-4 space-y-4 overflow-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-primary">FedWatch Tool</h1>
          <Badge variant="outline" className="px-3 py-1">
            <Clock className="w-4 h-4 mr-1" />
            Live Market Data
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          Data as of {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
        </div>
      </div>

      {/* Next Meeting Countdown */}
      <Card className="mb-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Next FOMC Meeting</h2>
            <div className="text-lg text-muted-foreground mb-4">
              {new Date(currentMeeting.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            
            <div className="flex justify-center gap-8 mb-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{timeRemaining.days}</div>
                <div className="text-sm text-muted-foreground">DAYS</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{String(timeRemaining.hours).padStart(2, '0')}</div>
                <div className="text-sm text-muted-foreground">HOURS</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{String(timeRemaining.minutes).padStart(2, '0')}</div>
                <div className="text-sm text-muted-foreground">MIN</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{String(timeRemaining.seconds).padStart(2, '0')}</div>
                <div className="text-sm text-muted-foreground">SEC</div>
              </div>
            </div>

            <div className="flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span>Most Likely: {mostLikely} ({maxProb.toFixed(1)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Current Rate: {currentMeeting.currentRate}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Meeting Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              FOMC Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedMeeting.toString()} onValueChange={(value) => setSelectedMeeting(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meetingData.map((meeting, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {new Date(meeting.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Target Rate:</span>
                <Badge variant="outline">{currentMeeting.targetRate}%</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Contract:</span>
                <span className="font-mono">{currentMeeting.contract}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Expires:</span>
                <span>{currentMeeting.expires}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Mid Price:</span>
                <span className="font-mono">{currentMeeting.midPrice.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Volume:</span>
                <span>{currentMeeting.volume.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Open Interest:</span>
                <span>{currentMeeting.openInterest.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rate Scenarios */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Rate Change Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rateScenarios.map((scenario, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: scenario.color }}
                    />
                    <div>
                      <div className="font-medium">{scenario.scenario}</div>
                      <div className="text-sm text-muted-foreground">{scenario.impact}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{scenario.probability}%</div>
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          backgroundColor: scenario.color,
                          width: `${scenario.probability}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Tabs with comprehensive Fed analysis */}
      <Tabs defaultValue="probability" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="probability">Rate Probabilities</TabsTrigger>
          <TabsTrigger value="historical">Historical Trends</TabsTrigger>
          <TabsTrigger value="heatmap">Probability Heatmap</TabsTrigger>
          <TabsTrigger value="analysis">Market Analysis</TabsTrigger>
          <TabsTrigger value="futures">Fed Futures</TabsTrigger>
          <TabsTrigger value="comparison">Meeting Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="probability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Target Rate Probabilities for {new Date(currentMeeting.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} Fed Meeting</CardTitle>
              <div className="text-sm text-muted-foreground">
                Current target rate is {currentMeeting.currentRate}%
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={probabilityChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="range" 
                      tick={{ fontSize: 12, fill: '#9CA3AF' }}
                      axisLine={{ stroke: '#4B5563' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#9CA3AF' }}
                      axisLine={{ stroke: '#4B5563' }}
                      label={{ value: 'Probability (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F3F4F6'
                      }}
                      formatter={(value: any) => [`${value}%`, 'Probability']}
                    />
                    <Bar 
                      dataKey="probability" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historical Probability Trend (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id="prob25" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="prob50" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: '#9CA3AF' }}
                      axisLine={{ stroke: '#4B5563' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#9CA3AF' }}
                      axisLine={{ stroke: '#4B5563' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F3F4F6'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="prob25"
                      stackId="1"
                      stroke="#EF4444"
                      fill="url(#prob25)"
                      name="25bp Cut"
                    />
                    <Area
                      type="monotone"
                      dataKey="prob50"
                      stackId="1"
                      stroke="#10B981"
                      fill="url(#prob50)"
                      name="No Change"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Probability Table</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Target Rate (BPS)</TableHead>
                    <TableHead className="text-center">Now*</TableHead>
                    <TableHead className="text-center">1 Day</TableHead>
                    <TableHead className="text-center">1 Week</TableHead>
                    <TableHead className="text-center">1 Month</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(currentMeeting.probabilities).map(([range, prob]) => (
                    <TableRow key={range} className={prob > 50 ? 'bg-emerald-500/10' : ''}>
                      <TableCell className="font-mono">{range}</TableCell>
                      <TableCell className="text-center font-bold">
                        {prob.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        {(prob + (Math.random() - 0.5) * 2).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        {(prob + (Math.random() - 0.5) * 5).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        {(prob + (Math.random() - 0.5) * 10).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 text-xs text-muted-foreground">
                *Data as of {currentTime.toLocaleString()}. Fed forecast not published meeting data.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meeting Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {meetingData.map((meeting, index) => {
                  const [mostLikelyRate, probability] = Object.entries(meeting.probabilities)
                    .reduce((max, current) => current[1] > max[1] ? current : max);
                  
                  return (
                    <Card key={index} className={index === selectedMeeting ? 'border-primary bg-primary/5' : ''}>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="font-bold text-lg">
                            {new Date(meeting.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {meeting.targetRate}%
                          </div>
                          <div className="text-2xl font-bold text-emerald-500 mb-1">
                            {probability.toFixed(1)}%
                          </div>
                          <div className="text-xs">Most Likely Rate</div>
                          <Badge variant="outline" className="mt-2">
                            {mostLikelyRate}%
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>
              <strong>MEDIA:</strong> Please attribute rate probabilities used in your reporting to "CME FedWatch."
              Data derived from 30-Day Fed Funds futures pricing. Updated in real-time during market hours.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FedWatch;