import { useEffect, useState } from 'react';
import ableTerminalLogo from '@/assets/able-terminal-logo.png';

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

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 overflow-hidden">
      {/* Bloomberg Terminal Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="absolute inset-0 bg-repeat" 
          style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 24px, hsl(var(--terminal-amber)) 25px, hsl(var(--terminal-amber)) 26px, transparent 27px),
              linear-gradient(90deg, transparent 24px, hsl(var(--terminal-amber)) 25px, hsl(var(--terminal-amber)) 26px, transparent 27px)
            `,
            backgroundSize: '25px 25px'
          }}
        ></div>
      </div>

      {/* Animated Dots Pattern */}
      <div className="absolute inset-0 opacity-10">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-terminal-amber rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-6 max-w-md mx-auto px-4">
        {/* Logo Container */}
        <div className="relative">
          {/* Multiple Glow Effects */}
          <div className="absolute -inset-8 bg-terminal-amber/10 blur-3xl rounded-full animate-pulse"></div>
          <div className="absolute -inset-6 bg-terminal-green/10 blur-2xl rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute -inset-4 bg-terminal-cyan/10 blur-xl rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Logo Frame */}
          <div className="relative w-40 h-40 bg-black border-2 border-terminal-amber/50 overflow-hidden">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-terminal-amber"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-terminal-amber"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-terminal-amber"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-terminal-amber"></div>
            
            <img 
              src={ableTerminalLogo} 
              alt="ABLE TERMINAL" 
              className="w-full h-full object-contain p-4"
            />
          </div>
        </div>

        {/* Terminal Header */}
        <div className="text-center space-y-2 bg-black border border-terminal-amber/30 px-6 py-4 w-full">
          <div className="flex items-center justify-center space-x-2 text-terminal-amber text-xs font-mono">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-terminal-amber rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-terminal-red rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
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

        {/* Progress Section */}
        <div className="w-full bg-black border border-terminal-amber/30 p-4">
          {/* System Status */}
          <div className="flex justify-between items-center text-xs font-mono mb-3">
            <span className="text-terminal-green">SYSTEM STATUS:</span>
            <span className="text-terminal-amber">ONLINE</span>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-3 bg-black border border-terminal-amber/30 mb-3">
            <div className="absolute inset-0 bg-gradient-to-r from-black via-terminal-amber/10 to-black animate-pulse"></div>
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-terminal-green to-terminal-amber transition-all duration-200 ease-out border-r-2 border-terminal-amber"
              style={{ width: `${progress}%` }}
            ></div>
            {/* Progress Indicator */}
            <div 
              className="absolute top-0 h-full w-1 bg-terminal-amber animate-pulse"
              style={{ left: `${progress}%` }}
            ></div>
          </div>
          
          {/* Loading Details */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-terminal-cyan">&gt; {loadingText}</span>
              <span className="text-terminal-amber">[{Math.round(progress)}%]</span>
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
          <span className="animate-pulse text-terminal-amber">|</span>
        </div>
      </div>
    </div>
  );
};