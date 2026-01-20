import React, { useState, useCallback, useEffect, useRef, RefObject } from 'react';
import { Position, Size } from '../types';
import { MIN_SIZE, MAX_SIZE } from '../constants';

interface UseDraggableResizableProps {
  containerRef: RefObject<HTMLDivElement>;
  initialPosition: Position;
  initialSize: Size;
  onUpdate: (pos: Position, size: Size) => void;
}

export const useDraggableResizable = ({
  containerRef,
  initialPosition,
  initialSize,
  onUpdate,
}: UseDraggableResizableProps) => {
  // Local state for rendering the component style
  const [position, setPosition] = useState<Position>(initialPosition);
  const [size, setSize] = useState<Size>(initialSize);

  // Refs for mutable values to be accessed inside event listeners without closure staleness
  const stateRef = useRef({
    position: initialPosition,
    size: initialSize,
    isDragging: false,
    isResizing: false,
    dragOffset: { x: 0, y: 0 },
    containerRect: null as DOMRect | null,
  });

  // Sync internal state if props change externally (e.g. from parent state update)
  useEffect(() => {
    stateRef.current.position = initialPosition;
    setPosition(initialPosition);
  }, [initialPosition.x, initialPosition.y]);

  useEffect(() => {
    stateRef.current.size = initialSize;
    setSize(initialSize);
  }, [initialSize.width, initialSize.height]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const state = stateRef.current;
    if (!state.isDragging && !state.isResizing) return;

    // Use cached rect or get new one
    let containerRect = state.containerRect;
    if (!containerRect && containerRef.current) {
        containerRect = containerRef.current.getBoundingClientRect();
        state.containerRect = containerRect;
    }
    if (!containerRect) return;

    if (state.isDragging) {
      let newX = e.clientX - state.dragOffset.x;
      let newY = e.clientY - state.dragOffset.y;

      // Boundary checks
      newX = Math.max(0, Math.min(newX, containerRect.width - state.size.width));
      newY = Math.max(0, Math.min(newY, containerRect.height - state.size.height));

      const newPos = { x: newX, y: newY };
      
      // Update ref immediately for next mousemove event
      state.position = newPos;
      // Update React state for UI
      setPosition(newPos);
      // Notify parent
      onUpdate(newPos, state.size);
    } 
    else if (state.isResizing) {
      // Calculate new size based on mouse position relative to container
      const absoluteLeft = containerRect.left + state.position.x;
      const absoluteTop = containerRect.top + state.position.y;

      let newWidth = e.clientX - absoluteLeft;
      let newHeight = e.clientY - absoluteTop;

      // Constrain size
      newWidth = Math.max(MIN_SIZE, Math.min(newWidth, MAX_SIZE));
      newHeight = Math.max(MIN_SIZE, Math.min(newHeight, MAX_SIZE));
      
      // Boundary checks for resize
      if (state.position.x + newWidth > containerRect.width) {
        newWidth = containerRect.width - state.position.x;
      }
      if (state.position.y + newHeight > containerRect.height) {
        newHeight = containerRect.height - state.position.y;
      }

      const newSize = { width: newWidth, height: newHeight };
      
      state.size = newSize;
      setSize(newSize);
      onUpdate(state.position, newSize);
    }
  }, [onUpdate, containerRef]);

  const handleMouseUp = useCallback(() => {
    const state = stateRef.current;
    state.isDragging = false;
    state.isResizing = false;
    state.containerRect = null;

    document.body.style.cursor = 'default';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'drag' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();

    if (!containerRef.current) return;

    const state = stateRef.current;
    state.containerRect = containerRef.current.getBoundingClientRect();

    if (type === 'drag') {
      state.isDragging = true;
      state.dragOffset = {
        x: e.clientX - state.position.x,
        y: e.clientY - state.position.y,
      };
      document.body.style.cursor = 'move';
    } else {
      state.isResizing = true;
      document.body.style.cursor = 'nwse-resize';
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [containerRef, handleMouseMove, handleMouseUp]);

  return {
    position,
    size,
    handleMouseDown,
    setPosition,
    setSize
  };
};