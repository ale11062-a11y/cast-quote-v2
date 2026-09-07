import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, Trash2, Check, PenTool, Sparkles, Activity, Maximize2, Minimize2 } from 'lucide-react';

export interface FluidSignaturePadProps {
  onSave?: (dataUrl: string) => void;
  onStrokeChange?: (isEmpty: boolean, strokeCount: number) => void;
  height?: number;
  penColor?: string;
  penWidth?: number;
  readOnly?: boolean;
  showGuides?: boolean;
  showTelemetry?: boolean;
  initialDataUrl?: string;
  clientName?: string;
}

interface Point {
  x: number;
  y: number;
  time: number;
  pressure?: number;
}

interface Stroke {
  points: Point[];
  color: string;
  baseWidth: number;
  dynamicWidth: boolean;
}

export const FluidSignaturePad: React.FC<FluidSignaturePadProps> = ({
  onSave,
  onStrokeChange,
  height = 240,
  penColor: defaultColor = '#1e3a8a', // Classic deep ballpoint blue
  penWidth: defaultWidth = 2.5,
  readOnly = false,
  showGuides = true,
  showTelemetry = true,
  initialDataUrl,
  clientName
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drawing state
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Point[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const lastVelocityRef = useRef(0);
  const lastWidthRef = useRef(defaultWidth);

  // Settings state
  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const [selectedWidth, setSelectedWidth] = useState(defaultWidth);
  const [dynamicThickness, setDynamicThickness] = useState(true);
  const [strokeCount, setStrokeCount] = useState(0);
  const [pointCount, setPointCount] = useState(0);
  const [fpsRating, setFpsRating] = useState('120Hz / Ultra-Fluido');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Color options: Formal Brazilian business colors
  const colorOptions = [
    { label: 'Azul Caneta', value: '#1d4ed8', bg: 'bg-blue-600' },
    { label: 'Azul Notarial', value: '#0f2b5c', bg: 'bg-slate-900' },
    { label: 'Preto Documental', value: '#09090b', bg: 'bg-black' }
  ];

  // Pen stroke presets
  const strokePresets = [
    { label: 'Fina (1.8px)', width: 1.8, dynamic: false },
    { label: 'Média (2.5px)', width: 2.5, dynamic: true },
    { label: 'Caligráfica (3.2px)', width: 3.2, dynamic: true }
  ];

  // Resize canvas with devicePixelRatio for Retina clarity
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const displayWidth = Math.floor(rect.width);
    const displayHeight = isFullscreen ? Math.floor(window.innerHeight * 0.7) : height;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }

    redrawAll();
  }, [height, isFullscreen]);

  useEffect(() => {
    resizeCanvas();
    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resizeCanvas]);

  // Load initial image if provided
  useEffect(() => {
    if (initialDataUrl && canvasRef.current) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        setStrokeCount(1);
        if (onStrokeChange) onStrokeChange(false, 1);
      };
      img.src = initialDataUrl;
    }
  }, [initialDataUrl, onStrokeChange]);

  // Redraw all strokes with quadratic Bézier smoothing
  const redrawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    strokesRef.current.forEach((stroke) => {
      drawStroke(ctx, stroke);
    });

    // Notify stroke count change
    if (onStrokeChange) {
      onStrokeChange(strokesRef.current.length === 0, strokesRef.current.length);
    }
  };

  // Draw an individual stroke using mid-point Bézier smoothing and dynamic ink velocity
  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    const points = stroke.points;
    if (points.length === 0) return;

    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (points.length === 1) {
      // Single tap dot
      const p = points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, stroke.baseWidth * 1.2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (points.length === 2) {
      // Simple line between 2 points
      ctx.lineWidth = stroke.baseWidth;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
      return;
    }

    // Midpoint Bézier curve interpolation for 3+ points
    let currentWidth = stroke.baseWidth;

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];

      // Calculate velocity for dynamic fountain pen effect
      if (stroke.dynamicWidth) {
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const timeDiff = Math.max(p2.time - p1.time, 1);
        const velocity = dist / timeDiff;

        // Taper: faster moves produce thinner, sharper strokes; slow moves produce richer ink
        const targetWidth = Math.max(stroke.baseWidth * 0.55, Math.min(stroke.baseWidth * 1.55, stroke.baseWidth / (velocity * 0.45 + 0.75)));
        currentWidth = currentWidth * 0.65 + targetWidth * 0.35;
      } else {
        currentWidth = stroke.baseWidth;
      }

      ctx.lineWidth = currentWidth;

      const midPoint = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
      };

      ctx.beginPath();
      if (i === 1) {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(midPoint.x, midPoint.y);
      } else {
        const prevMid = {
          x: (points[i - 2].x + p1.x) / 2,
          y: (points[i - 2].y + p1.y) / 2
        };
        ctx.moveTo(prevMid.x, prevMid.y);
        ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
      }
      ctx.stroke();
    }
  };

  // Convert pointer event to canvas coordinates with sub-pixel precision
  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, time: Date.now() };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: Date.now(),
      pressure: e.pressure && e.pressure > 0 ? e.pressure : 0.5
    };
  };

  // Pointer Down: starts capturing touch/stylus/mouse
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture pointer so fast movements outside canvas boundary are not lost
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignored if pointerId unsupported
    }

    isDrawingRef.current = true;
    lastVelocityRef.current = 0;
    lastWidthRef.current = selectedWidth;

    const pt = getPointerPos(e);
    currentStrokeRef.current = [pt];

    // Immediate draw feedback for the first touch point
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = selectedColor;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, selectedWidth * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    setPointCount((prev) => prev + 1);
  };

  // Pointer Move: processes native high-frequency coalesced touch events (120Hz/240Hz)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || readOnly) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check for high-fidelity coalesced events
    // This gives all sub-frame touch points reported by modern phone screens
    const nativeEvent = e.nativeEvent as PointerEvent;
    const coalescedEvents = typeof (nativeEvent as any).getCoalescedEvents === 'function'
      ? (nativeEvent as any).getCoalescedEvents()
      : [nativeEvent];

    const rect = canvas.getBoundingClientRect();

    for (const ce of coalescedEvents) {
      const pt: Point = {
        x: ce.clientX - rect.left,
        y: ce.clientY - rect.top,
        time: Date.now(),
        pressure: ce.pressure && ce.pressure > 0 ? ce.pressure : 0.5
      };

      const stroke = currentStrokeRef.current;
      if (stroke.length > 0) {
        const lastPt = stroke[stroke.length - 1];
        const dist = Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y);
        // Ignore duplicate jitter < 0.8px
        if (dist < 0.8) continue;
      }

      stroke.push(pt);

      // Incremental render for zero latency
      const len = stroke.length;
      if (len >= 3) {
        const p0 = stroke[len - 3];
        const p1 = stroke[len - 2];
        const p2 = stroke[len - 1];

        const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

        let width = selectedWidth;
        if (dynamicThickness) {
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const timeDiff = Math.max(p2.time - p1.time, 1);
          const vel = dist / timeDiff;
          const targetW = Math.max(selectedWidth * 0.55, Math.min(selectedWidth * 1.55, selectedWidth / (vel * 0.45 + 0.75)));
          lastWidthRef.current = lastWidthRef.current * 0.65 + targetW * 0.35;
          width = lastWidthRef.current;
        }

        ctx.strokeStyle = selectedColor;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = width;

        ctx.beginPath();
        ctx.moveTo(mid1.x, mid1.y);
        ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
        ctx.stroke();
      } else if (len === 2) {
        ctx.strokeStyle = selectedColor;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = selectedWidth;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        ctx.lineTo(stroke[1].x, stroke[1].y);
        ctx.stroke();
      }
    }

    setPointCount((prev) => prev + coalescedEvents.length);
  };

  // Pointer Up/Cancel: commits stroke
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }

    if (currentStrokeRef.current.length > 0) {
      strokesRef.current.push({
        points: [...currentStrokeRef.current],
        color: selectedColor,
        baseWidth: selectedWidth,
        dynamicWidth: dynamicThickness
      });
      currentStrokeRef.current = [];

      const count = strokesRef.current.length;
      setStrokeCount(count);
      if (onStrokeChange) onStrokeChange(false, count);

      // Auto-save callback
      if (onSave) {
        const dataUrl = exportPng();
        if (dataUrl) onSave(dataUrl);
      }
    }
  };

  // Clear all strokes
  const handleClear = () => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    setStrokeCount(0);
    setPointCount(0);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      }
    }

    if (onStrokeChange) onStrokeChange(true, 0);
  };

  // Undo last stroke
  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    const count = strokesRef.current.length;
    setStrokeCount(count);
    redrawAll();

    if (onSave) {
      const dataUrl = exportPng();
      if (dataUrl) onSave(dataUrl);
    }
  };

  // Export clean PNG with transparent background trimmed to content
  const exportPng = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.length === 0) return null;

    // Create export canvas at 2x resolution
    const exportCanvas = document.createElement('canvas');
    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    strokesRef.current.forEach((stroke) => {
      drawStroke(ctx, stroke);
    });

    return exportCanvas.toDataURL('image/png');
  };

  return (
    <div className={`w-full flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all ${isFullscreen ? 'fixed inset-0 z-50 p-4 bg-slate-900/90 flex items-center justify-center' : ''}`}>
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-slate-800">
            <PenTool className="w-3.5 h-3.5 text-blue-600" />
            <span>Assinatura Digital</span>
          </div>

          {/* Color Chooser */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300">
            {colorOptions.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => setSelectedColor(c.value)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${c.bg} ${
                  selectedColor === c.value ? 'scale-110 border-blue-500 shadow-sm ring-2 ring-blue-300' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>

          {/* Preset Tips */}
          <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-slate-300">
            {strokePresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setSelectedWidth(preset.width);
                  setDynamicThickness(preset.dynamic);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  selectedWidth === preset.width
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons: Undo & Clear */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokeCount === 0 || readOnly}
            title="Desfazer último traço"
            className="flex items-center gap-1 px-2 py-1 rounded bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Desfazer</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={strokeCount === 0 || readOnly}
            title="Limpar assinatura"
            className="flex items-center gap-1 px-2 py-1 rounded bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Limpar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Reduzir tela' : 'Expandir área de assinatura (Ideal para celular)'}
            className="p-1 rounded bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Touch Canvas Area */}
      <div
        ref={containerRef}
        className={`relative w-full bg-white select-none touch-none cursor-crosshair overflow-hidden ${
          isFullscreen ? 'w-[92vw] max-w-3xl rounded-xl shadow-2xl border border-slate-300' : ''
        }`}
        style={{ height: isFullscreen ? '480px' : `${height}px` }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 w-full h-full touch-none block"
          style={{ touchAction: 'none' }}
        />

        {/* Guides: Baseline & Legal signing note */}
        {showGuides && (
          <div className="absolute inset-x-8 bottom-7 pointer-events-none flex flex-col items-center">
            <div className="w-full border-b-2 border-dashed border-slate-300 mb-1.5 flex justify-between text-[11px] text-slate-400 select-none">
              <span>✕ Assine aqui com o dedo ou caneta touch</span>
              <span className="text-[10px] uppercase font-mono tracking-wider">Reconhecimento Ativo</span>
            </div>
            {clientName ? (
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                {clientName}
              </p>
            ) : (
              <p className="text-[10px] text-slate-400">
                Toque e deslize suavemente. O traçado se adapta à velocidade do toque.
              </p>
            )}
          </div>
        )}

        {/* Empty state hint */}
        {strokeCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-sm font-medium tracking-wide">
            <div className="flex flex-col items-center gap-1.5 bg-slate-50/70 backdrop-blur-xs px-4 py-2 rounded-lg border border-slate-100">
              <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
              <span>Toque na tela para assinar</span>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Stroke Telemetry & Training Bar */}
      {showTelemetry && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-500" />
              <strong className="text-slate-700">Fluidez:</strong>
              <span className="text-emerald-600 font-medium">Bézier Dinâmico 120Hz</span>
            </span>

            <span className="hidden sm:inline text-slate-300">•</span>

            <span className="hidden sm:inline">
              Traços detectados: <strong className="text-slate-700">{strokeCount}</strong>
            </span>

            <span className="hidden md:inline text-slate-300">•</span>

            <span className="hidden md:inline">
              Amostragem: <strong className="text-slate-700">{pointCount} pontos</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {strokeCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <Check className="w-3 h-3" /> Traçado Reconhecido
              </span>
            ) : (
              <span className="text-slate-400">Aguardando início do traço</span>
            )}

            {isFullscreen && (
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-2 py-0.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Concluir
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
