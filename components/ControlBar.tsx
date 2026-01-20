import React from 'react';
import { 
  Square, 
  Circle, 
  Square as SquareIcon, 
  Video, 
  VideoOff, 
  Download,
  Palette,
  ZoomIn
} from 'lucide-react';
import { Shape } from '../types';

interface ControlBarProps {
  isRecording: boolean;
  shape: Shape;
  isCameraOn: boolean;
  hasRecordedVideo: boolean;
  borderColor: string;
  borderWidth: number;
  zoomLevel: number;
  onStart: () => void;
  onStop: () => void;
  onToggleShape: () => void;
  onToggleCamera: () => void;
  onDownload: () => void;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onZoomChange: (zoom: number) => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isRecording,
  shape,
  isCameraOn,
  hasRecordedVideo,
  borderColor,
  borderWidth,
  zoomLevel,
  onStart,
  onStop,
  onToggleShape,
  onToggleCamera,
  onDownload,
  onColorChange,
  onWidthChange,
  onZoomChange
}) => {
  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 
                    bg-slate-900/80 backdrop-blur-xl border border-slate-700 
                    px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-50 transition-all">
      
      {/* Recording Control */}
      {!isRecording ? (
        <button
          onClick={onStart}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-red-600/20 active:scale-95 whitespace-nowrap"
        >
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          Start Rec
        </button>
      ) : (
        <button
          onClick={onStop}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-500/30 px-5 py-2 rounded-xl font-semibold transition-all active:scale-95 whitespace-nowrap"
        >
          <Square size={18} fill="currentColor" />
          Stop
        </button>
      )}

      <div className="w-px h-8 bg-slate-700" />

      {/* Camera Toggles */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleCamera}
          className={`p-2.5 rounded-xl transition-all ${
            isCameraOn 
              ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
          title={isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
        >
          {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        <button
          onClick={onToggleShape}
          disabled={!isCameraOn}
          className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${
            !isCameraOn ? 'opacity-50 cursor-not-allowed bg-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
          title="Toggle Shape"
        >
          {shape === 'circle' ? <Circle size={20} /> : <SquareIcon size={20} />}
        </button>
      </div>

      {/* Style Controls */}
      {isCameraOn && (
        <>
          <div className="w-px h-8 bg-slate-700" />
          
          <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-700/50">
            {/* Color & Border Width */}
            <div className="relative group flex items-center justify-center">
                <Palette size={16} className="text-slate-400 mr-2" />
                <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => onColorChange(e.target.value)}
                    className="w-6 h-6 rounded-full overflow-hidden cursor-pointer border-none p-0 bg-transparent"
                    title="Border Color"
                />
            </div>
            
            <div className="w-px h-4 bg-slate-700" />

            <div className="flex items-center gap-2" title="Border Width">
                <div className="w-2 h-2 rounded-full border border-slate-400" />
                <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={borderWidth}
                    onChange={(e) => onWidthChange(Number(e.target.value))}
                    className="w-16 accent-blue-500 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                />
                <div className="w-3 h-3 rounded-full border-2 border-slate-400" />
            </div>

            <div className="w-px h-4 bg-slate-700" />

            {/* Zoom Control */}
            <div className="flex items-center gap-2" title="Zoom Level">
                <ZoomIn size={16} className="text-slate-400" />
                <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={zoomLevel}
                    onChange={(e) => onZoomChange(Number(e.target.value))}
                    className="w-16 accent-blue-500 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                />
            </div>
          </div>
        </>
      )}

      {/* Download Action */}
      {hasRecordedVideo && !isRecording && (
        <>
          <div className="w-px h-8 bg-slate-700" />
          <button
            onClick={onDownload}
            className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 transition-colors"
          >
            <Download size={20} />
          </button>
        </>
      )}
    </div>
  );
};