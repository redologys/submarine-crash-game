import React from 'react';
import { HistoryEntry } from '../types';

interface HistoryProps {
  history: HistoryEntry[];
}

const History: React.FC<HistoryProps> = ({ history }) => {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-2 left-4 flex items-center gap-2 z-20">
      <span className="text-xs text-slate-500">PREVIOUS DIVES:</span>
      <div className="flex gap-2">
        {history.map(entry => {
          const value = entry.crashPoint;
          const colorClass = value >= 5 ? 'text-yellow-400' : value >= 2 ? 'text-green-400' : 'text-red-400';
          return (
            <div
              key={entry.id}
              className={`text-sm font-bold px-2 py-1 bg-slate-800/50 rounded-md border border-slate-700 ${colorClass}`}
            >
              {value.toFixed(2)}x
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default History;
