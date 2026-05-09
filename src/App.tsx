/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Play, 
  RotateCcw, 
  Pause, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Settings,
  Gamepad2
} from 'lucide-react';

// --- Constants ---
const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const MIN_SPEED = 60;
const SPEED_INCREMENT = 2;
const MAX_SPEED = 400;
const MANUAL_SPEED_STEP = 15;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const OPPOSITE_DIRECTIONS: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];

export default function App() {
  // --- State ---
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('UP');
  const [nextDirection, setNextDirection] = useState<Direction>('UP');
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [isFlashing, setIsFlashing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // --- Helpers ---
  const getRandomPoint = useCallback((): Point => {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  }, []);

  const spawnFood = useCallback((currentSnake: Point[]) => {
    let newFood = getRandomPoint();
    // Ensure food doesn't spawn on snake
    while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
      newFood = getRandomPoint();
    }
    setFood(newFood);
  }, [getRandomPoint]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection('UP');
    setNextDirection('UP');
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setSpeed(INITIAL_SPEED);
    spawnFood(INITIAL_SNAKE);
  };

  const startGame = () => {
    setIsStarted(true);
    resetGame();
  };

  // --- Game Logic ---
  const moveSnake = useCallback(() => {
    if (isGameOver || isPaused || !isStarted) return;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = { ...head };

      // Update direction for this tick
      setDirection(nextDirection);
      
      switch (nextDirection) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      // 1. Wrap-around logic
      if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
      else if (newHead.x >= GRID_SIZE) newHead.x = 0;
      
      if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
      else if (newHead.y >= GRID_SIZE) newHead.y = 0;

      // 2. Check Collisions: Self
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // 3. Check Food
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREMENT));
        spawnFood(newSnake);
        
        // Trigger flashing effect
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 300);
      } else {
        newSnake.pop(); // Remove tail
      }

      return newSnake;
    });
  }, [food, isGameOver, isPaused, isStarted, nextDirection, spawnFood]);

  // --- Input ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let newDir: Direction | null = null;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': newDir = 'UP'; break;
        case 'ArrowDown': case 's': case 'S': newDir = 'DOWN'; break;
        case 'ArrowLeft': case 'a': case 'A': newDir = 'LEFT'; break;
        case 'ArrowRight': case 'd': case 'D': newDir = 'RIGHT'; break;
        case ' ': 
          if (isStarted && !isGameOver) setIsPaused(p => !p);
          if (isGameOver) resetGame();
          if (!isStarted) startGame();
          break;
        case 'j': case 'J':
          setSpeed(prev => Math.min(MAX_SPEED, prev + MANUAL_SPEED_STEP));
          break;
        case 'k': case 'K':
          setSpeed(prev => Math.max(MIN_SPEED, prev - MANUAL_SPEED_STEP));
          break;
      }

      if (newDir && newDir !== OPPOSITE_DIRECTIONS[direction]) {
        setNextDirection(newDir);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, isGameOver, isPaused, isStarted]);

  // --- Audio Effects (Simulated with visual feedback for now) ---

  // --- Game Loop ---
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (!lastUpdateTimeRef.current) lastUpdateTimeRef.current = timestamp;
      const deltaTime = timestamp - lastUpdateTimeRef.current;

      if (deltaTime > speed) {
        moveSnake();
        lastUpdateTimeRef.current = timestamp;
      }
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    if (isStarted && !isGameOver && !isPaused) {
      gameLoopRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [isStarted, isGameOver, isPaused, speed, moveSnake]);

  // --- Persistent High Score ---
  useEffect(() => {
    const saved = localStorage.getItem('snake_high_score');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snake_high_score', score.toString());
    }
  }, [score, highScore]);

  // --- Rendering ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#09090b'; // zinc-950
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Enhanced Contrast)
    ctx.strokeStyle = '#27272a'; // zinc-800
    ctx.lineWidth = 0.5;
    const cellSize = canvas.width / GRID_SIZE;

    for (let i = 0; i <= GRID_SIZE; i++) {
      // Every 5th line is more prominent
      const isMajor = i % 5 === 0;
      ctx.strokeStyle = isMajor ? '#3f3f46' : '#27272a'; // zinc-700 / zinc-800
      ctx.lineWidth = isMajor ? 1 : 0.5;

      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Draw Snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      
      // Glow effect for snake
      ctx.shadowBlur = isHead ? 15 : 8;
      ctx.shadowColor = isHead ? '#22d3ee' : '#0891b2'; // cyan-400 / cyan-600
      
      ctx.fillStyle = isHead ? '#22d3ee' : '#0891b2';
      
      // Rounded snake segments
      const x = segment.x * cellSize + 2;
      const y = segment.y * cellSize + 2;
      const size = cellSize - 4;
      const radius = isHead ? 6 : 4;
      
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, radius);
      ctx.fill();
      
      // Eyes for the head
      if (isHead) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        const eyeSize = 3;
        const eyeOffset = size / 4;
        
        // Dynamic eyes based on direction
        let eye1 = { x: x + eyeOffset, y: y + eyeOffset };
        let eye2 = { x: x + size - eyeOffset - eyeSize, y: y + eyeOffset };
        
        if (direction === 'DOWN') {
          eye1 = { x: x + eyeOffset, y: y + size - eyeOffset - eyeSize };
          eye2 = { x: x + size - eyeOffset - eyeSize, y: y + size - eyeOffset - eyeSize };
        } else if (direction === 'LEFT') {
          eye1 = { x: x + eyeOffset, y: y + eyeOffset };
          eye2 = { x: x + eyeOffset, y: y + size - eyeOffset - eyeSize };
        } else if (direction === 'RIGHT') {
          eye1 = { x: x + size - eyeOffset - eyeSize, y: y + eyeOffset };
          eye2 = { x: x + size - eyeOffset - eyeSize, y: y + size - eyeOffset - eyeSize };
        }
        
        ctx.fillRect(eye1.x, eye1.y, eyeSize, eyeSize);
        ctx.fillRect(eye2.x, eye2.y, eyeSize, eyeSize);
      }
    });

    // Draw Food
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#f43f5e'; // rose-500
    ctx.fillStyle = '#f43f5e';
    
    const fx = food.x * cellSize + cellSize / 2;
    const fy = food.y * cellSize + cellSize / 2;
    const fRadius = cellSize / 3;

    ctx.beginPath();
    ctx.arc(fx, fy, fRadius, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow
    ctx.shadowBlur = 0;

  }, [snake, food, direction]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6 font-sans select-none">
      
      {/* --- Header --- */}
      <div className="w-full max-w-md flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-display font-bold text-cyan-400 tracking-tighter neon-glow flex items-center gap-2">
            NEON SNAKE
          </h1>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
            V 1.0 // SYSTEM ACTIVE
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Score</span>
            <span className="text-xl font-display font-bold text-zinc-100">{score}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Best</span>
            <span className="text-xl font-display font-bold text-rose-400">{highScore}</span>
          </div>
        </div>
      </div>

      {/* --- Game Stage --- */}
      <div className="relative group">
        <AnimatePresence>
          {isFlashing && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -inset-8 bg-cyan-500/20 blur-3xl z-0 pointer-events-none rounded-full"
            />
          )}
        </AnimatePresence>
        
        <div className={`absolute -inset-0.5 bg-cyan-500/20 blur-xl opacity-50 group-hover:opacity-100 transition duration-1000 ${isFlashing ? 'opacity-100 bg-cyan-400/40' : ''}`}></div>
        <div className={`relative border border-zinc-800 bg-zinc-950 rounded-xl overflow-hidden shadow-2xl transition-colors duration-300 ${isFlashing ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]' : ''}`}>
          <canvas 
            ref={canvasRef}
            width={400}
            height={400}
            className="block aspect-square max-w-[90vw] sm:max-w-none shadow-inner"
          />

          {/* Overlays */}
          <AnimatePresence>
            {!isStarted && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                      <Gamepad2 className="w-12 h-12 text-cyan-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-display font-bold text-zinc-100 uppercase tracking-widest">Initialization</h2>
                    <p className="text-sm text-zinc-500 max-w-[240px]">Navigate the grid. Consume energy modules. Loop through walls. Avoid self-collisions.</p>
                  </div>
                  <button 
                    onClick={startGame}
                    className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-display font-bold rounded-lg transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    START ENGINE
                  </button>
                  <div className="flex flex-col items-center justify-center gap-4 text-[10px] font-mono text-zinc-500">
                    <div className="flex gap-6">
                      <span className="flex items-center gap-1"><span className="p-1 border border-zinc-800 rounded bg-zinc-900">ARROWS</span> MOVE</span>
                      <span className="flex items-center gap-1"><span className="p-1 border border-zinc-800 rounded bg-zinc-900">SPACE</span> PAUSE</span>
                    </div>
                    <div className="flex gap-6">
                      <span className="flex items-center gap-1 text-cyan-500/60"><span className="p-1 border border-cyan-900/30 rounded bg-cyan-950/20">K</span> SPEED UP</span>
                      <span className="flex items-center gap-1 text-rose-500/60"><span className="p-1 border border-rose-900/30 rounded bg-rose-950/20">J</span> SPEED DOWN</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {isGameOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-rose-950/90 backdrop-blur-md p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-4xl font-display font-bold text-rose-400 uppercase tracking-tighter italic">GAME OVER</h2>
                  <div className="flex flex-col items-center justify-center py-4 border-y border-rose-500/20 gap-1 w-48 mx-auto">
                    <span className="text-[10px] font-mono text-rose-300/50 uppercase">Final Score</span>
                    <span className="text-4xl font-display font-bold text-white">{score}</span>
                    {score === highScore && score > 0 && (
                      <span className="text-[10px] font-display text-cyan-400 uppercase mt-2 animate-pulse">New Record!</span>
                    )}
                  </div>
                  <button 
                    onClick={resetGame}
                    className="w-full py-4 bg-white text-rose-950 font-display font-bold rounded-lg transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                  >
                    <RotateCcw className="w-5 h-5" />
                    REINITIALIZE
                  </button>
                </motion.div>
              </motion.div>
            )}

            {isPaused && !isGameOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/60 backdrop-blur-sm"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full border-2 border-cyan-500 flex items-center justify-center animate-pulse">
                    <Pause className="w-10 h-10 text-cyan-500 fill-current" />
                  </div>
                  <h3 className="font-display font-bold text-cyan-400 uppercase tracking-widest">System Paused</h3>
                  <button 
                    onClick={() => setIsPaused(false)}
                    className="px-6 py-2 border border-zinc-700 rounded-full text-zinc-100 font-display text-xs hover:bg-zinc-800"
                  >
                    Press Space to Resume
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* --- Controls --- */}
      <div className="w-full max-w-sm flex items-center justify-between gap-8 sm:hidden">
         {/* Mobile D-Pad */}
         <div className="grid grid-cols-3 gap-2">
            <div />
            <ControlButton icon={<ChevronUp />} onClick={() => direction !== 'DOWN' && setNextDirection('UP')} />
            <div />
            <ControlButton icon={<ChevronLeft />} onClick={() => direction !== 'RIGHT' && setNextDirection('LEFT')} />
            <ControlButton icon={<ChevronDown />} onClick={() => direction !== 'UP' && setNextDirection('DOWN')} />
            <ControlButton icon={<ChevronRight />} onClick={() => direction !== 'LEFT' && setNextDirection('RIGHT')} />
         </div>

         <div className="flex flex-col gap-3">
            <button 
              onClick={() => isGameOver ? resetGame() : setIsPaused(!isPaused)}
              className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-cyan-400 transition-colors"
            >
              {isGameOver ? <RotateCcw /> : isPaused ? <Play /> : <Pause />}
            </button>
         </div>
      </div>

      <div className="hidden sm:flex items-center gap-12 text-zinc-600 font-mono text-[10px]">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <span>SPEED: {Math.round((INITIAL_SPEED / speed) * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          <span>RANK: {score < 50 ? 'NOVICE' : score < 150 ? 'ADVANCED' : 'ELITE'}</span>
        </div>
      </div>
    </div>
  );
}

function ControlButton({ icon, onClick }: { icon: ReactNode, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-12 h-12 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 active:bg-cyan-500 active:text-zinc-950 active:border-cyan-400 transition-all outline-none"
    >
      {icon}
    </button>
  );
}

