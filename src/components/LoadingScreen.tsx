import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing ABLE Terminal...');

  useEffect(() => {
    const loadingMessages = [
      'Initializing ABLE Terminal...',
      'Loading Market Data...',
      'Connecting to Trading Systems...',
      'Preparing Dashboard...',
      'System Ready'
    ];

    let messageIndex = 0;
    let currentProgress = 0;

    const interval = setInterval(() => {
      currentProgress += Math.random() * 15 + 5;
      
      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        setLoadingText('System Ready');
        
        setTimeout(() => {
          onLoadingComplete();
        }, 800);
        
        clearInterval(interval);
      } else {
        setProgress(currentProgress);
        
        const newMessageIndex = Math.floor((currentProgress / 100) * loadingMessages.length);
        if (newMessageIndex !== messageIndex && newMessageIndex < loadingMessages.length) {
          messageIndex = newMessageIndex;
          setLoadingText(loadingMessages[messageIndex]);
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [onLoadingComplete]);

  // Pre-generate dot positions to avoid layout shifts
  const dots = Array.from({ length: 30 }, (_, i) => ({
    left: `${(i * 3.33) % 100}%`,
    top: `${(i * 7.77) % 100}%`,
    delay: `${(i * 0.1) % 3}s`
  }));

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 overflow-hidden contain-layout">
      {/* Bloomberg Terminal Background Pattern */}
      <div className="absolute inset-0 opacity-5" aria-hidden="true">
        <div 
          className="absolute inset-0 bg-repeat" 
          style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 24px, hsl(var(--terminal-amber)) 25px, hsl(var(--terminal-amber)) 26px, transparent 27px),
              linear-gradient(90deg, transparent 24px, hsl(var(--terminal-amber)) 25px, hsl(var(--terminal-amber)) 26px, transparent 27px)
            `,
            backgroundSize: '25px 25px',
            willChange: 'auto'
          }}
        />
      </div>

      {/* Static Dots Pattern - reduced count, fixed positions */}
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        {dots.map((dot, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-terminal-amber rounded-full"
            style={{
              left: dot.left,
              top: dot.top,
              opacity: 0.5
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-6 max-w-md mx-auto px-4">

        {/* Terminal Header - Fixed dimensions */}
        <div className="text-center space-y-2 bg-black border border-terminal-amber/30 px-6 py-4 w-full" style={{ minHeight: '100px' }}>
          <div className="flex items-center justify-center space-x-2 text-terminal-amber text-xs font-mono">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-terminal-green rounded-full"></div>
              <div className="w-2 h-2 bg-terminal-amber rounded-full"></div>
              <div className="w-2 h-2 bg-terminal-red rounded-full"></div>
            </div>
            <span>TERMINAL ACTIVE</span>
          </div>
          <h1 className="text-3xl font-bold text-terminal-amber font-mono tracking-wider">
            ABLE TERMINAL
          </h1>
          <div className="text-terminal-cyan text-xs font-mono tracking-wide border-t border-terminal-amber/20 pt-2">
            PROFESSIONAL TRADING PLATFORM v2.1
          </div>
        </div>

        {/* Progress Section - Fixed height to prevent layout shift */}
        <div className="w-full bg-black border border-terminal-amber/30 p-4" style={{ minHeight: '120px' }}>
          {/* System Status */}
          <div className="flex justify-between items-center text-xs font-mono mb-3">
            <span className="text-terminal-green">SYSTEM STATUS:</span>
            <span className="text-terminal-amber">ONLINE</span>
          </div>
          
          {/* Progress Bar - Fixed dimensions */}
          <div className="relative h-3 bg-black border border-terminal-amber/30 mb-3 overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-terminal-green to-terminal-amber"
              style={{ width: `${progress}%`, transition: 'width 200ms ease-out' }}
            />
          </div>
          
          {/* Loading Details - Fixed height */}
          <div className="space-y-1" style={{ minHeight: '40px' }}>
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-terminal-cyan truncate max-w-[200px]">&gt; {loadingText}</span>
              <span className="text-terminal-amber w-12 text-right">[{Math.round(progress)}%]</span>
            </div>
            <div className="flex justify-between items-center text-xs font-mono text-terminal-green/70">
              <span>MEMORY: 2.1GB / 8GB</span>
              <span>CPU: {Math.min(95, Math.round(progress * 0.95))}%</span>
            </div>
          </div>
        </div>

        {/* Terminal Command Line */}
        <div className="flex items-center space-x-2 font-mono text-terminal-green bg-black border border-terminal-green/30 px-4 py-2 w-full">
          <span className="text-terminal-amber">able@terminal:~$</span>
          <span className="text-terminal-green">initializing</span>
          <span className="text-terminal-amber">_</span>
        </div>
      </div>
    </div>
  );
};