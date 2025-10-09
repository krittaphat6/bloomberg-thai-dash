import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Line } from '@react-three/drei';
import { Calculator, TrendingUp, ZoomIn, ZoomOut, RotateCw, ArrowLeft, Home } from 'lucide-react';
import * as THREE from 'three';

// Black-Scholes implementation for Greeks calculation
class BlackScholesGreeks {
  static normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  }

  static normalPDF(x: number): number {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
  }

  static d1(S: number, K: number, r: number, sigma: number, T: number): number {
    if (T <= 0) return 0;
    return (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  }

  static d2(S: number, K: number, r: number, sigma: number, T: number): number {
    if (T <= 0) return 0;
    return this.d1(S, K, r, sigma, T) - sigma * Math.sqrt(T);
  }

  static callPrice(S: number, K: number, r: number, sigma: number, T: number): number {
    if (T <= 0) return Math.max(S - K, 0);
    const d1 = this.d1(S, K, r, sigma, T);
    const d2 = this.d2(S, K, r, sigma, T);
    return S * this.normalCDF(d1) - K * Math.exp(-r * T) * this.normalCDF(d2);
  }

  static putPrice(S: number, K: number, r: number, sigma: number, T: number): number {
    if (T <= 0) return Math.max(K - S, 0);
    const d1 = this.d1(S, K, r, sigma, T);
    const d2 = this.d2(S, K, r, sigma, T);
    return K * Math.exp(-r * T) * this.normalCDF(-d2) - S * this.normalCDF(-d1);
  }

  static delta(S: number, K: number, r: number, sigma: number, T: number, isCall: boolean): number {
    if (T <= 0) return 0;
    const d1 = this.d1(S, K, r, sigma, T);
    return isCall ? this.normalCDF(d1) : this.normalCDF(d1) - 1;
  }

  static gamma(S: number, K: number, r: number, sigma: number, T: number): number {
    if (T <= 0 || S <= 0) return 0;
    const d1 = this.d1(S, K, r, sigma, T);
    return this.normalPDF(d1) / (S * sigma * Math.sqrt(T));
  }

  static theta(S: number, K: number, r: number, sigma: number, T: number, isCall: boolean): number {
    if (T <= 0) return 0;
    const d1 = this.d1(S, K, r, sigma, T);
    const d2 = this.d2(S, K, r, sigma, T);
    const term1 = -(S * this.normalPDF(d1) * sigma) / (2 * Math.sqrt(T));
    
    if (isCall) {
      return (term1 - r * K * Math.exp(-r * T) * this.normalCDF(d2)) / 365;
    } else {
      return (term1 + r * K * Math.exp(-r * T) * this.normalCDF(-d2)) / 365;
    }
  }

  static vega(S: number, K: number, r: number, sigma: number, T: number): number {
    if (T <= 0) return 0;
    const d1 = this.d1(S, K, r, sigma, T);
    return (S * this.normalPDF(d1) * Math.sqrt(T)) / 100;
  }

  static rho(S: number, K: number, r: number, sigma: number, T: number, isCall: boolean): number {
    if (T <= 0) return 0;
    const d2 = this.d2(S, K, r, sigma, T);
    if (isCall) {
      return (K * T * Math.exp(-r * T) * this.normalCDF(d2)) / 100;
    } else {
      return -(K * T * Math.exp(-r * T) * this.normalCDF(-d2)) / 100;
    }
  }
}

interface SurfaceData {
  vertices: THREE.Vector3[];
  colors: THREE.Color[];
  indices: number[];
}

interface SurfaceMeshProps {
  data: SurfaceData;
  wireframe?: boolean;
}

function SurfaceMesh({ data, wireframe = false }: SurfaceMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(data.vertices.length * 3);
    const colors = new Float32Array(data.vertices.length * 3);

    data.vertices.forEach((vertex, i) => {
      positions[i * 3] = vertex.x;
      positions[i * 3 + 1] = vertex.y;
      positions[i * 3 + 2] = vertex.z;
      
      colors[i * 3] = data.colors[i].r;
      colors[i * 3 + 1] = data.colors[i].g;
      colors[i * 3 + 2] = data.colors[i].b;
    });

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(data.indices);
    geo.computeVertexNormals();

    return geo;
  }, [data]);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhongMaterial 
        vertexColors 
        side={THREE.DoubleSide} 
        wireframe={wireframe}
        shininess={30}
        specular={new THREE.Color(0x444444)}
      />
    </mesh>
  );
}

interface AxisLinesProps {
  xRange: [number, number];
  yRange: [number, number];
  zRange: [number, number];
}

function AxisLines({ xRange, yRange, zRange }: AxisLinesProps) {
  return (
    <group>
      {/* X Axis */}
      <Line
        points={[[xRange[0], 0, 0], [xRange[1], 0, 0]]}
        color="#F59E0B"
        lineWidth={2}
      />
      <Text position={[xRange[1] + 1, 0, 0]} fontSize={0.5} color="#F59E0B">
        Asset Price
      </Text>

      {/* Y Axis */}
      <Line
        points={[[0, yRange[0], 0], [0, yRange[1], 0]]}
        color="#3B82F6"
        lineWidth={2}
      />
      <Text position={[0, yRange[1] + 1, 0]} fontSize={0.5} color="#3B82F6">
        Days Left
      </Text>

      {/* Z Axis */}
      <Line
        points={[[0, 0, zRange[0]], [0, 0, zRange[1]]]}
        color="#22C55E"
        lineWidth={2}
      />
      <Text position={[0, 0, zRange[1] + 1]} fontSize={0.5} color="#22C55E">
        Greek Value
      </Text>
    </group>
  );
}

type GreekType = 'theta' | 'delta' | 'vega' | 'gamma' | 'rho' | 'price';

export default function OptionsSurfacePlot() {
  const navigate = useNavigate();
  
  // Option parameters
  const [strikePrice, setStrikePrice] = useState(100);
  const [riskFreeRate, setRiskFreeRate] = useState(0.05);
  const [volatility, setVolatility] = useState(0.25);
  const [optionType, setOptionType] = useState<'call' | 'put'>('call');
  const [selectedGreek, setSelectedGreek] = useState<GreekType>('theta');
  const [wireframeMode, setWireframeMode] = useState(false);

  // Surface plot ranges
  const [priceRange, setPriceRange] = useState({ min: 80, max: 120, steps: 30 });
  const [timeRange, setTimeRange] = useState({ min: 1, max: 90, steps: 30 });

  // Calculate surface data
  const surfaceData = useMemo((): SurfaceData => {
    const vertices: THREE.Vector3[] = [];
    const colors: THREE.Color[] = [];
    const indices: number[] = [];

    const priceStep = (priceRange.max - priceRange.min) / priceRange.steps;
    const timeStep = (timeRange.max - timeRange.min) / timeRange.steps;

    let minValue = Infinity;
    let maxValue = -Infinity;
    const values: number[][] = [];

    // Calculate all Greek values
    for (let i = 0; i <= priceRange.steps; i++) {
      values[i] = [];
      const price = priceRange.min + i * priceStep;
      
      for (let j = 0; j <= timeRange.steps; j++) {
        const days = timeRange.min + j * timeStep;
        const T = days / 365;

        let value = 0;
        switch (selectedGreek) {
          case 'theta':
            value = BlackScholesGreeks.theta(price, strikePrice, riskFreeRate, volatility, T, optionType === 'call');
            break;
          case 'delta':
            value = BlackScholesGreeks.delta(price, strikePrice, riskFreeRate, volatility, T, optionType === 'call');
            break;
          case 'vega':
            value = BlackScholesGreeks.vega(price, strikePrice, riskFreeRate, volatility, T);
            break;
          case 'gamma':
            value = BlackScholesGreeks.gamma(price, strikePrice, riskFreeRate, volatility, T);
            break;
          case 'rho':
            value = BlackScholesGreeks.rho(price, strikePrice, riskFreeRate, volatility, T, optionType === 'call');
            break;
          case 'price':
            value = optionType === 'call' 
              ? BlackScholesGreeks.callPrice(price, strikePrice, riskFreeRate, volatility, T)
              : BlackScholesGreeks.putPrice(price, strikePrice, riskFreeRate, volatility, T);
            break;
        }

        values[i][j] = value;
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }
    }

    // Create vertices with normalized positions
    const xScale = 10 / priceRange.steps;
    const yScale = 10 / timeRange.steps;
    const zScale = maxValue - minValue !== 0 ? 8 / (maxValue - minValue) : 1;

    for (let i = 0; i <= priceRange.steps; i++) {
      for (let j = 0; j <= timeRange.steps; j++) {
        const x = (i - priceRange.steps / 2) * xScale;
        const y = (j - timeRange.steps / 2) * yScale;
        const z = (values[i][j] - minValue) * zScale - 4;

        vertices.push(new THREE.Vector3(x, y, z));

        // Color mapping based on value (red for negative, green for positive)
        const normalized = (values[i][j] - minValue) / (maxValue - minValue);
        let color: THREE.Color;
        
        if (values[i][j] < 0) {
          // Negative: Red gradient
          color = new THREE.Color().setHSL(0, 0.8, 0.3 + normalized * 0.4);
        } else {
          // Positive: Green gradient
          color = new THREE.Color().setHSL(0.33, 0.8, 0.3 + normalized * 0.4);
        }
        
        colors.push(color);
      }
    }

    // Create triangle indices
    for (let i = 0; i < priceRange.steps; i++) {
      for (let j = 0; j < timeRange.steps; j++) {
        const a = i * (timeRange.steps + 1) + j;
        const b = a + timeRange.steps + 1;
        const c = a + 1;
        const d = b + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    return { vertices, colors, indices };
  }, [strikePrice, riskFreeRate, volatility, optionType, selectedGreek, priceRange, timeRange]);

  const greekOptions = [
    { value: 'price', label: 'Option Price', icon: '💵' },
    { value: 'theta', label: 'Theta (Time Decay)', icon: '⏱️' },
    { value: 'delta', label: 'Delta (Price Sensitivity)', icon: '📈' },
    { value: 'vega', label: 'Vega (Volatility)', icon: '📊' },
    { value: 'gamma', label: 'Gamma (Delta Change)', icon: '🔄' },
    { value: 'rho', label: 'Rho (Interest Rate)', icon: '💹' },
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header with navigation */}
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="text-terminal-green hover:bg-terminal-green/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Terminal
        </Button>
        <div className="text-2xl font-bold text-terminal-green">
          OPTIONS ANALYTICS LAB
        </div>
        <div className="w-32" /> {/* Spacer for centering */}
      </div>

      <div className="space-y-4">
        <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle className="text-terminal-green flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Options Greeks 3D Surface Plot
            <Badge variant="outline" className="ml-2">Black-Scholes Model</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Control Panel */}
            <div className="space-y-4">
              <div>
                <Label>Strike Price</Label>
                <Input
                  type="number"
                  value={strikePrice}
                  onChange={(e) => setStrikePrice(Number(e.target.value))}
                />
              </div>

              <div>
                <Label>Volatility (σ)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={volatility}
                  onChange={(e) => setVolatility(Number(e.target.value))}
                />
              </div>

              <div>
                <Label>Risk-Free Rate</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={riskFreeRate}
                  onChange={(e) => setRiskFreeRate(Number(e.target.value))}
                />
              </div>

              <div>
                <Label>Option Type</Label>
                <Select value={optionType} onValueChange={(v: 'call' | 'put') => setOptionType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Call Option</SelectItem>
                    <SelectItem value="put">Put Option</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Greek to Visualize</Label>
                <Select value={selectedGreek} onValueChange={(v: GreekType) => setSelectedGreek(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {greekOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={wireframeMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setWireframeMode(!wireframeMode)}
                  className="flex-1"
                >
                  Wireframe
                </Button>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>🖱️ Drag to rotate</p>
                  <p>🔍 Scroll to zoom</p>
                  <p>⌨️ Right-click to pan</p>
                </div>
              </div>
            </div>

            {/* 3D Visualization */}
            <div className="lg:col-span-3 h-[600px] bg-black rounded-lg border border-border overflow-hidden">
              <Canvas>
                <PerspectiveCamera makeDefault position={[15, 15, 15]} />
                <OrbitControls enableDamping dampingFactor={0.05} />
                
                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 10]} intensity={1} />
                <directionalLight position={[-10, -10, -10]} intensity={0.3} />
                <pointLight position={[0, 10, 0]} intensity={0.5} />
                
                {/* Surface */}
                <SurfaceMesh data={surfaceData} wireframe={wireframeMode} />
                
                {/* Axes */}
                <AxisLines
                  xRange={[-5, 5]}
                  yRange={[-5, 5]}
                  zRange={[-4, 4]}
                />
                
                {/* Grid */}
                <gridHelper args={[20, 20, '#333333', '#111111']} position={[0, 0, -4]} />
              </Canvas>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Panel */}
      <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle className="text-sm">Understanding Greeks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-semibold text-terminal-green">Delta (Δ)</div>
              <div className="text-muted-foreground">Rate of change of option price with respect to underlying price</div>
            </div>
            <div>
              <div className="font-semibold text-terminal-green">Gamma (Γ)</div>
              <div className="text-muted-foreground">Rate of change of delta with respect to underlying price</div>
            </div>
            <div>
              <div className="font-semibold text-terminal-green">Theta (Θ)</div>
              <div className="text-muted-foreground">Time decay - change in option price per day</div>
            </div>
            <div>
              <div className="font-semibold text-terminal-green">Vega (ν)</div>
              <div className="text-muted-foreground">Sensitivity to volatility changes</div>
            </div>
            <div>
              <div className="font-semibold text-terminal-green">Rho (ρ)</div>
              <div className="text-muted-foreground">Sensitivity to interest rate changes</div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
