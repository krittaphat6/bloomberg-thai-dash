import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Player = 'X' | 'O' | null;

const TicTacToeGame = () => {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });

  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  const checkWinner = (newBoard: Player[]) => {
    for (const [a, b, c] of winningCombinations) {
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        return newBoard[a];
      }
    }
    return newBoard.every(cell => cell !== null) ? 'draw' : null;
  };

  const handleClick = (index: number) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const gameResult = checkWinner(newBoard);
    if (gameResult) {
      setWinner(gameResult);
      setScores(prev => ({
        ...prev,
        [gameResult === 'draw' ? 'draws' : gameResult]: prev[gameResult === 'draw' ? 'draws' : gameResult] + 1
      }));
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
  };

  const resetScores = () => {
    setScores({ X: 0, O: 0, draws: 0 });
    resetGame();
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-card border-border">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl font-bold text-foreground">หมากฮอส (Tic Tac Toe)</CardTitle>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>X: {scores.X}</span>
          <span>เสมอ: {scores.draws}</span>
          <span>O: {scores.O}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          {winner ? (
            <p className="text-lg font-semibold text-primary">
              {winner === 'draw' ? 'เสมอ!' : `ผู้เล่น ${winner} ชนะ!`}
            </p>
          ) : (
            <p className="text-lg text-foreground">ตาของผู้เล่น: {currentPlayer}</p>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-2 max-w-48 mx-auto">
          {board.map((cell, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-16 w-16 text-2xl font-bold hover:bg-accent"
              onClick={() => handleClick(index)}
              disabled={!!cell || !!winner}
            >
              {cell}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 justify-center">
          <Button onClick={resetGame} variant="outline" size="sm">
            เกมใหม่
          </Button>
          <Button onClick={resetScores} variant="outline" size="sm">
            รีเซ็ตคะแนน
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TicTacToeGame;