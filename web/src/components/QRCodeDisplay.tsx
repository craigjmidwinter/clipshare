'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  url: string;
  size?: number;
  className?: string;
}

export function QRCodeDisplay({ url, size = 128, className = '' }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateQR = async () => {
      if (!canvasRef.current) return;

      try {
        setIsGenerating(true);
        setError(null);

        await QRCode.toCanvas(canvasRef.current, url, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });

        setIsGenerating(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate QR code');
        setIsGenerating(false);
      }
    };

    generateQR();
  }, [url, size]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/30 ${className}`}>
        <div className="text-center p-4">
          <div className="text-xs text-destructive mb-2">QR Code Error</div>
          <div className="text-xs text-muted-foreground">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className={`rounded-lg border ${isGenerating ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        />
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">Generating...</div>
          </div>
        )}
      </div>
    </div>
  );
}
