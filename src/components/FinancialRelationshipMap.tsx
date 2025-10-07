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

  useEffect(() => {
    loadExcelData();
  }, []);

  const loadExcelData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/wisdom14.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(firstSheet);

      const assets: FinancialAsset[] = data.map((row: any, index: number) => ({
        id: `asset-${index}`,
        name: row['Field'] || 'Unknown',
        position: row['Position'] || '',
        region: row['Region'] || 'NONE',
        marketValue: row['Curr MV'] || '0',
        positionSize: row['Position_1'] || 0,
        posChange: row['Pos Chg'] || 0
      }));

      const financialNodes = FinancialGraphLayout.createFinancialNodes(assets);
      setNodes(financialNodes);
    } catch (error) {
      console.error('Error loading Excel:', error);
    } finally {
      setLoading(false);
    }
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

    const nodeGroups = g.append("g").selectAll("g").data(nodes).enter().append("g")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => setSelectedNode(d))
      .on("mouseover", function(event, d) {
        d3.select(this).select("circle")
          .attr("stroke-width", 3)
          .attr("stroke", "#FFFFFF");
      })
      .on("mouseout", function(event, d) {
        if (selectedNode?.id !== d.id) {
          d3.select(this).select("circle")
            .attr("stroke-width", 2)
            .attr("stroke", "#374151");
        }
      });

    nodeGroups.append("circle")
      .attr("r", d => d.size)
      .attr("fill", d => d.color)
      .attr("stroke", d => selectedNode?.id === d.id ? "#FFFFFF" : "#374151")
      .attr("stroke-width", d => selectedNode?.id === d.id ? 3 : 2)
      .style("filter", "drop-shadow(0px 2px 4px rgba(0,0,0,0.4))");

    nodeGroups.filter(d => d.size > 15).append("text")
      .text(d => d.name.length > 12 ? d.name.substring(0, 12) + '...' : d.name)
      .attr("y", d => d.size + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#FFFFFF")
      .style("text-shadow", "0px 1px 2px rgba(0,0,0,0.8)");
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
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-terminal-green">Loading...</div>
          </div>
        ) : (
          <svg ref={svgRef} width="100%" height="600" style={{ background: '#000000' }} />
        )}
        <div className="mt-2 text-xs text-muted-foreground">
          Assets: {nodes.length} | Total: ${(nodes.reduce((s, n) => s + n.marketValue, 0) / 1e9).toFixed(2)}B
        </div>
      </CardContent>
    </Card>
  );
};
