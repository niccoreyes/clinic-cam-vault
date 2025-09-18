import React from 'react';
import { Circle, Square } from 'lucide-react';

interface RecordButtonProps {
  isRecording: boolean;
  isStreaming: boolean;
  onToggleRecording: () => void;
}

export function RecordButton({ isRecording, isStreaming, onToggleRecording }: RecordButtonProps) {
  const disabled = !isStreaming;

  return (
    <div className="flex flex-col items-center space-y-4">
      <button
        onClick={onToggleRecording}
        disabled={disabled}
        className={`
          record-button
          ${isRecording ? 'recording recording-pulse' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className={`record-inner ${isRecording ? 'recording' : ''}`}>
          {isRecording ? (
            <Square className="h-4 w-4 text-white" />
          ) : (
            <Circle className="h-6 w-6 text-record" />
          )}
        </div>
      </button>
      
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {isRecording ? 'Recording...' : 'Start Recording'}
        </p>
        {disabled && (
          <p className="text-xs text-muted-foreground mt-1">
            Please start webcam first
          </p>
        )}
      </div>
    </div>
  );
}