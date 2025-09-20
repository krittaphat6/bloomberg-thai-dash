import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface SurfacePoint {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
}

interface Props {
  trades: Trade[];
}

export const Enhanced3DSurfacePlot = ({ trades }: Props) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const frameIdRef = useRef<number>();
  const [surfaceType, setSurfaceType] = useState<'allocation' | 'performance' | 'risk'>('allocation');
  const [autoRotate, setAutoRotate] = useState(true);

  // Mathematical surface functions
  const generateAllocationSurface = (u: number, v: number): SurfacePoint => {
    const x = u * 20 - 10; // Diversification axis
    const y = v * 20 - 10; // Strategic position axis
    
    // Complex allocation surface based on portfolio theory
    const diversificationEffect = Math.sin(u * Math.PI * 2) * 2;
    const strategicEffect = Math.cos(v * Math.PI * 2) * 1.5;
    const correlationEffect = Math.sin(u * Math.PI) * Math.cos(v * Math.PI) * 0.8;
    
    const z = diversificationEffect + strategicEffect + correlationEffect + Math.sin(u * v * 10) * 0.5;
    
    // Color based on height and position
    const color = new THREE.Color();
    const normalizedZ = (z + 4) / 8; // Normalize to 0-1
    if (normalizedZ > 0.7) {
      color.setHSL(0.3, 0.8, 0.6); // Green for high performance
    } else if (normalizedZ > 0.4) {
      color.setHSL(0.15, 0.8, 0.6); // Yellow-green
    } else if (normalizedZ > 0.2) {
      color.setHSL(0.08, 0.8, 0.6); // Orange
    } else {
      color.setHSL(0, 0.8, 0.6); // Red for low performance
    }
    
    return { x, y, z, color };
  };

  const generatePerformanceSurface = (u: number, v: number): SurfacePoint => {
    const x = u * 20 - 10;
    const y = v * 20 - 10;
    
    // Performance surface with peaks and valleys
    const z = Math.sin(u * Math.PI * 3) * Math.cos(v * Math.PI * 3) * 3 +
              Math.sin(u * v * 20) * 0.8 +
              (u - 0.5) * (v - 0.5) * 4;
    
    const color = new THREE.Color();
    const hue = (z + 4) / 8 * 0.3; // Green to red spectrum
    color.setHSL(hue, 0.8, 0.6);
    
    return { x, y, z, color };
  };

  const generateRiskSurface = (u: number, v: number): SurfacePoint => {
    const x = u * 20 - 10;
    const y = v * 20 - 10;
    
    // Risk surface with volatility patterns
    const volatility = Math.abs(Math.sin(u * Math.PI * 4)) * Math.abs(Math.cos(v * Math.PI * 4));
    const correlation = Math.sin(u * v * 15) * 0.5;
    const z = volatility * 4 + correlation;
    
    const color = new THREE.Color();
    // Risk coloring: blue (low) to red (high)
    const risk = z / 4;
    color.setHSL(0.6 - risk * 0.6, 0.8, 0.6);
    
    return { x, y, z, color };
  };

  const getSurfaceFunction = () => {
    switch (surfaceType) {
      case 'performance': return generatePerformanceSurface;
      case 'risk': return generateRiskSurface;
      default: return generateAllocationSurface;
    }
  };

  const createParametricSurface = () => {
    const surfaceFunc = getSurfaceFunction();
    const geometry = new THREE.BufferGeometry();
    const resolution = 50;
    
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    // Generate vertices
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const u = i / resolution;
        const v = j / resolution;
        
        const point = surfaceFunc(u, v);
        positions.push(point.x, point.y, point.z);
        colors.push(point.color.r, point.color.g, point.color.b);
        
        // Calculate normal (simplified)
        const normal = new THREE.Vector3(0, 0, 1);
        if (i > 0 && j > 0) {
          const p1 = surfaceFunc((i-1)/resolution, v);
          const p2 = surfaceFunc(u, (j-1)/resolution);
          const v1 = new THREE.Vector3(point.x - p1.x, point.y - p1.y, point.z - p1.z);
          const v2 = new THREE.Vector3(point.x - p2.x, point.y - p2.y, point.z - p2.z);
          normal.crossVectors(v1, v2).normalize();
        }
        normals.push(normal.x, normal.y, normal.z);
      }
    }

    // Generate indices
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const a = i * (resolution + 1) + j;
        const b = a + 1;
        const c = (i + 1) * (resolution + 1) + j;
        const d = c + 1;

        indices.push(a, b, d);
        indices.push(a, d, c);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);

    return geometry;
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
    camera.position.set(20, 15, 20);
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
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x4f81ff, 0.5);
    pointLight.position.set(-10, 10, -10);
    scene.add(pointLight);

    // Create surface
    const geometry = createParametricSurface();
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      shininess: 100,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });

    const surface = new THREE.Mesh(geometry, material);
    scene.add(surface);

    // Add wireframe
    const wireframeGeometry = new THREE.EdgesGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x333333,
      transparent: true,
      opacity: 0.2
    });
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    scene.add(wireframe);

    // Add coordinate axes
    const axesHelper = new THREE.AxesHelper(15);
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
      camera.position.clampLength(10, 100);
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
      surface.rotation.y = rotationY;
      surface.rotation.x = rotationX * 0.5;
      wireframe.rotation.y = rotationY;
      wireframe.rotation.x = rotationX * 0.5;
      
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup function
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
      wireframeMaterial.dispose();
      renderer.dispose();
    };
  }, [surfaceType, autoRotate]);

  const getSurfaceDescription = () => {
    switch (surfaceType) {
      case 'allocation':
        return 'Asset allocation efficiency surface showing diversification vs strategic positioning';
      case 'performance':
        return 'Portfolio performance landscape with return peaks and valleys';
      case 'risk':
        return 'Risk correlation surface displaying volatility patterns';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Enhanced 3D Surface Visualization</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {getSurfaceDescription()}
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={surfaceType} onValueChange={(value: any) => setSurfaceType(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allocation">Allocation</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="risk">Risk Analysis</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={autoRotate ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRotate(!autoRotate)}
            >
              {autoRotate ? "Auto Rotate" : "Manual"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div 
            ref={mountRef} 
            className="w-full h-96 bg-black rounded-lg border border-border overflow-hidden"
          />
          
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="text-center">
              <div className="font-medium text-red-400">X-Axis</div>
              <div className="text-muted-foreground">
                {surfaceType === 'allocation' ? 'Diversification' : 
                 surfaceType === 'performance' ? 'Time Period' : 'Volatility'}
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-400">Y-Axis</div>
              <div className="text-muted-foreground">
                {surfaceType === 'allocation' ? 'Strategic Position' : 
                 surfaceType === 'performance' ? 'Asset Class' : 'Correlation'}
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-blue-400">Z-Axis</div>
              <div className="text-muted-foreground">
                {surfaceType === 'allocation' ? 'Efficiency Score' : 
                 surfaceType === 'performance' ? 'Return (%)' : 'Risk Level'}
              </div>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>Drag to rotate • Scroll to zoom • Click Auto Rotate to enable/disable rotation</p>
            <p>Surface generated using parametric mathematical functions</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};