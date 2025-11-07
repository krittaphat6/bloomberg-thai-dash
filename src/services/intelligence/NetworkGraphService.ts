import { MarketQuote, MarketConnection } from './GlobalMarketDataService';

export interface NetworkNode {
  id: string;
  label: string;
  group: string;
  value: number;
  color?: string;
  title?: string;
  x?: number;
  y?: number;
}

export interface NetworkEdge {
  from: string;
  to: string;
  value: number;
  color?: any;
  label?: string;
  dashes?: boolean;
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

class NetworkGraphService {
  private static instance: NetworkGraphService;

  private constructor() {}

  static getInstance(): NetworkGraphService {
    if (!NetworkGraphService.instance) {
      NetworkGraphService.instance = new NetworkGraphService();
    }
    return NetworkGraphService.instance;
  }

  createNetworkFromMarketData(
    quotes: MarketQuote[],
    connections: MarketConnection[]
  ): NetworkData {
    const nodes: NetworkNode[] = quotes.map(quote => {
      const change = quote.changePercent;
      const color = this.getColorByPerformance(change);
      const size = this.getSizeByVolume(quote.volume);

      return {
        id: quote.symbol,
        label: quote.symbol,
        group: quote.sector || quote.country,
        value: size,
        color: color,
        title: this.createTooltip(quote)
      };
    });

    const edges: NetworkEdge[] = connections.map(conn => {
      return {
        from: conn.from,
        to: conn.to,
        value: conn.strength * 5,
        color: this.getEdgeColor(conn.type),
        label: conn.type,
        dashes: conn.type === 'correlation'
      };
    });

    return { nodes, edges };
  }

  createClusteredNetwork(quotes: MarketQuote[]): NetworkData {
    const sectorMap = new Map<string, MarketQuote[]>();
    
    quotes.forEach(quote => {
      const sector = quote.sector || quote.country || 'OTHER';
      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, []);
      }
      sectorMap.get(sector)!.push(quote);
    });

    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];

    sectorMap.forEach((stocks, sector) => {
      const hubId = `HUB_${sector}`;
      nodes.push({
        id: hubId,
        label: sector,
        group: sector,
        value: 50,
        color: this.getSectorColor(sector),
        title: `${sector}: ${stocks.length} stocks`
      });

      stocks.forEach(quote => {
        nodes.push({
          id: quote.symbol,
          label: quote.symbol,
          group: sector,
          value: this.getSizeByVolume(quote.volume),
          color: this.getColorByPerformance(quote.changePercent),
          title: this.createTooltip(quote)
        });

        edges.push({
          from: hubId,
          to: quote.symbol,
          value: 2,
          color: { opacity: 0.3 }
        });
      });
    });

    return { nodes, edges };
  }

  private getColorByPerformance(changePercent: number): string {
    if (changePercent > 5) return '#00ff00';
    if (changePercent > 2) return '#7fff7f';
    if (changePercent > 0) return '#90EE90';
    if (changePercent > -2) return '#ffb6b6';
    if (changePercent > -5) return '#ff6b6b';
    return '#ff0000';
  }

  private getSizeByVolume(volume: number): number {
    const normalized = Math.log10(volume + 1);
    return Math.min(50, Math.max(10, normalized * 5));
  }

  private getEdgeColor(type: string): any {
    const colors: { [key: string]: any } = {
      'sector': { color: '#4169E1', opacity: 0.6 },
      'supplier': { color: '#32CD32', opacity: 0.5 },
      'competitor': { color: '#FF6347', opacity: 0.4 },
      'correlation': { color: '#FFD700', opacity: 0.3 }
    };
    return colors[type] || { color: '#999', opacity: 0.2 };
  }

  private getSectorColor(sector: string): string {
    const colors: { [key: string]: string } = {
      'Technology': '#0080FF',
      'Finance': '#00C853',
      'Healthcare': '#FF1744',
      'Energy': '#FFD600',
      'Consumer': '#AA00FF',
      'Industrial': '#FF6D00',
      'US': '#0052CC',
      'UK': '#FF0000',
      'TH': '#ED1C24',
      'HK': '#DE2910',
      'JP': '#BC002D'
    };
    return colors[sector] || '#666666';
  }

  private createTooltip(quote: MarketQuote): string {
    return `
      <b>${quote.name || quote.symbol}</b><br>
      Price: $${quote.price.toFixed(2)}<br>
      Change: ${quote.changePercent.toFixed(2)}%<br>
      Volume: ${this.formatVolume(quote.volume)}<br>
      Exchange: ${quote.exchange}
    `;
  }

  private formatVolume(volume: number): string {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return volume.toString();
  }
}

export const networkGraphService = NetworkGraphService.getInstance();
