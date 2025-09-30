import React, { useState, useEffect, useMemo } from 'react';
import { GamePhase, PlayerState, PlayerBet } from '../types';

interface ControlsProps {
  playerState: PlayerState;
  gamePhase: GamePhase;
  onBet: (bet: PlayerBet) => void;
  onEject: () => void;
  currentMultiplier: number;
  winnings: number | null;
  hasEjected: boolean;
  ejectMultiplier: number | null;
}

const Controls: React.FC<ControlsProps> = ({ playerState, gamePhase, onBet, onEject, currentMultiplier, winnings, hasEjected, ejectMultiplier }) => {
  const [betAmount, setBetAmount] = useState('10');
  const [autoEject, setAutoEject] = useState('');

  const handleBetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setBetAmount(value);
    }
  };
  
  const handleAutoEjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setAutoEject(value);
    }
  };
  
  const handlePlaceBet = () => {
    const amount = parseFloat(betAmount);
    const ejectVal = autoEject ? parseFloat(autoEject) : null;
    if (amount > 0 && amount <= playerState.balance) {
      onBet({ amount, autoEjectMultiplier: ejectVal });
    }
  };

  const isBettingPhase = gamePhase === GamePhase.BETTING;
  const isInProgress = gamePhase === GamePhase.IN_PROGRESS;

  const buttonContent = useMemo(() => {
    if (isBettingPhase) {
      return { text: 'Place Bet', color: 'bg-cyan-500 hover:bg-cyan-400', action: handlePlaceBet, disabled: !betAmount || parseFloat(betAmount) <= 0 || parseFloat(betAmount) > playerState.balance };
    }
    if (isInProgress) {
      if (hasEjected) {
        return { text: `Ejected @ ${ejectMultiplier?.toFixed(2)}x`, color: 'bg-slate-600', action: () => {}, disabled: true };
      }
      return { text: `Eject @ ${currentMultiplier.toFixed(2)}x`, color: 'bg-yellow-500 hover:bg-yellow-400', action: onEject, disabled: false };
    }
    return { text: 'Waiting for next round...', color: 'bg-slate-600', action: () => {}, disabled: true };
  }, [gamePhase, currentMultiplier, betAmount, playerState.balance, hasEjected, ejectMultiplier, onEject]);
  
  return (
    <div className="w-full h-full flex flex-col bg-slate-900/50 border border-slate-700 rounded-lg p-6 font-exo text-white gap-6">
      <div className="text-center">
          <p className="text-slate-400 text-sm">BALANCE</p>
          <p className="font-orbitron text-3xl text-green-400">{playerState.balance.toFixed(2)}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Bet Amount</label>
          <div className="relative">
            <input type="text" value={betAmount} onChange={handleBetAmountChange} disabled={!isBettingPhase} className="w-full bg-slate-800 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
            <span className="absolute right-3 top-2.5 text-slate-500 text-sm">CR</span>
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Auto Eject (optional)</label>
          <div className="relative">
            <input type="text" value={autoEject} onChange={handleAutoEjectChange} placeholder="e.g., 2.5" disabled={!isBettingPhase} className="w-full bg-slate-800 border border-slate-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
            <span className="absolute right-3 top-2.5 text-slate-500 text-sm">x</span>
          </div>
        </div>
      </div>
      
      <button 
        onClick={buttonContent.action}
        disabled={buttonContent.disabled}
        className={`w-full py-4 text-xl font-bold rounded-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-900 ${buttonContent.color} ${buttonContent.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {buttonContent.text}
      </button>

      {winnings !== null && (
        <div className="mt-auto text-center bg-green-500/10 border border-green-500 rounded-lg p-3">
            <p className="text-lg text-green-300">Ejected successfully!</p>
            <p className="text-2xl font-bold text-white">+{winnings.toFixed(2)} CR</p>
        </div>
      )}
    </div>
  );
};

export default Controls;