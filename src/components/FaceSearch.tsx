import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Camera, Upload, Search, User, Instagram, Twitter, Facebook, 
  Linkedin, Globe, X, Image as ImageIcon, ExternalLink,
  Sparkles, ScanFace, Users, Eye, Fingerprint, Zap, Youtube
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SocialProfile {
  platform: string;
  username: string;
  url: string;
  followers?: string;
  bio?: string;
  verified?: boolean;
}

interface PersonInfo {
  name: string;
  confidence: number;
  occupation?: string;
  bio?: string;
  nationality?: string;
  age?: string;
  socialProfiles: SocialProfile[];
  relatedImages?: string[];
  sources: string[];
  isLookalike?: boolean;
}

interface SearchResult {
  success: boolean;
  persons: PersonInfo[];
  lookalikes?: PersonInfo[];
  rawAnalysis?: string;
  error?: string;
}

interface ScanPhase {
  name: string;
  icon: React.ReactNode;
  color: string;
}

const scanPhases: ScanPhase[] = [
  { name: 'ตรวจจับใบหน้า', icon: <ScanFace className="w-5 h-5" />, color: 'text-cyan-400' },
  { name: 'วิเคราะห์จุดสังเกต', icon: <Eye className="w-5 h-5" />, color: 'text-blue-400' },
  { name: 'สร้าง Facial Signature', icon: <Fingerprint className="w-5 h-5" />, color: 'text-purple-400' },
  { name: 'ค้นหาในฐานข้อมูล', icon: <Search className="w-5 h-5" />, color: 'text-pink-400' },
  { name: 'ค้นหาคนหน้าคล้าย', icon: <Users className="w-5 h-5" />, color: 'text-orange-400' },
  { name: 'วิเคราะห์ผลลัพธ์', icon: <Zap className="w-5 h-5" />, color: 'text-green-400' },
];

export const FaceSearch: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [showScanOverlay, setShowScanOverlay] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [scanLines, setScanLines] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'main' | 'lookalikes'>('main');

  // Animate scan phases
  useEffect(() => {
    if (isSearching) {
      setShowScanOverlay(true);
      setCurrentPhase(0);
      setScanProgress(0);
      setFaceDetected(false);
      
      // Generate random scan lines
      const lines: number[] = [];
      for (let i = 0; i < 20; i++) {
        lines.push(Math.random() * 100);
      }
      setScanLines(lines);
      
      // Animate through phases
      const phaseInterval = setInterval(() => {
        setCurrentPhase(prev => {
          if (prev < scanPhases.length - 1) return prev + 1;
          return prev;
        });
      }, 1500);
      
      // Progress animation
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev < 100) return prev + 2;
          return prev;
        });
      }, 150);
      
      // Face detected animation
      setTimeout(() => setFaceDetected(true), 800);
      
      return () => {
        clearInterval(phaseInterval);
        clearInterval(progressInterval);
      };
    } else {
      setShowScanOverlay(false);
    }
  }, [isSearching]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาเลือกไฟล์รูปภาพ');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setResults(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      setStream(mediaStream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      toast.error('ไม่สามารถเข้าถึงกล้องได้');
      console.error('Camera error:', error);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setSelectedImage(canvas.toDataURL('image/jpeg'));
        setResults(null);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const searchFace = async () => {
    if (!selectedImage) {
      toast.error('กรุณาเลือกรูปภาพก่อน');
      return;
    }

    setIsSearching(true);
    setResults(null);
    setActiveTab('main');

    try {
      const { data, error } = await supabase.functions.invoke('face-search', {
        body: { 
          image: selectedImage,
          options: {
            searchSocialMedia: true,
            includeRelatedImages: true,
            searchLookalikes: true
          }
        }
      });

      if (error) throw error;

      setResults(data);
      
      if (data.success && (data.persons.length > 0 || (data.lookalikes && data.lookalikes.length > 0))) {
        const totalResults = data.persons.length + (data.lookalikes?.length || 0);
        toast.success(`พบ ${totalResults} ผลลัพธ์`);
      } else if (data.success) {
        toast.info('ไม่พบข้อมูลที่ตรงกับใบหน้านี้');
      }
    } catch (error) {
      console.error('Face search error:', error);
      toast.error('เกิดข้อผิดพลาดในการค้นหา');
      setResults({ 
        success: false, 
        persons: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return <Instagram className="w-4 h-4 text-pink-500" />;
      case 'twitter':
      case 'x': return <Twitter className="w-4 h-4 text-blue-400" />;
      case 'facebook': return <Facebook className="w-4 h-4 text-blue-600" />;
      case 'linkedin': return <Linkedin className="w-4 h-4 text-blue-700" />;
      case 'tiktok': return <span className="text-sm">🎵</span>;
      case 'youtube': return <Youtube className="w-4 h-4 text-red-500" />;
      case 'threads': return <span className="text-sm">🧵</span>;
      default: return <Globe className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setResults(null);
  };

  // Render scanning overlay
  const renderScanOverlay = () => (
    <div className="absolute inset-0 z-10">
      {/* Scan grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-30">
        {/* Horizontal lines */}
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={`${(i + 1) * 10}%`}
            x2="100%"
            y2={`${(i + 1) * 10}%`}
            stroke="cyan"
            strokeWidth="0.5"
            className="animate-pulse"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
        {/* Vertical lines */}
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={`${(i + 1) * 10}%`}
            y1="0"
            x2={`${(i + 1) * 10}%`}
            y2="100%"
            stroke="cyan"
            strokeWidth="0.5"
            className="animate-pulse"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </svg>
      
      {/* Scanning beam */}
      <div 
        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80"
        style={{
          top: `${scanProgress}%`,
          boxShadow: '0 0 20px cyan, 0 0 40px cyan',
          transition: 'top 0.15s linear'
        }}
      />
      
      {/* Face detection box */}
      {faceDetected && (
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
            w-24 h-32 border-2 border-green-400 rounded-lg
            animate-pulse"
          style={{
            boxShadow: '0 0 10px rgba(74, 222, 128, 0.5), inset 0 0 10px rgba(74, 222, 128, 0.2)'
          }}
        >
          {/* Corner brackets */}
          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-green-400" />
          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-green-400" />
          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-green-400" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-green-400" />
          
          {/* Face landmarks dots */}
          <div className="absolute top-4 left-4 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
          <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" style={{ animationDelay: '0.1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-3 h-1 bg-cyan-400 rounded animate-ping" style={{ animationDelay: '0.3s' }} />
        </div>
      )}
      
      {/* Data streams */}
      <div className="absolute top-2 left-2 text-[8px] font-mono text-cyan-400/70 space-y-0.5">
        {scanLines.slice(0, 8).map((v, i) => (
          <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
            0x{Math.floor(v * 1000).toString(16).padStart(4, '0')}
          </div>
        ))}
      </div>
      
      {/* Confidence meter */}
      <div className="absolute bottom-2 left-2 right-2">
        <div className="flex items-center gap-2 text-[10px] text-cyan-400">
          <span>SCAN</span>
          <div className="flex-1 h-1 bg-gray-700 rounded overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-green-400 transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <span>{scanProgress}%</span>
        </div>
      </div>
    </div>
  );

  const renderPersonCard = (person: PersonInfo, idx: number, isLookalike: boolean = false) => (
    <Card key={idx} className={`overflow-hidden ${isLookalike ? 'border-orange-500/30' : ''}`}>
      <CardHeader className={`pb-2 ${isLookalike 
        ? 'bg-gradient-to-r from-orange-500/10 to-yellow-500/10' 
        : 'bg-gradient-to-r from-purple-500/5 to-pink-500/5'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isLookalike 
              ? 'bg-gradient-to-br from-orange-500 to-yellow-500' 
              : 'bg-gradient-to-br from-purple-500 to-pink-500'}`}>
              {isLookalike ? <Users className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
            </div>
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                {person.name}
                {isLookalike && <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-400">คล้าย</Badge>}
              </h4>
              {person.occupation && (
                <p className="text-xs text-muted-foreground">{person.occupation}</p>
              )}
            </div>
          </div>
          <Badge 
            variant={person.confidence > 70 ? 'default' : 'secondary'}
            className={person.confidence > 70 ? 'bg-green-500' : ''}
          >
            {person.confidence}% {isLookalike ? 'similar' : 'match'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {person.bio && (
          <p className="text-sm text-muted-foreground mb-3">{person.bio}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {person.nationality && (
            <Badge variant="outline" className="text-xs">
              🌍 {person.nationality}
            </Badge>
          )}
          {person.age && (
            <Badge variant="outline" className="text-xs">
              📅 {person.age}
            </Badge>
          )}
        </div>

        {person.socialProfiles.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Social Media Profiles
              </p>
              {person.socialProfiles.map((profile, pIdx) => (
                <a
                  key={pIdx}
                  href={profile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(profile.platform)}
                    <div>
                      <p className="text-sm font-medium">@{profile.username}</p>
                      {profile.followers && (
                        <p className="text-xs text-muted-foreground">
                          {profile.followers} followers
                        </p>
                      )}
                    </div>
                    {profile.verified && (
                      <Badge variant="secondary" className="text-xs">✓</Badge>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </>
        )}

        {person.sources && person.sources.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">แหล่งข้อมูล:</p>
              <div className="flex flex-wrap gap-1">
                {person.sources.slice(0, 3).map((source, sIdx) => (
                  <a 
                    key={sIdx}
                    href={source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:underline truncate max-w-[150px]"
                  >
                    {new URL(source).hostname}
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      <Card className="h-full flex flex-col border-0 rounded-none">
        <CardHeader className="flex-shrink-0 border-b border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <ScanFace className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Face Search
                <Badge variant="secondary" className="text-xs">Beta</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">ค้นหาข้อมูลบุคคลและคนหน้าคล้ายจากใบหน้า</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-4">
          <div className="h-full flex gap-4">
            {/* Left: Image Upload */}
            <div className="w-1/3 flex flex-col gap-4">
              {/* Upload Area */}
              <div
                className={`relative flex-1 min-h-[200px] border-2 border-dashed rounded-xl transition-all overflow-hidden ${
                  dragOver 
                    ? 'border-purple-500 bg-purple-500/10' 
                    : 'border-muted-foreground/30 hover:border-purple-500/50'
                } ${selectedImage ? 'p-2' : 'p-6'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {showCamera ? (
                  <div className="h-full flex flex-col">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="flex-1 rounded-lg object-cover bg-black"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        onClick={capturePhoto}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                      >
                        <Camera className="w-4 h-4 mr-1" /> ถ่ายรูป
                      </Button>
                      <Button size="sm" variant="outline" onClick={stopCamera}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : selectedImage ? (
                  <div className="h-full flex flex-col">
                    <div className="relative flex-1">
                      <img 
                        src={selectedImage} 
                        alt="Selected" 
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      
                      {/* Scan overlay on image */}
                      {showScanOverlay && renderScanOverlay()}
                      
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 z-20"
                        onClick={clearImage}
                        disabled={isSearching}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button
                      className="mt-2 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      onClick={searchFace}
                      disabled={isSearching}
                    >
                      {isSearching ? (
                        <>
                          <ScanFace className="w-4 h-4 mr-2 animate-pulse" />
                          กำลังสแกน...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          ค้นหาใบหน้า
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="p-4 rounded-full bg-muted mb-4">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      ลากวางรูปภาพหรือ
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-1" /> อัปโหลด
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={startCamera}
                      >
                        <Camera className="w-4 h-4 mr-1" /> กล้อง
                      </Button>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>

              {/* Scanning Status */}
              {isSearching && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
                  <div className="space-y-2">
                    {scanPhases.map((phase, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                          idx <= currentPhase ? 'opacity-100' : 'opacity-30'
                        }`}
                      >
                        <div className={`${phase.color} ${idx === currentPhase ? 'animate-pulse' : ''}`}>
                          {phase.icon}
                        </div>
                        <span className={idx === currentPhase ? 'font-medium' : ''}>
                          {phase.name}
                        </span>
                        {idx < currentPhase && (
                          <span className="text-green-400 ml-auto">✓</span>
                        )}
                        {idx === currentPhase && (
                          <span className="text-cyan-400 ml-auto animate-pulse">...</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {!isSearching && (
                <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <p className="font-medium mb-1">💡 Tips</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>ใช้รูปที่เห็นใบหน้าชัดเจน</li>
                    <li>หน้าตรงจะให้ผลลัพธ์ดีที่สุด</li>
                    <li>แสงสว่างเพียงพอ</li>
                    <li>รองรับหาคนหน้าคล้าย</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Right: Results */}
            <div className="flex-1 flex flex-col">
              {/* Tab Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={activeTab === 'main' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('main')}
                    className="h-8"
                  >
                    <User className="w-4 h-4 mr-1" />
                    ผลหลัก
                    {results?.persons && results.persons.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">{results.persons.length}</Badge>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === 'lookalikes' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('lookalikes')}
                    className="h-8"
                  >
                    <Users className="w-4 h-4 mr-1" />
                    หน้าคล้าย
                    {results?.lookalikes && results.lookalikes.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs bg-orange-500/20 text-orange-400">
                        {results.lookalikes.length}
                      </Badge>
                    )}
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 pr-2">
                {isSearching ? (
                  <div className="h-full flex flex-col items-center justify-center py-12">
                    <div className="relative mb-6">
                      {/* Outer ring */}
                      <div className="w-24 h-24 rounded-full border-4 border-purple-500/20">
                        <div 
                          className="absolute inset-0 rounded-full border-4 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"
                        />
                      </div>
                      {/* Inner content */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                          <ScanFace className="w-8 h-8 text-purple-400 animate-pulse" />
                        </div>
                      </div>
                      {/* Orbiting dots */}
                      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-cyan-400 rounded-full" />
                      </div>
                      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 bg-pink-400 rounded-full" />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {scanPhases[currentPhase]?.name || 'กำลังประมวลผล...'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ค้นหาข้อมูลจากอินเทอร์เน็ตและหาคนหน้าคล้าย
                    </p>
                    <div className="w-48 h-1.5 bg-muted rounded-full mt-4 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 transition-all duration-300"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                  </div>
                ) : results ? (
                  activeTab === 'main' ? (
                    results.success && results.persons.length > 0 ? (
                      <div className="space-y-4">
                        {results.persons.map((person, idx) => renderPersonCard(person, idx, false))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <User className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-sm">ไม่พบข้อมูล</p>
                        <p className="text-xs mt-1">ไม่พบข้อมูลที่ตรงกับใบหน้านี้ในอินเทอร์เน็ต</p>
                        {results.lookalikes && results.lookalikes.length > 0 && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => setActiveTab('lookalikes')}
                          >
                            <Users className="w-4 h-4 mr-1" />
                            ดูคนหน้าคล้าย ({results.lookalikes.length})
                          </Button>
                        )}
                      </div>
                    )
                  ) : (
                    // Lookalikes tab
                    results.lookalikes && results.lookalikes.length > 0 ? (
                      <div className="space-y-4">
                        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 mb-4">
                          <p className="text-xs text-orange-400">
                            <Users className="w-4 h-4 inline mr-1" />
                            คนที่มีใบหน้าคล้ายกับรูปที่ค้นหา (อาจไม่ใช่คนเดียวกัน)
                          </p>
                        </div>
                        {results.lookalikes.map((person, idx) => renderPersonCard(person, idx, true))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Users className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-sm">ไม่พบคนหน้าคล้าย</p>
                        <p className="text-xs mt-1">ลองใช้รูปที่เห็นใบหน้าชัดเจนกว่านี้</p>
                      </div>
                    )
                  )
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <User className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-sm">ไม่พบข้อมูล</p>
                    <p className="text-xs mt-1">อัปโหลดรูปและกดค้นหาเพื่อเริ่มต้น</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaceSearch;
