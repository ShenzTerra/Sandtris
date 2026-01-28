export enum SandColor {
  Red = '#ff4d4d',     
  Orange = '#ff9f43',  
  Yellow = '#feca57',   
  Green = '#1dd1a1',   
  Cyan = '#48dbfb',    
  Blue = '#54a0ff',    
  Purple = '#a29bfe',  
  Pink = '#ff9ff3',    
}

export interface Point {
  x: number;
  y: number;
}

export interface Piece {
  x: number;
  y: number;
  color: string;
  shape: number[][]; 
  type: string; 
}

export interface GameState {
  score: number;
  highScore: number;
  isGameOver: boolean;
  isPaused: boolean;
  nextPiece: Piece | null;
}