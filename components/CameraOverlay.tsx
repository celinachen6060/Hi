import React, { useRef, useEffect } from 'react';
import { Camera, Maximize2 } from 'lucide-react';
import { useDraggableResizable } from '../hooks/useDraggableResizable';
import { Position, Size, Shape } from '../types';

interface CameraOverlayProps {
  stream: MediaStream | null;
  containerRef: React.RefObject<HTMLDivElement>;
  shape: Shape;
  initialPosition: Position;
  initialSize: Size;
  borderColor: string;
  borderWidth: number;
  zoomLevel: number;
  onUpdateConfig: (pos: Position, size: Size) => void;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({
  stream,
  containerRef,
  shape,
  initialPosition,
  initialSize,
  borderColor,
  borderWidth,
  zoomLevel,
  onUpdateConfig,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { position, size, handleMouseDown, setPosition, setSize } = useDraggableResizable({
    containerRef,
    initialPosition,
    initialSize,
    onUpdate: onUpdateConfig,
  });

  // Update internal state if props change (e.g. reset)
  useEffect(() => {
    setPosition(initialPosition);
    setSize(initialSize);
  }, [initialPosition, initialSize, setPosition, setSize]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const borderRadius = shape === 'circle' ? '50%' : '12px';

  return (
    <div
      className="absolute group select-none shadow-2xl z-20 transition-shadow"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        borderRadius: borderRadius,
        overflow: 'hidden', 
        cursor: 'move',
        // We apply the border as a box-shadow or direct border. 
        // Direct border affects box model size, so box-sizing: border-box is key, 
        // but video might shift. 
        // Outline doesn't respect radius in all browsers well. 
        // Let's use a nested div for border to sit on top without affecting layout flow.
      }}
      onMouseDown={(e) => handleMouseDown(e, 'drag')}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          // We combine the scale (zoom) with scaleX(-1) (mirroring). 
          // Note: transform order matters, but here we just multiply scale.
          style={{
            transform: `scale(${zoomLevel}) scaleX(-1)`,
            transformOrigin: 'center center'
          }}
          className="w-full h-full object-cover pointer-events-none transition-transform duration-100 ease-out" 
        />
      ) : (
        <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center text-slate-500">
          <Camera size={32} />
          <span className="text-xs mt-2">No Camera</span>
        </div>
      )}

      {/* Resize Handle */}
      <div
        className="absolute bottom-2 right-2 w-6 h-6 bg-white/20 backdrop-blur-md rounded-full 
                   opacity-0 group-hover:opacity-100 cursor-nwse-resize flex items-center justify-center
                   hover:bg-blue-500 hover:text-white transition-all z-30"
        onMouseDown={(e) => handleMouseDown(e, 'resize')}
      >
        <Maximize2 size={12} />
      </div>

      {/* Custom Border Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ 
            borderRadius, 
            border: `${borderWidth}px solid ${borderColor}`,
            // Ensure the border is inside the box so it doesn't mess with dimensions
            boxSizing: 'border-box'
        }}
      />
      
      {/* Hover interaction hint (subtle inner ring) */}
      <div 
        className="absolute inset-0 pointer-events-none border-2 border-white/0 group-hover:border-white/20 transition-colors"
        style={{ borderRadius }}
      />
    </div>
  );
};