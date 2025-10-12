import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Pause, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CELL_SIZE = 20;
const GAME_WIDTH = 28;
const GAME_HEIGHT = 31;

// Game map (0 = empty, 1 = wall, 2 = dot, 3 = power pellet)
const INITIAL_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,3,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,0,0,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
  [0,0,0,0,0,0,2,0,0,0,1,0,0,0,0,0,0,1,0,0,0,2,0,0,0,0,0,0],
  [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,1,1,2,2,3,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

interface Ghost {
  x: number;
  y: number;
  color: string;
  direction: { x: number; y: number };
}

export const PacManGame = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'paused' | 'gameover'>('ready');
  const [level, setLevel] = useState(1);
  
  const gameStateRef = useRef({
    pacman: { x: 14, y: 23, direction: { x: 0, y: 0 }, nextDirection: { x: 0, y: 0 }, mouthOpen: true },
    ghosts: [
      { x: 13, y: 14, color: '#FF0000', direction: { x: 1, y: 0 } },
      { x: 14, y: 14, color: '#FFB8FF', direction: { x: -1, y: 0 } },
      { x: 13, y: 15, color: '#00FFFF', direction: { x: 0, y: -1 } },
      { x: 14, y: 15, color: '#FFB852', direction: { x: 0, y: 1 } },
    ] as Ghost[],
    map: INITIAL_MAP.map(row => [...row]),
    powerMode: false,
    powerModeTimer: 0,
  });

  // Draw game
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { pacman, ghosts, map, powerMode } = gameStateRef.current;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw map
    map.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 1) {
          // Wall
          ctx.fillStyle = '#1E3A8A';
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = '#3B82F6';
          ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        } else if (cell === 2) {
          // Dot
          ctx.fillStyle = '#FCD34D';
          ctx.beginPath();
          ctx.arc(
            x * CELL_SIZE + CELL_SIZE / 2,
            y * CELL_SIZE + CELL_SIZE / 2,
            2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        } else if (cell === 3) {
          // Power pellet
          ctx.fillStyle = '#FCD34D';
          ctx.beginPath();
          ctx.arc(
            x * CELL_SIZE + CELL_SIZE / 2,
            y * CELL_SIZE + CELL_SIZE / 2,
            5,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      });
    });

    // Draw Pac-Man
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    const mouthAngle = pacman.mouthOpen ? 0.2 : 0;
    const angle = Math.atan2(pacman.direction.y, pacman.direction.x);
    ctx.arc(
      pacman.x * CELL_SIZE + CELL_SIZE / 2,
      pacman.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      angle + mouthAngle,
      angle + Math.PI * 2 - mouthAngle
    );
    ctx.lineTo(pacman.x * CELL_SIZE + CELL_SIZE / 2, pacman.y * CELL_SIZE + CELL_SIZE / 2);
    ctx.fill();

    // Draw ghosts
    ghosts.forEach(ghost => {
      ctx.fillStyle = powerMode ? '#0000FF' : ghost.color;
      ctx.beginPath();
      ctx.arc(
        ghost.x * CELL_SIZE + CELL_SIZE / 2,
        ghost.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        Math.PI,
        0
      );
      ctx.lineTo(ghost.x * CELL_SIZE + CELL_SIZE - 2, ghost.y * CELL_SIZE + CELL_SIZE - 2);
      ctx.lineTo(ghost.x * CELL_SIZE + CELL_SIZE - 5, ghost.y * CELL_SIZE + CELL_SIZE / 2 + 3);
      ctx.lineTo(ghost.x * CELL_SIZE + CELL_SIZE - 8, ghost.y * CELL_SIZE + CELL_SIZE - 2);
      ctx.lineTo(ghost.x * CELL_SIZE + 8, ghost.y * CELL_SIZE + CELL_SIZE - 2);
      ctx.lineTo(ghost.x * CELL_SIZE + 5, ghost.y * CELL_SIZE + CELL_SIZE / 2 + 3);
      ctx.lineTo(ghost.x * CELL_SIZE + 2, ghost.y * CELL_SIZE + CELL_SIZE - 2);
      ctx.closePath();
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(ghost.x * CELL_SIZE + 5, ghost.y * CELL_SIZE + 6, 5, 5);
      ctx.fillRect(ghost.x * CELL_SIZE + 13, ghost.y * CELL_SIZE + 6, 5, 5);
      ctx.fillStyle = '#000000';
      ctx.fillRect(ghost.x * CELL_SIZE + 7, ghost.y * CELL_SIZE + 8, 3, 3);
      ctx.fillRect(ghost.x * CELL_SIZE + 15, ghost.y * CELL_SIZE + 8, 3, 3);
    });
  };

  // Check collision
  const checkCollision = (x: number, y: number) => {
    const { map } = gameStateRef.current;
    if (y < 0 || y >= GAME_HEIGHT || x < 0 || x >= GAME_WIDTH) return true;
    return map[y][x] === 1;
  };

  // Update game logic
  const updateGame = () => {
    if (gameState !== 'playing') return;

    const { pacman, ghosts, map } = gameStateRef.current;

    // Update Pac-Man position
    const newX = pacman.x + pacman.nextDirection.x;
    const newY = pacman.y + pacman.nextDirection.y;
    
    if (!checkCollision(newX, newY)) {
      pacman.direction = { ...pacman.nextDirection };
    }

    const moveX = pacman.x + pacman.direction.x;
    const moveY = pacman.y + pacman.direction.y;

    if (!checkCollision(moveX, moveY)) {
      pacman.x = moveX;
      pacman.y = moveY;
      pacman.mouthOpen = !pacman.mouthOpen;

      // Check for dots
      const cell = map[pacman.y][pacman.x];
      if (cell === 2) {
        map[pacman.y][pacman.x] = 0;
        setScore(s => s + 10);
      } else if (cell === 3) {
        map[pacman.y][pacman.x] = 0;
        setScore(s => s + 50);
        gameStateRef.current.powerMode = true;
        gameStateRef.current.powerModeTimer = 150;
      }
    }

    // Update power mode
    if (gameStateRef.current.powerMode) {
      gameStateRef.current.powerModeTimer--;
      if (gameStateRef.current.powerModeTimer <= 0) {
        gameStateRef.current.powerMode = false;
      }
    }

    // Update ghosts
    ghosts.forEach(ghost => {
      const directions = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 }
      ];

      // Simple AI: Random direction when blocked
      const newGhostX = ghost.x + ghost.direction.x;
      const newGhostY = ghost.y + ghost.direction.y;

      if (checkCollision(newGhostX, newGhostY) || Math.random() < 0.05) {
        const validDirections = directions.filter(d => 
          !checkCollision(ghost.x + d.x, ghost.y + d.y)
        );
        if (validDirections.length > 0) {
          ghost.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
        }
      } else {
        ghost.x = newGhostX;
        ghost.y = newGhostY;
      }

      // Check collision with Pac-Man
      if (ghost.x === pacman.x && ghost.y === pacman.y) {
        if (gameStateRef.current.powerMode) {
          // Eat ghost
          setScore(s => s + 200);
          ghost.x = 14;
          ghost.y = 14;
        } else {
          // Lose life
          setLives(l => {
            const newLives = l - 1;
            if (newLives <= 0) {
              setGameState('gameover');
            } else {
              // Reset positions
              pacman.x = 14;
              pacman.y = 23;
              pacman.direction = { x: 0, y: 0 };
              pacman.nextDirection = { x: 0, y: 0 };
              ghosts.forEach((g, i) => {
                g.x = 13 + (i % 2);
                g.y = 14 + Math.floor(i / 2);
              });
            }
            return newLives;
          });
        }
      }
    });

    drawGame();
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      const key = e.key.toLowerCase();
      const { pacman } = gameStateRef.current;

      switch (key) {
        case 'arrowup':
        case 'w':
          e.preventDefault();
          pacman.nextDirection = { x: 0, y: -1 };
          break;
        case 'arrowdown':
        case 's':
          e.preventDefault();
          pacman.nextDirection = { x: 0, y: 1 };
          break;
        case 'arrowleft':
        case 'a':
          e.preventDefault();
          pacman.nextDirection = { x: -1, y: 0 };
          break;
        case 'arrowright':
        case 'd':
          e.preventDefault();
          pacman.nextDirection = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState]);

  // Game loop
  useEffect(() => {
    let animationId: number;
    let lastTime = 0;
    const fps = 60;
    const interval = 1000 / fps;

    const gameLoop = (currentTime: number) => {
      animationId = requestAnimationFrame(gameLoop);

      const deltaTime = currentTime - lastTime;
      if (deltaTime >= interval) {
        lastTime = currentTime - (deltaTime % interval);
        updateGame();
      }
    };

    if (gameState === 'playing') {
      animationId = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [gameState]);

  const handleStart = () => {
    setGameState('playing');
    drawGame();
  };

  const handlePause = () => {
    setGameState(gameState === 'playing' ? 'paused' : 'playing');
  };

  const handleReset = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setGameState('ready');
    gameStateRef.current = {
      pacman: { x: 14, y: 23, direction: { x: 0, y: 0 }, nextDirection: { x: 0, y: 0 }, mouthOpen: true },
      ghosts: [
        { x: 13, y: 14, color: '#FF0000', direction: { x: 1, y: 0 } },
        { x: 14, y: 14, color: '#FFB8FF', direction: { x: -1, y: 0 } },
        { x: 13, y: 15, color: '#00FFDE', direction: { x: 0, y: -1 } },
        { x: 14, y: 15, color: '#FFB852', direction: { x: 0, y: 1 } },
      ],
      map: INITIAL_MAP.map(row => [...row]),
      powerMode: false,
      powerModeTimer: 0,
    };
    drawGame();
  };

  // Initial draw
  useEffect(() => {
    drawGame();
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="text-terminal-green hover:bg-terminal-green/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Terminal
        </Button>

        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">PAC-MAN</h1>
          <Badge variant="outline" className="text-sm">Classic Arcade Game</Badge>
        </div>

        <div className="w-32" />
      </div>

      {/* Game Container */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Canvas */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex justify-center bg-black rounded-lg p-4">
                <canvas
                  ref={canvasRef}
                  width={GAME_WIDTH * CELL_SIZE}
                  height={GAME_HEIGHT * CELL_SIZE}
                  className="border-2 border-primary/30"
                />
              </div>

              {/* Game State Overlay */}
              {gameState === 'ready' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
                  <div className="text-center">
                    <h2 className="text-4xl font-bold text-primary mb-4">READY!</h2>
                    <Button onClick={handleStart} size="lg" className="text-lg">
                      <Play className="h-5 w-5 mr-2" />
                      Start Game
                    </Button>
                  </div>
                </div>
              )}

              {gameState === 'paused' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
                  <div className="text-center">
                    <h2 className="text-4xl font-bold text-primary mb-4">PAUSED</h2>
                    <Button onClick={handlePause} size="lg" className="text-lg">
                      <Play className="h-5 w-5 mr-2" />
                      Resume
                    </Button>
                  </div>
                </div>
              )}

              {gameState === 'gameover' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
                  <div className="text-center">
                    <h2 className="text-4xl font-bold text-destructive mb-4">GAME OVER</h2>
                    <p className="text-2xl text-muted-foreground mb-6">Final Score: {score}</p>
                    <Button onClick={handleReset} size="lg" className="text-lg">
                      <RotateCcw className="h-5 w-4 mr-2" />
                      Play Again
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Controls & Stats */}
        <div className="space-y-4">
          {/* Stats Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-primary">Game Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Score</div>
                <div className="text-3xl font-bold text-primary">{score}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Lives</div>
                <div className="flex gap-2">
                  {Array.from({ length: lives }).map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-yellow-400" />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Level</div>
                <div className="text-2xl font-bold text-primary">{level}</div>
              </div>
            </CardContent>
          </Card>

          {/* Controls Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-primary">Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleStart}
                  disabled={gameState === 'playing'}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </Button>
                <Button
                  onClick={handlePause}
                  disabled={gameState === 'ready' || gameState === 'gameover'}
                  variant="secondary"
                  className="w-full"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              </div>

              <Button onClick={handleReset} variant="outline" className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Game
              </Button>

              <div className="pt-4 border-t border-border space-y-2">
                <div className="text-sm font-semibold text-primary mb-3">⌨️ Keyboard Controls:</div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Move Up:</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">↑ / W</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Move Down:</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">↓ / S</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Move Left:</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">← / A</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Move Right:</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">→ / D</kbd>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-2">
                <div className="text-xs text-muted-foreground">
                  <p className="mb-2">🟡 <strong>Dots</strong> - 10 points</p>
                  <p className="mb-2">⚪ <strong>Power Pellets</strong> - 50 points + Power Mode</p>
                  <p>👻 <strong>Ghosts</strong> - 200 points (in Power Mode)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
