export type Shape = 'circle' | 'rectangle';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  blobUrl: string | null;
}

export interface OverlayConfig {
  shape: Shape;
  position: Position;
  size: Size;
  isVisible: boolean;
  borderColor: string;
  borderWidth: number;
  zoomLevel: number;
}