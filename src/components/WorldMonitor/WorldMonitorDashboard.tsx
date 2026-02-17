import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const WorldMonitorDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full w-full relative bg-[#060d18]">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/')}
        className="absolute top-2 left-2 z-10 text-white/50 hover:text-white bg-[#0a1628]/80 hover:bg-[#0a1628] h-7 px-2 backdrop-blur-sm"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
        <span className="text-[10px] font-mono">BACK</span>
      </Button>
      <iframe
        src="https://worldmonitor.app"
        className="w-full h-full border-0"
        title="World Monitor"
        allow="autoplay; fullscreen; clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
      />
    </div>
  );
};

export default WorldMonitorDashboard;
