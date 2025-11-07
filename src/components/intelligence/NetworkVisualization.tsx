import { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network/standalone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NetworkData } from '@/services/intelligence/NetworkGraphService';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Settings } from 'lucide-react';

interface NetworkVisualizationProps {
  data: NetworkData;
  title?: string;
  height?: number;
}

export const NetworkVisualization = ({ 
  data, 
  title = 'Market Network', 
  height = 600 
}: NetworkVisualizationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isPhysicsEnabled, setIsPhysicsEnabled] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const options = {
      nodes: {
        shape: 'dot',
        scaling: {
          min: 10,
          max: 50,
          label: {
            enabled: true,
            min: 12,
            max: 24
          }
        },
        font: {
          size: 14,
          color: '#ffffff',
          face: 'monospace',
          strokeWidth: 3,
          strokeColor: '#000000'
        },
        borderWidth: 2,
        borderWidthSelected: 4,
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.5)',
          size: 10,
          x: 3,
          y: 3
        }
      },
      edges: {
        width: 2,
        smooth: {
          enabled: true,
          type: 'continuous',
          roundness: 0.5
        },
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.3)',
          size: 5
        },
        font: {
          size: 10,
          color: '#ffffff',
          strokeWidth: 2,
          strokeColor: '#000000'
        }
      },
      physics: {
        enabled: isPhysicsEnabled,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 200,
          springConstant: 0.08,
          damping: 0.4,
          avoidOverlap: 0.5
        },
        stabilization: {
          enabled: true,
          iterations: 100,
          updateInterval: 25
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        navigationButtons: true,
        keyboard: true,
        zoomView: true,
        dragView: true
      },
      layout: {
        improvedLayout: true,
        hierarchical: false
      }
    };

    const network = new Network(
      containerRef.current,
      data,
      options
    );

    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        setSelectedNode(nodeId as string);
        network.selectNodes([nodeId]);
      } else {
        setSelectedNode(null);
      }
    });

    network.on('hoverNode', () => {
      containerRef.current!.style.cursor = 'pointer';
    });

    network.on('blurNode', () => {
      containerRef.current!.style.cursor = 'default';
    });

    network.on('doubleClick', (params) => {
      if (params.nodes.length > 0) {
        network.focus(params.nodes[0], {
          scale: 2,
          animation: {
            duration: 1000,
            easingFunction: 'easeInOutQuad'
          }
        });
      }
    });

    networkRef.current = network;

    return () => {
      network.destroy();
    };
  }, [data, isPhysicsEnabled]);

  const handleZoomIn = () => {
    networkRef.current?.moveTo({ scale: (networkRef.current.getScale() || 1) * 1.2 });
  };

  const handleZoomOut = () => {
    networkRef.current?.moveTo({ scale: (networkRef.current.getScale() || 1) * 0.8 });
  };

  const handleFit = () => {
    networkRef.current?.fit({
      animation: {
        duration: 1000,
        easingFunction: 'easeInOutQuad'
      }
    });
  };

  const handleReset = () => {
    networkRef.current?.moveTo({
      position: { x: 0, y: 0 },
      scale: 1,
      animation: {
        duration: 1000,
        easingFunction: 'easeInOutQuad'
      }
    });
  };

  const togglePhysics = () => {
    setIsPhysicsEnabled(!isPhysicsEnabled);
    if (networkRef.current) {
      networkRef.current.setOptions({
        physics: { enabled: !isPhysicsEnabled }
      });
    }
  };

  return (
    <Card className="p-4 bg-black/90 border-primary/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-primary">{title}</h3>
          <Badge variant="outline" className="bg-primary/20">
            {data.nodes.length} Nodes • {data.edges.length} Connections
          </Badge>
          {selectedNode && (
            <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400">
              Selected: {selectedNode}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleZoomIn}
            className="bg-primary/10 hover:bg-primary/20"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleZoomOut}
            className="bg-primary/10 hover:bg-primary/20"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleFit}
            className="bg-primary/10 hover:bg-primary/20"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
            className="bg-primary/10 hover:bg-primary/20"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={isPhysicsEnabled ? "default" : "outline"}
            onClick={togglePhysics}
            className={isPhysicsEnabled ? "bg-green-500/20 text-green-400" : "bg-primary/10"}
          >
            <Settings className="w-4 h-4 mr-1" />
            Physics
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{ height: `${height}px` }}
        className="w-full border border-primary/20 rounded-lg bg-gradient-to-br from-black via-gray-900 to-black"
      />

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-muted-foreground">Gaining</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-muted-foreground">Declining</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-blue-500"></div>
          <span className="text-muted-foreground">Sector Connection</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-yellow-500 border-dashed border-t-2"></div>
          <span className="text-muted-foreground">Correlation</span>
        </div>
      </div>
    </Card>
  );
};
