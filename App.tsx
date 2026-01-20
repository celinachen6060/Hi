import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CameraOverlay } from './components/CameraOverlay';
import { ControlBar } from './components/ControlBar';
import { INITIAL_OVERLAY_CONFIG, RECORDING_MIME_TYPE } from './constants';
import { OverlayConfig, Position, Size } from './types';
import { VideoCompositor } from './utils/compositor';
import { Monitor, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>(INITIAL_OVERLAY_CONFIG);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(document.createElement('video'));
  const cameraVideoRef = useRef<HTMLVideoElement>(document.createElement('video'));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const compositorRef = useRef<VideoCompositor | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Keep a ref of the config so the compositor can access the latest value inside its loop
  // without needing to close over a new variable every render.
  const overlayConfigRef = useRef(overlayConfig);

  useEffect(() => {
    overlayConfigRef.current = overlayConfig;
  }, [overlayConfig]);

  // Initialize Camera on Mount
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true, // We need audio for the mic
        });
        setCameraStream(stream);
        cameraVideoRef.current.srcObject = stream;
        cameraVideoRef.current.play().catch(console.error);
        cameraVideoRef.current.muted = true; // Mute locally to avoid feedback
      } catch (err) {
        console.error("Camera access denied or missing", err);
        setError("Could not access camera/microphone. Please check permissions.");
      }
    };
    initCamera();

    return () => {
      // Cleanup tracks on unmount
      cameraStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const handleStartRecording = async () => {
    setError(null);
    setRecordedBlob(null);

    try {
      // 1. Get Screen Stream (System Audio + Video)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: true, // Request system audio
      });
      setScreenStream(displayStream);
      
      // Wire up hidden screen video element for the canvas to read
      screenVideoRef.current.srcObject = displayStream;
      await screenVideoRef.current.play();

      // 2. Setup Audio Mixing
      // We need to mix: Mic (from cameraStream) + System Audio (from displayStream)
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const destination = audioCtx.createMediaStreamDestination();

      if (cameraStream) {
        const micSource = audioCtx.createMediaStreamSource(cameraStream);
        micSource.connect(destination);
      }

      if (displayStream.getAudioTracks().length > 0) {
        const sysSource = audioCtx.createMediaStreamSource(displayStream);
        sysSource.connect(destination);
      }

      // 3. Setup Canvas Compositor
      if (canvasRef.current && previewContainerRef.current) {
        const compositor = new VideoCompositor(canvasRef.current);
        compositorRef.current = compositor;
        
        // Start the draw loop
        // IMPORTANT: We pass a function that reads from the Ref, not the state closure
        compositor.start(
          screenVideoRef.current,
          cameraVideoRef.current,
          () => overlayConfigRef.current, 
          previewContainerRef.current.clientWidth,
          previewContainerRef.current.clientHeight
        );
      }

      // 4. Setup MediaRecorder
      // Combine Canvas Video Track + Mixed Audio Track
      const canvasStream = canvasRef.current!.captureStream(30); // 30 FPS
      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ];
      const finalStream = new MediaStream(combinedTracks);

      const recorder = new MediaRecorder(finalStream, {
        mimeType: RECORDING_MIME_TYPE
      });
      
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: RECORDING_MIME_TYPE });
        setRecordedBlob(blob);
        stopAllStreams();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Handle user clicking "Stop Sharing" in browser UI
      displayStream.getVideoTracks()[0].onended = () => {
        handleStopRecording();
      };

    } catch (err: any) {
      console.error("Error starting recording:", err);
      setError("Failed to start recording. " + err.message);
      stopAllStreams();
    }
  };

  const stopAllStreams = () => {
    // Stop Compositor
    if (compositorRef.current) compositorRef.current.stop();
    
    // Stop Screen Stream tracks
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }

    // Close Audio Context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsRecording(false);
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleDownload = useCallback(() => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `omni-record-${new Date().toISOString()}.webm`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  }, [recordedBlob]);

  // Use callback to ensure stability of the function reference
  const updateOverlayConfig = useCallback((pos: Position, size: Size) => {
    setOverlayConfig(prev => ({ ...prev, position: pos, size: size }));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative font-sans">
      
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
          <div className="w-3 h-3 bg-white rounded-full" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">OmniRecord</h1>
      </div>

      {/* Main Preview Area */}
      <div className="w-full max-w-6xl aspect-video bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl backdrop-blur-sm group">
        
        {/* The Container Reference for Drag Calculations */}
        <div ref={previewContainerRef} className="w-full h-full relative">
            
          {/* Screen Preview (Source) */}
          {screenStream ? (
            <video
              ref={screenVideoRef}
              className="w-full h-full object-contain"
              autoPlay
              muted
              playsInline
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-4">
              <div className="p-6 bg-slate-800/50 rounded-full mb-2 group-hover:scale-110 transition-transform duration-500">
                <Monitor size={48} className="text-slate-400" />
              </div>
              <p className="text-lg font-medium">Ready to capture</p>
              <p className="text-sm opacity-60">Click "Start Rec" to select a screen</p>
            </div>
          )}

          {/* Camera Overlay (UI) - Visible to user for positioning */}
          {overlayConfig.isVisible && (
            <CameraOverlay
              stream={cameraStream}
              containerRef={previewContainerRef}
              shape={overlayConfig.shape}
              initialPosition={overlayConfig.position}
              initialSize={overlayConfig.size}
              borderColor={overlayConfig.borderColor}
              borderWidth={overlayConfig.borderWidth}
              zoomLevel={overlayConfig.zoomLevel}
              onUpdateConfig={updateOverlayConfig}
            />
          )}

        </div>

        {/* Hidden Canvas for actual recording composition */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute top-20 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Controls */}
      <ControlBar
        isRecording={isRecording}
        shape={overlayConfig.shape}
        isCameraOn={overlayConfig.isVisible}
        hasRecordedVideo={!!recordedBlob}
        borderColor={overlayConfig.borderColor}
        borderWidth={overlayConfig.borderWidth}
        zoomLevel={overlayConfig.zoomLevel}
        onStart={handleStartRecording}
        onStop={handleStopRecording}
        onToggleShape={() => setOverlayConfig(prev => ({ ...prev, shape: prev.shape === 'circle' ? 'rectangle' : 'circle' }))}
        onToggleCamera={() => setOverlayConfig(prev => ({ ...prev, isVisible: !prev.isVisible }))}
        onDownload={handleDownload}
        onColorChange={(color) => setOverlayConfig(prev => ({ ...prev, borderColor: color }))}
        onWidthChange={(width) => setOverlayConfig(prev => ({ ...prev, borderWidth: width }))}
        onZoomChange={(zoom) => setOverlayConfig(prev => ({ ...prev, zoomLevel: zoom }))}
      />

    </div>
  );
};

export default App;