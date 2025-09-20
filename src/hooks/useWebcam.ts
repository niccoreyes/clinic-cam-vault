import { useState, useRef, useCallback, useEffect } from 'react';

export interface WebcamErrorInfo {
  name?: string;
  message?: string;
  failedAttempts: Array<{
    width: number;
    height: number;
    includeDeviceId: boolean;
    result: 'ok' | 'error';
    errorName?: string;
    errorMessage?: string;
  }>;
  permission?: 'granted' | 'denied' | 'prompt' | 'unknown';
  suggestedActions: string[];
}

export interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  isStreaming: boolean;
  isRecording: boolean;
  error: string | null;
  errorInfo?: WebcamErrorInfo;
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
  const [errorInfo, setErrorInfo] = useState<WebcamErrorInfo | undefined>(undefined);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  // Hold chunks in a ref to avoid races between MediaRecorder.onstop and React state updates
  const recordedChunksRef = useRef<Blob[]>([]);
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

  const getPermissionStatus = async (): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> => {
    try {
      if ('permissions' in navigator && (navigator as Navigator).permissions.query) {
        const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return status.state as 'granted' | 'denied' | 'prompt';
      }
    } catch {
      // ignore
    }
    return 'unknown';
  };

  const startStream = useCallback(async (deviceId?: string) => {
    setError(null);

    if (cameras.length === 0) {
      await getCameras();
    }

    type VideoConstraints = MediaTrackConstraints & { deviceId?: ConstrainDOMString | ConstrainDOMStringParameters };

    const makeConstraints = (width: number, height: number, includeDeviceId: boolean): MediaStreamConstraints => {
      const videoConstraints: VideoConstraints = {
        width: { ideal: width },
        height: { ideal: height },
      };

      if (includeDeviceId && (deviceId || selectedCameraId)) {
        videoConstraints.deviceId = { exact: deviceId || selectedCameraId! };
      }

      return { video: videoConstraints, audio: true };
    };

    const attempt = async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
      return await navigator.mediaDevices.getUserMedia(constraints);
    };

    const widths = [1280, 640];
    const includeDeviceIdCandidates = (deviceId || selectedCameraId) ? [true, false] : [false];

    let obtainedStream: MediaStream | null = null;
    let lastError: unknown = null;
    const failedAttempts: WebcamErrorInfo['failedAttempts'] = [];

    for (const width of widths) {
      const height = width === 1280 ? 720 : 480;
      for (const includeDeviceId of includeDeviceIdCandidates) {
        const constraints = makeConstraints(width, height, includeDeviceId);
        try {
          obtainedStream = await attempt(constraints);
          failedAttempts.push({
            width,
            height,
            includeDeviceId,
            result: 'ok',
          });
          break;
        } catch (err) {
          lastError = err;
          failedAttempts.push({
            width,
            height,
            includeDeviceId,
            result: 'error',
            errorName: err instanceof DOMException ? err.name : undefined,
            errorMessage: err instanceof Error ? err.message : String(err),
          });
          const isConstraintError =
            err instanceof DOMException &&
            (err.name === 'OverconstrainedError' || err.name === 'NotFoundError' || err.name === 'NotReadableError');
          const isPermissionError =
            err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
          if (isPermissionError) {
            setError('Camera access denied. Please allow camera permissions and try again.');
            setErrorInfo({
              name: err.name,
              message: err.message,
              failedAttempts: [...failedAttempts],
              permission: 'denied',
              suggestedActions: [
                'Check browser camera permissions.',
                'Ensure no other app is using the camera.',
                'Try restarting your browser or computer.',
              ],
            });
            return;
          }
          // Continue fallback for constraint errors, otherwise break
          if (!isConstraintError) break;
        }
      }
      if (obtainedStream) break;
    }

    if (!obtainedStream) {
      const permission = await getPermissionStatus();
      const suggestedActions: string[] = [
        'Try unplugging and replugging your camera.',
        'Try a different camera device.',
        'Check OS-level camera privacy settings.',
        'Close other apps that may be using the camera.',
        'Try a different browser.',
      ];
      if (permission === 'denied') {
        suggestedActions.unshift('Grant camera permission in your browser settings.');
      }
      setError('No compatible camera found. Try a different camera or check system permissions.');
      setErrorInfo({
        name: lastError && lastError instanceof DOMException ? lastError.name : undefined,
        message: lastError && lastError instanceof Error ? lastError.message : String(lastError),
        failedAttempts,
        permission,
        suggestedActions,
      });
      return;
    }

    setErrorInfo(undefined);

    try {
      setStream(obtainedStream);
      setIsStreaming(true);

      // Attach diagnostics for unexpected track/stream endings
      try {
        const log = (e: string, data?: unknown) => {
          if (typeof window !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dbg = (window as any).clinicCamDebug || ((window as any).clinicCamDebug = []);
            dbg.push({ type: e, at: Date.now(), data });
          }
        };
        obtainedStream.getTracks().forEach((t) => {
          // track ended (e.g., device unplug, camera taken by other app)
          if (t.addEventListener) {
            t.addEventListener('ended', () => log('track-ended', { kind: t.kind, readyState: t.readyState }));
            t.addEventListener('mute', () => log('track-mute', { kind: t.kind }));
            t.addEventListener('unmute', () => log('track-unmute', { kind: t.kind }));
          } else {
            // Fallback assignments if EventTarget methods not exposed (older DOM typings)
            const tAssign = t as unknown as {
              onended?: () => void;
              onmute?: () => void;
              onunmute?: () => void;
            };
            tAssign.onended = () => log('track-ended', { kind: t.kind, readyState: t.readyState });
            tAssign.onmute = () => log('track-mute', { kind: t.kind });
            tAssign.onunmute = () => log('track-unmute', { kind: t.kind });
          }
        });
        // stream inactive when all tracks stop
        const anyStream = obtainedStream as unknown as { addEventListener?: (type: string, cb: () => void) => void };
        if (anyStream.addEventListener) {
          anyStream.addEventListener('inactive', () => log('stream-inactive'));
        }
      } catch (e) {
        // No-op: diagnostic event binding is best-effort
      }

      if (deviceId) {
        setSelectedCameraId(deviceId);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = obtainedStream;
        try {
          const playPromise = videoRef.current.play();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise.catch(() => {});
          }
        } catch { /* no-op */ }
      }
    } catch (attachErr) {
      setError('Failed to start camera preview.');
      setErrorInfo({
        name: attachErr instanceof DOMException ? attachErr.name : undefined,
        message: attachErr instanceof Error ? attachErr.message : String(attachErr),
        failedAttempts,
        permission: await getPermissionStatus(),
        suggestedActions: [
          'Try refreshing the page.',
          'Try a different camera device.',
          'Check browser and OS camera permissions.',
        ],
      });
      try {
        obtainedStream.getTracks().forEach(t => t.stop());
      } catch { /* no-op */ }
      setStream(null);
      setIsStreaming(false);
    }
  }, [cameras.length, getCameras, selectedCameraId]);

  const switchCamera = useCallback(async (deviceId: string) => {
    if (isStreaming) {
      //stopStream();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    await startStream(deviceId);
  }, [isStreaming, startStream]);

  const stopStream = useCallback(() => {
    if (stream) {
      try {
        // Debug trace for identifying stop triggers
        if (typeof window !== 'undefined') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dbg = (window as any).clinicCamDebug || ((window as any).clinicCamDebug = []);
          dbg.push({
            type: 'stopStream',
            source: 'manual-call',
            at: Date.now(),
            tracks: stream.getTracks().map(t => ({ kind: t.kind, readyState: t.readyState })),
          });
        }
      } catch {
        // ignore debug errors
      }

      // Stop tracks first
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsStreaming(false);

      // Only clear srcObject if it still references this stream, and do it on the next frame
      const video = videoRef.current as HTMLVideoElement | null;
      if (video) {
        const current = video.srcObject as MediaStream | null;
        if (current === stream) {
          requestAnimationFrame(() => {
            try {
              video.pause();
            } catch {
              // ignore
            }
            try {
              video.srcObject = null;
            } catch {
              // ignore transient browser errors
            }
          });
        }
      }
    }
  }, [stream]);

  const startRecording = useCallback(() => {
    if (!stream) return;

    try {
      // reset both state and ref storage for chunks
      recordedChunksRef.current = [];
      setRecordedChunks([]);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      // accumulate chunks into the ref to avoid state update races
      mediaRecorder.addEventListener('dataavailable', (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      });

      // update state when recording stops (for UI listing) but keep ref as source-of-truth
      mediaRecorder.addEventListener('stop', () => {
        setRecordedChunks([...recordedChunksRef.current]);
      });

      mediaRecorder.start(100);
      setIsRecording(true);
    } catch (err) {
      setError('Failed to start recording');
      console.error('Recording error:', err);
    }
  }, [stream]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr || !isRecording) {
        resolve(null);
        return;
      }

      const onStop = () => {
        try {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          setIsRecording(false);
          resolve(blob);
        } catch (e) {
          console.error('Failed to build blob from recorded chunks:', e);
          resolve(null);
        } finally {
          // cleanup listener
          try { mr.removeEventListener('stop', onStop); } catch { /* no-op */ }
        }
      };

      mr.addEventListener('stop', onStop);
      try {
        mr.stop();
      } catch (e) {
        // If stop throws, ensure we remove listener and resolve
        try { mr.removeEventListener('stop', onStop); } catch { /* no-op */ }
        console.error('Error stopping MediaRecorder:', e);
        setIsRecording(false);
        resolve(null);
      }
    });
  }, [isRecording, recordedChunks]);

  // Initialize camera list on mount and listen for device changes.
  // Do NOT stop the stream on dependency changes; only on unmount.
  useEffect(() => {
    getCameras();

    const handleDeviceChange = () => {
      try {
        if (typeof window !== 'undefined') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dbg = (window as any).clinicCamDebug || ((window as any).clinicCamDebug = []);
          dbg.push({ type: 'devicechange', at: Date.now() });
        }
      } catch { /* no-op */ }
      getCameras();
    };

    // Add devicechange listener (browser support varies) with safe typing.
    const md: {
      addEventListener?: (type: string, cb: () => void) => void;
      removeEventListener?: (type: string, cb: () => void) => void;
      ondevicechange?: (() => void) | null;
    } = (navigator.mediaDevices as unknown) as {
      addEventListener?: (type: string, cb: () => void) => void;
      removeEventListener?: (type: string, cb: () => void) => void;
      ondevicechange?: (() => void) | null;
    };
    if (md?.addEventListener) {
      md.addEventListener('devicechange', handleDeviceChange);
    } else if (md) {
      md.ondevicechange = handleDeviceChange;
    }

    return () => {
      const mdCleanup: {
        addEventListener?: (type: string, cb: () => void) => void;
        removeEventListener?: (type: string, cb: () => void) => void;
        ondevicechange?: (() => void) | null;
      } = (navigator.mediaDevices as unknown) as {
        addEventListener?: (type: string, cb: () => void) => void;
        removeEventListener?: (type: string, cb: () => void) => void;
        ondevicechange?: (() => void) | null;
      };
      if (mdCleanup?.removeEventListener) {
        mdCleanup.removeEventListener('devicechange', handleDeviceChange);
      } else if (mdCleanup) {
        mdCleanup.ondevicechange = null;
      }
    };
  }, [getCameras]);

  // Ensure we stop the active stream ONLY on unmount.
  // We keep the latest stopStream via a ref to avoid stale closures.
  const stopStreamRef = useRef(stopStream);
  useEffect(() => {
    stopStreamRef.current = stopStream;
  }, [stopStream]);

  // Track if the page is unloading to distinguish real teardown from React 18 StrictMode dev re-mount cycles.
  const isUnloadingRef = useRef(false);
  useEffect(() => {
    const onPageHide = () => {
      isUnloadingRef.current = true;
    };
    const onBeforeUnload = () => {
      isUnloadingRef.current = true;
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  useEffect(() => {
    const mountedAt = performance.now();
    return () => {
      // In React 18 StrictMode (DEV), effects are mounted, cleaned up, and re-mounted immediately.
      // Skip stopping the stream during that synthetic cleanup to avoid flicker.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;
      const elapsed = performance.now() - mountedAt;
      if (isDev && !isUnloadingRef.current && elapsed < 1000) {
        return;
      }
      try {
        if (typeof window !== 'undefined') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dbg = (window as any).clinicCamDebug || ((window as any).clinicCamDebug = []);
          dbg.push({
            type: 'stopStream',
            source: isUnloadingRef.current ? 'page-unload' : 'component-unmount',
            at: Date.now(),
          });
        }
      } catch {
        // ignore debug errors
      }
      stopStreamRef.current?.();
    };
  }, []);

  return {
    videoRef,
    stream,
    isStreaming,
    isRecording,
    error,
    errorInfo,
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
