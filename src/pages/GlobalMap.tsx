import { useState } from 'react';
import { BloombergMap } from '@/components/BloombergMap';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GlobalMap = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {!isFullscreen && (
        <div className="flex items-center gap-4 p-2 bg-[#1a2744] border-b border-[#2d4a6f]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Terminal
          </Button>
          <span className="text-[#ff6600] text-sm font-bold">ABLE GLOBAL MAP</span>
        </div>
      )}
      
      <div className={isFullscreen ? "h-screen" : "h-[calc(100vh-40px)]"}>
        <BloombergMap 
          isFullscreen={isFullscreen} 
          onToggleFullscreen={handleToggleFullscreen}
        />
      </div>
    </div>
  );
};

export default GlobalMap;
