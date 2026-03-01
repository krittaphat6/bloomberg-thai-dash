const GlobalMap = () => {
  return (
    <div className="w-full" style={{ height: '100vh', background: '#060d18' }}>
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

export default GlobalMap;
