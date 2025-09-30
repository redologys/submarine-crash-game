import { useState, useRef, useEffect, useCallback } from 'react';
import { GamePhase, PlayerState, PlayerBet, HistoryEntry, PlotPoint } from '../types';
import { INITIAL_BALANCE, PRE_DIVE_DURATION, POST_DIVE_DELAY, TREASURE_MARKER_DEFINITIONS, TREASURE_BONUS } from '../constants';

// --- Helper Functions ---
const generateCrashPoint = (): number => {
  // By taking the square root of the random number, we skew the distribution.
  // A regular Math.random() results in a 50% chance of the game crashing before 2x.
  // Math.sqrt(Math.random()) makes lower random numbers (which lead to early crashes) less likely.
  // This shifts the median crash point higher, making the game feel more fair and exciting,
  // as more rounds will reach higher multipliers.
  const r = Math.sqrt(Math.random());
  const houseEdge = 1.03; // The house edge is still applied to ensure long-term profitability.
  const crash = 1 / (1 - r) / houseEdge;
  return Math.max(1.01, parseFloat(crash.toFixed(2)));
};

const generateTreasureMarkers = (): number[] => {
  return TREASURE_MARKER_DEFINITIONS.map(def =>
    parseFloat((def.base + (Math.random() - 0.5) * def.range).toFixed(2))
  ).sort((a, b) => a - b);
};

// --- The Hook ---
export const useGameEngine = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.BETTING);
  const [playerState, setPlayerState] = useState<PlayerState>({ balance: INITIAL_BALANCE });
  const [playerBet, setPlayerBet] = useState<PlayerBet | null>(null);
  const [multiplier, setMultiplier] = useState(1.00);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [winnings, setWinnings] = useState<number | null>(null);
  const [plotPoints, setPlotPoints] = useState<PlotPoint[]>([]);
  const [treasureMarkers, setTreasureMarkers] = useState<number[]>([]);
  const [hasEjected, setHasEjected] = useState(false);
  const [ejectMultiplier, setEjectMultiplier] = useState<number | null>(null);

  const animationFrameId = useRef<number | null>(null);
  const gameLoopState = useRef({
    startTime: 0,
    crashPoint: 1,
    lastUpdateTime: 0,
    timeProgress: 0,
  });

  const stopGameLoop = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  }, []);
  
  const resetForNewRound = useCallback(() => {
    setGamePhase(GamePhase.BETTING);
    setPlayerBet(null);
    setWinnings(null);
    setPlotPoints([]);
    setMultiplier(1.00);
    setHasEjected(false);
    setEjectMultiplier(null);
  }, []);

  const handleCrash = useCallback(() => {
    stopGameLoop();
    setGamePhase(GamePhase.ENDED);
    setMultiplier(gameLoopState.current.crashPoint);

    setHistory(prev => [{
      id: Date.now(),
      crashPoint: gameLoopState.current.crashPoint
    }, ...prev].slice(0, 15));
    
    if (playerBet && !hasEjected) {
        // Player lost
    }

    setTimeout(resetForNewRound, POST_DIVE_DELAY);
  }, [playerBet, stopGameLoop, resetForNewRound, hasEjected]);

  const performEject = useCallback(() => {
    if (gamePhase !== GamePhase.IN_PROGRESS || !playerBet || hasEjected) return;
    
    setHasEjected(true);
    const currentEjectMultiplier = multiplier;
    setEjectMultiplier(currentEjectMultiplier);

    let totalWinnings = playerBet.amount * currentEjectMultiplier;
    let bonusWinnings = 0;
    
    const highestPassedMarker = [...treasureMarkers]
      .filter(m => currentEjectMultiplier >= m)
      .pop();

    if (highestPassedMarker) {
        bonusWinnings = (playerBet.amount * currentEjectMultiplier) * TREASURE_BONUS;
        totalWinnings += bonusWinnings;
    }
    
    setPlayerState(prev => ({ ...prev, balance: prev.balance + totalWinnings }));
    setWinnings(totalWinnings);
  }, [gamePhase, playerBet, multiplier, treasureMarkers, hasEjected]);

  const gameLoop = useCallback((timestamp: number) => {
    if (gameLoopState.current.startTime === 0) {
        gameLoopState.current.startTime = timestamp;
        gameLoopState.current.lastUpdateTime = timestamp;
    }
    
    const deltaTime = (timestamp - gameLoopState.current.lastUpdateTime) / 1000;
    gameLoopState.current.lastUpdateTime = timestamp;

    // Exponential growth formula
    const newMultiplier = 1.00 * Math.pow(1.05 + gameLoopState.current.timeProgress / 100, gameLoopState.current.timeProgress);
    gameLoopState.current.timeProgress += deltaTime * 2;
    
    if (newMultiplier >= gameLoopState.current.crashPoint) {
      handleCrash();
      return;
    }
    
    setMultiplier(newMultiplier);
    
    if (plotPoints.length === 0 || gameLoopState.current.timeProgress - plotPoints[plotPoints.length -1].x > 0.05) {
      setPlotPoints(prev => [...prev, { x: gameLoopState.current.timeProgress, y: newMultiplier }]);
    }
    
    if (playerBet?.autoEjectMultiplier && newMultiplier >= playerBet.autoEjectMultiplier) {
      if (!hasEjected) performEject();
    }
    
    animationFrameId.current = requestAnimationFrame(gameLoop);

  }, [handleCrash, playerBet, performEject, plotPoints, hasEjected]);

  const startDive = useCallback(() => {
    setGamePhase(GamePhase.IN_PROGRESS);
    setWinnings(null);
    setHasEjected(false);
    setEjectMultiplier(null);
    gameLoopState.current = {
      ...gameLoopState.current,
      startTime: 0,
      crashPoint: generateCrashPoint(),
      timeProgress: 0,
    };
    setTreasureMarkers(generateTreasureMarkers());
    setPlotPoints([]); // Clear points for new round
    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  const placeBet = useCallback((bet: PlayerBet) => {
    if (gamePhase !== GamePhase.BETTING || bet.amount <= 0 || bet.amount > playerState.balance) {
      return;
    }
    setPlayerState(prev => ({ ...prev, balance: prev.balance - bet.amount }));
    setPlayerBet(bet);
    
    setTimeout(startDive, 500);

  }, [gamePhase, playerState.balance, startDive]);
  
  useEffect(() => {
    return () => stopGameLoop();
  }, [stopGameLoop]);

  return { 
    gamePhase, 
    playerState, 
    multiplier, 
    history, 
    plotPoints, 
    treasureMarkers,
    placeBet, 
    eject: performEject,
    winnings,
    hasEjected,
    ejectMultiplier
  };
};