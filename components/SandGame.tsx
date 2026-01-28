import React, { useEffect, useRef, useState } from 'react';
import { Pause, ArrowLeft, ArrowRight, ArrowDown, RefreshCw, RotateCw, Play, Zap, Trophy, Coins } from 'lucide-react';
import { COLS, ROWS, CELL_SIZE, COLORS, SHAPES, SHAPE_KEYS, BLOCK_SCALE, createScaledShape, TICK_RATE } from '../constants';
import { Piece } from '../types';

const getRandomPiece = (): Piece => {
  const type = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
  const baseShape = SHAPES[type];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const shape = createScaledShape(baseShape, BLOCK_SCALE);
  const x = Math.floor((COLS - shape[0].length) / 2);
  
  return { type, shape, color, x, y: 0 };
};

const checkCollision = (grid: (string | null)[], piece: Piece, offsetX = 0, offsetY = 0): boolean => {
  const { x, y, shape } = piece;
  const h = shape.length;
  const w = shape[0].length;

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (shape[r][c]) {
        const newX = x + c + offsetX;
        const newY = y + r + offsetY;
        if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
        if (newY >= 0 && grid[newY * COLS + newX] !== null) return true;
      }
    }
  }
  return false;
};

const rotateMatrix = (matrix: number[][]): number[][] => {
  const N = matrix.length;
  const M = matrix[0].length;
  const newMatrix = Array.from({ length: M }, () => Array(N).fill(0));
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < M; c++) {
      newMatrix[c][N - 1 - r] = matrix[r][c];
    }
  }
  return newMatrix;
};

export const SandGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const dropCounterRef = useRef<number>(0);
  const gridRef = useRef<(string | null)[]>(new Array(COLS * ROWS).fill(null));
  const visitedRef = useRef<Uint8Array>(new Uint8Array(COLS * ROWS));
  const pieceRef = useRef<Piece>(getRandomPiece());
  const nextPieceRef = useRef<Piece>(getRandomPiece());

  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [nextPieceDisplay, setNextPieceDisplay] = useState<Piece | null>(null);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('sand-tetris-highscore') || '0'));

  useEffect(() => {
    setNextPieceDisplay(nextPieceRef.current);
  }, []);

  const resetGame = () => {
    gridRef.current = new Array(COLS * ROWS).fill(null);
    pieceRef.current = getRandomPiece();
    nextPieceRef.current = getRandomPiece();
    setNextPieceDisplay(nextPieceRef.current);
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    dropCounterRef.current = 0;
  };

  const spawnNextPiece = () => {
    pieceRef.current = { ...nextPieceRef.current, x: Math.floor((COLS - nextPieceRef.current.shape[0].length) / 2), y: 0 };
    nextPieceRef.current = getRandomPiece();
    setNextPieceDisplay(nextPieceRef.current);
    if (checkCollision(gridRef.current, pieceRef.current)) setIsGameOver(true);
  };

  const lockPiece = () => {
    const { x, y, shape, color } = pieceRef.current;
    const h = shape.length;
    const w = shape[0].length;
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (shape[r][c]) {
          const gridX = x + c;
          const gridY = y + r;
          if (gridX >= 0 && gridX < COLS && gridY >= 0 && gridY < ROWS) {
            gridRef.current[gridY * COLS + gridX] = color;
          }
        }
      }
    }
    spawnNextPiece();
  };

  const updatePhysics = () => {
    const grid = gridRef.current;
    let active = false;
    for (let y = ROWS - 2; y >= 0; y--) {
      for (let x = 0; x < COLS; x++) {
        const idx = y * COLS + x;
        const cell = grid[idx];
        if (!cell) continue;
        const downIdx = (y + 1) * COLS + x;
        const canGoDown = grid[downIdx] === null;
        if (canGoDown) {
           grid[downIdx] = cell;
           grid[idx] = null;
           active = true;
           continue;
        }
        const leftIdx = (y + 1) * COLS + (x - 1);
        const rightIdx = (y + 1) * COLS + (x + 1);
        const canGoLeft = x > 0 && grid[leftIdx] === null;
        const canGoRight = x < COLS - 1 && grid[rightIdx] === null;
        if (canGoLeft && canGoRight) {
           const dir = Math.random() < 0.5 ? -1 : 1;
           grid[(y + 1) * COLS + (x + dir)] = cell;
           grid[idx] = null;
           active = true;
        } else if (canGoLeft) {
           grid[leftIdx] = cell;
           grid[idx] = null;
           active = true;
        } else if (canGoRight) {
           grid[rightIdx] = cell;
           grid[idx] = null;
           active = true;
        }
      }
    }
    return active;
  };

  const checkLines = () => {
    const grid = gridRef.current;
    const visited = visitedRef.current;
    visited.fill(0);
    const groupsToRemove: number[][] = []; 
    for (let y = 0; y < ROWS; y++) {
      const startIdx = y * COLS + 0; 
      if (grid[startIdx] !== null && visited[startIdx] === 0) {
        const color = grid[startIdx];
        const queue = [startIdx];
        const groupIndices: number[] = [];
        let reachedRight = false;
        visited[startIdx] = 1;
        let head = 0;
        while(head < queue.length) {
          const currIdx = queue[head++];
          groupIndices.push(currIdx);
          const cx = currIdx % COLS;
          const cy = Math.floor(currIdx / COLS);
          if (cx === COLS - 1) reachedRight = true;
          const neighbors = [
            { nx: cx, ny: cy - 1 }, { nx: cx, ny: cy + 1 },
            { nx: cx - 1, ny: cy }, { nx: cx + 1, ny: cy }
          ];
          for (const {nx, ny} of neighbors) {
             if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
               const nIdx = ny * COLS + nx;
               if (visited[nIdx] === 0 && grid[nIdx] === color) {
                 visited[nIdx] = 1;
                 queue.push(nIdx);
               }
             }
          }
        }
        if (reachedRight) groupsToRemove.push(groupIndices);
      }
    }
    if (groupsToRemove.length > 0) {
      let pixelsCleared = 0;
      groupsToRemove.forEach(group => {
        pixelsCleared += group.length;
        group.forEach(idx => grid[idx] = null);
      });
      setScore(prev => prev + pixelsCleared);
    }
  };

  const move = (dx: number, dy: number) => {
    if (isGameOver || isPaused) return;
    if (!checkCollision(gridRef.current, pieceRef.current, dx, dy)) {
      pieceRef.current.x += dx;
      pieceRef.current.y += dy;
    } else if (dy > 0 && dx === 0) {
      lockPiece();
    }
  };

  const rotate = () => {
    if (isGameOver || isPaused) return;
    const { shape } = pieceRef.current;
    const newShape = rotateMatrix(shape);
    const kicks = [{ ox: 0, oy: 0 }, { ox: -1, oy: 0 }, { ox: 1, oy: 0 }, { ox: 0, oy: -1 }];
    for (const { ox, oy } of kicks) {
      const testPiece = { ...pieceRef.current, shape: newShape };
      if (!checkCollision(gridRef.current, testPiece, ox, oy)) {
        pieceRef.current.shape = newShape;
        pieceRef.current.x += ox;
        pieceRef.current.y += oy;
        return;
      }
    }
  };

  const hardDrop = () => {
    if (isGameOver || isPaused) return;
    while (!checkCollision(gridRef.current, pieceRef.current, 0, 1)) {
      pieceRef.current.y += 1;
    }
    lockPiece();
  };

  const loop = (time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const delta = time - lastTimeRef.current;
    if (delta > TICK_RATE && !isPaused && !isGameOver) {
      updatePhysics();
      checkLines();
      const gravityThreshold = Math.max(30, 400 - Math.floor(score / 2000) * 30);
      dropCounterRef.current += delta;
      if (dropCounterRef.current > gravityThreshold) {
        move(0, 1);
        dropCounterRef.current = 0;
      }
      lastTimeRef.current = time;
      draw();
    }
    if (!isGameOver) requestRef.current = requestAnimationFrame(loop);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#050515'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw Grid (Sand)
    const grid = gridRef.current;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i]) {
        const x = i % COLS;
        const y = Math.floor(i / COLS);
        ctx.fillStyle = grid[i] as string;
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
    
    // Draw Active Piece
    if (!isGameOver) {
      const { x, y, shape, color } = pieceRef.current;
      ctx.fillStyle = color;
      const h = shape.length;
      const w = shape[0].length;
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          if (shape[r][c]) {
            ctx.fillRect((x + c) * CELL_SIZE, (y + r) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;
      switch (e.key) {
        case 'ArrowLeft': move(-1, 0); break;
        case 'ArrowRight': move(1, 0); break;
        case 'ArrowDown': move(0, 1); break;
        case 'ArrowUp': rotate(); break;
        case ' ': hardDrop(); break;
        case 'p': case 'P': setIsPaused(prev => !prev); break;
      }
      draw();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameOver, isPaused, score]);

  useEffect(() => {
    if (!isGameOver && !isPaused) requestRef.current = requestAnimationFrame(loop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPaused, isGameOver]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('sand-tetris-highscore', score.toString());
    }
  }, [score]);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen w-full bg-[#050515] text-white p-4 pt-8 lg:pt-12 overflow-hidden selection:bg-rose-500">
      
      {/* 90s ARCADE HEADER */}
      <div className="relative mb-8 text-center group">
        <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-cyan-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-[#050515] px-8 py-4 rounded-lg border-2 border-slate-800">
           <h1 className="logo-text text-6xl lg:text-8xl tracking-widest uppercase">SANDTRIS</h1>
           <div className="flex justify-center gap-2 mt-2">
             <div className="w-12 h-1 bg-rose-500 shadow-[0_0_8px_#f43f5e]"></div>
             <div className="w-12 h-1 bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></div>
             <div className="w-12 h-1 bg-rose-500 shadow-[0_0_8px_#f43f5e]"></div>
           </div>
        </div>
        <p className="text-[10px] lg:text-xs mt-3 tracking-[0.4em] text-slate-400 font-bold uppercase animate-pulse">Insert Coin to Start</p>
      </div>

      <div className="flex flex-col lg:flex-row items-start justify-center gap-8 w-full max-w-6xl mx-auto h-full">
        
        {/* Left Side: Stats */}
        <div className="hidden lg:flex flex-col gap-6 w-56 order-1">
          <StatDisplay label="1P SCORE" value={score} color="text-yellow-400" icon={<Zap size={14}/>} />
          <StatDisplay label="HI-SCORE" value={highScore} color="text-rose-400" icon={<Trophy size={14}/>} />
          
          <div className="bg-slate-900/40 p-4 rounded-lg border-2 border-slate-800 backdrop-blur-sm">
            <p className="text-[10px] text-slate-500 font-bold mb-4 tracking-tighter">NEXT UNIT</p>
            <div className="h-24 flex items-center justify-center bg-black/40 rounded border border-slate-700/50">
               <NextPiecePreview piece={nextPieceDisplay} />
            </div>
          </div>
        </div>

        {/* Center: The Screen */}
        <div className="relative order-2 self-center lg:self-start">
           {/* Arcade Cabinet Frame */}
           <div className="relative p-3 bg-slate-800 rounded-lg border-b-8 border-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.8)] crt-container vignette">
              <canvas
                ref={canvasRef}
                width={COLS * CELL_SIZE}
                height={ROWS * CELL_SIZE}
                className="block bg-black shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]"
                style={{ height: '65vh', width: 'auto' }}
              />
              
              {/* Overlays */}
              {isPaused && !isGameOver && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40 backdrop-blur-[1px]">
                   <span className="text-4xl font-bold tracking-widest text-white blink drop-shadow-[0_0_10px_#fff]">PAUSED</span>
                </div>
              )}

              {isGameOver && (
                <div className="absolute inset-0 bg-rose-950/80 flex flex-col items-center justify-center z-50 p-6 text-center">
                   <h2 className="text-5xl font-black text-rose-500 drop-shadow-[0_0_15px_#f43f5e] mb-4">GAME OVER</h2>
                   <p className="text-xs text-rose-200 mb-8 uppercase tracking-widest">Score: {score}</p>
                   <button 
                     onClick={resetGame}
                     className="arcade-btn bg-white text-rose-950 px-8 py-3 rounded font-black uppercase text-sm active:scale-95"
                   >
                     Continue? 10
                   </button>
                </div>
              )}
           </div>
           
           {/* Mobile Stats Row */}
           <div className="lg:hidden flex justify-between w-full mt-4 px-2">
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-500 uppercase font-bold">Score</span>
                <span className="text-lg font-mono text-yellow-400 leading-none">{score}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] text-slate-500 uppercase font-bold">Best</span>
                <span className="text-lg font-mono text-rose-400 leading-none">{highScore}</span>
              </div>
           </div>
        </div>

        {/* Right Side: Control Panel (Arcade Style Buttons) */}
        <div className="flex flex-col gap-4 w-full lg:w-64 order-3 pb-8 lg:pb-0">
          <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto lg:max-w-none w-full">
            <div className="col-start-2">
              <ArcadeButton onClick={rotate} color="bg-cyan-500" icon={<RotateCw size={24}/>} label="UP" />
            </div>
            <div className="col-start-1 row-start-2">
              <ArcadeButton onClick={() => move(-1, 0)} color="bg-slate-600" icon={<ArrowLeft size={24}/>} label="LEFT" />
            </div>
            <div className="col-start-2 row-start-2">
              <ArcadeButton onClick={() => move(0, 1)} color="bg-slate-600" icon={<ArrowDown size={24}/>} label="DOWN" />
            </div>
            <div className="col-start-3 row-start-2">
              <ArcadeButton onClick={() => move(1, 0)} color="bg-slate-600" icon={<ArrowRight size={24}/>} label="RIGHT" />
            </div>
            <div className="col-start-1 row-start-3">
              <ArcadeButton onClick={() => setIsPaused(p => !p)} color="bg-amber-500" icon={isPaused ? <Play size={20}/> : <Pause size={20}/>} label="START" />
            </div>
            <div className="col-start-2 row-start-3 col-span-2">
              <ArcadeButton onClick={hardDrop} color="bg-rose-600" icon={<Zap size={24}/>} label="BOOM" wide />
            </div>
          </div>
          
          <div className="mt-8 hidden lg:block">
            <div className="p-4 border-2 border-slate-800 rounded-lg bg-slate-900/20">
               <h3 className="text-[10px] text-slate-400 font-bold mb-4 flex items-center gap-2"><Coins size={12}/> HOW TO PLAY</h3>
               <ul className="text-[8px] space-y-3 leading-relaxed text-slate-500">
                 <li>• BRIDGING: CONNECT SAME COLORS FROM LEFT WALL TO RIGHT WALL.</li>
                 <li>• GRAVITY: PIXELS FLOW LIKE REAL SAND.</li>
                 <li>• HARD DROP: TAP BOOM TO SMASH.</li>
               </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 opacity-10">
        <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-pink-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[5%] w-64 h-64 bg-cyan-500 rounded-full blur-[120px]"></div>
      </div>
    </div>
  );
};

const StatDisplay = ({ label, value, color, icon }: { label: string, value: number, color: string, icon: React.ReactNode }) => (
  <div className="flex flex-col gap-1 p-4 bg-slate-900/40 rounded-lg border-2 border-slate-800 backdrop-blur-sm">
    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-2 tracking-tighter uppercase">{icon} {label}</span>
    <span className={`text-3xl font-mono ${color} drop-shadow-[0_0_5px_currentColor]`}>{value.toLocaleString()}</span>
  </div>
);

const ArcadeButton = ({ onClick, color, icon, label, wide = false }: { onClick: () => void, color: string, icon: React.ReactNode, label: string, wide?: boolean }) => (
  <div className={`flex flex-col items-center gap-1 ${wide ? 'col-span-2' : ''}`}>
    <button
      onPointerDown={(e) => { e.preventDefault(); onClick(); }}
      className={`arcade-btn ${color} w-full aspect-square ${wide ? 'aspect-auto h-[60px]' : 'h-[60px]'} rounded-full flex items-center justify-center text-white border-4 border-black/20`}
    >
      {icon}
    </button>
    <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">{label}</span>
  </div>
);

const NextPiecePreview = ({ piece }: { piece: Piece | null }) => {
  if (!piece) return null;
  const shape = piece.shape;
  const h = shape.length;
  const w = shape[0].length;
  const PREVIEW_CELL_SIZE = 2;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${w}, ${PREVIEW_CELL_SIZE}px)` }}>
      {shape.map((row, r) => row.map((cell, c) => (
        <div key={`${r}-${c}`} style={{ backgroundColor: cell ? piece.color : 'transparent', width: PREVIEW_CELL_SIZE, height: PREVIEW_CELL_SIZE, boxShadow: cell ? `0 0 5px ${piece.color}` : 'none' }} />
      )))}
    </div>
  );
};