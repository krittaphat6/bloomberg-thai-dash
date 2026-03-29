import React, { Suspense, useState } from 'react';
import { Loader2 } from 'lucide-react';

const CursorStyleEditor = React.lazy(() => 
  import('./CodeEditor/CursorStyleEditor').catch(err => {
    console.error('Failed to load editor:', err);
    return { default: () => (
      <div className="h-full flex items-center justify-center bg-[#1e1e1e] text-white">
        <div className="text-center space-y-3">
          <p className="text-red-400 text-sm">Failed to load editor</p>
          <button onClick={() => window.location.reload()} className="text-xs text-emerald-400 underline">Reload</button>
        </div>
      </div>
    )};
  })
);

const EditorLoading = () => (
  <div className="flex flex-col items-center justify-center h-full bg-[#1e1e1e] text-white">
    <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
    <p className="text-sm text-zinc-400">Loading Editor...</p>
  </div>
);

class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center bg-[#1e1e1e] text-white">
          <div className="text-center space-y-3">
            <p className="text-red-400 text-sm">Editor crashed</p>
            <button onClick={() => { this.setState({ hasError: false }); }} className="text-xs text-emerald-400 underline">Retry</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const PythonCodeEditor: React.FC = () => (
  <EditorErrorBoundary>
    <Suspense fallback={<EditorLoading />}>
      <CursorStyleEditor />
    </Suspense>
  </EditorErrorBoundary>
);

export default PythonCodeEditor;
