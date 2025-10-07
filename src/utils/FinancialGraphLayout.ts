// FinancialGraphLayout.ts - Smart clustering algorithm for financial data

export interface FinancialAsset {
  id: string;
  name: string;
  position: string;
  region: string;
  marketValue: string; // "6.96BLN", "3.33BLN"
  positionSize: number;
  assetType?: string;
  posChange?: number;
}

export interface FinancialNode {
  id: string;
  name: string;
  region: string;
  assetType: string;
  marketValue: number;
  size: number;
  color: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface ClusterGroup {
  id: string;
  label: string;
  region: string;
  nodes: string[];
  center: { x: number; y: number };
  radius: number;
  color: string;
}

export class FinancialGraphLayout {
  private static readonly REGION_COLORS: Record<string, string> = {
    'North America': '#3B82F6',
    'Europe': '#22C55E',
    'Asia': '#F59E0B',
    'South America': '#EF4444',
    'Middle East': '#8B5CF6',
    'Africa': '#EC4899',
    'Oceania': '#14B8A6',
    'NONE': '#9CA3AF'
  };

  private static parseMarketValue(mvString: string): number {
    if (!mvString) return 0;
    const value = parseFloat(mvString.replace(/[^0-9.]/g, ''));
    if (mvString.includes('BLN') || mvString.includes('B')) return value * 1000000000;
    if (mvString.includes('MLN') || mvString.includes('M')) return value * 1000000;
    if (mvString.includes('K')) return value * 1000;
    return value;
  }

  private static detectAssetType(name: string, position: string): string {
    const nameLower = name.toLowerCase();
    const posLower = position.toLowerCase();
    if (nameLower.includes('treasury') || nameLower.includes('bond')) return 'Treasury/Bond';
    if (nameLower.includes('euro') || nameLower.includes('dollar') || posLower.includes('curncy')) return 'Currency';
    if (nameLower.includes('equity') || posLower.includes('equity')) return 'Equity';
    if (nameLower.includes('option') || posLower.includes('option')) return 'Option';
    if (nameLower.includes('future') || posLower.includes('future')) return 'Future';
    if (nameLower.includes('etf')) return 'ETF';
    if (posLower.includes('us') || posLower.includes('corp')) return 'Stock';
    return 'Other';
  }

  static createFinancialNodes(assets: FinancialAsset[]): FinancialNode[] {
    const nodes = assets.map(asset => {
      const marketValue = this.parseMarketValue(asset.marketValue);
      const assetType = asset.assetType || this.detectAssetType(asset.name, asset.position);
      const region = asset.region || 'NONE';
      return {
        id: asset.id,
        name: asset.name,
        region,
        assetType,
        marketValue,
        size: 0,
        color: this.REGION_COLORS[region] || '#9CA3AF'
      };
    });

    const maxValue = Math.max(...nodes.map(n => n.marketValue));
    const minValue = Math.min(...nodes.filter(n => n.marketValue > 0).map(n => n.marketValue));
    
    nodes.forEach(node => {
      if (node.marketValue > 0) {
        const normalized = (node.marketValue - minValue) / (maxValue - minValue);
        node.size = 8 + normalized * 32;
      } else {
        node.size = 8;
      }
    });

    return nodes;
  }

  static clusterByRegionAndType(nodes: FinancialNode[], width: number, height: number): ClusterGroup[] {
    const regionGroups = new Map<string, FinancialNode[]>();
    nodes.forEach(node => {
      if (!regionGroups.has(node.region)) regionGroups.set(node.region, []);
      regionGroups.get(node.region)!.push(node);
    });

    const clusters: ClusterGroup[] = [];
    const regionCount = regionGroups.size;
    const angleStep = (2 * Math.PI) / regionCount;
    const centerX = width / 2;
    const centerY = height / 2;
    const mainRadius = Math.min(width, height) * 0.3;

    let regionIndex = 0;
    regionGroups.forEach((regionNodes, regionName) => {
      const angle = regionIndex * angleStep;
      const regionCenterX = centerX + Math.cos(angle) * mainRadius;
      const regionCenterY = centerY + Math.sin(angle) * mainRadius;

      const sortedNodes = [...regionNodes].sort((a, b) => b.marketValue - a.marketValue);
      const clusterRadius = Math.max(80, Math.sqrt(sortedNodes.length) * 30);

      sortedNodes.forEach((node, i) => {
        const nodeAngle = (i / sortedNodes.length) * 2 * Math.PI;
        const distanceRatio = 1 - (node.size / 40) * 0.3;
        const nodeRadius = clusterRadius * distanceRatio;
        node.x = regionCenterX + Math.cos(nodeAngle) * nodeRadius;
        node.y = regionCenterY + Math.sin(nodeAngle) * nodeRadius;
      });

      clusters.push({
        id: `region-${regionIndex}`,
        label: regionName,
        region: regionName,
        nodes: sortedNodes.map(n => n.id),
        center: { x: regionCenterX, y: regionCenterY },
        radius: clusterRadius,
        color: this.REGION_COLORS[regionName] || '#9CA3AF'
      });

      regionIndex++;
    });

    return clusters;
  }

  static createLinks(nodes: FinancialNode[]): Array<{ source: string; target: string; type: string }> {
    const links: Array<{ source: string; target: string; type: string }> = [];
    const regionMap = new Map<string, FinancialNode[]>();
    
    nodes.forEach(node => {
      if (!regionMap.has(node.region)) regionMap.set(node.region, []);
      regionMap.get(node.region)!.push(node);
    });

    regionMap.forEach((regionNodes) => {
      const topAssets = regionNodes.sort((a, b) => b.marketValue - a.marketValue).slice(0, 5);
      for (let i = 0; i < topAssets.length - 1; i++) {
        links.push({ source: topAssets[i].id, target: topAssets[i + 1].id, type: 'region' });
      }
    });

    return links;
  }

  static hierarchicalLayout(nodes: FinancialNode[], width: number, height: number): void {
    const sorted = [...nodes].sort((a, b) => b.marketValue - a.marketValue);
    const centerX = width / 2;
    const centerY = height / 2;
    
    if (sorted.length > 0) {
      sorted[0].x = centerX;
      sorted[0].y = centerY;
    }

    for (let i = 1; i < sorted.length; i++) {
      const angle = (i / (sorted.length - 1)) * 2 * Math.PI;
      const normalized = i / sorted.length;
      const radius = 100 + normalized * 300;
      sorted[i].x = centerX + Math.cos(angle) * radius;
      sorted[i].y = centerY + Math.sin(angle) * radius;
    }
  }
}
