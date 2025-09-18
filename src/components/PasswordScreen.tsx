import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Eye, EyeOff } from 'lucide-react';
import ableTerminalLogo from '@/assets/able-terminal-logo.png';

interface PasswordScreenProps {
  onAuthenticated: () => void;
}

export const PasswordScreen = ({ onAuthenticated }: PasswordScreenProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (password === '1606') {
      onAuthenticated();
    } else {
      setError('Invalid access code. Please try again.');
      setPassword('');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-muted flex items-center justify-center z-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--terminal-amber))_1px,transparent_1px)] bg-[length:50px_50px]"></div>
      </div>

      <Card className="w-full max-w-md mx-4 bg-card/80 backdrop-blur-md border-terminal-amber/20 shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-terminal-amber/30">
              <img 
                src={ableTerminalLogo} 
                alt="ABLE TERMINAL" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-terminal-amber font-mono">
              ABLE TERMINAL
            </CardTitle>
            <p className="text-muted-foreground text-sm font-mono">
              Secure Access Required
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password Input */}
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-terminal-amber/60" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter access code"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-12 bg-input/50 border-terminal-amber/20 focus:border-terminal-amber/50 font-mono"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-terminal-amber/60 hover:text-terminal-amber"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>

              {error && (
                <p className="text-terminal-red text-sm font-mono animate-pulse">
                  {error}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !password}
              className="w-full bg-terminal-amber hover:bg-terminal-amber/90 text-black font-mono font-semibold disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Access Terminal'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground font-mono">
            Authorized Personnel Only
          </div>
        </CardContent>
      </Card>
    </div>
  );
};