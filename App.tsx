import React from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import GameDisplay from './components/GameDisplay';
import Controls from './components/Controls';
import History from './components/History';
import { GamePhase } from './types';

const App: React.FC = () => {
  const {
    gamePhase,
    playerState,
    multiplier,
    history,
    plotPoints,
    treasureMarkers,
    placeBet,
    eject,
    winnings,
    hasEjected,
    ejectMultiplier,
  } = useGameEngine();

  return (
    <div className="w-screen h-screen bg-[#0c1427] flex flex-col items-center justify-center font-roboto-mono text-slate-300 p-4 lg:p-8">
      <div className="w-full max-w-7xl h-full flex flex-col md:flex-row gap-4">
        
        {/* Left Side: Game Display */}
        <div className="flex-grow flex flex-col bg-slate-900/50 border border-slate-700 rounded-lg p-4 relative overflow-hidden">
          <History history={history} />
          <GameDisplay 
            multiplier={multiplier} 
            phase={gamePhase}
            plotPoints={plotPoints}
            treasureMarkers={treasureMarkers}
          />
        </div>

        {/* Right Side: Controls */}
        <div className="w-full md:w-80 lg:w-96 flex-shrink-0">
          <Controls 
            playerState={playerState}
            gamePhase={gamePhase}
            onBet={placeBet}
            onEject={eject}
            currentMultiplier={multiplier}
            winnings={winnings}
            hasEjected={hasEjected}
            ejectMultiplier={ejectMultiplier}
          />
        </div>

      </div>
    </div>
  );
};

export default App;