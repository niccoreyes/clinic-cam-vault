import React, { useRef, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Calendar, User } from 'lucide-react';

interface VideoRecord {
  id: string;
  patientName: string;
  blob: Blob;
  thumbnail: string;
  duration: number;
  createdAt: Date;
}

interface VideoPlaybackDialogProps {
  video: VideoRecord | null;
  open: boolean;
  onClose: () => void;
}

export function VideoPlaybackDialog({ video, open, onClose }: VideoPlaybackDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ duration?: number; width?: number; height?: number } | null>(null);

  useEffect(() => {
    setLoadError(null);
    setMeta(null);

    if (!video) {
      setObjectUrl(null);
      return;
    }

    let url: string | null = null;
    try {
      url = URL.createObjectURL(video.blob);
      setObjectUrl(url);
    } catch (e) {
      console.error('Failed to create object URL for video blob', e);
      setLoadError('Could not prepare video for playback.');
      setObjectUrl(null);
      return;
    }

    return () => {
      try {
        if (url) URL.revokeObjectURL(url);
      } catch (e) {
        console.warn('Failed to revoke object URL', e);
      }
      setObjectUrl(null);
      setLoadError(null);
      setMeta(null);
    };
  }, [video]);

  const handleDownload = () => {
    if (!video) return;

    const url = URL.createObjectURL(video.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video.patientName || 'patient'}-${new Date(video.createdAt).toISOString().split('T')[0]}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!video) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-4 flex flex-col">
        <DialogHeader className="flex items-start justify-between gap-4 py-2">
          <div>
            <DialogTitle className="text-lg font-semibold">Video Playback</DialogTitle>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground mt-2">
              <div className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>{video.patientName || 'Unnamed Patient'}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                <span>{new Date(video.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <div className="w-full max-w-[1100px] max-h-[calc(90vh-140px)] bg-black rounded-lg shadow-lg relative">
            <video
              ref={videoRef}
              src={objectUrl ?? undefined}
              poster={video.thumbnail || undefined}
              controls
              preload="metadata"
              className="w-full h-full object-contain rounded-lg bg-black"
              playsInline
              onCanPlay={() => {
                setLoadError(null);
                const el = videoRef.current;
                if (el) {
                  setMeta({ duration: el.duration, width: el.videoWidth, height: el.videoHeight });
                  // if duration is zero or NaN, surface an error
                  if (!el.duration || isNaN(el.duration) || el.duration <= 0) {
                    setLoadError('Loaded video metadata but duration is zero. Try downloading and playing locally.');
                  }
                }
              }}
              onLoadedMetadata={() => {
                const el = videoRef.current;
                if (el) {
                  setMeta({ duration: el.duration, width: el.videoWidth, height: el.videoHeight });
                }
              }}
              onError={(ev) => {
                console.error('Video element error', ev, { blobType: video.blob.type, blobSize: video.blob.size });
                setLoadError('This video cannot be played in your browser. You can download it and try locally.');
              }}
            />

            {loadError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white p-4">
                <div className="max-w-lg text-center">
                  <p className="mb-3">{loadError}</p>
                  <Button onClick={handleDownload} variant="outline">Download</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Debug / info area */}
        <div className="mt-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <div>
              <strong>MIME:</strong> {video.blob.type || 'unknown'} • <strong>Size:</strong> {video.blob.size} bytes
            </div>
            {meta && (
              <div>
                <strong>Duration:</strong> {isFinite(meta.duration || 0) ? `${Math.round((meta.duration || 0) * 10) / 10}s` : 'unknown'} • <strong>Resolution:</strong> {meta.width || '?'}×{meta.height || '?'}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}