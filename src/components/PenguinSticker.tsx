import penguinImage from "@/assets/penguin-sticker.png";

const PenguinSticker = () => {
  return (
    <div className="fixed top-4 right-4 z-50 animate-bounce">
      <img 
        src={penguinImage} 
        alt="Cute penguin sticker"
        className="w-16 h-16 cursor-pointer hover:scale-110 transition-transform duration-200"
      />
    </div>
  );
};

export default PenguinSticker;