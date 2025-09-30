import { useState, useRef, useEffect, useCallback } from 'react';
import { GamePhase, Message, PlayerState, PlayerBet, NPC, MessageType } from '../types';
import { INITIAL_BALANCE, PRE_DIVE_DURATION, POST_DIVE_DELAY, NPC_NAMES, TREASURE_MARKER_DEFINITIONS, TREASURE_BONUS } from '../constants';

// --- Helper Functions ---
const CHART_WIDTH = 30;
const CHART_HEIGHT = 10;

const generateCrashPoint = (): number => {
  const r = Math.random();
  const houseEdge = 1.03; // ~3% house edge
  const crash = 1 / (1 - r) / houseEdge;
  return Math.max(1.00, parseFloat(crash.toFixed(2))); // Can crash at 1.00x
};

const generateTreasureMarkers = (): number[] => {
  return TREASURE_MARKER_DEFINITIONS.map(def => 
    Math.floor(def.base + (Math.random() - 0.5) * def.range)
  ).sort((a, b) => a - b);
};

const generateNpcBets = (playerBetAmount: number): NPC[] => {
    const numNpcs = Math.floor(Math.random() * 3) + 2; // 2-4 NPCs
    const selectedNpcs = [...NPC_NAMES].sort(() => 0.5 - Math.random()).slice(0, numNpcs);

    return selectedNpcs.map(name => {
        const betAmount = Math.floor(Math.random() * (playerBetAmount * 4) + (playerBetAmount / 2));
        const willAutoEject = Math.random() > 0.4;
        const autoEjectDepth = willAutoEject 
            ? Math.floor(((Math.random() * 5) + 1.5) * 100) // Eject between 150m and 650m
            : null;
        return { name, betAmount, autoEjectDepth, hasEjected: false };
    });
};

const generateChart = (
    points: Map<number, number>,
    breachMultiplier: number | null
): string => {
    const grid: string[][] = Array.from({ length: CHART_HEIGHT }, () =>
        Array(CHART_WIDTH).fill(' ')
    );

    // Draw the points
    for (const [multiplier, x] of points.entries()) {
        if (multiplier > 10) continue;
        const y = 9 - (multiplier - 1);
        if (y >= 0 && y < CHART_HEIGHT && x >= 0 && x < CHART_WIDTH) {
            grid[y][x] = '*';
        }
    }

    let breachPoint: {x: number, y: number} | null = null;
    if (breachMultiplier) {
        const breachIntegerMultiplier = Math.floor(breachMultiplier);
        // Find the x-coordinate for the integer multiplier at or before the breach
        let pointX: number | undefined;
        for (let i = breachIntegerMultiplier; i >= 1; i--) {
            if (points.has(i)) {
                pointX = points.get(i);
                break;
            }
        }

        if (pointX !== undefined) {
             const breachY = 9 - (breachIntegerMultiplier - 1);
             breachPoint = {x: pointX, y: breachY};
             if (breachY >= 0 && breachY < CHART_HEIGHT && pointX >= 0 && pointX < CHART_WIDTH) {
                grid[breachY][pointX] = 'X';
            }
        }
    }
    
    const yLabels: { [key: number]: string } = {
        0: '10.0x+|',
        8: ' 1.0x|',
    };

    const chartRows: string[] = ['Depth|'];
    for (let y = 0; y < CHART_HEIGHT; y++) {
        const label = yLabels[y] || '     |';
        let rowContent = grid[y].join('');
        
        if (breachPoint && breachPoint.y === y) {
            rowContent += ' <-- HULL BREACH!';
        }
        
        chartRows.push(`${label}${rowContent}`);
    }

    chartRows.push('     +' + '-'.repeat(CHART_WIDTH) + '>');
    return chartRows.join('\n');
};

// --- The Hook ---
export const useDiveControl = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [playerState, setPlayerState] = useState<PlayerState>({
    balance: INITIAL_BALANCE,
    bet: null,
    hasEjected: false,
  });
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.AWAITING_COMMAND);
  const [isInputDisabled, setIsInputDisabled] = useState(false);

  // Refs to hold state that changes without causing re-renders
  const messageIdCounter = useRef(0);
  const diveState = useRef<{
    crashPoint: number;
    treasureMarkers: number[];
    npcs: NPC[];
    currentDepth: number;
    startTime: number | null;
    timeoutId: number | null;
    passedMarkers: number[];
    chartPoints: Map<number, number>;
    updateCount: number;
  } | null>(null);

  const addMessage = useCallback((text: string, type: MessageType = 'system') => {
    setMessages(prev => [...prev, { id: messageIdCounter.current++, text, type }]);
  }, []);
  
  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (diveState.current?.timeoutId) {
        clearTimeout(diveState.current.timeoutId);
      }
    };
  }, []);

  const resetForNextRound = useCallback(() => {
    addMessage("--- Preparing for next dive... You may place your bet. ---", 'system');
    setGamePhase(GamePhase.AWAITING_COMMAND);
    setIsInputDisabled(false);
    diveState.current = null;
  }, [addMessage]);

  const handleCrash = useCallback(() => {
    if (!diveState.current) return;
    setGamePhase(GamePhase.POST_DIVE);
    
    const breachDepth = Math.floor(diveState.current.crashPoint * 100);
    const breachMultiplier = diveState.current.crashPoint;

    const finalChart = generateChart(diveState.current.chartPoints, breachMultiplier);
    
    addMessage("WARNING! HULL INTEGRITY FAILING! PRESSURE ALARM!", 'error');
    addMessage(finalChart, 'dive');
    addMessage(`HULL BREACH AT ${breachDepth}m (${breachMultiplier.toFixed(2)}x)!`, 'error');

    // Post-Dive Report
    addMessage("--- Post-Dive Report ---", 'info');
    
    if (playerState.bet && !playerState.hasEjected) {
        addMessage(`Your pod failed to launch. Your ${playerState.bet.amount} credit bet is lost.`, 'error');
    } else if (!playerState.bet) {
        addMessage("You were observing this dive. No bet was lost.", 'info');
    }
    
    diveState.current.npcs.forEach(npc => {
        if (npc.hasEjected) {
             addMessage(`${npc.name} ejected safely at ${npc.ejectMultiplier!.toFixed(2)}x.`, 'success');
        } else {
             addMessage(`${npc.name} was lost in the breach.`, 'warning');
        }
    });

    setPlayerState(p => ({ ...p, bet: null, hasEjected: false }));
    diveState.current.timeoutId = window.setTimeout(resetForNextRound, POST_DIVE_DELAY);
  }, [addMessage, playerState.bet, playerState.hasEjected, resetForNextRound]);

  const performEject = useCallback(() => {
    if (!diveState.current || !playerState.bet || playerState.hasEjected) {
        return;
    }

    const ejectDepth = diveState.current.currentDepth;
    const multiplier = parseFloat((ejectDepth / 100).toFixed(2));
    
    let winnings = playerState.bet.amount * multiplier;
    let bonusWinnings = 0;
    const passedMarker = [...diveState.current.passedMarkers].pop();

    if (passedMarker) {
        bonusWinnings = winnings * TREASURE_BONUS;
        winnings += bonusWinnings;
    }
    
    let winMessage = `Ejection successful at ${ejectDepth}m! You secured ${winnings.toFixed(2)} credits!`;
    if (passedMarker) {
        winMessage += ` (includes ${bonusWinnings.toFixed(2)} credit treasure bonus)`;
    }
    addMessage(winMessage, 'success');

    setPlayerState(p => ({ ...p, balance: p.balance + winnings, hasEjected: true }));
    
  }, [addMessage, playerState.bet, playerState.hasEjected]);

  const diveLoop = useCallback(() => {
    if (!diveState.current) return;
    
    const { currentDepth, crashPoint, treasureMarkers, passedMarkers, chartPoints, updateCount } = diveState.current;
    
    if (currentDepth / 100 >= crashPoint) {
      handleCrash();
      return;
    }

    if (playerState.bet && !playerState.hasEjected && playerState.bet.autoEjectDepth && currentDepth >= playerState.bet.autoEjectDepth) {
        performEject();
    }

    diveState.current.npcs.forEach(npc => {
        if (!npc.hasEjected && npc.autoEjectDepth && currentDepth >= npc.autoEjectDepth) {
            npc.hasEjected = true;
            npc.ejectMultiplier = currentDepth / 100;
            addMessage(`${npc.name} has ejected at ${currentDepth}m!`, 'success');
        }
    });

    const currentMultiplier = currentDepth / 100;
    const currentIntegerMultiplier = Math.floor(currentMultiplier);

    if (currentIntegerMultiplier > 0 && !chartPoints.has(currentIntegerMultiplier)) {
        const xPosition = 2 + updateCount; 
        if (xPosition < CHART_WIDTH) {
            chartPoints.set(currentIntegerMultiplier, xPosition);
        }
    }
    diveState.current.updateCount++;

    const chart = generateChart(chartPoints, null);
    
    let flavorText = '';
    if (currentDepth > 250 && currentDepth < 300) flavorText = "Passing a bioluminescent squid.";
    if (currentDepth > 600 && currentDepth < 650) flavorText = "You hear the hull groan under the immense pressure.";
    if (currentDepth > 1200 && currentDepth < 1300) flavorText = "Entering the abyssal zone...";

    const messageBlock = [
        chart,
        flavorText,
        `Depth: ${currentDepth}m (${currentMultiplier.toFixed(2)}x)`
    ].filter(Boolean).join('\n');
    
    addMessage(messageBlock, 'dive');
    
    const nextMarker = treasureMarkers.find(m => !passedMarkers.includes(m) && currentDepth >= m);
    if (nextMarker) {
        diveState.current.passedMarkers.push(nextMarker);
        addMessage(`** TREASURE MARKER PASSED: ${nextMarker}m! All future ejects from this dive will receive a bonus! **`, 'success');
    }

    const baseSpeed = 0.05;
    const acceleration = currentDepth / 100;
    const increment = Math.max(1, Math.floor(baseSpeed * acceleration * 50));
    diveState.current.currentDepth += increment;
    
    const delay = 1000 / (1 + acceleration * 0.2);
    diveState.current.timeoutId = window.setTimeout(diveLoop, delay);
  }, [playerState.bet, playerState.hasEjected, handleCrash, performEject, addMessage]);

  const startDive = useCallback(() => {
    setGamePhase(GamePhase.DIVING);
    addMessage("Dive! Dive! Dive! Sealing the bay doors.", 'warning');
    diveState.current!.startTime = Date.now();
    diveLoop();
  }, [addMessage, diveLoop]);

  const startPreDive = useCallback(() => {
    setGamePhase(GamePhase.PRE_DIVE);
    setIsInputDisabled(true);

    const crashPoint = generateCrashPoint();
    const treasureMarkers = generateTreasureMarkers();
    const npcs = generateNpcBets(playerState.bet?.amount || 50);

    diveState.current = {
      crashPoint,
      treasureMarkers,
      npcs,
      currentDepth: 100,
      startTime: null,
      timeoutId: null,
      passedMarkers: [],
      chartPoints: new Map<number, number>(),
      updateCount: 0,
    };
    
    addMessage("Commencing pre-dive checks. The bay doors are open for the next dive! (10 seconds)", 'info');
    addMessage("The dive's structural failure point has been pre-calculated and logged for fairness.", 'info');
    addMessage(`Treasure Markers located at: ${treasureMarkers.join('m, ')}m.`, 'info');
    
    if (playerState.bet) {
      const initialChart = generateChart(diveState.current.chartPoints, null);
      addMessage("Initial chart loaded.", "system");
      addMessage(initialChart, 'dive');
    } else {
        addMessage("You have not placed a bet for this dive. Observing only.", 'warning');
    }

    npcs.forEach(npc => {
        const betMsg = npc.autoEjectDepth 
            ? `${npc.name} readies ${npc.betAmount} credits for ${npc.autoEjectDepth}m.`
            : `${npc.name} readies ${npc.betAmount} credits.`;
        setTimeout(() => addMessage(betMsg, 'system'), Math.random() * 7000 + 1000);
    });

    diveState.current.timeoutId = window.setTimeout(startDive, PRE_DIVE_DURATION);
  }, [addMessage, playerState.bet, startDive]);

  const handleCommand = useCallback(async (command: string) => {
    const lowerCommand = command.toLowerCase().trim();
    if (!lowerCommand) return;
    
    addMessage(`> ${command}`, 'player');
    
    const parts = lowerCommand.split(' ').filter(p => p);
    const action = parts[0];
    
    switch(action) {
      case 'bet':
        if (gamePhase !== GamePhase.AWAITING_COMMAND) {
          addMessage("Betting is currently closed. Please wait for the next round.", 'error');
          return;
        }
        const amount = parseInt(parts[1], 10);
        const ejectDepthStr = parts[2];
        
        if (isNaN(amount) || amount <= 0) {
          addMessage("Invalid bet amount. Usage: bet [amount] [eject_depth?]", 'error');
          return;
        }
        if (amount > playerState.balance) {
          addMessage("Insufficient balance.", 'error');
          return;
        }

        let autoEjectDepth: number | null = null;
        if (ejectDepthStr) {
            if (!ejectDepthStr.endsWith('m')) {
                addMessage("Invalid auto-eject depth. Must end with 'm' (e.g., 250m).", 'error');
                return;
            }
            autoEjectDepth = parseInt(ejectDepthStr.slice(0, -1), 10);
            if (isNaN(autoEjectDepth) || autoEjectDepth <= 100) {
                 addMessage("Auto-eject depth must be greater than 100m.", 'error');
                 return;
            }
        }
        
        const newBet: PlayerBet = { amount, autoEjectDepth };
        setPlayerState(p => ({ ...p, balance: p.balance - amount, bet: newBet }));
        
        const betConfirmation = autoEjectDepth 
            ? `Bet placed: ${amount} credits with auto-eject at ${autoEjectDepth}m.`
            : `Bet placed: ${amount} credits.`;
        addMessage(betConfirmation, 'success');
        
        startPreDive();
        break;

      case 'eject':
        if (gamePhase !== GamePhase.DIVING) {
          addMessage("Cannot eject. No dive is in progress.", 'error');
          return;
        }
        if (!playerState.bet || playerState.hasEjected) {
          addMessage("You have no active bet or have already ejected.", 'error');
          return;
        }
        performEject();
        break;

      case 'balance':
        addMessage(`Current Balance: ${playerState.balance.toFixed(2)} credits.`, 'info');
        break;

      case 'skip':
        if (gamePhase !== GamePhase.AWAITING_COMMAND) {
          addMessage("Cannot skip. A dive sequence is already in progress.", 'error');
          return;
        }
        setPlayerState(p => ({ ...p, bet: null }));
        addMessage("Skipping this dive. Your bet has been cleared.", 'info');
        startPreDive();
        break;
        
      case 'help':
        addMessage('--- Available Commands ---', 'info');
        addMessage('bet [amount] - Place a bet.', 'info');
        addMessage('bet [amount] [eject_depth]m - Bet with auto-eject (e.g., bet 100 250m).', 'info');
        addMessage('eject - Eject during a dive.', 'info');
        addMessage('balance - Check your current credits.', 'info');
        addMessage('skip - Skip the next dive.', 'info');
        break;

      default:
        addMessage(`Unknown command: "${action}". Type 'help' for a list of commands.`, 'error');
    }

  }, [gamePhase, playerState, addMessage, startPreDive, performEject]);
  
  useEffect(() => {
    addMessage("Welcome to Dive Control. Your starting balance is 1000 credits. Type 'help' for commands.", 'system');
    addMessage("Place your bet for the first dive.", 'system');
  }, [addMessage]);

  return { messages, handleCommand, isInputDisabled, playerState };
};
