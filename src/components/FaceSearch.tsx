import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Camera, Upload, Search, User, Instagram, Twitter, Facebook, 
  Linkedin, Globe, X, Image as ImageIcon, ExternalLink,
  Sparkles, ScanFace, Users, Eye, Fingerprint, Zap, Youtube,
  Brain, Database, Network, CheckCircle, Loader2
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
  facialFeatures?: string[];
  isLookalike?: boolean;
}

interface FaceAnalysisData {
  detected: boolean;
  gender?: string;
  estimatedAge?: string;
  ethnicity?: string;
  facialFeatures?: {
    faceShape: string;
    eyeShape: string;
    noseShape: string;
    lipShape: string;
    skinTone: string;
    hairStyle: string;
    hairColor: string;
    distinguishingFeatures: string[];
  };
}

interface SearchResult {
  success: boolean;
  persons: PersonInfo[];
  lookalikes?: PersonInfo[];
  faceAnalysis?: FaceAnalysisData;
  possibleIdentity?: { name: string; confidence: number; reasoning: string[] }[];
  rawAnalysis?: string;
  error?: string;
}

interface ScanPhase {
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  status: 'pending' | 'active' | 'complete';
}

export const FaceSearch: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [showScanOverlay, setShowScanOverlay] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [scanLines, setScanLines] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'main' | 'lookalikes' | 'analysis'>('main');
  const [scanPhases, setScanPhases] = useState<ScanPhase[]>([
    { name: 'Face Detection', description: 'ตรวจจับใบหน้าในรูปภาพ', icon: <ScanFace className="w-4 h-4" />, color: 'text-cyan-400', status: 'pending' },
    { name: 'Deep Analysis', description: 'วิเคราะห์ลักษณะใบหน้า 68 จุด', icon: <Eye className="w-4 h-4" />, color: 'text-blue-400', status: 'pending' },
    { name: 'Face Embedding', description: 'สร้าง Face Vector สำหรับเปรียบเทียบ', icon: <Fingerprint className="w-4 h-4" />, color: 'text-purple-400', status: 'pending' },
    { name: 'AI Reasoning', description: 'Chain-of-Thought Analysis', icon: <Brain className="w-4 h-4" />, color: 'text-pink-400', status: 'pending' },
    { name: 'Database Search', description: 'ค้นหาในฐานข้อมูล Face Registration', icon: <Database className="w-4 h-4" />, color: 'text-orange-400', status: 'pending' },
    { name: 'Platform Search', description: 'ค้นหา IG, TikTok, FB, X', icon: <Network className="w-4 h-4" />, color: 'text-green-400', status: 'pending' },
    { name: 'Lookalike Match', description: 'จับคู่คนหน้าคล้ายจากคนดัง', icon: <Users className="w-4 h-4" />, color: 'text-yellow-400', status: 'pending' },
    { name: 'Verification', description: 'ตรวจสอบและยืนยันผลลัพธ์', icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-400', status: 'pending' },
  ]);
  const [analysisLog, setAnalysisLog] = useState<string[]>([]);

  // Animate scan phases
  useEffect(() => {
    if (isSearching) {
      setShowScanOverlay(true);
      setCurrentPhase(0);
      setScanProgress(0);
      setFaceDetected(false);
      setAnalysisLog([]);
      
      // Reset phases
      setScanPhases(prev => prev.map(p => ({ ...p, status: 'pending' as const })));
      
      // Generate random scan lines
      const lines: number[] = [];
      for (let i = 0; i < 30; i++) {
        lines.push(Math.random() * 100);
      }
      setScanLines(lines);
      
      // Animate through phases with realistic timing
      const phaseDurations = [800, 1200, 1500, 2000, 1800, 1500, 1200, 800];
      let cumulativeTime = 0;
      
      phaseDurations.forEach((duration, idx) => {
        // Start phase
        setTimeout(() => {
          setScanPhases(prev => prev.map((p, i) => ({
            ...p,
            status: i === idx ? 'active' : (i < idx ? 'complete' : 'pending')
          })));
          setCurrentPhase(idx);
          
          // Add analysis log
          const logs = [
            '🔍 Detecting facial boundaries & landmarks...',
            '📐 Deep analyzing 68 facial points + features...',
            '🔐 Generating face embedding vector...',
            '🧠 Running Chain-of-Thought AI reasoning...',
            '💾 Searching registered faces database...',
            '🌐 Simulating IG, TikTok, FB, X reverse search...',
            '👥 Finding lookalike celebrities...',
            '✅ Verifying & ranking all results...'
          ];
          setAnalysisLog(prev => [...prev, logs[idx]]);
        }, cumulativeTime);
        
        cumulativeTime += duration;
      });
      
      // Mark last phase complete
      setTimeout(() => {
        setScanPhases(prev => prev.map(p => ({ ...p, status: 'complete' })));
      }, cumulativeTime);
      
      // Progress animation
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev < 100) return prev + 1;
          return prev;
        });
      }, 100);
      
      // Face detected animation
      setTimeout(() => setFaceDetected(true), 600);
      
      return () => {
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

  // Fetch registered faces from database to enhance search
  const fetchRegisteredFaces = async () => {
    try {
      const { data, error } = await supabase
        .from('face_registrations')
        .select('user_id, face_encoding, face_image_url')
        .eq('status', 'approved');
      
      if (error) {
        console.error('Error fetching registered faces:', error);
        return [];
      }
      
      return (data || []).map(item => ({
        userId: item.user_id,
        faceEncoding: item.face_encoding || '',
        faceImageUrl: item.face_image_url || ''
      }));
    } catch (error) {
      console.error('Error fetching registered faces:', error);
      return [];
    }
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
      // Fetch registered faces to include in search
      const registeredFaces = await fetchRegisteredFaces();
      console.log(`Loaded ${registeredFaces.length} registered faces for matching`);

      const { data, error } = await supabase.functions.invoke('face-search', {
        body: { 
          image: selectedImage,
          options: {
            searchSocialMedia: true,
            includeRelatedImages: true,
            searchLookalikes: true,
            deepAnalysis: true,
            searchRegisteredFaces: true,
            webSearch: true
          },
          registeredFaces: registeredFaces
        }
      });

      if (error) throw error;

      setResults(data);
      
      if (data.success && (data.persons.length > 0 || (data.lookalikes && data.lookalikes.length > 0))) {
        const totalResults = data.persons.length + (data.lookalikes?.length || 0);
        const dbMatches = data.databaseMatches || 0;
        const strategies = data.searchStrategies?.length || 0;
        toast.success(`พบ ${totalResults} ผลลัพธ์ (${strategies} strategies, ${dbMatches} DB matches)`);
      } else if (data.success) {
        toast.info('ไม่พบข้อมูลที่ตรงกับใบหน้านี้ ลองใช้รูปที่ชัดกว่านี้');
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

  // Enhanced scanning overlay with live analysis
  const renderScanOverlay = () => (
    <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm">
      {/* Animated scan grid */}
      <svg className="absolute inset-0 w-full h-full opacity-40">
        <defs>
          <linearGradient id="scanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="cyan" stopOpacity="0.5" />
            <stop offset="50%" stopColor="purple" stopOpacity="0.3" />
            <stop offset="100%" stopColor="pink" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {/* Grid pattern */}
        {Array.from({ length: 15 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0" y1={`${(i + 1) * 6.66}%`} x2="100%" y2={`${(i + 1) * 6.66}%`}
            stroke="url(#scanGrad)" strokeWidth="0.5"
            className="animate-pulse" style={{ animationDelay: `${i * 0.05}s` }}
          />
        ))}
        {Array.from({ length: 15 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={`${(i + 1) * 6.66}%`} y1="0" x2={`${(i + 1) * 6.66}%`} y2="100%"
            stroke="url(#scanGrad)" strokeWidth="0.5"
            className="animate-pulse" style={{ animationDelay: `${i * 0.05}s` }}
          />
        ))}
      </svg>
      
      {/* Moving scan beam */}
      <div 
        className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
        style={{
          top: `${scanProgress}%`,
          boxShadow: '0 0 30px cyan, 0 0 60px cyan, 0 0 90px rgba(0,255,255,0.3)',
          transition: 'top 0.1s linear'
        }}
      />
      
      {/* Face detection box */}
      {faceDetected && (
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
        >
          {/* Main detection frame */}
          <div className="w-28 h-36 border-2 border-green-400 rounded-lg relative"
            style={{ boxShadow: '0 0 20px rgba(74, 222, 128, 0.5), inset 0 0 20px rgba(74, 222, 128, 0.1)' }}>
            
            {/* Corner brackets */}
            <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-green-400 rounded-tl" />
            <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-green-400 rounded-tr" />
            <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-green-400 rounded-bl" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-green-400 rounded-br" />
            
            {/* Facial landmark points */}
            <div className="absolute top-5 left-4 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
            <div className="absolute top-5 right-4 w-2 h-2 bg-cyan-400 rounded-full animate-ping" style={{ animationDelay: '0.1s' }} />
            <div className="absolute top-8 left-5 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.15s' }} />
            <div className="absolute top-8 right-5 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '0.25s' }} />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-pink-400 rounded animate-ping" style={{ animationDelay: '0.3s' }} />
            
            {/* Connecting lines */}
            <svg className="absolute inset-0 w-full h-full opacity-50">
              <line x1="20%" y1="20%" x2="45%" y2="50%" stroke="cyan" strokeWidth="0.5" className="animate-pulse" />
              <line x1="80%" y1="20%" x2="55%" y2="50%" stroke="cyan" strokeWidth="0.5" className="animate-pulse" />
              <line x1="45%" y1="50%" x2="55%" y2="50%" stroke="purple" strokeWidth="0.5" className="animate-pulse" />
              <line x1="50%" y1="50%" x2="50%" y2="75%" stroke="pink" strokeWidth="0.5" className="animate-pulse" />
            </svg>
          </div>
          
          {/* Face ID badge */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-green-500/20 border border-green-400/50 rounded px-2 py-0.5">
            <span className="text-[10px] text-green-400 font-mono">FACE DETECTED</span>
          </div>
        </div>
      )}
      
      {/* Live analysis panel */}
      <div className="absolute top-2 left-2 right-2 bg-black/70 backdrop-blur-md rounded-lg p-3 border border-cyan-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-xs font-medium text-cyan-400">Multi-Stage AI Analysis</span>
          <span className="ml-auto text-xs text-gray-400">{scanProgress}%</span>
        </div>
        
        {/* Phase indicators */}
        <div className="grid grid-cols-4 gap-1 mb-2">
          {scanPhases.map((phase, idx) => (
            <div 
              key={idx}
              className={`flex flex-col items-center p-1 rounded transition-all ${
                phase.status === 'active' 
                  ? 'bg-white/10 scale-105' 
                  : phase.status === 'complete' 
                    ? 'bg-green-500/10' 
                    : 'opacity-50'
              }`}
            >
              <div className={`${phase.color} ${phase.status === 'active' ? 'animate-pulse' : ''}`}>
                {phase.status === 'complete' ? <CheckCircle className="w-3 h-3 text-green-400" /> : phase.icon}
              </div>
              <span className="text-[8px] text-gray-400 text-center mt-0.5 leading-tight">{phase.name}</span>
            </div>
          ))}
        </div>
        
        {/* Live log */}
        <div className="max-h-16 overflow-hidden">
          {analysisLog.slice(-3).map((log, idx) => (
            <div 
              key={idx} 
              className="text-[9px] font-mono text-cyan-300/80 animate-fade-in"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              {log}
            </div>
          ))}
        </div>
      </div>
      
      {/* Data streams on sides */}
      <div className="absolute top-20 left-2 text-[7px] font-mono text-cyan-400/50 space-y-0.5">
        {scanLines.slice(0, 12).map((v, i) => (
          <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.15}s` }}>
            {Math.floor(v * 1000).toString(16).padStart(4, '0').toUpperCase()}
          </div>
        ))}
      </div>
      <div className="absolute top-20 right-2 text-[7px] font-mono text-purple-400/50 space-y-0.5 text-right">
        {scanLines.slice(12, 24).map((v, i) => (
          <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.15}s` }}>
            {Math.floor(v * 1000).toString(16).padStart(4, '0').toUpperCase()}
          </div>
        ))}
      </div>
      
      {/* Bottom progress */}
      <div className="absolute bottom-2 left-2 right-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 transition-all duration-300 ease-out"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between mt-1 text-[8px] text-gray-500">
          <span>Stage {currentPhase + 1}/8</span>
          <span>{scanPhases[currentPhase]?.description || 'Processing...'}</span>
        </div>
      </div>
    </div>
  );

  const renderFaceAnalysis = () => {
    if (!results?.faceAnalysis) return null;
    
    const fa = results.faceAnalysis;
    const ff = fa.facialFeatures;
    
    return (
      <Card className="mb-4 border-purple-500/30">
        <CardHeader className="pb-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            AI Face Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">เพศ</span>
              <p className="font-medium">{fa.gender === 'male' ? 'ชาย' : 'หญิง'}</p>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">อายุโดยประมาณ</span>
              <p className="font-medium">{fa.estimatedAge}</p>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">เชื้อชาติ</span>
              <p className="font-medium">{fa.ethnicity}</p>
            </div>
          </div>
          
          {ff && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-medium mb-2 text-muted-foreground">ลักษณะใบหน้า</p>
              <div className="grid grid-cols-4 gap-2 text-[10px]">
                <Badge variant="outline" className="justify-center">รูปหน้า: {ff.faceShape}</Badge>
                <Badge variant="outline" className="justify-center">ตา: {ff.eyeShape}</Badge>
                <Badge variant="outline" className="justify-center">จมูก: {ff.noseShape}</Badge>
                <Badge variant="outline" className="justify-center">ปาก: {ff.lipShape}</Badge>
                <Badge variant="outline" className="justify-center">ผิว: {ff.skinTone}</Badge>
                <Badge variant="outline" className="justify-center">ทรงผม: {ff.hairStyle}</Badge>
                <Badge variant="outline" className="justify-center">สีผม: {ff.hairColor}</Badge>
              </div>
              {ff.distinguishingFeatures && ff.distinguishingFeatures.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-[10px] text-muted-foreground">จุดเด่น:</span>
                  {ff.distinguishingFeatures.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{f}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

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
        
        {person.facialFeatures && person.facialFeatures.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {person.facialFeatures.map((f, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{f}</Badge>
            ))}
          </div>
        )}

        {person.socialProfiles.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Social Media Profiles ({person.socialProfiles.length})
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
                    {(() => { try { return new URL(source).hostname } catch { return source } })()}
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
                Face Search Pro
                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-0">AI</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">Multi-Stage AI • Chain-of-Thought • Deep Analysis</p>
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
                    : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
              >
                {showCamera ? (
                  <div className="relative h-full">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                      <Button size="sm" onClick={capturePhoto} className="bg-green-500 hover:bg-green-600">
                        <Camera className="w-4 h-4 mr-2" /> ถ่ายรูป
                      </Button>
                      <Button size="sm" variant="destructive" onClick={stopCamera}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : selectedImage ? (
                  <div className="relative h-full">
                    <img 
                      src={selectedImage} 
                      alt="Selected" 
                      className="w-full h-full object-contain"
                    />
                    {showScanOverlay && renderScanOverlay()}
                    <Button 
                      size="icon" 
                      variant="destructive" 
                      className="absolute top-2 right-2 w-6 h-6"
                      onClick={clearImage}
                      disabled={isSearching}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="flex flex-col items-center justify-center h-full cursor-pointer p-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="p-4 rounded-full bg-muted mb-4">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium mb-1">ลากรูปมาวางที่นี่</p>
                    <p className="text-xs text-muted-foreground">หรือคลิกเพื่อเลือกไฟล์</p>
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

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={startCamera}
                  disabled={isSearching || showCamera}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  กล้อง
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSearching}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  อัพโหลด
                </Button>
              </div>

              {/* Search Button */}
              <Button 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={searchFace}
                disabled={!selectedImage || isSearching}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    กำลังวิเคราะห์...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    ค้นหาใบหน้า
                  </>
                )}
              </Button>
            </div>

            {/* Right: Results */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Tabs */}
              {results && (
                <div className="flex gap-2 mb-3">
                  <Button
                    variant={activeTab === 'main' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('main')}
                  >
                    <User className="w-3 h-3 mr-1" />
                    ผลลัพธ์ ({results.persons?.length || 0})
                  </Button>
                  <Button
                    variant={activeTab === 'lookalikes' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('lookalikes')}
                  >
                    <Users className="w-3 h-3 mr-1" />
                    คนหน้าคล้าย ({results.lookalikes?.length || 0})
                  </Button>
                  <Button
                    variant={activeTab === 'analysis' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('analysis')}
                  >
                    <Brain className="w-3 h-3 mr-1" />
                    Analysis
                  </Button>
                </div>
              )}

              <ScrollArea className="flex-1">
                {!results ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="p-4 rounded-full bg-muted mb-4">
                      <Sparkles className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">Face Search Pro</h3>
                    <p className="text-sm text-muted-foreground max-w-[300px]">
                      อัพโหลดรูปภาพหรือถ่ายรูปเพื่อค้นหาข้อมูลบุคคล พร้อมค้นหา Social Media และคนหน้าคล้าย
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" /> Multi-Stage Analysis</div>
                      <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" /> Chain-of-Thought AI</div>
                      <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" /> 68 Facial Landmarks</div>
                      <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" /> Social Media Search</div>
                    </div>
                  </div>
                ) : results.error && !results.success ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="p-4 rounded-full bg-red-500/10 mb-4">
                      <X className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="font-semibold mb-2">เกิดข้อผิดพลาด</h3>
                    <p className="text-sm text-muted-foreground">{results.error}</p>
                  </div>
                ) : (
                  <div className="space-y-4 pr-2">
                    {activeTab === 'analysis' && renderFaceAnalysis()}
                    
                    {activeTab === 'main' && (
                      results.persons.length > 0 ? (
                        results.persons.map((person, idx) => renderPersonCard(person, idx, false))
                      ) : (
                        <div className="text-center py-8">
                          <User className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                          <p className="text-muted-foreground">ไม่พบบุคคลที่ตรงกัน</p>
                          <p className="text-xs text-muted-foreground mt-1">ลองดูที่แท็บ "คนหน้าคล้าย"</p>
                        </div>
                      )
                    )}

                    {activeTab === 'lookalikes' && (
                      results.lookalikes && results.lookalikes.length > 0 ? (
                        results.lookalikes.map((person, idx) => renderPersonCard(person, idx, true))
                      ) : (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                          <p className="text-muted-foreground">ไม่พบคนหน้าคล้าย</p>
                        </div>
                      )
                    )}
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
