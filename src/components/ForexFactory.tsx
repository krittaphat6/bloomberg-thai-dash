export default function ForexFactory() {
  return (
    <div className="w-full h-full flex flex-col bg-background border border-border rounded-lg overflow-hidden">
      <div className="h-full w-full">
        <iframe
          src="https://www.forexfactory.com/"
          className="w-full h-full border-0"
          title="Forex Factory"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}