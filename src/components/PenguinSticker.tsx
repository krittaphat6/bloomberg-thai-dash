import { useState } from "react";
import penguinImage from "@/assets/penguin-sticker.png";

const PenguinSticker = () => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      {/* Click trigger - always visible */}
      <div 
        className="fixed top-4 right-4 z-50 cursor-pointer"
        onClick={() => setIsVisible(!isVisible)}
      >
        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center hover:bg-primary/30 transition-colors">
          <span className="text-xs">🐧</span>
        </div>
      </div>
      
      {/* Penguin sticker - shows when clicked */}
      {isVisible && (
        <div className="fixed top-16 right-4 z-50 animate-bounce">
          <img 
            src={penguinImage} 
            alt="Cute penguin sticker"
            className="w-16 h-16 cursor-pointer hover:scale-110 transition-transform duration-200"
            onClick={() => setIsVisible(false)}
          />
        </div>
      )}
    </>
  );
};

export default PenguinSticker;