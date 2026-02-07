'use client';

import React, { useRef, useEffect, useState } from 'react';

interface FacialOverlayProps {
  isDetecting: boolean;
  faceDetected: boolean;
  qualityScore?: number;
}

export function FacialOverlay({ isDetecting, faceDetected, qualityScore }: FacialOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animationFrame, setAnimationFrame] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      setAnimationFrame(prev => (prev + 1) % 360);
    };

    const interval = setInterval(animate, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isDetecting) {
      drawFaceMesh(ctx, canvas.width, canvas.height, animationFrame, faceDetected, qualityScore);
    }
  }, [isDetecting, animationFrame, faceDetected, qualityScore]);

  const drawFaceMesh = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    frame: number,
    detected: boolean,
    quality?: number
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;

    // Main face oval
    const faceWidth = width * 0.35;
    const faceHeight = height * 0.5;

    // Color based on detection status
    const color = detected
      ? quality && quality > 70
        ? '#10b981' // green
        : '#f59e0b' // amber
      : '#3b82f6'; // blue

    // Enhanced animated scanline with glow
    const scanY = (Math.sin(frame * 0.08) * faceHeight * 0.5) + centerY;
    const scanOpacity = (Math.sin(frame * 0.15) + 1) / 2; // 0 to 1

    // Draw face oval outline with pulsing glow
    const ovalPulse = 3 + Math.sin(frame * 0.1) * 1.5;
    
    // Outer glow
    ctx.strokeStyle = color + '40';
    ctx.lineWidth = ovalPulse + 6;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, faceWidth, faceHeight, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Main oval
    ctx.strokeStyle = color;
    ctx.lineWidth = ovalPulse;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, faceWidth, faceHeight, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Draw corner brackets with rotation animation
    const bracketSize = 35;
    const offset = 20;
    const bracketRotation = Math.sin(frame * 0.05) * 0.1;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(centerX - faceWidth - offset, centerY - faceHeight - offset + bracketSize);
    ctx.lineTo(centerX - faceWidth - offset, centerY - faceHeight - offset);
    ctx.lineTo(centerX - faceWidth - offset + bracketSize, centerY - faceHeight - offset);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(centerX + faceWidth + offset - bracketSize, centerY - faceHeight - offset);
    ctx.lineTo(centerX + faceWidth + offset, centerY - faceHeight - offset);
    ctx.lineTo(centerX + faceWidth + offset, centerY - faceHeight - offset + bracketSize);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(centerX - faceWidth - offset, centerY + faceHeight + offset - bracketSize);
    ctx.lineTo(centerX - faceWidth - offset, centerY + faceHeight + offset);
    ctx.lineTo(centerX - faceWidth - offset + bracketSize, centerY + faceHeight + offset);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(centerX + faceWidth + offset - bracketSize, centerY + faceHeight + offset);
    ctx.lineTo(centerX + faceWidth + offset, centerY + faceHeight + offset);
    ctx.lineTo(centerX + faceWidth + offset, centerY + faceHeight + offset - bracketSize);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Draw facial landmark points
    const landmarks = [
      // Eyes
      { x: centerX - faceWidth * 0.3, y: centerY - faceHeight * 0.15 },
      { x: centerX + faceWidth * 0.3, y: centerY - faceHeight * 0.15 },
      // Nose
      { x: centerX, y: centerY },
      // Mouth corners
      { x: centerX - faceWidth * 0.25, y: centerY + faceHeight * 0.25 },
      { x: centerX + faceWidth * 0.25, y: centerY + faceHeight * 0.25 },
      // Cheeks
      { x: centerX - faceWidth * 0.6, y: centerY },
      { x: centerX + faceWidth * 0.6, y: centerY },
      // Chin
      { x: centerX, y: centerY + faceHeight * 0.7 },
      // Forehead points
      { x: centerX - faceWidth * 0.2, y: centerY - faceHeight * 0.6 },
      { x: centerX, y: centerY - faceHeight * 0.7 },
      { x: centerX + faceWidth * 0.2, y: centerY - faceHeight * 0.6 },
    ];

    landmarks.forEach((point, index) => {
      const pulseSize = 4 + Math.sin(frame * 0.15 + index * 0.5) * 2;
      const glowSize = pulseSize + 4 + Math.sin(frame * 0.2 + index * 0.3) * 3;
      
      // Outer glow (stronger)
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.strokeStyle = color + '60';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(point.x, point.y, glowSize, 0, Math.PI * 2);
      ctx.stroke();

      // Middle ring
      ctx.strokeStyle = color + '80';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, pulseSize + 2, 0, Math.PI * 2);
      ctx.stroke();
      
      // Center point
      ctx.shadowBlur = 20;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, pulseSize, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.shadowBlur = 0;

    // Draw connecting lines between landmarks
    ctx.strokeStyle = color + '60';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // Face contour connections
    const connections = [
      [0, 1], // Eyes
      [0, 3], // Left eye to left mouth
      [1, 4], // Right eye to right mouth
      [3, 4], // Mouth
      [2, 7], // Nose to chin
      [8, 9], [9, 10], // Forehead
    ];

    connections.forEach(([start, end]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[start].x, landmarks[start].y);
      ctx.lineTo(landmarks[end].x, landmarks[end].y);
      ctx.stroke();
    });

    ctx.setLineDash([]);

    // Animated scanning lines (multiple layers)
    if (!detected) {
      // Main scan line with strong glow
      const gradient = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      gradient.addColorStop(0, color + '00');
      gradient.addColorStop(0.3, color + '60');
      gradient.addColorStop(0.5, color + 'ff');
      gradient.addColorStop(0.7, color + '60');
      gradient.addColorStop(1, color + '00');

      ctx.shadowBlur = 20;
      ctx.shadowColor = color;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX - faceWidth - 40, scanY);
      ctx.lineTo(centerX + faceWidth + 40, scanY);
      ctx.stroke();
      
      // Secondary scan line
      const scanY2 = scanY + 20;
      const gradient2 = ctx.createLinearGradient(0, scanY2 - 15, 0, scanY2 + 15);
      gradient2.addColorStop(0, color + '00');
      gradient2.addColorStop(0.5, color + '40');
      gradient2.addColorStop(1, color + '00');
      
      ctx.strokeStyle = gradient2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - faceWidth - 40, scanY2);
      ctx.lineTo(centerX + faceWidth + 40, scanY2);
      ctx.stroke();
      
      ctx.shadowBlur = 0;
    }

    // Grid overlay effect with fade animation
    const gridOpacity = Math.floor((Math.sin(frame * 0.05) + 1.5) * 15).toString(16).padStart(2, '0');
    ctx.strokeStyle = color + gridOpacity;
    ctx.lineWidth = 1;
    const gridSize = 30;
    
    for (let x = 0; x < width; x += gridSize) {
      const lineOpacity = Math.floor((Math.sin(frame * 0.05 + x * 0.01) + 1.5) * 10).toString(16).padStart(2, '0');
      ctx.strokeStyle = color + lineOpacity;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = 0; y < height; y += gridSize) {
      const lineOpacity = Math.floor((Math.sin(frame * 0.05 + y * 0.01) + 1.5) * 10).toString(16).padStart(2, '0');
      ctx.strokeStyle = color + lineOpacity;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Add animated particles/sparkles when face detected
    if (detected) {
      for (let i = 0; i < 8; i++) {
        const angle = (frame * 0.02 + i * (Math.PI * 2 / 8)) % (Math.PI * 2);
        const radius = faceWidth + 50 + Math.sin(frame * 0.1 + i) * 20;
        const px = centerX + Math.cos(angle) * radius;
        const py = centerY + Math.sin(angle) * radius * (faceHeight / faceWidth);
        const size = 2 + Math.sin(frame * 0.1 + i) * 1;
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    // Quality indicator arc with animation
    if (detected && quality) {
      const arcRadius = faceWidth + 45;
      const arcAngle = (quality / 100) * Math.PI * 2;
      const arcPulse = 5 + Math.sin(frame * 0.12) * 2;
      
      // Outer glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.strokeStyle = color + '60';
      ctx.lineWidth = arcPulse + 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, arcRadius + 5, -Math.PI / 2, -Math.PI / 2 + arcAngle);
      ctx.stroke();
      
      // Main arc
      ctx.strokeStyle = color;
      ctx.lineWidth = arcPulse;
      ctx.beginPath();
      ctx.arc(centerX, centerY, arcRadius, -Math.PI / 2, -Math.PI / 2 + arcAngle);
      ctx.stroke();
      
      // End cap glow
      const endX = centerX + Math.cos(-Math.PI / 2 + arcAngle) * arcRadius;
      const endY = centerY + Math.sin(-Math.PI / 2 + arcAngle) * arcRadius;
      ctx.shadowBlur = 20;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(endX, endY, arcPulse, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={480}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
