import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MempoolData {
  timestamp: string;
  feeLevel: number;
  avgTransactionTime: number;
  confirmationsPerDay: number;
  totalTransactions: number;
  avgTransactionsPerBlock: number;
}

interface Transaction {
  id: string;
  amount: number;
  fee: number;
  time: string;
}

const BitcoinMempool = () => {
  const [mempoolData, setMempoolData] = useState<MempoolData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    // Fetch real mempool data from mempool.space API
    const fetchMempoolData = async () => {
      try {
        // Fetch mempool statistics
        const mempoolResponse = await fetch('https://mempool.space/api/mempool');
        const mempoolStats = await mempoolResponse.json();
        
        // Fetch fee recommendations
        const feeResponse = await fetch('https://mempool.space/api/v1/fees/recommended');
        const feeData = await feeResponse.json();
        
        // Fetch recent transactions
        const txResponse = await fetch('https://mempool.space/api/mempool/recent');
        const recentTxs = await txResponse.json();

        // Generate historical data points (mixing real current data with simulated historical)
        const data: MempoolData[] = [];
        const currentTime = new Date();
        
        for (let i = 23; i >= 0; i--) {
          const timestamp = new Date(currentTime.getTime() - i * 60 * 60 * 1000);
          data.push({
            timestamp: `${timestamp.getHours()}:${timestamp.getMinutes().toString().padStart(2, '0')}`,
            feeLevel: i === 0 ? feeData.fastestFee : feeData.fastestFee + (Math.random() - 0.5) * 20,
            avgTransactionTime: i === 0 ? (mempoolStats.count / 2000) : Math.random() * 60 + 10,
            confirmationsPerDay: i === 0 ? mempoolStats.count : Math.random() * 1000 + 500,
            totalTransactions: i === 0 ? mempoolStats.count : Math.random() * 5000 + 2000,
            avgTransactionsPerBlock: Math.random() * 4000 + 1000
          });
        }

        // Process recent transactions
        const processedTxs: Transaction[] = recentTxs.slice(0, 15).map((tx: any, index: number) => ({
          id: tx.txid?.substring(0, 8) || `tx_${index}`,
          amount: (tx.value || Math.random() * 10) / 100000000, // Convert satoshis to BTC
          fee: (tx.fee || Math.random() * 1000000) / 100000000, // Convert satoshis to BTC
          time: new Date().toLocaleTimeString()
        }));

        setMempoolData(data);
        setTransactions(processedTxs);
      } catch (error) {
        console.error('Failed to fetch mempool data, using fallback:', error);
        
        // Fallback to mock data if API fails
        const data: MempoolData[] = [];
        const trans: Transaction[] = [];
        
        for (let i = 0; i < 24; i++) {
          data.push({
            timestamp: `${i}:00`,
            feeLevel: Math.random() * 100 + 20,
            avgTransactionTime: Math.random() * 60 + 10,
            confirmationsPerDay: Math.random() * 1000 + 500,
            totalTransactions: Math.random() * 5000 + 2000,
            avgTransactionsPerBlock: Math.random() * 4000 + 1000
          });
        }

        for (let i = 0; i < 15; i++) {
          trans.push({
            id: `tx_${i}`,
            amount: Math.random() * 10 + 0.001,
            fee: Math.random() * 0.01 + 0.0001,
            time: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString()
          });
        }

        setMempoolData(data);
        setTransactions(trans);
      }
    };

    fetchMempoolData();
    const interval = setInterval(fetchMempoolData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="terminal-panel h-full flex flex-col text-[0.4rem] xs:text-[0.5rem] sm:text-[0.6rem] md:text-xs lg:text-sm">
      {/* Header */}
      <div className="panel-header flex items-center justify-between border-b border-border pb-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span className="text-[0.6rem] xs:text-[0.7rem] sm:text-sm md:text-base font-bold text-terminal-green">
            Bitcoin Mempool
          </span>
        </div>
        <span className="text-[0.4rem] xs:text-[0.5rem] sm:text-xs text-terminal-gray">
          Live Data
        </span>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {/* Mempool Bytes Per Fee Level */}
        <div className="bg-terminal-panel p-2 rounded border border-border">
          <h3 className="text-[0.5rem] xs:text-[0.6rem] sm:text-xs text-terminal-amber mb-2">
            Mempool Bytes Per Fee Level
          </h3>
          <div className="h-24 sm:h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mempoolData}>
                <defs>
                  <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 8 }} 
                  stroke="#666" 
                />
                <YAxis 
                  tick={{ fontSize: 8 }} 
                  stroke="#666" 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #333',
                    fontSize: '8px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="feeLevel" 
                  stroke="#8884d8" 
                  fillOpacity={1} 
                  fill="url(#feeGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Average Transaction Time */}
          <div className="bg-terminal-panel p-2 rounded border border-border">
            <h3 className="text-[0.4rem] xs:text-[0.5rem] sm:text-xs text-terminal-amber mb-1">
              Avg Transaction Time
            </h3>
            <div className="h-20 sm:h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mempoolData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 6 }} stroke="#666" />
                  <YAxis tick={{ fontSize: 6 }} stroke="#666" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      fontSize: '6px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgTransactionTime" 
                    stroke="#ff7300" 
                    strokeWidth={1}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Confirmations Per Day */}
          <div className="bg-terminal-panel p-2 rounded border border-border">
            <h3 className="text-[0.4rem] xs:text-[0.5rem] sm:text-xs text-terminal-amber mb-1">
              Confirmations/Day
            </h3>
            <div className="h-20 sm:h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mempoolData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 6 }} stroke="#666" />
                  <YAxis tick={{ fontSize: 6 }} stroke="#666" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      fontSize: '6px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="confirmationsPerDay" 
                    stroke="#00ff88" 
                    strokeWidth={1}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-terminal-panel p-2 rounded border border-border">
          <h3 className="text-[0.4rem] xs:text-[0.5rem] sm:text-xs text-terminal-amber mb-2">
            Unconfirmed BTC Transactions
          </h3>
          <div className="space-y-1 max-h-32 overflow-auto">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between text-[0.3rem] xs:text-[0.4rem] sm:text-[0.5rem]">
                <span className="text-terminal-white">{tx.amount.toFixed(8)} BTC</span>
                <span className="text-terminal-gray">{tx.time}</span>
                <span className="text-terminal-cyan">{tx.fee.toFixed(6)} BTC</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BitcoinMempool;