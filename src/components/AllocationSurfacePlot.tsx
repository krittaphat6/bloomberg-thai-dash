import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as THREE from 'three';

interface Trade {
  id: string;
  date: string;
  symbol: string;
  position: 'Long' | 'Short';
  type: 'CFD' | 'STOCK';
  entryPrice: number;
  exitPrice?: number;
  size: number;
  pnl: number;
  pnlPercentage?: number;
  status: 'Open' | 'Closed';
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
    const closedTrades = trades.filter(t => t.status === 'Closed' && t.pnl !== undefined);
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
      .filter(([_, trades]) => trades.length >= 3) // At least 3 trades per month
      .map(([period, periodTrades]) => {
        // Calculate diversification (unique symbols)
        const uniqueSymbols = new Set(periodTrades.map(t => t.symbol)).size;
        
        // Calculate strategic position (average hold time approximation)
        // We'll use strategy variety as a proxy for strategic positioning
        const uniqueStrategies = new Set(periodTrades.map(t => t.strategy)).size;
        const strategicPosition = (uniqueStrategies / Math.max(1, uniqueSymbols)) * 100;
        
        // Calculate monthly return
        const totalPnL = periodTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalInvestment = periodTrades.reduce((sum, t) => sum + (t.size * t.entryPrice), 0);
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
    if (!containerRef.current || data.length === 0) return;

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

    const camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(400, 300);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // Create surface geometry
    const width = 20;
    const height = 20;
    const geometry = new THREE.PlaneGeometry(width, height, width - 1, height - 1);
    
    // Generate surface based on data
    const vertices = geometry.attributes.position.array as Float32Array;
    const colors: number[] = [];
    
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      
      // Map x,y to diversification and strategic position
      const diversification = ((x + width/2) / width) * 20; // 0 to 20
      const strategicPosition = ((y + height/2) / height) * 100; // 0 to 100
      
      // Find closest data point or interpolate
      let annualReturn = 0;
      if (data.length > 0) {
        const closest = data.reduce((prev, curr) => {
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
    const data = calculateAllocationData();
    const cleanup = createSurface(data);

    return cleanup;
  }, [trades]);

  const allocationData = calculateAllocationData();

  return (
    <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] rounded-lg p-4">
      <h3 className="text-sm font-semibold text-[hsl(var(--trading-text))] mb-3 uppercase tracking-wide">3D Asset Allocation Surface</h3>
      <div className="space-y-4">
        <div 
          ref={containerRef} 
          className="w-full h-[280px] bg-gradient-to-b from-[hsl(var(--trading-darker))] to-[hsl(var(--trading-dark))] rounded border border-[hsl(var(--trading-border))] flex items-center justify-center"
        >
          {allocationData.length === 0 && (
            <div className="text-center text-[hsl(var(--trading-muted))]">
              <p>Insufficient data for 3D visualization</p>
              <p className="text-xs mt-1">Need at least 3+ trades per month</p>
            </div>
          )}
        </div>
        
        {/* Legend and Controls */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-medium text-[hsl(var(--trading-accent))]">X-Axis</div>
            <div className="text-[hsl(var(--trading-muted))]">Diversification Score</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-[hsl(var(--trading-success))]">Y-Axis</div>
            <div className="text-[hsl(var(--trading-muted))]">Strategic Position</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-[hsl(var(--trading-warning))]">Z-Axis</div>
            <div className="text-[hsl(var(--trading-muted))]">Annual Return (%)</div>
          </div>
        </div>
        
        {/* Color Legend */}
        <div className="flex justify-center space-x-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-[hsl(var(--trading-success))] rounded"></div>
            <span className="text-[hsl(var(--trading-text))]">High Return (&gt;20%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-[hsl(var(--trading-warning))] rounded"></div>
            <span className="text-[hsl(var(--trading-text))]">Moderate (0-20%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-[hsl(var(--trading-danger))] rounded"></div>
            <span className="text-[hsl(var(--trading-text))]">Loss (&lt;0%)</span>
          </div>
        </div>
        
        <p className="text-xs text-[hsl(var(--trading-muted))] text-center">
          Click and drag to rotate • Auto-rotates when idle
        </p>
      </div>
    </div>
  );
};