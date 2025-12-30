import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink, Maximize2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const LiveUAMap = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  const refreshMap = () => {
    setIsLoading(true);
    const iframe = document.getElementById('ua-map-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
    setTimeout(() => setIsLoading(false), 2000);
  };
  
  const openInNewTab = () => {
    window.open('https://liveuamap.com/', '_blank');
    toast.success('Opened in new tab');
  };
  
  return (
    <div className="flex flex-col h-full bg-[#0a1628]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-[#0d1f3c] border-b border-[#1e3a5f]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-white font-bold text-sm">LIVE UA MAP</span>
          </div>
          <span className="text-gray-400 text-xs">Conflict Monitoring</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={refreshMap}
            className="h-7 px-2 text-green-400 hover:bg-green-500/20"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={openInNewTab}
            className="h-7 px-2 text-blue-400 hover:bg-blue-500/20"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Map Container */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-[#0a1628] flex items-center justify-center z-10">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-green-400 animate-spin mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Loading map...</p>
            </div>
          </div>
        )}
        
        <iframe
          id="ua-map-iframe"
          src="https://liveuamap.com/"
          className="w-full h-full border-0"
          title="Live UA Map"
          onLoad={() => setIsLoading(false)}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
      
      {/* Footer Info */}
      <div className="bg-[#0d1f3c] border-t border-[#1e3a5f] p-2 text-xs text-gray-400 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span>🌍 Live Updates</span>
          <span>•</span>
          <span>⚔️ Conflict Zones</span>
          <span>•</span>
          <span>📍 Real-time Events</span>
        </div>
        <span className="text-yellow-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Sensitive Content
        </span>
      </div>
    </div>
  );
};

export default LiveUAMap;
