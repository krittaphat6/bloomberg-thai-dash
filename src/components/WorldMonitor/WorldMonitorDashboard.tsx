export const WorldMonitorDashboard = () => {
  return (
    <div className="h-full w-full relative bg-[#060d18]">
      <iframe
        src="https://worldmonitor.app"
        title="World Monitor"
        className="w-full h-full border-0"
        allow="geolocation; fullscreen"
        style={{ border: 'none' }}
      />
    </div>
  );
};

export default WorldMonitorDashboard;
