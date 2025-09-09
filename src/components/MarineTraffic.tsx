const MarineTraffic = () => {
  return (
    <div className="terminal-panel h-full">
      <div className="panel-header border-b border-border pb-2 mb-4">
        <h3 className="text-terminal-green font-bold text-sm">MARINE TRAFFIC</h3>
        <p className="text-terminal-gray text-xs">Live ship tracking and maritime data</p>
      </div>
      
      <div className="h-full flex flex-col">
        <iframe
          src="https://www.marinetraffic.com/en/ais/home/centerx:11.0/centery:53.9/zoom:5"
          className="flex-1 w-full border border-border rounded bg-background"
          title="Marine Traffic Map"
          allow="geolocation"
        />
        <div className="mt-2 text-xs text-terminal-cyan">
          🚢 Live ship positions • 🌊 Maritime routes • ⚓ Port information
        </div>
      </div>
    </div>
  );
};

export default MarineTraffic;