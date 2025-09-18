import React, { useEffect } from 'react';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CameraSelector } from '@/components/CameraSelector';

interface WebcamViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isStreaming: boolean;
  error: string | null;
  cameras: MediaDeviceInfo[];
  selectedCameraId: string | null;
  onStartStream: () => void;
  onSwitchCamera: (deviceId: string) => void;
}

export function WebcamView({ videoRef, isStreaming, error, cameras, selectedCameraId, onStartStream, onSwitchCamera }: WebcamViewProps) {
  useEffect(() => {
    if (videoRef.current && isStreaming) {
      videoRef.current.play().catch(console.error);
    }
  }, [isStreaming, videoRef]);

  return (
    <div className="webcam-container flex-1 min-h-[500px] lg:min-h-[600px]">
      {error && (
        <Alert className="mb-4 border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="relative h-full w-full">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
        />
        
        {isStreaming && (
          <div className="absolute top-4 right-4">
            <CameraSelector
              cameras={cameras}
              selectedCameraId={selectedCameraId}
              onSwitchCamera={onSwitchCamera}
              disabled={false}
            />
          </div>
        )}
        
        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 backdrop-blur-sm">
            <div className="text-center space-y-4">
              {error ? (
                <CameraOff className="mx-auto h-16 w-16 text-muted-foreground" />
              ) : (
                <Camera className="mx-auto h-16 w-16 text-medical" />
              )}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">
                  {error ? 'Camera Access Failed' : 'Live Webcam View'}
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {error 
                    ? 'Please check your camera permissions and try again.'
                    : 'Click the button below to start your webcam and begin recording patient sessions.'
                  }
                </p>
              </div>
              <Button 
                onClick={onStartStream}
                className="bg-medical hover:bg-medical-dark text-white"
              >
                <Camera className="mr-2 h-4 w-4" />
                {error ? 'Retry Camera Access' : 'Start Webcam'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}