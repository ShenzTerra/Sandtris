import { SandColor } from './types';

// Board Dimensions
export const COLS = 60;
export const ROWS = 100;
export const CELL_SIZE = 5; 
export const TICK_RATE = 1000 / 60; 

export const BLOCK_SCALE = 6; 

// Reduced palette to 5 high-contrast colors for easier bridging
export const COLORS = [
  SandColor.Red,
  SandColor.Yellow,
  SandColor.Cyan,
  SandColor.Purple,
  SandColor.Pink,
];

const I = [
  [0, 0, 0, 0],
  [1, 1, 1, 1],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];

const J = [
  [1, 0, 0],
  [1, 1, 1],
  [0, 0, 0],
];

const L = [
  [0, 0, 1],
  [1, 1, 1],
  [0, 0, 0],
];

const O = [
  [1, 1],
  [1, 1],
];

const S = [
  [0, 1, 1],
  [1, 1, 0],
  [0, 0, 0],
];

const T = [
  [0, 1, 0],
  [1, 1, 1],
  [0, 0, 0],
];

const Z = [
  [1, 1, 0],
  [0, 1, 1],
  [0, 0, 0],
];

export const SHAPES: Record<string, number[][]> = { I, J, L, O, S, T, Z };
export const SHAPE_KEYS = Object.keys(SHAPES);

export const createScaledShape = (shape: number[][], scale: number): number[][] => {
  const h = shape.length;
  const w = shape[0].length;
  const scaledH = h * scale;
  const scaledW = w * scale;
  
  const scaled = Array.from({ length: scaledH }, () => Array(scaledW).fill(0));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (shape[y][x]) {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            scaled[y * scale + dy][x * scale + dx] = 1;
          }
        }
      }
    }
  }
  return scaled;
};