import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as THREE from 'three';
import { Settings, Play, Pause } from 'lucide-react';

interface VolatilitySurfaceProps {
  ticker?: string;
}

interface SurfaceParameters {
  ticker: string;
  riskFreeRate: number;
  dividendYield: number;
  minStrikeFilter: number; // percentage of spot price
  maxStrikeFilter: number; // percentage of spot price
  yAxisType: 'strike' | 'moneyness';
}

export const VolatilitySurface = ({ ticker = 'AAPL' }: VolatilitySurfaceProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const frameIdRef = useRef<number>();
  const surfaceRef = useRef<THREE.Mesh>();
  
  const [autoRotate, setAutoRotate] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [parameters, setParameters] = useState<SurfaceParameters>({
    ticker: ticker,
    riskFreeRate: 0.05,
    dividendYield: 0.02,
    minStrikeFilter: 80,
    maxStrikeFilter: 120,
    yAxisType: 'strike'
  });

  // Generate realistic implied volatility surface data
  const generateVolatilityData = () => {
    const spotPrice = 100; // Normalized spot price
    const timeToExpirations = []; // Days to expiration
    const strikes = [];
    const volatilities = [];

    // Generate time to expiration range (7 days to 365 days)
    for (let t = 7; t <= 365; t += 14) {
      timeToExpirations.push(t / 365); // Convert to years
    }

    // Generate strike prices based on filters
    const minStrike = spotPrice * (parameters.minStrikeFilter / 100);
    const maxStrike = spotPrice * (parameters.maxStrikeFilter / 100);
    
    for (let s = minStrike; s <= maxStrike; s += 2.5) {
      strikes.push(s);
    }

    // Generate implied volatility surface with realistic patterns
    const surface = [];
    for (let i = 0; i < timeToExpirations.length; i++) {
      const row = [];
      for (let j = 0; j < strikes.length; j++) {
        const T = timeToExpirations[i];
        const K = strikes[j];
        const moneyness = K / spotPrice;
        
        // Base volatility with time decay
        let iv = 0.20 + 0.05 * Math.exp(-T * 2); // Higher vol for shorter term
        
        // Volatility smile/skew
        const skew = Math.pow(moneyness - 1, 2) * 0.3; // U-shaped smile
        const skewAsymmetry = (moneyness - 1) * -0.1; // Put skew (higher vol for OTM puts)
        
        // Add some noise and structure
        iv += skew + skewAsymmetry;
        iv += Math.sin(moneyness * 3) * 0.02; // Some oscillation
        iv += (Math.random() - 0.5) * 0.01; // Small random noise
        
        // Ensure reasonable bounds
        iv = Math.max(0.05, Math.min(0.60, iv));
        
        row.push(iv);
      }
      surface.push(row);
    }

    return {
      timeToExpirations,
      strikes,
      surface,
      spotPrice
    };
  };

  const createVolatilitySurface = () => {
    const data = generateVolatilityData();
    const { timeToExpirations, strikes, surface } = data;
    
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    const xScale = 20; // Scale for time axis
    const yScale = 0.5; // Scale for strike/moneyness axis  
    const zScale = 50; // Scale for volatility axis

    // Generate vertices
    for (let i = 0; i < timeToExpirations.length; i++) {
      for (let j = 0; j < strikes.length; j++) {
        const x = (timeToExpirations[i] * 365 - 180) * xScale / 180; // Center around 0
        const y = parameters.yAxisType === 'moneyness' 
          ? (strikes[j] / data.spotPrice - 1) * 200 // Moneyness centered at 0
          : (strikes[j] - data.spotPrice) * yScale; // Strike price difference
        const z = surface[i][j] * zScale;
        
        positions.push(x, y, z);
        
        // Color based on volatility level
        const volatility = surface[i][j];
        const color = new THREE.Color();
        
        if (volatility > 0.35) {
          color.setHSL(0, 0.8, 0.6); // Red for high vol
        } else if (volatility > 0.25) {
          color.setHSL(0.08, 0.8, 0.6); // Orange
        } else if (volatility > 0.20) {
          color.setHSL(0.16, 0.8, 0.6); // Yellow
        } else if (volatility > 0.15) {
          color.setHSL(0.3, 0.8, 0.6); // Green
        } else {
          color.setHSL(0.6, 0.8, 0.6); // Blue for low vol
        }
        
        colors.push(color.r, color.g, color.b);
        
        // Simple normal calculation
        normals.push(0, 0, 1);
      }
    }

    // Generate indices for triangulation
    for (let i = 0; i < timeToExpirations.length - 1; i++) {
      for (let j = 0; j < strikes.length - 1; j++) {
        const a = i * strikes.length + j;
        const b = a + 1;
        const c = (i + 1) * strikes.length + j;
        const d = c + 1;

        // Two triangles per quad
        indices.push(a, b, d);
        indices.push(a, d, c);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  };

  const updateSurface = () => {
    if (!sceneRef.current || !surfaceRef.current) return;
    
    // Remove old surface
    sceneRef.current.remove(surfaceRef.current);
    
    // Create new surface
    const geometry = createVolatilitySurface();
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      shininess: 30,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    
    const surface = new THREE.Mesh(geometry, material);
    surfaceRef.current = surface;
    sceneRef.current.add(surface);
    
    // Add wireframe
    const wireframeGeometry = new THREE.EdgesGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x333333,
      transparent: true,
      opacity: 0.3
    });
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    sceneRef.current.add(wireframe);
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(30, 20, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x0a0a0a);
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x4f81ff, 0.3);
    pointLight.position.set(-15, 15, -15);
    scene.add(pointLight);

    // Create initial surface
    const geometry = createVolatilitySurface();
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      shininess: 30,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });

    const surface = new THREE.Mesh(geometry, material);
    surfaceRef.current = surface;
    scene.add(surface);

    // Add coordinate axes
    const axesHelper = new THREE.AxesHelper(20);
    scene.add(axesHelper);

    // Mouse interaction
    let mouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let rotationY = 0;
    let rotationX = 0;

    const handleMouseDown = (event: MouseEvent) => {
      mouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
      setAutoRotate(false);
    };

    const handleMouseUp = () => {
      mouseDown = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (mouseDown) {
        const deltaX = event.clientX - mouseX;
        const deltaY = event.clientY - mouseY;
        
        rotationY += deltaX * 0.01;
        rotationX += deltaY * 0.01;
        rotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, rotationX));
        
        mouseX = event.clientX;
        mouseY = event.clientY;
      }
    };

    const handleWheel = (event: WheelEvent) => {
      camera.position.multiplyScalar(1 + event.deltaY * 0.001);
      camera.position.clampLength(15, 100);
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('wheel', handleWheel);

    // Animation loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      if (autoRotate && !mouseDown) {
        rotationY += 0.005;
      }
      
      // Apply rotations
      if (surfaceRef.current) {
        surfaceRef.current.rotation.y = rotationY;
        surfaceRef.current.rotation.x = rotationX * 0.3;
      }
      
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [parameters, autoRotate]);

  const handleParameterChange = (key: keyof SurfaceParameters, value: string | number) => {
    setParameters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold">Implied Volatility Surface</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              3D visualization of implied volatility across strikes and time to expiration for {parameters.ticker}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant={autoRotate ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRotate(!autoRotate)}
            >
              {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {showSettings && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="ticker">Ticker Symbol</Label>
                <Input
                  id="ticker"
                  value={parameters.ticker}
                  onChange={(e) => handleParameterChange('ticker', e.target.value)}
                  placeholder="AAPL"
                />
              </div>
              <div>
                <Label htmlFor="riskFreeRate">Risk-Free Rate</Label>
                <Input
                  id="riskFreeRate"
                  type="number"
                  step="0.001"
                  value={parameters.riskFreeRate}
                  onChange={(e) => handleParameterChange('riskFreeRate', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="dividendYield">Dividend Yield</Label>
                <Input
                  id="dividendYield"
                  type="number"
                  step="0.001"
                  value={parameters.dividendYield}
                  onChange={(e) => handleParameterChange('dividendYield', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="minStrike">Min Strike (%)</Label>
                <Input
                  id="minStrike"
                  type="number"
                  value={parameters.minStrikeFilter}
                  onChange={(e) => handleParameterChange('minStrikeFilter', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="maxStrike">Max Strike (%)</Label>
                <Input
                  id="maxStrike"
                  type="number"
                  value={parameters.maxStrikeFilter}
                  onChange={(e) => handleParameterChange('maxStrikeFilter', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="yAxis">Y-Axis Type</Label>
                <Select value={parameters.yAxisType} onValueChange={(value: 'strike' | 'moneyness') => handleParameterChange('yAxisType', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strike">Strike Price</SelectItem>
                    <SelectItem value="moneyness">Moneyness</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <div 
            ref={mountRef} 
            className="w-full h-96 bg-black rounded-lg border border-border overflow-hidden"
          />
          
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="text-center">
              <div className="font-medium text-red-400">X-Axis (Red)</div>
              <div className="text-muted-foreground">Time to Expiration (Days)</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-400">Y-Axis (Green)</div>
              <div className="text-muted-foreground">
                {parameters.yAxisType === 'strike' ? 'Strike Price' : 'Moneyness'}
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-blue-400">Z-Axis (Blue)</div>
              <div className="text-muted-foreground">Implied Volatility</div>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Color Coding:</span>
              <div className="flex gap-2">
                <span className="text-blue-400">Blue: Low Vol</span>
                <span className="text-green-400">Green: Normal</span>
                <span className="text-yellow-400">Yellow: Elevated</span>
                <span className="text-orange-400">Orange: High</span>
                <span className="text-red-400">Red: Extreme</span>
              </div>
            </div>
            <p className="text-center">Drag to rotate • Scroll to zoom • Toggle auto-rotation</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};