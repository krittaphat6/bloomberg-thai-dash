import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as THREE from 'three';

interface Trade {
  id: string;
  date: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  type: 'CFD' | 'STOCK';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  pnlPercentage?: number;
  status: 'OPEN' | 'CLOSED';
  strategy: string;
}

interface AllocationData {
  diversification: number;
  strategicPosition: number;
  annualReturn: number;
  period: string;
}

interface Props {
  trades: Trade[];
}

export const AllocationSurfacePlot = ({ trades }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationRef = useRef<number | null>(null);

  const calculateAllocationData = (): AllocationData[] => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
    if (closedTrades.length === 0) return [];

    // Group trades by month for time-based analysis
    const monthlyData = new Map<string, Trade[]>();
    
    closedTrades.forEach(trade => {
      const month = trade.date.substring(0, 7); // YYYY-MM format
      if (!monthlyData.has(month)) {
        monthlyData.set(month, []);
      }
      monthlyData.get(month)!.push(trade);
    });

    return Array.from(monthlyData.entries())
      .filter(([_, trades]) => trades.length >= 1) // At least 1 trade per month
      .map(([period, periodTrades]) => {
        // Calculate diversification (unique symbols)
        const uniqueSymbols = new Set(periodTrades.map(t => t.symbol)).size;
        
        // Calculate strategic position (average hold time approximation)
        // We'll use strategy variety as a proxy for strategic positioning
        const uniqueStrategies = new Set(periodTrades.map(t => t.strategy)).size;
        const strategicPosition = (uniqueStrategies / Math.max(1, uniqueSymbols)) * 100;
        
        // Calculate monthly return
        const totalPnL = periodTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalInvestment = periodTrades.reduce((sum, t) => sum + (t.quantity * t.entryPrice), 0);
        const monthlyReturn = totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0;
        
        // Annualize the return (approximate)
        const annualReturn = monthlyReturn * 12;

        return {
          diversification: Math.min(uniqueSymbols, 20), // Cap at 20 for visualization
          strategicPosition: Math.min(strategicPosition, 100), // Percentage
          annualReturn: Math.max(-100, Math.min(200, annualReturn)), // Cap between -100% and 200%
          period
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));
  };

  const createSurface = (data: AllocationData[]) => {
    if (!containerRef.current) return;

    // Clear previous scene
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Dark background

    // Get container dimensions
    const containerWidth = containerRef.current.clientWidth || 800;
    const containerHeight = containerRef.current.clientHeight || 320;
    
    const camera = new THREE.PerspectiveCamera(75, containerWidth / containerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerWidth, containerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Create surface geometry
    const width = 20;
    const height = 20;
    const geometry = new THREE.PlaneGeometry(width, height, width - 1, height - 1);
    
    // Generate surface based on data or fallback
    const vertices = geometry.attributes.position.array as Float32Array;
    const colors: number[] = [];
    
    // Create fallback data if no actual data exists
    const fallbackData = data.length === 0 ? [
      { diversification: 5, strategicPosition: 30, annualReturn: 15, period: '2024-09' },
      { diversification: 8, strategicPosition: 50, annualReturn: 8, period: '2024-08' },
      { diversification: 12, strategicPosition: 70, annualReturn: 25, period: '2024-07' },
    ] : data;
    
    console.log('AllocationSurfacePlot: Using data points:', fallbackData.length);
    
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      
      // Map x,y to diversification and strategic position
      const diversification = ((x + width/2) / width) * 20; // 0 to 20
      const strategicPosition = ((y + height/2) / height) * 100; // 0 to 100
      
      // Find closest data point or interpolate
      let annualReturn = 0;
      if (fallbackData.length > 0) {
        const closest = fallbackData.reduce((prev, curr) => {
          const prevDist = Math.abs(prev.diversification - diversification) + 
                          Math.abs(prev.strategicPosition - strategicPosition);
          const currDist = Math.abs(curr.diversification - diversification) + 
                          Math.abs(curr.strategicPosition - strategicPosition);
          return currDist < prevDist ? curr : prev;
        });
        annualReturn = closest.annualReturn;
      }
      
      // Set Z coordinate based on return
      vertices[i + 2] = annualReturn / 20; // Scale down for visualization
      
      // Color based on performance
      const color = new THREE.Color();
      if (annualReturn > 20) {
        color.setHSL(0.3, 0.8, 0.6); // Green
      } else if (annualReturn > 0) {
        color.setHSL(0.15, 0.8, 0.6); // Yellow-green
      } else if (annualReturn > -20) {
        color.setHSL(0.08, 0.8, 0.6); // Orange
      } else {
        color.setHSL(0, 0.8, 0.6); // Red
      }
      
      colors.push(color.r, color.g, color.b);
    }
    
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.attributes.position.needsUpdate = true;

    // Create material with vertex colors
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      shininess: 30,
      transparent: true,
      opacity: 0.9
    });

    const surface = new THREE.Mesh(geometry, material);
    surface.rotation.x = -Math.PI / 3; // Tilt for better viewing
    scene.add(surface);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Add wireframe for better visualization
    const wireframeGeometry = geometry.clone();
    const wireframeMaterial = new THREE.WireframeGeometry(wireframeGeometry);
    const wireframe = new THREE.LineSegments(
      wireframeMaterial, 
      new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.3 })
    );
    wireframe.rotation.x = -Math.PI / 3;
    scene.add(wireframe);

    // Position camera
    camera.position.set(15, 15, 15);
    camera.lookAt(0, 0, 0);

    // Add orbit controls simulation (simple rotation)
    let mouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let rotationY = 0;
    let rotationX = 0;

    const handleMouseDown = (event: MouseEvent) => {
      mouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
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
        
        // Limit vertical rotation
        rotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, rotationX));
        
        mouseX = event.clientX;
        mouseY = event.clientY;
      }
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      // Apply rotations
      surface.rotation.y = rotationY;
      surface.rotation.x = -Math.PI / 3 + rotationX * 0.5;
      wireframe.rotation.y = rotationY;
      wireframe.rotation.x = -Math.PI / 3 + rotationX * 0.5;
      
      // Auto-rotate if not being controlled
      if (!mouseDown) {
        rotationY += 0.005;
      }
      
      renderer.render(scene, camera);
    };

    animate();

    // Store references for cleanup
    sceneRef.current = scene;
    rendererRef.current = renderer;

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  };

  useEffect(() => {
    console.log('AllocationSurfacePlot: Initializing with trades:', trades.length);
    
    try {
      const data = calculateAllocationData();
      console.log('AllocationSurfacePlot: Calculated data:', data);
      const cleanup = createSurface(data);

      return cleanup;
    } catch (error) {
      console.error('AllocationSurfacePlot: Error creating surface:', error);
    }
  }, [trades]);

  const allocationData = calculateAllocationData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Asset Allocation 3D Surface</CardTitle>
        <p className="text-sm text-muted-foreground">
          Diversification vs Strategic Position vs Annual Return
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div 
            ref={containerRef} 
            className="w-full h-80 bg-slate-900 rounded-lg border border-border overflow-hidden relative"
            style={{ minHeight: '320px' }}
          >
            {allocationData.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-center text-muted-foreground z-10 pointer-events-none">
                <div>
                  <p>Sample 3D visualization</p>
                  <p className="text-xs mt-1">Load sample data to see your actual trading patterns</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Legend and Controls */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-medium text-blue-400">X-Axis</div>
              <div className="text-muted-foreground">Diversification Score</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-400">Y-Axis</div>
              <div className="text-muted-foreground">Strategic Position</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-orange-400">Z-Axis</div>
              <div className="text-muted-foreground">Annual Return (%)</div>
            </div>
          </div>
          
          {/* Color Legend */}
          <div className="flex justify-center space-x-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>High Return (&gt;20%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Moderate (0-20%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Loss (&lt;0%)</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Click and drag to rotate • Auto-rotates when idle
          </p>
        </div>
      </CardContent>
    </Card>
  );
};