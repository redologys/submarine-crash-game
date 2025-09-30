import React, { useRef, useEffect } from 'react';
import { GamePhase, PlotPoint } from '../types';

interface GameDisplayProps {
  multiplier: number;
  phase: GamePhase;
  plotPoints: PlotPoint[];
  treasureMarkers: number[];
}

// Simple particle class for background bubbles
class Bubble {
  x: number;
  y: number;
  r: number;
  speed: number;
  opacity: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = canvasHeight + Math.random() * 100;
    this.r = Math.random() * 2 + 1;
    this.speed = Math.random() * 1 + 0.5;
    this.opacity = Math.random() * 0.5 + 0.2;
  }

  update(canvasWidth: number, canvasHeight: number) {
    this.y -= this.speed;
    if (this.y < -this.r) {
      this.y = canvasHeight + this.r;
      this.x = Math.random() * canvasWidth;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(173, 216, 230, ${this.opacity})`;
    ctx.fill();
  }
}

const GameDisplay: React.FC<GameDisplayProps> = ({ multiplier, phase, plotPoints, treasureMarkers }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<Bubble[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize bubbles once
    if (bubblesRef.current.length === 0) {
      for (let i = 0; i < 50; i++) {
        bubblesRef.current.push(new Bubble(canvas.width, canvas.height));
      }
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Sizing
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const { width, height } = rect;

      // Clear and draw background
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#1e3a8a'); // Darker blue
      gradient.addColorStop(1, '#0c1427'); // Deep navy
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      // Update and draw bubbles
      bubblesRef.current.forEach(b => {
        b.update(width, height);
        b.draw(ctx);
      });

      // --- Drawing Logic ---
      const maxMultiplierVisible = plotPoints.reduce((max, p) => Math.max(max, p.y), 5);
      const maxTime = plotPoints.reduce((max, p) => Math.max(max, p.x), 10);
      
      const transformPoint = (p: PlotPoint) => {
        const yLog = Math.log(p.y);
        const maxLog = Math.log(maxMultiplierVisible);
        return {
          x: (p.x / maxTime) * (width - 60) + 50,
          y: (yLog / maxLog) * (height - 40) + 20
        };
      };
      
      // Draw Y-axis markers and gridlines
      const yAxisMarkers = [1, 2, 5, 10, 20, 50, 100].filter(m => m < maxMultiplierVisible * 1.2);
      yAxisMarkers.forEach(m => {
        const pos = transformPoint({x: 0, y: m});
        ctx.beginPath();
        ctx.moveTo(50, pos.y);
        ctx.lineTo(width - 10, pos.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.stroke();
        ctx.fillStyle = '#64748b';
        ctx.font = '10px Roboto Mono';
        ctx.fillText(`${m.toFixed(0)}x`, 15, pos.y + 3);
      });
      
      // Draw Treasure markers
      treasureMarkers.forEach(m => {
        if (m > maxMultiplierVisible) return;
        const pos = transformPoint({x: 0, y: m});
        ctx.beginPath();
        ctx.moveTo(50, pos.y);
        ctx.lineTo(width - 10, pos.y);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.3)';
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#facc15';
        ctx.fillText(`💎 ${m}x`, width - 45, pos.y - 5);
      });

      // Draw path
      if (plotPoints.length > 1) {
        ctx.beginPath();
        const firstPoint = transformPoint(plotPoints[0]);
        ctx.moveTo(firstPoint.x, firstPoint.y);
        plotPoints.forEach(p => {
          const tP = transformPoint(p);
          ctx.lineTo(tP.x, tP.y);
        });
        const pathGradient = ctx.createLinearGradient(0,0,width,0);
        pathGradient.addColorStop(0, '#0ea5e9');
        pathGradient.addColorStop(0.5, '#22d3ee');
        pathGradient.addColorStop(1, '#fef08a');
        ctx.strokeStyle = pathGradient;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw submarine
      if (phase === GamePhase.IN_PROGRESS && plotPoints.length > 0) {
        const currentPos = transformPoint(plotPoints[plotPoints.length - 1]);
        ctx.save();
        ctx.translate(currentPos.x, currentPos.y);
        
        // Rotation
        if (plotPoints.length > 1) {
          const prevPos = transformPoint(plotPoints[plotPoints.length - 2]);
          const angle = Math.atan2(currentPos.y - prevPos.y, currentPos.x - prevPos.x);
          ctx.rotate(angle);
        }
        
        ctx.fillStyle = '#fde047'; // Yellow
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 10, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#fca5a5'; // Red fin
        ctx.fillRect(-10, -15, 5, 15);
        ctx.restore();
      }
      
      // Crash effect
      if (phase === GamePhase.ENDED) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.fillRect(0, 0, width, height);
      }
    };

    let animationFrameId: number;
    const render = () => {
      draw();
      animationFrameId = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [plotPoints, phase, treasureMarkers]); // Rerun effect when these change to redraw

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Central Multiplier Display */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className={`transition-all duration-200 text-center ${phase === GamePhase.ENDED ? 'opacity-100 scale-110' : 'opacity-80 scale-100'}`}>
          <h2 className={`font-orbitron text-6xl lg:text-8xl transition-colors duration-200 ${phase === GamePhase.ENDED ? 'text-red-500' : 'text-white'}`}>
            {multiplier.toFixed(2)}x
          </h2>
          {phase === GamePhase.ENDED && <p className="text-red-400 text-2xl font-exo animate-pulse">HULL BREACH</p>}
          {phase === GamePhase.BETTING && <p className="text-cyan-400 text-xl font-exo">Place your bet</p>}
        </div>
      </div>
      
      {/* Canvas for Chart */}
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default GameDisplay;