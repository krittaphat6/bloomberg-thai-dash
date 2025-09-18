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
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-muted flex items-center justify-center z-50">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24px,hsl(var(--terminal-amber))_25px,hsl(var(--terminal-amber))_26px,transparent_27px,transparent_49px,hsl(var(--terminal-amber))_50px,hsl(var(--terminal-amber))_51px,transparent_52px),linear-gradient(hsl(var(--terminal-amber))_25px,transparent_26px,transparent_49px,hsl(var(--terminal-amber))_50px,hsl(var(--terminal-amber))_51px,transparent_52px)] bg-[length:50px_50px]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-8">
        {/* Logo Container */}
        <div className="relative">
          {/* Glow Effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-terminal-amber/20 to-terminal-cyan/20 blur-xl rounded-full animate-pulse"></div>
          
          {/* Logo */}
          <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-terminal-amber/30 shadow-2xl">
            <img 
              src={ableTerminalLogo} 
              alt="ABLE TERMINAL" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Terminal Style Text */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-terminal-amber font-mono tracking-wider">
            ABLE TERMINAL
          </h1>
          <p className="text-terminal-cyan text-sm font-mono tracking-wide">
            Professional Trading Platform
          </p>
        </div>

        {/* Loading Progress */}
        <div className="w-80 space-y-3">
          {/* Progress Bar */}
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-terminal-amber/20 to-terminal-cyan/20 animate-pulse"></div>
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-terminal-amber to-terminal-cyan transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          {/* Loading Text */}
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-terminal-cyan">{loadingText}</span>
            <span className="text-terminal-amber">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Terminal Cursor Animation */}
        <div className="flex items-center space-x-1 font-mono text-terminal-green">
          <span>$</span>
          <span className="animate-pulse">_</span>
        </div>
      </div>
    </div>
  );
};