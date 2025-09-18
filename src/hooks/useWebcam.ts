import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  isStreaming: boolean;
  isRecording: boolean;
  error: string | null;
  cameras: MediaDeviceInfo[];
  selectedCameraId: string | null;
  startStream: (deviceId?: string) => Promise<void>;
  stopStream: () => void;
  startRecording: () => void;
  stopRecording: () => Promise<Blob | null>;
  recordedChunks: Blob[];
  switchCamera: (deviceId: string) => Promise<void>;
}

export function useWebcam(): UseWebcamReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  // Get available cameras
  const getCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
    }
  }, [selectedCameraId]);

  const startStream = useCallback(async (deviceId?: string) => {
    try {
      setError(null);
      
      // Get cameras if not already loaded
      if (cameras.length === 0) {
        await getCameras();
      }
      
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          deviceId: deviceId || selectedCameraId ? { exact: deviceId || selectedCameraId! } : undefined,
        },
        audio: true
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      setStream(mediaStream);
      setIsStreaming(true);
      
      if (deviceId) {
        setSelectedCameraId(deviceId);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access webcam';
      setError(errorMessage);
      console.error('Error accessing webcam:', err);
    }
  }, [cameras.length, getCameras, selectedCameraId]);

  const switchCamera = useCallback(async (deviceId: string) => {
    if (isStreaming) {
      stopStream();
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }
    await startStream(deviceId);
  }, [isStreaming, startStream]);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsStreaming(false);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  const startRecording = useCallback(() => {
    if (!stream) return;

    try {
      setRecordedChunks([]);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setRecordedChunks(chunks);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
    } catch (err) {
      setError('Failed to start recording');
      console.error('Recording error:', err);
    }
  }, [stream]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        setIsRecording(false);
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  }, [isRecording, recordedChunks]);

  useEffect(() => {
    getCameras();
    return () => {
      stopStream();
    };
  }, [getCameras, stopStream]);

  return {
    videoRef,
    stream,
    isStreaming,
    isRecording,
    error,
    cameras,
    selectedCameraId,
    startStream,
    stopStream,
    startRecording,
    stopRecording,
    recordedChunks,
    switchCamera,
  };
}