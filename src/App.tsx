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
const CANVAS_SIZE = 400;
const INITIAL_SNAKE_LENGTH = 15;
const BASE_SPEED = 2.5;
const BOOST_SPEED = 5.0;
const ROTATION_SPEED = 0.08;
const SNAKE_RADIUS = 8;
const SEGMENT_SPACING = 5; // Distance between segments
const FOOD_RADIUS = 5;
const INITIAL_POS = { x: 200, y: 200 };

type Point = { x: number; y: number };

export default function App() {
  // --- State ---
  const [snake, setSnake] = useState<Point[]>([]);
  const [food, setFood] = useState<Point>({ x: 100, y: 100 });
  const [angle, setAngle] = useState(-Math.PI / 2); // Start pointing UP
  const [targetAngle, setTargetAngle] = useState(-Math.PI / 2);
  const [isBoosting, setIsBoosting] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const keysRef = useRef<Set<string>>(new Set());

  // --- Helpers ---
  const getRandomPoint = useCallback((): Point => ({
    x: Math.random() * CANVAS_SIZE,
    y: Math.random() * CANVAS_SIZE,
  }), []);

  const spawnFood = useCallback(() => {
    setFood(getRandomPoint());
  }, [getRandomPoint]);

  const resetGame = () => {
    const initialSnake: Point[] = [];
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
       initialSnake.push({ x: INITIAL_POS.x, y: INITIAL_POS.y + i * SEGMENT_SPACING });
    }
    setSnake(initialSnake);
    setAngle(-Math.PI / 2);
    setTargetAngle(-Math.PI / 2);
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setIsBoosting(false);
    spawnFood();
  };

  const startGame = () => {
    setIsStarted(true);
    resetGame();
  };

  // --- Game Logic ---
  const moveSnake = useCallback(() => {
    if (isGameOver || isPaused || !isStarted) return;

    // Handle Rotation
    let rotation = 0;
    if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a')) rotation -= ROTATION_SPEED;
    if (keysRef.current.has('ArrowRight') || keysRef.current.has('d')) rotation += ROTATION_SPEED;
    
    const newAngle = angle + rotation;
    setAngle(newAngle);

    const currentSpeed = isBoosting ? BOOST_SPEED : BASE_SPEED;

    setSnake((prevSnake) => {
      if (prevSnake.length === 0) return prevSnake;

      const head = prevSnake[0];
      const newHead = {
        x: head.x + Math.cos(newAngle) * currentSpeed,
        y: head.y + Math.sin(newAngle) * currentSpeed,
      };

      // 1. Wrap-around 
      if (newHead.x < 0) newHead.x = CANVAS_SIZE;
      else if (newHead.x > CANVAS_SIZE) newHead.x = 0;
      
      if (newHead.y < 0) newHead.y = CANVAS_SIZE;
      else if (newHead.y > CANVAS_SIZE) newHead.y = 0;

      // 2. Check Collisions: Self (Skip first few segments)
      for (let i = 20; i < prevSnake.length; i++) {
        const seg = prevSnake[i];
        const dist = Math.hypot(newHead.x - seg.x, newHead.y - seg.y);
        if (dist < SNAKE_RADIUS) {
          setIsGameOver(true);
          return prevSnake;
        }
      }

      // 3. Movement logic: Slither style
      const newSnake = [newHead];
      let lastPos = newHead;

      // Every segment follows the one in front of it at a fixed distance
      for (let i = 0; i < prevSnake.length - 1; i++) {
        const currentSeg = prevSnake[i];
        const nextSeg = prevSnake[i + 1];
        
        // Calculate distance between current and next
        const dx = nextSeg.x - lastPos.x;
        const dy = nextSeg.y - lastPos.y;
        
        // Wrap-aware distance calculation for trailing
        const dist = Math.hypot(dx, dy);
        
        if (dist > SEGMENT_SPACING) {
          const ratio = SEGMENT_SPACING / dist;
          const movedSeg = {
            x: lastPos.x + dx * ratio,
            y: lastPos.y + dy * ratio
          };
          newSnake.push(movedSeg);
          lastPos = movedSeg;
        } else {
          newSnake.push(nextSeg);
          lastPos = nextSeg;
        }
      }

      // Check Food
      const foodDist = Math.hypot(newHead.x - food.x, newHead.y - food.y);
      if (foodDist < SNAKE_RADIUS + FOOD_RADIUS) {
        setScore(s => s + 10);
        spawnFood();
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 300);
        
        // Add multiple segments when eating
        for(let i = 0; i < 5; i++) {
           newSnake.push({ ...newSnake[newSnake.length - 1] });
        }
      }

      return newSnake;
    });
  }, [angle, food, isGameOver, isPaused, isStarted, spawnFood, isBoosting]);

  // --- Input ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      
      if (e.key === ' ') {
        if (isStarted && !isGameOver) setIsPaused(p => !p);
        if (isGameOver) resetGame();
        if (!isStarted) startGame();
      }
      
      if (e.key === 'Shift') setIsBoosting(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
      if (e.key === 'Shift') setIsBoosting(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isGameOver, isPaused, isStarted]);

  // --- Game Loop ---
  useEffect(() => {
    const loop = () => {
      moveSnake();
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    if (isStarted && !isGameOver && !isPaused) {
      gameLoopRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [isStarted, isGameOver, isPaused, moveSnake]);

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

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Grid
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 0.5;
    const gridSize = 40;
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw Food
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#f43f5e';
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(food.x, food.y, FOOD_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Draw Snake
    if (snake.length > 0) {
      // Draw tail to head to layer correctly
      for (let i = snake.length - 1; i >= 0; i--) {
        const seg = snake[i];
        const isHead = i === 0;
        
        ctx.shadowBlur = isHead ? 20 : 5;
        ctx.shadowColor = isHead ? '#22d3ee' : '#0891b2';
        ctx.fillStyle = isHead ? '#22d3ee' : '#0891b2';
        
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, isHead ? SNAKE_RADIUS : SNAKE_RADIUS * 0.8, 0, Math.PI * 2);
        ctx.fill();

        if (isHead) {
          // Eyes
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#000';
          const eyeOffset = 4;
          const eyeX1 = seg.x + Math.cos(angle + 0.5) * eyeOffset;
          const eyeY1 = seg.y + Math.sin(angle + 0.5) * eyeOffset;
          const eyeX2 = seg.x + Math.cos(angle - 0.5) * eyeOffset;
          const eyeY2 = seg.y + Math.sin(angle - 0.5) * eyeOffset;
          
          ctx.beginPath();
          ctx.arc(eyeX1, eyeY1, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(eyeX2, eyeY2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    ctx.shadowBlur = 0;
  }, [snake, food, angle]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6 font-sans select-none">
      
      {/* --- Header --- */}
      <div className="w-full max-w-md flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-display font-bold text-cyan-400 tracking-tighter neon-glow flex items-center gap-2">
            SLITHER NEON
          </h1>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
            FREE MOVEMENT // v2.0
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
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
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
                    <h2 className="text-2xl font-display font-bold text-zinc-100 uppercase tracking-widest">Free Movement</h2>
                    <p className="text-sm text-zinc-500 max-w-[240px]">Use A/D or Arrows to steer. Hold SHIFT to boost. Consume energy.</p>
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
                      <span className="flex items-center gap-1"><span className="p-1 border border-zinc-800 rounded bg-zinc-900">A/D</span> STEER</span>
                      <span className="flex items-center gap-1"><span className="p-1 border border-zinc-800 rounded bg-zinc-900">SHIFT</span> BOOST</span>
                      <span className="flex items-center gap-1"><span className="p-1 border border-zinc-800 rounded bg-zinc-900">SPACE</span> PAUSE</span>
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
                  <h2 className="text-4xl font-display font-bold text-rose-400 uppercase tracking-tighter italic">CRITICAL FAILURE</h2>
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

      <div className="hidden sm:flex items-center gap-12 text-zinc-600 font-mono text-[10px]">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <span>BOOST: {isBoosting ? 'ENABLED' : 'OFF'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          <span>RANK: {score < 50 ? 'NOVICE' : score < 150 ? 'ADVANCED' : 'ELITE'}</span>
        </div>
      </div>
    </div>
  );
}


