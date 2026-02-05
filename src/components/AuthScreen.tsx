import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Lock, User, Eye, EyeOff, Loader2, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ableTerminalLogo from '@/assets/able-terminal-logo.png';

export const AuthScreen = () => {
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');

  // Forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'Successfully logged in'
      });
    }
    
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signupPassword !== signupConfirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      });
      return;
    }
    
    if (signupPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive'
      });
      return;
    }

    if (signupUsername.trim().length < 2) {
      toast({
        title: 'Error',
        description: 'Username must be at least 2 characters',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    const { error } = await signUp(signupEmail, signupPassword, signupUsername.trim());
    
    if (error) {
      let errorMessage = error.message;
      if (error.message.includes('already registered')) {
        errorMessage = 'This email is already registered. Please login instead.';
      }
      toast({
        title: 'Signup Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Account Created!',
        description: 'You can now login with your credentials'
      });
      setSignupEmail('');
      setSignupPassword('');
      setSignupConfirmPassword('');
      setSignupUsername('');
    }
    
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotEmail) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        // Check for specific error types
        if (error.message.includes('rate limit')) {
          throw new Error('Too many requests. Please wait a few minutes and try again.');
        }
        if (error.message.includes('not found') || error.message.includes('invalid')) {
          // Don't reveal if email exists for security
          setResetSent(true);
          toast({
            title: 'Reset Email Sent!',
            description: 'If an account exists with this email, you will receive a reset link.',
          });
          return;
        }
        throw error;
      }
      
      setResetSent(true);
      toast({
        title: 'Reset Email Sent!',
        description: 'Check your email for the password reset link. Note: Check spam folder if not received.',
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset email. Please check your Supabase SMTP settings.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-muted flex items-center justify-center z-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--terminal-amber))_1px,transparent_1px)] bg-[length:50px_50px]"></div>
      </div>

      <Card className="w-full max-w-md mx-4 bg-card/80 backdrop-blur-md border-terminal-amber/20 shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-4">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-terminal-amber/30">
              <img src={ableTerminalLogo} alt="ABLE TERMINAL" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-terminal-amber font-mono">
              ABLE TERMINAL
            </CardTitle>
            <p className="text-muted-foreground text-sm font-mono">
              Financial Intelligence Platform
            </p>
          </div>
        </CardHeader>

        <CardContent>
          {showForgotPassword ? (
            // Forgot Password View
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSent(false);
                    setForgotEmail('');
                  }}
                  className="p-1 h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold text-terminal-amber font-mono">Reset Password</h3>
              </div>

              {resetSent ? (
                <div className="text-center space-y-4 py-6">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-terminal-green/20 flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-terminal-green" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-terminal-green">Email Sent!</h4>
                    <p className="text-sm text-muted-foreground">
                      We've sent a password reset link to:
                    </p>
                    <p className="text-sm font-mono text-terminal-amber">
                      {forgotEmail}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Check your inbox and follow the link to reset your password.
                  </p>
                  <Button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetSent(false);
                      setForgotEmail('');
                    }}
                    className="w-full bg-terminal-amber hover:bg-terminal-amber/90 text-black font-mono"
                  >
                    Back to Login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                  
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-terminal-amber/60" />
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="pl-10 bg-input/50 border-terminal-amber/20 focus:border-terminal-amber/50 font-mono"
                      required
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={isLoading || !forgotEmail}
                    className="w-full bg-terminal-amber hover:bg-terminal-amber/90 text-black font-mono font-semibold"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4 mr-2" />
                        Send Reset Link
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          ) : (
            // Login/Signup Tabs
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50">
                <TabsTrigger value="login" className="font-mono data-[state=active]:bg-terminal-amber data-[state=active]:text-black">
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="font-mono data-[state=active]:bg-terminal-green data-[state=active]:text-black">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-terminal-amber/60" />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10 bg-input/50 border-terminal-amber/20 focus:border-terminal-amber/50 font-mono"
                      required
                    />
                  </div>
                  
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-terminal-amber/60" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10 bg-input/50 border-terminal-amber/20 focus:border-terminal-amber/50 font-mono"
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

                  <Button
                    type="submit"
                    disabled={isLoading || !loginEmail || !loginPassword}
                    className="w-full bg-terminal-amber hover:bg-terminal-amber/90 text-black font-mono font-semibold disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Authenticating...
                      </>
                    ) : (
                      'Login'
                    )}
                  </Button>

                  {/* Forgot Password Link */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-terminal-amber/70 hover:text-terminal-amber text-sm font-mono inline-flex items-center gap-1"
                    >
                      <KeyRound className="h-3 w-3" />
                      Forgot Password?
                    </button>
                  </div>
                </form>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-terminal-green/60" />
                    <Input
                      type="text"
                      placeholder="Username"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      className="pl-10 bg-input/50 border-terminal-green/20 focus:border-terminal-green/50 font-mono"
                      required
                      minLength={2}
                    />
                  </div>
                  
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-terminal-green/60" />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-10 bg-input/50 border-terminal-green/20 focus:border-terminal-green/50 font-mono"
                      required
                    />
                  </div>
                  
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-terminal-green/60" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password (min 6 characters)"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-10 bg-input/50 border-terminal-green/20 focus:border-terminal-green/50 font-mono"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-terminal-green/60" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm Password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 bg-input/50 border-terminal-green/20 focus:border-terminal-green/50 font-mono"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-terminal-green/60 hover:text-terminal-green"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !signupEmail || !signupPassword || !signupUsername}
                    className="w-full bg-terminal-green hover:bg-terminal-green/90 text-black font-mono font-semibold disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-muted-foreground font-mono">
            Authorized Personnel Only
          </div>
        </CardContent>
      </Card>
    </div>
  );
};