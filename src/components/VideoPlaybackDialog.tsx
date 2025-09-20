import React, { useRef, useEffect } from 'react';
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

  useEffect(() => {
    if (video && videoRef.current) {
      const vidEl = videoRef.current;
      const url = URL.createObjectURL(video.blob);
      let handled = false;

      const onError = (ev: Event) => {
        // Log detailed error for debugging playback issues
        try {
          console.error('Video playback error', ev, { url, blobSize: video.blob.size, blobType: video.blob.type });
        } catch (logErr) {
          // no-op
          void 0;
        }
      };

      const onLoadedData = () => {
        // Ensure the video element has loaded enough metadata/frames
        handled = true;
        try { vidEl.currentTime = 0; } catch (seekErr) { console.warn('Could not set currentTime', seekErr); }
      };

      try {
        vidEl.removeAttribute('src');
        vidEl.src = url;
        vidEl.load();
      } catch (e) {
        console.error('Failed to assign video src or load:', e);
      }

      vidEl.addEventListener('error', onError);
      vidEl.addEventListener('loadeddata', onLoadedData);

      return () => {
        try {
          vidEl.removeEventListener('error', onError);
          vidEl.removeEventListener('loadeddata', onLoadedData);
        } catch (remErr) { console.warn('Error removing video listeners', remErr); }
        try {
          // Pause and clear source before revoking to avoid range requests against revoked URL
          vidEl.pause();
          vidEl.removeAttribute('src');
          vidEl.load();
        } catch (clearErr) { console.warn('Error clearing video src', clearErr); }
        try { URL.revokeObjectURL(url); } catch (revokeErr) { console.warn('Failed to revoke object URL', revokeErr); }
      };
    }
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
      <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-6">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl flex items-center justify-between">
            Video Playback
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="ml-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </DialogTitle>
          
          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              {video.patientName || 'Unnamed Patient'}
            </div>
            <div className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              {new Date(video.createdAt).toLocaleDateString()}
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
          <video
            ref={videoRef}
            controls
            className="w-full h-full object-contain rounded-lg bg-black"
            autoPlay
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}