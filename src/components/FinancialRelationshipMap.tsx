import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import * as d3 from 'd3';
import * as XLSX from 'xlsx';
import { FinancialGraphLayout, FinancialAsset, FinancialNode } from '@/utils/FinancialGraphLayout';

interface Props {
  className?: string;
}

export const FinancialRelationshipMap = ({ className }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<FinancialNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<FinancialNode | null>(null);
  const [layoutType, setLayoutType] = useState<'region' | 'hierarchical'>('region');
  const [loading, setLoading] = useState(false);

  // Debug helper
  useEffect(() => {
    console.log('🔍 FinancialRelationshipMap Debug Info:');
    console.log('  - Component mounted');
    console.log('  - Current nodes count:', nodes.length);
    console.log('  - Layout type:', layoutType);
    console.log('  - Loading state:', loading);
    
    if (nodes.length > 0) {
      console.log('  - Sample node:', nodes[0]);
      const regions = [...new Set(nodes.map(n => n.region))];
      console.log('  - Unique regions:', regions);
    }
  }, [nodes, layoutType, loading]);

  useEffect(() => {
    loadExcelData();
  }, []);

  const loadExcelData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading Excel data...');
      
      const response = await fetch('/wisdom14.xlsx');
      if (!response.ok) throw new Error('File not found');
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('✅ File loaded successfully');
      
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      console.log('📊 Workbook parsed, sheets:', workbook.SheetNames);
      
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(firstSheet);
      console.log('📈 Data rows:', data.length);

      if (data.length === 0) {
        console.warn('⚠️ No data found in Excel');
        loadMockData();
        return;
      }

      const assets: FinancialAsset[] = data.map((row: any, index: number) => ({
        id: `asset-${index}`,
        name: row['Field'] || 'Unknown',
        position: row['Position'] || '',
        region: row['Region'] || 'NONE',
        marketValue: row['Curr MV'] || '0',
        positionSize: row['Position_1'] || 0,
        posChange: row['Pos Chg'] || 0
      }));

      console.log('🎯 Assets created:', assets.length);
      console.log('📍 Sample asset:', assets[0]);
      
      const financialNodes = FinancialGraphLayout.createFinancialNodes(assets);
      console.log('🔵 Nodes created:', financialNodes.length);
      console.log('🗺️ Sample node:', financialNodes[0]);
      
      const regionCounts = financialNodes.reduce((acc, node) => {
        acc[node.region] = (acc[node.region] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('🌍 Regions distribution:', regionCounts);
      
      setNodes(financialNodes);
      console.log('✅ Nodes set successfully');
    } catch (error) {
      console.error('❌ Error loading Excel:', error);
      console.log('🔄 Loading fallback mock data...');
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    console.log('📝 Creating mock financial data...');
    
    const mockAssets: FinancialAsset[] = [
      // North America
      { id: '1', name: 'US Treasury Note', position: 'CT10 Govt', region: 'North America', marketValue: '6.96BLN', positionSize: 5593250, posChange: 1 },
      { id: '2', name: 'Microsoft Corp', position: 'MSFT US', region: 'North America', marketValue: '3.33BLN', positionSize: 4591808, posChange: -8576 },
      { id: '3', name: 'Apple Inc', position: 'AAPL US', region: 'North America', marketValue: '2.85BLN', positionSize: 3821000, posChange: 2500 },
      { id: '4', name: 'Tesla Inc', position: 'TSLA US', region: 'North America', marketValue: '1.92BLN', positionSize: 2150000, posChange: -1200 },
      { id: '5', name: 'Amazon.com', position: 'AMZN US', region: 'North America', marketValue: '2.15BLN', positionSize: 2800000, posChange: 1800 },
      
      // Europe
      { id: '6', name: 'Euro Spot', position: 'EUR Curncy', region: 'Europe', marketValue: '5.80BLN', positionSize: 3941497757, posChange: 5938 },
      { id: '7', name: 'ASML Holding', position: 'ASML NA', region: 'Europe', marketValue: '1.75BLN', positionSize: 1920000, posChange: 850 },
      { id: '8', name: 'SAP SE', position: 'SAP GR', region: 'Europe', marketValue: '1.45BLN', positionSize: 1650000, posChange: 620 },
      { id: '9', name: 'Novo Nordisk', position: 'NOVOB DC', region: 'Europe', marketValue: '1.25BLN', positionSize: 1420000, posChange: -320 },
      
      // Asia
      { id: '10', name: 'Taiwan Semi', position: 'TSM US', region: 'Asia', marketValue: '2.45BLN', positionSize: 2950000, posChange: 1500 },
      { id: '11', name: 'Alibaba Group', position: 'BABA US', region: 'Asia', marketValue: '1.85BLN', positionSize: 2100000, posChange: -850 },
      { id: '12', name: 'Tencent Holdings', position: '700 HK', region: 'Asia', marketValue: '1.65BLN', positionSize: 1880000, posChange: 720 },
      { id: '13', name: 'Samsung Elec', position: '005930 KS', region: 'Asia', marketValue: '1.95BLN', positionSize: 2250000, posChange: 960 },
      
      // NONE (Mixed/Other)
      { id: '14', name: 'Bitcoin Future', position: 'BTC1 Comdty', region: 'NONE', marketValue: '875MLN', positionSize: 850000, posChange: 12500 },
      { id: '15', name: 'Gold Spot', position: 'XAU Curncy', region: 'NONE', marketValue: '650MLN', positionSize: 620000, posChange: 3200 },
    ];
    
    const mockNodes = FinancialGraphLayout.createFinancialNodes(mockAssets);
    console.log('✅ Mock nodes created:', mockNodes.length);
    setNodes(mockNodes);
  };

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 1000;
    const height = 700;

    if (layoutType === 'region') {
      const clusters = FinancialGraphLayout.clusterByRegionAndType(nodes, width, height);
      renderClusteredGraph(svg, nodes, clusters, width, height);
    } else {
      FinancialGraphLayout.hierarchicalLayout(nodes, width, height);
      renderHierarchicalGraph(svg, nodes, width, height);
    }
  }, [nodes, layoutType, selectedNode]);

  const renderClusteredGraph = (
    svg: any,
    nodes: FinancialNode[],
    clusters: any[],
    width: number,
    height: number
  ) => {
    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    clusters.forEach(cluster => {
      g.append("circle")
        .attr("cx", cluster.center.x)
        .attr("cy", cluster.center.y)
        .attr("r", cluster.radius)
        .attr("fill", cluster.color)
        .attr("opacity", 0.1)
        .attr("stroke", cluster.color)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");

      g.append("text")
        .attr("x", cluster.center.x)
        .attr("y", cluster.center.y - cluster.radius - 10)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("fill", cluster.color)
        .text(cluster.label);
    });

    const links = FinancialGraphLayout.createLinks(nodes);
    g.append("g").selectAll("line").data(links).enter().append("line")
      .attr("x1", d => {
        const source = nodes.find(n => n.id === d.source);
        return source?.x || 0;
      })
      .attr("y1", d => {
        const source = nodes.find(n => n.id === d.source);
        return source?.y || 0;
      })
      .attr("x2", d => {
        const target = nodes.find(n => n.id === d.target);
        return target?.x || 0;
      })
      .attr("y2", d => {
        const target = nodes.find(n => n.id === d.target);
        return target?.y || 0;
      })
      .attr("stroke", "#FFFFFF")
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", 1);

    // CRITICAL: Create nodes WITHOUT dragging (which re-enables simulation)
    const nodeGroups = g.append("g").selectAll("g").data(nodes).enter().append("g")
      .attr("transform", d => `translate(${d.x},${d.y})`)  // Use FIXED positions
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
      })
      .on("mouseover", function(event, d) {
        d3.select(this).select("circle")
          .transition().duration(200)
          .attr("stroke-width", 4)
          .attr("stroke", "#FFFFFF");
      })
      .on("mouseout", function(event, d) {
        if (selectedNode?.id !== d.id) {
          d3.select(this).select("circle")
            .transition().duration(200)
            .attr("stroke-width", 2)
            .attr("stroke", "#374151");
        }
      });
      // ❌ NO DRAG BEHAVIOR - keeps positions fixed!

    nodeGroups.append("circle")
      .attr("r", d => d.size)
      .attr("fill", d => d.color)
      .attr("stroke", d => selectedNode?.id === d.id ? "#FFFFFF" : "#374151")
      .attr("stroke-width", d => selectedNode?.id === d.id ? 4 : 2)
      .style("filter", "drop-shadow(0px 2px 6px rgba(0,0,0,0.6))")
      .style("transition", "all 0.3s ease");

    // Show ALL node labels (not just large ones)
    nodeGroups.append("text")
      .text(d => {
        const name = d.name;
        return name.length > 15 ? name.substring(0, 15) + '...' : name;
      })
      .attr("y", d => d.size + 16)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("font-weight", "500")
      .attr("fill", "#FFFFFF")
      .style("text-shadow", "0px 1px 3px rgba(0,0,0,0.9)")
      .style("pointer-events", "none");
  };

  const renderHierarchicalGraph = (
    svg: any,
    nodes: FinancialNode[],
    width: number,
    height: number
  ) => {
    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    const centerNode = nodes[0];
    if (centerNode) {
      g.append("g").selectAll("line").data(nodes.slice(1)).enter().append("line")
        .attr("x1", centerNode.x).attr("y1", centerNode.y)
        .attr("x2", d => d.x || 0).attr("y2", d => d.y || 0)
        .attr("stroke", "#8B5CF6").attr("stroke-opacity", 0.2).attr("stroke-width", 1);
    }

    const nodeGroups = g.append("g").selectAll("g").data(nodes).enter().append("g")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => setSelectedNode(d));

    nodeGroups.append("circle")
      .attr("r", d => d.size)
      .attr("fill", d => d.color)
      .attr("stroke", d => selectedNode?.id === d.id ? "#FFFFFF" : "#374151")
      .attr("stroke-width", d => selectedNode?.id === d.id ? 3 : 2)
      .style("filter", "drop-shadow(0px 2px 4px rgba(0,0,0,0.4))");

    nodeGroups.append("text")
      .text(d => d.name.length > 12 ? d.name.substring(0, 12) + '...' : d.name)
      .attr("y", d => d.size + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#FFFFFF")
      .style("text-shadow", "0px 1px 2px rgba(0,0,0,0.8)");
  };

  return (
    <Card className={`${className} bg-background border-border h-full`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-terminal-green flex items-center gap-2">
            <span>🌐</span> Financial Relationship Map
          </CardTitle>
          <div className="flex gap-2">
            <Select value={layoutType} onValueChange={(v: any) => setLayoutType(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="region">Group by Region</SelectItem>
                <SelectItem value="hierarchical">By Size</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={loadExcelData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {selectedNode && (
          <div className="mt-2 p-3 bg-muted rounded-lg">
            <div className="text-sm font-bold">{selectedNode.name}</div>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline">{selectedNode.region}</Badge>
              <Badge variant="outline">{selectedNode.assetType}</Badge>
              <Badge variant="outline">${(selectedNode.marketValue / 1000000000).toFixed(2)}B</Badge>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[600px] gap-4">
            <RefreshCw className="h-12 w-12 text-terminal-green animate-spin" />
            <div className="text-terminal-green text-lg">Loading financial data...</div>
            <div className="text-muted-foreground text-sm">Reading wisdom14.xlsx</div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[600px] gap-4">
            <div className="text-yellow-500 text-lg">⚠️ No data loaded</div>
            <div className="text-muted-foreground text-sm">Check console for details</div>
            <Button onClick={loadExcelData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Loading
            </Button>
          </div>
        ) : (
          <>
            <svg 
              ref={svgRef} 
              width="100%" 
              height="600" 
              style={{ background: '#000000', border: '1px solid #333' }} 
            />
            <div className="mt-2 text-xs text-muted-foreground flex justify-between">
              <span>Total Assets: {nodes.length}</span>
              <span>Total Value: ${(nodes.reduce((s, n) => s + n.marketValue, 0) / 1e9).toFixed(2)}B</span>
              <span>Layout: {layoutType === 'region' ? 'Grouped by Region' : 'Hierarchical'}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
