import React, { Suspense, useState, useEffect } from 'react';
import { Loader2, AlertTriangle, RefreshCw, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Lazy load the heavy editor component
const CursorStyleEditor = React.lazy(() => 
  import('./CodeEditor/CursorStyleEditor').catch(err => {
    console.error('Failed to load editor:', err);
    return { default: () => <EditorLoadError error={err} /> };
  })
);

// Error display component
const EditorLoadError = ({ error, onRetry }: { error?: Error; onRetry?: () => void }) => (
  <div className="flex flex-col items-center justify-center h-full bg-black text-white p-8">
    <div className="max-w-md w-full space-y-6">
      <div className="flex items-center gap-3 text-red-400">
        <AlertTriangle className="w-8 h-8" />
        <h2 className="text-xl font-semibold">Editor Failed to Load</h2>
      </div>
      
      <Alert variant="destructive" className="bg-red-900/20 border-red-500/30">
        <AlertTitle>Error Details</AlertTitle>
        <AlertDescription className="text-sm mt-2">
          {error?.message || 'The code editor encountered an error while loading.'}
        </AlertDescription>
      </Alert>
      
      <div className="flex gap-3">
        {onRetry && (
          <Button 
            onClick={onRetry}
            variant="outline"
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        )}
        <Button 
          onClick={() => window.location.reload()}
          variant="outline"
          className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
        >
          Reload Page
        </Button>
      </div>
      
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-amber-400 mb-2">
          <Terminal className="w-4 h-4" />
          <span className="font-medium text-sm">💡 Tips to fix:</span>
        </div>
        <ul className="text-sm text-zinc-400 space-y-1 list-disc list-inside">
          <li>Check your internet connection</li>
          <li>Disable browser extensions (especially ad blockers)</li>
          <li>Try using Chrome or Edge browser</li>
          <li>Clear browser cache and reload</li>
        </ul>
      </div>
    </div>
  </div>
);

// Loading component
const EditorLoading = () => (
  <div className="flex flex-col items-center justify-center h-full bg-black text-white">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-400" />
        <div className="absolute inset-0 animate-ping">
          <Loader2 className="w-12 h-12 text-emerald-400/30" />
        </div>
      </div>
      <h3 className="text-lg font-medium text-white">Loading Python Editor...</h3>
      <p className="text-sm text-zinc-500">This may take a moment on first load</p>
    </div>
  </div>
);

// Error Boundary Class
class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset?: () => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Python Editor Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <EditorLoadError 
          error={this.state.error}
          onRetry={() => {
            this.setState({ hasError: false, error: undefined });
            this.props.onReset?.();
          }}
        />
      );
    }
    return this.props.children;
  }
}

// Main Component
export const PythonCodeEditor: React.FC = () => {
  const [key, setKey] = useState(0);
  const [loadTimeout, setLoadTimeout] = useState(false);
  
  // Set timeout for loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadTimeout(true);
    }, 30000); // 30 seconds timeout
    
    return () => clearTimeout(timer);
  }, [key]);
  
  const handleReset = () => {
    setKey(prev => prev + 1);
    setLoadTimeout(false);
  };

  if (loadTimeout) {
    return (
      <EditorLoadError 
        error={new Error('Loading timeout - Pyodide took too long to load')}
        onRetry={handleReset}
      />
    );
  }

  return (
    <EditorErrorBoundary key={key} onReset={handleReset}>
      <Suspense fallback={<EditorLoading />}>
        <CursorStyleEditor />
      </Suspense>
    </EditorErrorBoundary>
  );
};

export default PythonCodeEditor;
