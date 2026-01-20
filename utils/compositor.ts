import { OverlayConfig } from "../types";

export class VideoCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private isActive = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error("Could not get canvas context");
    this.ctx = context;
  }

  start(
    screenVideo: HTMLVideoElement,
    cameraVideo: HTMLVideoElement,
    getConfig: () => OverlayConfig,
    containerWidth: number,
    containerHeight: number
  ) {
    this.isActive = true;

    const draw = () => {
      if (!this.isActive) return;

      const config = getConfig();
      
      // 1. Sync Canvas Size to Screen Video Size (Resolution)
      // If the screen video is not ready, we skip
      if (screenVideo.readyState < 2) {
        this.animationFrameId = requestAnimationFrame(draw);
        return;
      }

      // We set the canvas resolution to match the incoming screen share resolution
      // This ensures high quality recording.
      const screenWidth = screenVideo.videoWidth;
      const screenHeight = screenVideo.videoHeight;

      if (this.canvas.width !== screenWidth || this.canvas.height !== screenHeight) {
        this.canvas.width = screenWidth;
        this.canvas.height = screenHeight;
      }

      // Clear
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, screenWidth, screenHeight);

      // 2. Draw Screen
      this.ctx.drawImage(screenVideo, 0, 0, screenWidth, screenHeight);

      // 3. Draw Camera Overlay
      if (config.isVisible && cameraVideo.readyState >= 2) {
        // We need to translate the DOM coordinates (which are relative to the container view)
        // to the Canvas coordinates (which are based on video resolution).
        const scaleX = screenWidth / containerWidth;
        const scaleY = screenHeight / containerHeight;
        
        const camX = config.position.x * scaleX;
        const camY = config.position.y * scaleY;
        const camW = config.size.width * scaleX;
        const camH = config.size.height * scaleY;

        this.ctx.save();

        // Apply Shape Clipping
        if (config.shape === 'circle') {
            this.ctx.beginPath();
            const centerX = camX + camW / 2;
            const centerY = camY + camH / 2;
            const radiusX = camW / 2;
            const radiusY = camH / 2;
            
            this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            this.ctx.clip();
        }

        // Draw the camera video with ZOOM
        // To implement zoom, we draw a subset (crop) of the source video into the destination rect.
        const vidW = cameraVideo.videoWidth;
        const vidH = cameraVideo.videoHeight;
        
        // Calculate Source Rect based on zoomLevel
        // A zoom level of 2 means we see half the width/height centered.
        const zoom = Math.max(1, config.zoomLevel);
        const srcW = vidW / zoom;
        const srcH = vidH / zoom;
        const srcX = (vidW - srcW) / 2;
        const srcY = (vidH - srcH) / 2;

        this.ctx.drawImage(
            cameraVideo, 
            srcX, srcY, srcW, srcH, // Source Crop (Zoom)
            camX, camY, camW, camH  // Destination on Canvas
        );
        
        // Draw Border if visible (width > 0)
        if (config.borderWidth > 0) {
            this.ctx.strokeStyle = config.borderColor;
            this.ctx.lineWidth = config.borderWidth * scaleX; // Scale width relative to canvas resolution

            if (config.shape === 'circle') {
                 this.ctx.stroke(); // Uses the path defined in the clip block above if circle
            } else {
                 this.ctx.strokeRect(camX, camY, camW, camH);
            }
        }

        this.ctx.restore();
      }

      this.animationFrameId = requestAnimationFrame(draw);
    };

    draw();
  }

  stop() {
    this.isActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}