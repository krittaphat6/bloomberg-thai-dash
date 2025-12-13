// Bitcoin Mempool Service - Real data from mempool.space API

export interface MempoolData {
  count: number;
  vsize: number;
  totalFee: number;
  feeHistogram: [number, number][];
}

export interface FeeRecommendation {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export interface Block {
  id: string;
  height: number;
  version: number;
  timestamp: number;
  tx_count: number;
  size: number;
  weight: number;
  merkle_root: string;
  previousblockhash: string;
  mediantime: number;
  nonce: number;
  bits: number;
  difficulty: number;
  extras?: {
    totalFees: number;
    medianFee: number;
    reward: number;
  };
}

export interface TransactionStats {
  timestamp: number;
  added: number;
  confirmed: number;
}

export class MempoolService {
  private static readonly API_BASE = 'https://mempool.space/api';
  private static cache: { mempool: MempoolData | null; fees: FeeRecommendation | null; timestamp: number } = {
    mempool: null,
    fees: null,
    timestamp: 0
  };
  private static readonly CACHE_DURATION = 15000; // 15 seconds

  // Fetch current mempool status
  static async fetchMempoolData(): Promise<MempoolData | null> {
    try {
      const response = await fetch(`${this.API_BASE}/mempool`);
      if (!response.ok) throw new Error('Mempool API error');

      const data = await response.json();
      this.cache.mempool = data;
      this.cache.timestamp = Date.now();

      return {
        count: data.count || 0,
        vsize: data.vsize || 0,
        totalFee: data.total_fee || 0,
        feeHistogram: data.fee_histogram || []
      };
    } catch (error) {
      console.error('Mempool fetch error:', error);
      return this.cache.mempool;
    }
  }

  // Fetch fee recommendations
  static async fetchFeeRecommendations(): Promise<FeeRecommendation | null> {
    try {
      const response = await fetch(`${this.API_BASE}/v1/fees/recommended`);
      if (!response.ok) throw new Error('Fee API error');

      const data = await response.json();
      this.cache.fees = data;

      return {
        fastestFee: data.fastestFee || 10,
        halfHourFee: data.halfHourFee || 8,
        hourFee: data.hourFee || 5,
        economyFee: data.economyFee || 3,
        minimumFee: data.minimumFee || 1
      };
    } catch (error) {
      console.error('Fee recommendation error:', error);
      return this.cache.fees;
    }
  }

  // Fetch recent blocks
  static async fetchRecentBlocks(count: number = 10): Promise<Block[]> {
    try {
      const response = await fetch(`${this.API_BASE}/v1/blocks`);
      if (!response.ok) throw new Error('Blocks API error');

      const blocks = await response.json();
      return blocks.slice(0, count).map((block: any) => ({
        id: block.id,
        height: block.height,
        version: block.version,
        timestamp: block.timestamp,
        tx_count: block.tx_count,
        size: block.size,
        weight: block.weight,
        merkle_root: block.merkle_root,
        previousblockhash: block.previousblockhash,
        mediantime: block.mediantime,
        nonce: block.nonce,
        bits: block.bits,
        difficulty: block.difficulty,
        extras: block.extras ? {
          totalFees: block.extras.totalFees || 0,
          medianFee: block.extras.medianFee || 0,
          reward: block.extras.reward || 0
        } : undefined
      }));
    } catch (error) {
      console.error('Blocks fetch error:', error);
      return [];
    }
  }

  // Fetch transaction statistics (2h history)
  static async fetchTransactionStats(): Promise<TransactionStats[]> {
    try {
      const response = await fetch(`${this.API_BASE}/v1/statistics/2h`);
      if (!response.ok) throw new Error('Stats API error');

      const data = await response.json();
      return data.map((stat: any) => ({
        timestamp: stat.timestamp || Date.now(),
        added: stat.added || 0,
        confirmed: stat.confirmed || 0
      }));
    } catch (error) {
      console.error('Transaction stats error:', error);
      return [];
    }
  }

  // Fetch mempool fee histogram for visualization
  static async fetchMempoolBlocks(): Promise<any[]> {
    try {
      const response = await fetch(`${this.API_BASE}/v1/fees/mempool-blocks`);
      if (!response.ok) throw new Error('Mempool blocks API error');

      return await response.json();
    } catch (error) {
      console.error('Mempool blocks error:', error);
      return [];
    }
  }

  // Get current hashrate
  static async fetchHashrate(): Promise<{ current: number; difficulty: number }> {
    try {
      const response = await fetch(`${this.API_BASE}/v1/mining/hashrate/3d`);
      if (!response.ok) throw new Error('Hashrate API error');

      const data = await response.json();
      const latest = data.hashrates?.[data.hashrates.length - 1];

      return {
        current: latest?.avgHashrate || 0,
        difficulty: data.difficulty || 0
      };
    } catch (error) {
      console.error('Hashrate error:', error);
      return { current: 0, difficulty: 0 };
    }
  }

  // Format fee histogram for chart display
  static processFeeHistogram(histogram: [number, number][] | undefined): { fee: string; vsize: number }[] {
    if (!histogram || histogram.length === 0) {
      return [];
    }

    // Group by fee ranges
    const ranges = [1, 2, 5, 10, 20, 50, 100, 200, 500];
    const grouped = new Map<string, number>();

    for (const [fee, vsize] of histogram) {
      let rangeKey = '500+';
      for (let i = 0; i < ranges.length; i++) {
        if (fee <= ranges[i]) {
          rangeKey = i === 0 ? `1` : `${ranges[i-1]+1}-${ranges[i]}`;
          break;
        }
      }
      grouped.set(rangeKey, (grouped.get(rangeKey) || 0) + vsize);
    }

    return Array.from(grouped.entries()).map(([fee, vsize]) => ({
      fee,
      vsize: Math.round(vsize / 1000000) // Convert to MB
    }));
  }
}

export const mempoolService = new MempoolService();
