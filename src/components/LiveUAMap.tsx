const LiveUAMap = () => {
  return (
    <div className="terminal-panel h-full">
      <div className="panel-header border-b border-border pb-2 mb-4">
        <h3 className="text-terminal-green font-bold text-sm">LIVE UA MAP - Conflict & Weather</h3>
        <p className="text-terminal-gray text-xs">Real-time conflict and weather monitoring</p>
      </div>
      
      <div className="h-full flex flex-col">
        <iframe
          src="https://liveuamap.com/"
          className="flex-1 w-full border border-border rounded bg-background"
          title="Live Ukraine Map"
          allow="geolocation"
        />
        <div className="mt-2 text-xs text-terminal-amber">
          🌍 Live conflict monitoring • 🌦️ Weather conditions • 📍 Real-time updates
        </div>
      </div>
    </div>
  );
};

export default LiveUAMap;