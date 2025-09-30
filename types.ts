export enum GamePhase {
  BETTING,
  IN_PROGRESS,
  ENDED,
  // FIX: Add game phases for useDiveControl hook to resolve errors.
  AWAITING_COMMAND,
  PRE_DIVE,
  DIVING,
  POST_DIVE,
}

export interface PlayerState {
  balance: number;
  // FIX: Add optional properties for useDiveControl hook to resolve errors.
  bet?: PlayerBet | null;
  hasEjected?: boolean;
}

export interface PlayerBet {
  amount: number;
  autoEjectMultiplier?: number | null;
  // FIX: Add optional property for useDiveControl hook to resolve errors.
  autoEjectDepth?: number | null;
}

export interface HistoryEntry {
  id: number;
  crashPoint: number;
}

export interface PlotPoint {
  x: number; // Represents time/progress
  y: number; // Represents multiplier
}

// FIX: Add missing types for useDiveControl hook and Terminal component to resolve errors.
export type MessageType = 'system' | 'player' | 'success' | 'error' | 'warning' | 'info' | 'dive';

export interface Message {
  id: number;
  text: string;
  type: MessageType;
}

export interface NPC {
  name: string;
  betAmount: number;
  autoEjectDepth: number | null;
  hasEjected: boolean;
  ejectMultiplier?: number;
}
