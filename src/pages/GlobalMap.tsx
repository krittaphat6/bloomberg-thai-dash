import BloombergMap from '@/components/BloombergMap';

const GlobalMap = () => {
  return (
    <div className="w-full" style={{ height: '100vh', background: '#060d18' }}>
      <BloombergMap isFullscreen />
    </div>
  );
};

export default GlobalMap;
