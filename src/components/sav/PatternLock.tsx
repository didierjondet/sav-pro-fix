import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Eye, EyeOff } from 'lucide-react';

interface PatternLockProps {
  pattern?: number[];
  onChange: (pattern: number[]) => void;
  disabled?: boolean;
  showPattern?: boolean;
}

export function PatternLock({ pattern = [], onChange, disabled = false, showPattern = false }: PatternLockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPattern, setCurrentPattern] = useState<number[]>(pattern);
  const [showPatternState, setShowPatternState] = useState(showPattern);

  const GRID_SIZE = 3;
  const CANVAS_SIZE = 300;
  const DOT_RADIUS = 15;
  const SELECTED_DOT_RADIUS = 20;

  // Calculate dot positions
  const getDotPosition = (index: number) => {
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const spacing = CANVAS_SIZE / (GRID_SIZE + 1);
    return {
      x: spacing * (col + 1),
      y: spacing * (row + 1),
    };
  };

  // Get dot index from mouse position
  const getDotFromPosition = (x: number, y: number) => {
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const dot = getDotPosition(i);
      const distance = Math.sqrt((x - dot.x) ** 2 + (y - dot.y) ** 2);
      if (distance <= DOT_RADIUS + 5) {
        return i;
      }
    }
    return -1;
  };

  // Draw the pattern
  const drawPattern = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid dots
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const { x, y } = getDotPosition(i);
      const isSelected = currentPattern.includes(i);
      
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? SELECTED_DOT_RADIUS : DOT_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
      ctx.fill();
      
      // Add inner circle for selected dots
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, DOT_RADIUS - 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'hsl(var(--primary-foreground))';
        ctx.fill();
      }
    }

    // Draw pattern lines
    if (currentPattern.length > 1 && (showPatternState || isDrawing)) {
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      for (let i = 0; i < currentPattern.length; i++) {
        const { x, y } = getDotPosition(currentPattern[i]);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Draw numbers if showing pattern
    if (showPatternState && currentPattern.length > 0) {
      ctx.fillStyle = 'hsl(var(--primary-foreground))';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      currentPattern.forEach((dotIndex, patternIndex) => {
        const { x, y } = getDotPosition(dotIndex);
        ctx.fillText((patternIndex + 1).toString(), x, y);
      });
    }
  }, [currentPattern, showPatternState, isDrawing]);

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const dotIndex = getDotFromPosition(x, y);
    if (dotIndex !== -1) {
      setIsDrawing(true);
      setCurrentPattern([dotIndex]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const dotIndex = getDotFromPosition(x, y);
    if (dotIndex !== -1 && !currentPattern.includes(dotIndex)) {
      setCurrentPattern(prev => [...prev, dotIndex]);
    } else if (dotIndex !== -1 && dotIndex === currentPattern[0] && currentPattern.length >= 2) {
      // Fermer le pattern si on revient au point de départ avec au moins 2 points
      const newPattern = [...currentPattern, dotIndex];
      setCurrentPattern(newPattern);
      setIsDrawing(false);
      onChange(newPattern);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      onChange(currentPattern);
    }
  };

  const clearPattern = () => {
    setCurrentPattern([]);
    onChange([]);
  };

  const toggleShowPattern = () => {
    setShowPatternState(!showPatternState);
  };

  // Update pattern when prop changes
  useEffect(() => {
    setCurrentPattern(pattern);
  }, [pattern]);

  // Draw on canvas changes
  useEffect(() => {
    drawPattern();
  }, [drawPattern]);

  return (
    <Card className="w-fit">
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          Schéma de verrouillage
          <div className="flex gap-2">
            {currentPattern.length > 0 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleShowPattern}
                  disabled={disabled}
                >
                  {showPatternState ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearPattern}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="border border-border rounded-lg cursor-pointer"
            style={{ touchAction: 'none' }}
          />
          <p className="text-xs text-muted-foreground">
            {disabled 
              ? currentPattern.length > 0 
                ? `Schéma enregistré (${currentPattern.length} points)`
                : 'Aucun schéma enregistré'
              : 'Dessinez le schéma en reliant les points avec la souris'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}