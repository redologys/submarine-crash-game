import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageType } from '../types';

interface TerminalProps {
  messages: Message[];
  onCommand: (command: string) => void;
  isDisabled: boolean;
}

const getMessageTypeColor = (type: MessageType): string => {
  switch (type) {
    case 'player':
      return 'text-slate-400';
    case 'success':
      return 'text-green-400';
    case 'error':
      return 'text-red-400';
    case 'warning':
      return 'text-yellow-400';
    case 'info':
      return 'text-cyan-400';
    case 'dive':
      return 'text-blue-300';
    case 'system':
    default:
      return 'text-slate-200';
  }
};

export const Terminal: React.FC<TerminalProps> = ({ messages, onCommand, isDisabled }) => {
  const [input, setInput] = useState('');
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isDisabled) {
      onCommand(input.trim());
      setInput('');
    }
  };

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);
  
  useEffect(() => {
    if (!isDisabled) {
      inputRef.current?.focus();
    }
  }, [isDisabled]);

  return (
    <div className="h-full flex flex-col bg-slate-900/50 border border-slate-700 rounded-lg p-4" onClick={() => inputRef.current?.focus()}>
      <div className="flex-grow overflow-y-auto pr-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`text-sm leading-relaxed ${getMessageTypeColor(msg.type)}`}>
            <pre className="font-roboto-mono whitespace-pre-wrap">{msg.text}</pre>
          </div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex items-center pt-2 mt-2 border-t border-slate-700">
        <span className="text-green-400 font-bold mr-2">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isDisabled}
          className="terminal-input w-full bg-transparent text-slate-200 focus:outline-none"
          placeholder={isDisabled ? 'Awaiting dive sequence...' : 'Enter command...'}
          autoFocus
        />
      </form>
    </div>
  );
};
