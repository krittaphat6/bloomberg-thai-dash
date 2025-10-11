import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Line, Stats } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Calculator, ArrowLeft, Camera, Clock, Grid3x3, Activity } from 'lucide-react';
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

// Heatmap Overlay Component
function OptionsHeatmapOverlay({ selectedGreek }: { selectedGreek: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const heatmapTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, 'rgba(0, 0, 255, 0.5)');
    gradient.addColorStop(0.25, 'rgba(0, 255, 255, 0.5)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.5)');
    gradient.addColorStop(0.75, 'rgba(255, 255, 0, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0.5)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [selectedGreek]);
  
  return (
    <mesh ref={meshRef} position={[0, 0, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[20, 20, 50, 50]} />
      <meshBasicMaterial 
        map={heatmapTexture} 
        transparent 
        opacity={0.4}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// Interactive Crosshair Component
function InteractiveCrosshair({ enabled }: { enabled: boolean }) {
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number; z: number } | null>(null);
  
  if (!enabled || !hoverPoint) return null;
  
  return (
    <group>
      <Line
        points={[[-10, 0, hoverPoint.z], [10, 0, hoverPoint.z]]}
        color="#FFFF00"
        lineWidth={2}
      />
      <Line
        points={[[hoverPoint.x, 0, -10], [hoverPoint.x, 0, 10]]}
        color="#FFFF00"
        lineWidth={2}
      />
      <Line
        points={[[hoverPoint.x, 0, hoverPoint.z], [hoverPoint.x, hoverPoint.y, hoverPoint.z]]}
        color="#FF00FF"
        lineWidth={3}
      />
      <mesh position={[hoverPoint.x, hoverPoint.y, hoverPoint.z]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="#FF00FF" />
      </mesh>
    </group>
  );
}

// Implied Volatility Surface Component
function ImpliedVolatilitySurface({ strikeRange, timeRange }: { 
  strikeRange: [number, number]; 
  timeRange: [number, number] 
}) {
  const ivData = useMemo(() => {
    const points: { x: number; y: number; z: number; color: THREE.Color }[] = [];
    
    for (let k = strikeRange[0]; k <= strikeRange[1]; k += 5) {
      for (let t = timeRange[0]; t <= timeRange[1]; t += 10) {
        const moneyness = k / 100;
        const ivBase = 0.2;
        const smile = Math.abs(moneyness - 1) * 0.5;
        const termStructure = Math.sqrt(t / 365) * 0.1;
        const iv = ivBase + smile + termStructure;
        
        const color = new THREE.Color();
        color.setHSL((1 - iv) * 0.7, 0.8, 0.5);
        
        points.push({
          x: (k - strikeRange[0]) / (strikeRange[1] - strikeRange[0]) * 20 - 10,
          y: iv * 10,
          z: (t - timeRange[0]) / (timeRange[1] - timeRange[0]) * 20 - 10,
          color
        });
      }
    }
    
    return points;
  }, [strikeRange, timeRange]);
  
  return (
    <group>
      {ivData.map((point, i) => (
        <mesh key={i} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color={point.color} />
        </mesh>
      ))}
    </group>
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
      <Line
        points={[[xRange[0], 0, 0], [xRange[1], 0, 0]]}
        color="#F59E0B"
        lineWidth={2}
      />
      <Text position={[xRange[1] + 1, 0, 0]} fontSize={0.5} color="#F59E0B">
        Asset Price
      </Text>

      <Line
        points={[[0, yRange[0], 0], [0, yRange[1], 0]]}
        color="#3B82F6"
        lineWidth={2}
      />
      <Text position={[0, yRange[1] + 1, 0]} fontSize={0.5} color="#3B82F6">
        Days Left
      </Text>

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

// Greeks Sensitivity Heatmap Component
function GreeksSensitivityHeatmap({ 
  greek, 
  strikeRange, 
  volRange,
  riskFreeRate,
  optionType 
}: {
  greek: GreekType;
  strikeRange: [number, number];
  volRange: [number, number];
  riskFreeRate: number;
  optionType: 'call' | 'put';
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;
    
    const resolution = 50;
    const imageData = ctx.createImageData(width, height);
    
    let minVal = Infinity;
    let maxVal = -Infinity;
    const values: number[][] = [];
    
    for (let i = 0; i < resolution; i++) {
      values[i] = [];
      for (let j = 0; j < resolution; j++) {
        const strike = strikeRange[0] + (i / resolution) * (strikeRange[1] - strikeRange[0]);
        const vol = volRange[0] + (j / resolution) * (volRange[1] - volRange[0]);
        
        let value = 0;
        const T = 0.25;
        const S = 100;
        
        switch (greek) {
          case 'delta':
            value = BlackScholesGreeks.delta(S, strike, riskFreeRate, vol, T, optionType === 'call');
            break;
          case 'gamma':
            value = BlackScholesGreeks.gamma(S, strike, riskFreeRate, vol, T);
            break;
          case 'theta':
            value = BlackScholesGreeks.theta(S, strike, riskFreeRate, vol, T, optionType === 'call');
            break;
          case 'vega':
            value = BlackScholesGreeks.vega(S, strike, riskFreeRate, vol, T);
            break;
          case 'rho':
            value = BlackScholesGreeks.rho(S, strike, riskFreeRate, vol, T, optionType === 'call');
            break;
          case 'price':
            value = optionType === 'call' 
              ? BlackScholesGreeks.callPrice(S, strike, riskFreeRate, vol, T)
              : BlackScholesGreeks.putPrice(S, strike, riskFreeRate, vol, T);
            break;
        }
        
        values[i][j] = value;
        minVal = Math.min(minVal, value);
        maxVal = Math.max(maxVal, value);
      }
    }
    
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const normalized = maxVal !== minVal ? (values[i][j] - minVal) / (maxVal - minVal) : 0.5;
        const hue = normalized * 240;
        
        const h = hue / 360;
        const s = 0.8;
        const l = 0.5;
        
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = l - c / 2;
        
        let r = 0, g = 0, b = 0;
        if (h < 1/6) { r = c; g = x; b = 0; }
        else if (h < 2/6) { r = x; g = c; b = 0; }
        else if (h < 3/6) { r = 0; g = c; b = x; }
        else if (h < 4/6) { r = 0; g = x; b = c; }
        else if (h < 5/6) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        
        const pixelX = Math.floor((i / resolution) * width);
        const pixelY = Math.floor((j / resolution) * height);
        const pixelIndex = (pixelY * width + pixelX) * 4;
        
        imageData.data[pixelIndex] = (r + m) * 255;
        imageData.data[pixelIndex + 1] = (g + m) * 255;
        imageData.data[pixelIndex + 2] = (b + m) * 255;
        imageData.data[pixelIndex + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }, [greek, strikeRange, volRange, riskFreeRate, optionType]);
  
  return (
    <div>
      <div className="text-sm font-semibold mb-2 text-terminal-green">{greek.toUpperCase()} Sensitivity Heatmap</div>
      <canvas ref={canvasRef} width={300} height={200} className="border border-border rounded" />
      <div className="flex justify-between text-xs mt-1 text-muted-foreground">
        <span>Strike: {strikeRange[0]}</span>
        <span>{strikeRange[1]}</span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Vol: {volRange[0]}</span>
        <span>{volRange[1]}</span>
      </div>
    </div>
  );
}

export default function OptionsSurfacePlot() {
  const navigate = useNavigate();
  
  // Option parameters
  const [strikePrice, setStrikePrice] = useState(100);
  const [riskFreeRate, setRiskFreeRate] = useState(0.05);
  const [volatility, setVolatility] = useState(0.25);
  const [optionType, setOptionType] = useState<'call' | 'put'>('call');
  const [selectedGreek, setSelectedGreek] = useState<GreekType>('theta');
  
  // Visual options
  const [wireframeMode, setWireframeMode] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [showIVSurface, setShowIVSurface] = useState(false);
  const [showBloom, setShowBloom] = useState(true);
  const [showStats, setShowStats] = useState(false);
  
  // Animation
  const [animateTheta, setAnimateTheta] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  
  // Comparison mode
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedGreeks, setSelectedGreeks] = useState<GreekType[]>(['delta', 'gamma']);

  // Surface plot ranges
  const [priceRange] = useState({ min: 80, max: 120, steps: 30 });
  const [timeRange] = useState({ min: 1, max: 90, steps: 30 });

  // Presets
  const presets = {
    'ATM Call': { strikePrice: 100, volatility: 0.2, optionType: 'call' as const },
    'ITM Put': { strikePrice: 90, volatility: 0.3, optionType: 'put' as const },
    'OTM Call': { strikePrice: 110, volatility: 0.25, optionType: 'call' as const },
    'High Vol': { strikePrice: 100, volatility: 0.5, optionType: 'call' as const },
  };

  const applyPreset = (presetName: keyof typeof presets) => {
    const preset = presets[presetName];
    setStrikePrice(preset.strikePrice);
    setVolatility(preset.volatility);
    setOptionType(preset.optionType);
  };

  const exportImage = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `options-surface-${selectedGreek}-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  // Generate surface data
  const generateSurfaceData = (
    strike: number,
    vol: number,
    rate: number,
    type: 'call' | 'put',
    greek: GreekType
  ): SurfaceData => {
    const vertices: THREE.Vector3[] = [];
    const colors: THREE.Color[] = [];
    const indices: number[] = [];

    const priceStep = (priceRange.max - priceRange.min) / priceRange.steps;
    const timeStep = (timeRange.max - timeRange.min) / timeRange.steps;

    let minValue = Infinity;
    let maxValue = -Infinity;
    const values: number[][] = [];

    for (let i = 0; i <= priceRange.steps; i++) {
      values[i] = [];
      const price = priceRange.min + i * priceStep;
      
      for (let j = 0; j <= timeRange.steps; j++) {
        const days = timeRange.min + j * timeStep;
        const T = animateTheta ? Math.max(1/365, 1 - animationTime) : days / 365;

        let value = 0;
        switch (greek) {
          case 'theta':
            value = BlackScholesGreeks.theta(price, strike, rate, vol, T, type === 'call');
            break;
          case 'delta':
            value = BlackScholesGreeks.delta(price, strike, rate, vol, T, type === 'call');
            break;
          case 'vega':
            value = BlackScholesGreeks.vega(price, strike, rate, vol, T);
            break;
          case 'gamma':
            value = BlackScholesGreeks.gamma(price, strike, rate, vol, T);
            break;
          case 'rho':
            value = BlackScholesGreeks.rho(price, strike, rate, vol, T, type === 'call');
            break;
          case 'price':
            value = type === 'call' 
              ? BlackScholesGreeks.callPrice(price, strike, rate, vol, T)
              : BlackScholesGreeks.putPrice(price, strike, rate, vol, T);
            break;
        }

        values[i][j] = value;
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }
    }

    const xScale = 10 / priceRange.steps;
    const yScale = 10 / timeRange.steps;
    const zScale = maxValue - minValue !== 0 ? 8 / (maxValue - minValue) : 1;

    for (let i = 0; i <= priceRange.steps; i++) {
      for (let j = 0; j <= timeRange.steps; j++) {
        const x = (i - priceRange.steps / 2) * xScale;
        const y = (j - timeRange.steps / 2) * yScale;
        const z = (values[i][j] - minValue) * zScale - 4;

        vertices.push(new THREE.Vector3(x, y, z));

        const normalized = (values[i][j] - minValue) / (maxValue - minValue);
        let color: THREE.Color;
        
        if (values[i][j] < 0) {
          color = new THREE.Color().setHSL(0, 0.8, 0.3 + normalized * 0.4);
        } else {
          color = new THREE.Color().setHSL(0.33, 0.8, 0.3 + normalized * 0.4);
        }
        
        colors.push(color);
      }
    }

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
  };

  const surfaceData = useMemo(
    () => generateSurfaceData(strikePrice, volatility, riskFreeRate, optionType, selectedGreek),
    [strikePrice, volatility, riskFreeRate, optionType, selectedGreek, animationTime]
  );

  useEffect(() => {
    if (animateTheta) {
      const interval = setInterval(() => {
        setAnimationTime((t) => (t + 0.01) % 1);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [animateTheta]);

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
        <div className="w-32" />
      </div>

      <div className="space-y-4">
        <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle className="text-terminal-green flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Options Greeks 3D Surface Plot - Professional Edition
            <Badge variant="outline" className="ml-2">Black-Scholes Model</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
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

              <div className="pt-2 border-t border-border space-y-2">
                <Label>Quick Presets</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(presets).map(preset => (
                    <Button
                      key={preset}
                      size="sm"
                      variant="outline"
                      onClick={() => applyPreset(preset as keyof typeof presets)}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border space-y-2">
                <Label>Visual Effects</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={wireframeMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWireframeMode(!wireframeMode)}
                  >
                    <Grid3x3 className="h-4 w-4 mr-1" />
                    Wireframe
                  </Button>
                  <Button
                    variant={showHeatmap ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowHeatmap(!showHeatmap)}
                  >
                    🔥 Heatmap
                  </Button>
                  <Button
                    variant={showBloom ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowBloom(!showBloom)}
                  >
                    ✨ Bloom
                  </Button>
                  <Button
                    variant={showStats ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowStats(!showStats)}
                  >
                    <Activity className="h-4 w-4 mr-1" />
                    Stats
                  </Button>
                  <Button
                    variant={showIVSurface ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowIVSurface(!showIVSurface)}
                  >
                    📊 IV Surface
                  </Button>
                  <Button
                    variant={animateTheta ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAnimateTheta(!animateTheta)}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    {animateTheta ? 'Stop' : 'Animate'}
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t border-border space-y-2">
                <Label>Comparison Mode</Label>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={comparisonMode}
                    onChange={(e) => setComparisonMode(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-xs">Show Multiple Greeks</span>
                </div>
                {comparisonMode && (
                  <div className="mt-2 space-y-1">
                    {greekOptions.slice(0, 4).map(opt => (
                      <div key={opt.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedGreeks.includes(opt.value as GreekType)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGreeks([...selectedGreeks, opt.value as GreekType]);
                            } else {
                              setSelectedGreeks(selectedGreeks.filter(g => g !== opt.value));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-xs">{opt.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button size="sm" onClick={exportImage} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Export Image
              </Button>

              <div className="pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>🖱️ Drag to rotate</p>
                  <p>🔍 Scroll to zoom</p>
                  <p>⌨️ Right-click to pan</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 h-[600px] bg-black rounded-lg border border-border overflow-hidden">
              <Canvas>
                <PerspectiveCamera makeDefault position={[15, 15, 15]} />
                <OrbitControls enableDamping dampingFactor={0.05} />
                
                {showStats && <Stats />}
                
                <ambientLight intensity={0.3} />
                <directionalLight position={[10, 10, 10]} intensity={1} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4444ff" />
                
                {comparisonMode ? (
                  <group>
                    {selectedGreeks.map((greek, i) => {
                      const data = generateSurfaceData(strikePrice, volatility, riskFreeRate, optionType, greek);
                      return (
                        <group key={greek} position={[i * 12 - (selectedGreeks.length - 1) * 6, 0, 0]}>
                          <SurfaceMesh data={data} wireframe={wireframeMode} />
                          <Text position={[0, 8, 0]} fontSize={0.8} color="#22C55E">
                            {greek.toUpperCase()}
                          </Text>
                        </group>
                      );
                    })}
                  </group>
                ) : (
                  <>
                    <SurfaceMesh data={surfaceData} wireframe={wireframeMode} />
                    {showHeatmap && <OptionsHeatmapOverlay selectedGreek={selectedGreek} />}
                    {showIVSurface && <ImpliedVolatilitySurface strikeRange={[80, 120]} timeRange={[1, 90]} />}
                  </>
                )}
                
                <InteractiveCrosshair enabled={showCrosshair} />
                
                <AxisLines
                  xRange={[-5, 5]}
                  yRange={[-5, 5]}
                  zRange={[-4, 4]}
                />
                
                <gridHelper args={[20, 20, '#333333', '#111111']} position={[0, 0, -4]} />
                
                {showBloom && (
                  <EffectComposer>
                    <Bloom 
                      intensity={1.5} 
                      luminanceThreshold={0.3} 
                      luminanceSmoothing={0.9} 
                    />
                  </EffectComposer>
                )}
              </Canvas>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle className="text-sm text-terminal-green">Greeks Sensitivity Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <GreeksSensitivityHeatmap 
              greek={selectedGreek} 
              strikeRange={[strikePrice * 0.8, strikePrice * 1.2]}
              volRange={[0.1, 0.5]}
              riskFreeRate={riskFreeRate}
              optionType={optionType}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle className="text-sm text-terminal-green">Understanding Greeks</CardTitle>
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