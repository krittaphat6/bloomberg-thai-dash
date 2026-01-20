import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Camera, Upload, Search, User, Instagram, Twitter, Facebook, 
  Linkedin, Globe, Loader2, X, Image as ImageIcon, ExternalLink,
  Sparkles, ScanFace
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
}

interface SearchResult {
  success: boolean;
  persons: PersonInfo[];
  rawAnalysis?: string;
  error?: string;
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

    try {
      const { data, error } = await supabase.functions.invoke('face-search', {
        body: { 
          image: selectedImage,
          options: {
            searchSocialMedia: true,
            includeRelatedImages: true
          }
        }
      });

      if (error) throw error;

      setResults(data);
      
      if (data.success && data.persons.length > 0) {
        toast.success(`พบ ${data.persons.length} ผลลัพธ์`);
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
      default: return <Globe className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setResults(null);
  };

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
              <p className="text-xs text-muted-foreground">ค้นหาข้อมูลบุคคลจากใบหน้า</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-4">
          <div className="h-full flex gap-4">
            {/* Left: Image Upload */}
            <div className="w-1/3 flex flex-col gap-4">
              {/* Upload Area */}
              <div
                className={`relative flex-1 min-h-[200px] border-2 border-dashed rounded-xl transition-all ${
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
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={clearImage}
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
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          กำลังค้นหา...
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

              {/* Tips */}
              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <p className="font-medium mb-1">💡 Tips</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>ใช้รูปที่เห็นใบหน้าชัดเจน</li>
                  <li>หน้าตรงจะให้ผลลัพธ์ดีที่สุด</li>
                  <li>แสงสว่างเพียงพอ</li>
                </ul>
              </div>
            </div>

            {/* Right: Results */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  ผลการค้นหา
                </h3>
                {results && results.persons.length > 0 && (
                  <Badge variant="secondary">
                    {results.persons.length} ผลลัพธ์
                  </Badge>
                )}
              </div>

              <ScrollArea className="flex-1 pr-2">
                {isSearching ? (
                  <div className="h-full flex flex-col items-center justify-center py-12">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ScanFace className="w-8 h-8 text-purple-500 animate-pulse" />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">กำลังวิเคราะห์ใบหน้า...</p>
                    <p className="text-xs text-muted-foreground mt-1">ค้นหาข้อมูลจากอินเทอร์เน็ต</p>
                  </div>
                ) : results ? (
                  results.success && results.persons.length > 0 ? (
                    <div className="space-y-4">
                      {results.persons.map((person, idx) => (
                        <Card key={idx} className="overflow-hidden">
                          <CardHeader className="pb-2 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                                  <User className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <h4 className="font-semibold">{person.name}</h4>
                                  {person.occupation && (
                                    <p className="text-xs text-muted-foreground">{person.occupation}</p>
                                  )}
                                </div>
                              </div>
                              <Badge 
                                variant={person.confidence > 70 ? 'default' : 'secondary'}
                                className={person.confidence > 70 ? 'bg-green-500' : ''}
                              >
                                {person.confidence}% match
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

                            {person.sources.length > 0 && (
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
                                        className="text-purple-500 hover:underline truncate max-w-[150px]"
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
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                      <div className="p-4 rounded-full bg-muted mb-4">
                        <User className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">ไม่พบข้อมูล</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {results.error || 'ไม่พบข้อมูลที่ตรงกับใบหน้านี้ในอินเทอร์เน็ต'}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4">
                      <Search className="w-8 h-8 text-purple-500" />
                    </div>
                    <p className="text-sm font-medium">รอการค้นหา</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      อัปโหลดรูปภาพแล้วกดค้นหา
                    </p>
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
