import { OverlayConfig } from './types';

export const INITIAL_OVERLAY_CONFIG: OverlayConfig = {
  shape: 'circle',
  position: { x: 50, y: 50 },
  size: { width: 200, height: 200 },
  isVisible: true,
  borderColor: '#3b82f6',
  borderWidth: 4,
  zoomLevel: 1.0,
};

export const MIN_SIZE = 100;
export const MAX_SIZE = 600;
export const RECORDING_MIME_TYPE = 'video/webm; codecs=vp9';