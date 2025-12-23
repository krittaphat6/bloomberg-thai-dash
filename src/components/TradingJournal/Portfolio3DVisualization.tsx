import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Trade, calculateMetrics, calculateEquityCurve } from '@/utils/tradingMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2, RotateCcw, Info } from 'lucide-react';

interface Portfolio3DVisualizationProps {
  trades: Trade[];
  initialCapital: number;
}

interface EquitySurfaceProps {
  equityData: { date: string; cumulativePnL: number; drawdown: number }[];
  maxEquity: number;
  minEquity: number;
}

function EquitySurface({ equityData, maxEquity, minEquity }: EquitySurfaceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    
    const width = equityData.length;
    const depth = 10; // Time dimension
    
    // Create surface points
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < depth; j++) {
        const x = (i / (width - 1)) * 10 - 5;
        const z = (j / (depth - 1)) * 10 - 5;
        
        // Calculate height based on equity with some variation for 3D effect
        const baseEquity = equityData[i].cumulativePnL;
        const normalizedEquity = (baseEquity - minEquity) / (maxEquity - minEquity || 1);
        const variation = Math.sin(j * 0.5) * 0.2;
        const y = normalizedEquity * 5 + variation;
        
        vertices.push(x, y, z);
        
        // Color based on profit/loss
        const color = new THREE.Color();
        if (baseEquity >= 0) {
          color.setHSL(0.33, 0.8, 0.4 + normalizedEquity * 0.3); // Green hues
        } else {
          color.setHSL(0, 0.8, 0.4 - normalizedEquity * 0.2); // Red hues
        }
        colors.push(color.r, color.g, color.b);
      }
    }
    
    // Create indices for triangles
    for (let i = 0; i < width - 1; i++) {
      for (let j = 0; j < depth - 1; j++) {
        const a = i * depth + j;
        const b = a + depth;
        const c = a + 1;
        const d = b + 1;
        
        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }
    
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    
    return geo;
  }, [equityData, maxEquity, minEquity]);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });
  
  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhongMaterial 
        vertexColors 
        side={THREE.DoubleSide}
        shininess={30}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

function GridFloor() {
  return (
    <group position={[0, -0.1, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12, 12, 12]} />
        <meshBasicMaterial 
          color="#1a1a1a" 
          wireframe={false}
          transparent
          opacity={0.5}
        />
      </mesh>
      <gridHelper args={[12, 12, '#333', '#222']} />
    </group>
  );
}

function AxisLabels() {
  return (
    <group>
      {/* X Axis - Time */}
      <Line 
        points={[[-6, 0, 0], [6, 0, 0]]} 
        color="#f59e0b" 
        lineWidth={2}
      />
      <Text position={[6.5, 0, 0]} fontSize={0.4} color="#f59e0b">
        Time
      </Text>
      
      {/* Y Axis - P&L */}
      <Line 
        points={[[0, 0, 0], [0, 6, 0]]} 
        color="#22c55e" 
        lineWidth={2}
      />
      <Text position={[0, 6.5, 0]} fontSize={0.4} color="#22c55e">
        P&L
      </Text>
      
      {/* Z Axis - Risk */}
      <Line 
        points={[[0, 0, -6], [0, 0, 6]]} 
        color="#3b82f6" 
        lineWidth={2}
      />
      <Text position={[0, 0, 6.5]} fontSize={0.4} color="#3b82f6">
        Risk
      </Text>
    </group>
  );
}

function TradeMarkers({ trades }: { trades: Trade[] }) {
  return (
    <group>
      {trades.slice(-20).map((trade, index) => {
        const x = (index / 20) * 10 - 5;
        const y = ((trade.pnl || 0) / 100) * 2;
        const z = 0;
        const isProfit = (trade.pnl || 0) >= 0;
        
        return (
          <mesh key={trade.id} position={[x, Math.abs(y), z]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial 
              color={isProfit ? '#22c55e' : '#ef4444'}
              emissive={isProfit ? '#22c55e' : '#ef4444'}
              emissiveIntensity={0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export default function Portfolio3DVisualization({ trades, initialCapital }: Portfolio3DVisualizationProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const equityData = useMemo(() => {
    return calculateEquityCurve(trades, initialCapital);
  }, [trades, initialCapital]);
  
  const { maxEquity, minEquity } = useMemo(() => {
    if (equityData.length === 0) return { maxEquity: initialCapital, minEquity: 0 };
    const values = equityData.map(e => e.cumulativePnL);
    return {
      maxEquity: Math.max(...values, initialCapital),
      minEquity: Math.min(...values, 0)
    };
  }, [equityData, initialCapital]);
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  return (
    <Card className="border-terminal-green/20 bg-card/50" ref={containerRef}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-terminal-green flex items-center gap-2">
            📊 3D Portfolio Visualization
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Info className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={toggleFullscreen}
            >
              <Maximize2 className="h-4 w-4 text-terminal-green" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className={`${isFullscreen ? 'h-screen' : 'h-[350px]'} bg-black/50 rounded-b-lg`}>
          {trades.length > 0 ? (
            <Canvas>
              <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={50} />
              <OrbitControls 
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                autoRotate={false}
                autoRotateSpeed={0.5}
              />
              
              {/* Lighting */}
              <ambientLight intensity={0.4} />
              <directionalLight position={[10, 10, 5]} intensity={0.8} color="#ffffff" />
              <directionalLight position={[-10, -10, -5]} intensity={0.3} color="#4a9eff" />
              <pointLight position={[0, 5, 0]} intensity={0.5} color="#22c55e" />
              
              {/* Scene elements */}
              <GridFloor />
              <AxisLabels />
              
              {equityData.length > 1 && (
                <EquitySurface 
                  equityData={equityData} 
                  maxEquity={maxEquity}
                  minEquity={minEquity}
                />
              )}
              
              <TradeMarkers trades={trades} />
            </Canvas>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <div>Add trades to see 3D visualization</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="p-3 border-t border-border/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Profit</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Loss</span>
            </div>
          </div>
          <div className="text-muted-foreground">
            Drag to rotate • Scroll to zoom
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
