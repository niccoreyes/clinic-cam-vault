import React, { useEffect, useState } from 'react';
import { Camera, CameraOff, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CameraSelector } from '@/components/CameraSelector';
import type { WebcamErrorInfo } from '@/hooks/useWebcam';

interface WebcamViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isStreaming: boolean;
  error: string | null;
  errorInfo?: WebcamErrorInfo;
  cameras: MediaDeviceInfo[];
  selectedCameraId: string | null;
  onStartStream: () => void;
  onSwitchCamera: (deviceId: string) => void;
}

export function WebcamView({
  videoRef,
  isStreaming,
  error,
  errorInfo,
  cameras,
  selectedCameraId,
  onStartStream,
  onSwitchCamera,
}: WebcamViewProps) {
  const [showDebug, setShowDebug] = useState(false);

  // Display-only lifecycle: do not manipulate srcObject here.
  // Hook (useWebcam) owns attaching/clearing the stream.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isStreaming) {
      const tryPlay = () => {
        if (video.readyState >= 2) {
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch((err: unknown) => {
              // Ignore expected transient errors
              if (err && typeof err === 'object' && 'name' in err) {
                const name = (err as { name?: string }).name;
                if (name === 'AbortError' || name === 'NotSupportedError') return;
              }
              // Non-fatal; suppress noisy logs. Add a comment for easier debugging.
              // console.debug('WebcamView play() error', err);
            });
          }
        }
      };

      const handleCanPlay = () => tryPlay();
      video.addEventListener('canplay', handleCanPlay);

      // Attempt immediate play if already buffered enough
      tryPlay();

      return () => {
        video.removeEventListener('canplay', handleCanPlay);
      };
    } else {
      try {
        video.pause();
      } catch {
        // ignore pause errors
      }
      // Do not clear srcObject here; hook will manage it.
    }
  }, [isStreaming, videoRef]);

  return (
    <div className="webcam-container h-full w-full">
      {error && (
        <Alert className="mb-4 border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            {errorInfo && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 py-1 text-xs"
                  onClick={() => setShowDebug((v) => !v)}
                  aria-expanded={showDebug}
                >
                  {showDebug ? (
                    <>
                      <ChevronUp className="inline h-3 w-3 mr-1" />
                      Hide Debug Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="inline h-3 w-3 mr-1" />
                      Show Debug Details
                    </>
                  )}
                </Button>
                {showDebug && (
                  <div className="mt-2 p-2 rounded bg-muted/30 text-xs text-muted-foreground max-w-lg">
                    <div>
                      <strong>Error Name:</strong> {errorInfo.name || 'N/A'}
                    </div>
                    <div>
                      <strong>Error Message:</strong> {errorInfo.message || 'N/A'}
                    </div>
                    <div>
                      <strong>Permission:</strong> {errorInfo.permission || 'unknown'}
                    </div>
                    <div>
                      <strong>Suggested Actions:</strong>
                      <ul className="list-disc ml-5">
                        {errorInfo.suggestedActions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-2">
                      <strong>Failed Attempts:</strong>
                      <ul className="list-decimal ml-5">
                        {errorInfo.failedAttempts.map((a, i) => (
                          <li key={i}>
                            {a.result === 'ok'
                              ? `Success: ${a.width}x${a.height} ${a.includeDeviceId ? 'with deviceId' : 'no deviceId'}`
                              : `Failed: ${a.width}x${a.height} ${a.includeDeviceId ? 'with deviceId' : 'no deviceId'} (${a.errorName || 'error'}) - ${a.errorMessage || ''}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </AlertDescription>
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

        {isStreaming && cameras.length > 1 && (
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
                    : 'Click the button below to start your webcam and begin recording patient sessions.'}
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
