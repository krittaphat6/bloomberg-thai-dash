import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ChessPiece = string;
type BoardPosition = [number, number];

interface ChessPuzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  solution: string;
}

const ChessGame = () => {
  const [board, setBoard] = useState<ChessPiece[][]>(Array(8).fill(null).map(() => Array(8).fill("")));
  const [selectedSquare, setSelectedSquare] = useState<BoardPosition | null>(null);
  const [userMove, setUserMove] = useState("");
  const [puzzle, setPuzzle] = useState<ChessPuzzle | null>(null);
  const [gameState, setGameState] = useState<"playing" | "correct" | "wrong">("playing");
  const [theme, setTheme] = useState("classic");

  // Chess piece symbols
  const pieces = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
  };

  // Sample chess puzzles
  const samplePuzzles: ChessPuzzle[] = [
    {
      id: "puzzle1",
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR",
      moves: ["e2e4"],
      rating: 1200,
      solution: "d7d5"
    },
    {
      id: "puzzle2", 
      fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R",
      moves: ["e1g1"],
      rating: 1400,
      solution: "f6g4"
    }
  ];

  // Initialize puzzle
  useEffect(() => {
    const dailyPuzzle = samplePuzzles[new Date().getDate() % samplePuzzles.length];
    setPuzzle(dailyPuzzle);
    parseFEN(dailyPuzzle.fen);
  }, []);

  // Parse FEN notation to board
  const parseFEN = (fen: string) => {
    const rows = fen.split(' ')[0].split('/');
    const newBoard: ChessPiece[][] = [];
    
    rows.forEach(row => {
      const boardRow: ChessPiece[] = [];
      for (let char of row) {
        if (isNaN(parseInt(char))) {
          boardRow.push(char);
        } else {
          for (let i = 0; i < parseInt(char); i++) {
            boardRow.push('');
          }
        }
      }
      newBoard.push(boardRow);
    });
    
    setBoard(newBoard);
  };

  // Convert position to chess notation
  const positionToNotation = (row: number, col: number): string => {
    const files = 'abcdefgh';
    const ranks = '87654321';
    return files[col] + ranks[row];
  };

  // Handle square click
  const handleSquareClick = (row: number, col: number) => {
    if (!selectedSquare) {
      if (board[row][col]) {
        setSelectedSquare([row, col]);
      }
    } else {
      const [fromRow, fromCol] = selectedSquare;
      const move = positionToNotation(fromRow, fromCol) + positionToNotation(row, col);
      setUserMove(move);
      setSelectedSquare(null);
    }
  };

  // Submit move
  const handleSubmitMove = () => {
    if (!puzzle || !userMove) return;
    
    if (userMove === puzzle.solution) {
      setGameState("correct");
    } else {
      setGameState("wrong");
    }
  };

  // Reset game
  const resetGame = () => {
    setGameState("playing");
    setUserMove("");
    setSelectedSquare(null);
    if (puzzle) {
      parseFEN(puzzle.fen);
    }
  };

  // Get square color
  const getSquareColor = (row: number, col: number) => {
    const isLight = (row + col) % 2 === 0;
    const isSelected = selectedSquare && selectedSquare[0] === row && selectedSquare[1] === col;
    
    if (theme === "classic") {
      if (isSelected) return "bg-yellow-400";
      return isLight ? "bg-amber-100" : "bg-amber-700";
    } else if (theme === "modern") {
      if (isSelected) return "bg-yellow-400";
      return isLight ? "bg-slate-100" : "bg-slate-700";
    } else if (theme === "green") {
      if (isSelected) return "bg-yellow-400";
      return isLight ? "bg-green-100" : "bg-green-700";
    }
    return isLight ? "bg-gray-100" : "bg-gray-700";
  };

  const getBorderColor = () => {
    if (gameState === "correct") return "border-green-500";
    if (gameState === "wrong") return "border-red-500";
    return "border-border";
  };

  return (
    <Card className={`w-full max-w-2xl mx-auto ${getBorderColor()} border-2`}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl font-bold text-foreground">
          Daily Chess Puzzle
        </CardTitle>
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Puzzle ID: {puzzle?.id}</span>
          <span>Rating: {puzzle?.rating}</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Theme Selector */}
        <div className="flex justify-center">
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="classic">Classic</SelectItem>
              <SelectItem value="modern">Modern</SelectItem>
              <SelectItem value="green">Green</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Chess Board */}
        <div className="flex justify-center">
          <div className="grid grid-cols-8 gap-0 border-2 border-foreground w-80 h-80">
            {board.map((row, rowIndex) =>
              row.map((piece, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    w-10 h-10 flex items-center justify-center cursor-pointer
                    text-2xl select-none hover:opacity-80 transition-opacity
                    ${getSquareColor(rowIndex, colIndex)}
                  `}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                >
                  {piece && pieces[piece as keyof typeof pieces]}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Move Input and Status */}
        <div className="space-y-3">
          <div className="flex gap-2 justify-center">
            <Input
              value={userMove}
              onChange={(e) => setUserMove(e.target.value)}
              placeholder="Enter move (e.g., e2e4)"
              className="w-40"
              maxLength={5}
            />
            <Button 
              onClick={handleSubmitMove}
              disabled={!userMove || gameState !== "playing"}
              variant="default"
            >
              Submit
            </Button>
          </div>
          
          {/* Game Status */}
          <div className="text-center">
            {gameState === "correct" && (
              <p className="text-green-600 font-semibold">✅ Correct! Well done!</p>
            )}
            {gameState === "wrong" && (
              <p className="text-red-600 font-semibold">❌ Wrong move. Try again!</p>
            )}
            {gameState === "playing" && (
              <p className="text-muted-foreground">
                Click pieces to select, then click destination square
              </p>
            )}
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex justify-center">
          <Button onClick={resetGame} variant="outline" size="sm">
            Reset Puzzle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChessGame;