import React, { useState, useEffect } from 'react';
import { WebcamView } from '@/components/WebcamView';
import { RecordButton } from '@/components/RecordButton';
import { PatientNameInput } from '@/components/PatientNameInput';
import { VideoGallery } from '@/components/VideoGallery';
import { VideoPlaybackDialog } from '@/components/VideoPlaybackDialog';
import { useWebcam } from '@/hooks/useWebcam';
import { saveVideo, getVideos, deleteVideo, updateVideo } from '@/lib/database';
import { generateVideoThumbnail, getNextPatientNumber } from '@/utils/videoUtils';
import { useToast } from '@/hooks/use-toast';
import { Stethoscope, Wifi, WifiOff } from 'lucide-react';

interface VideoRecord {
  id: string;
  patientName: string;
  blob: Blob;
  thumbnail: string;
  duration: number;
  createdAt: Date;
  hidePatient?: boolean;
}

const Index = () => {
  const {
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
    switchCamera,
  } = useWebcam();

  const [patientName, setPatientName] = useState('');
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  // Load videos on mount
  useEffect(() => {
    loadVideos();
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-start webcam on mount
  useEffect(() => {
    startStream();
  }, [startStream]);

  const loadVideos = async () => {
    try {
      const savedVideos = await getVideos();
      setVideos(savedVideos);
    } catch (err) {
      console.error('Failed to load videos:', err);
      toast({
        title: 'Error',
        description: 'Failed to load saved videos',
        variant: 'destructive',
      });
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      try {
        const recordedBlob = await stopRecording();
        if (recordedBlob && patientName.trim()) {
          // Generate thumbnail and save
          const thumbnail = await generateVideoThumbnail(recordedBlob);
          const duration = 0; // We'll estimate this later
          
          await saveVideo(patientName.trim(), recordedBlob, thumbnail, duration);
          await loadVideos();
          
          toast({
            title: 'Recording Saved',
            description: `Video for ${patientName} has been saved successfully`,
          });
        } else if (recordedBlob && !patientName.trim()) {
          toast({
            title: 'Patient Name Required',
            description: 'Please enter a patient name before recording',
            variant: 'destructive',
          });
        }
      } catch (err) {
        console.error('Failed to save recording:', err);
        toast({
          title: 'Error',
          description: 'Failed to save recording',
          variant: 'destructive',
        });
      }
    } else {
      if (!patientName.trim()) {
        toast({
          title: 'Patient Name Required',
          description: 'Please enter a patient name before starting recording',
          variant: 'destructive',
        });
        return;
      }
      startRecording();
      toast({
        title: 'Recording Started',
        description: `Recording session for ${patientName}`,
      });
    }
  };

  const handleDeleteVideo = async (id: string) => {
    try {
      await deleteVideo(id);
      await loadVideos();
      toast({
        title: 'Video Deleted',
        description: 'Recording has been removed',
      });
    } catch (err) {
      console.error('Failed to delete video:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete video',
        variant: 'destructive',
      });
    }
  };

  const handleClearAll = async () => {
    try {
      // Delete all videos
      await Promise.all(videos.map(video => deleteVideo(video.id)));
      await loadVideos();
      toast({
        title: 'All Videos Cleared',
        description: 'All recordings have been removed',
      });
    } catch (err) {
      console.error('Failed to clear videos:', err);
      toast({
        title: 'Error',
        description: 'Failed to clear all videos',
        variant: 'destructive',
      });
    }
  };

  const handleGeneratePlaceholder = () => {
    const nextPatientNumber = getNextPatientNumber(videos);
    setPatientName(nextPatientNumber);
  };

  // New: clear service worker registrations (confirmation + toast)
  const handleClearServiceWorkers = async () => {
    if (!('serviceWorker' in navigator)) {
      toast({
        title: 'Not supported',
        description: 'Service workers are not supported in this browser.',
        variant: 'destructive',
      });
      return;
    }

    const confirmClear = window.confirm('Unregister all service workers and clear caches? This may require a reload. Proceed?');
    if (!confirmClear) return;

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      // Also try to clear caches (best-effort)
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        } catch (cacheErr) {
          console.warn('Failed to clear caches:', cacheErr);
        }
      }

      toast({
        title: 'Service Workers Unregistered',
        description: 'All service workers were unregistered. You may need to reload the page.',
      });

      const reloadConfirm = window.confirm('Reload page now to complete clearing?');
      if (reloadConfirm) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to unregister service workers:', err);
      toast({
        title: 'Error',
        description: 'Failed to unregister service workers',
        variant: 'destructive',
      });
    }
  };

  // New: toggle hidePatient flag on a video
  const handleToggleHide = async (id: string, hide: boolean) => {
    try {
      await updateVideo(id, { hidePatient: hide });
      await loadVideos();
      toast({
        title: hide ? 'Patient Hidden' : 'Patient Shown',
        description: hide ? 'Patient name hidden for this video' : 'Patient name is now visible',
      });
    } catch (err) {
      console.error('Failed to update video hide flag:', err);
      toast({
        title: 'Error',
        description: 'Failed to update video',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header removed - full-screen camera focus */}

      {/* Main Content - Full Screen Camera Focus */}
      <main className="relative h-[100vh]">
        {/* Camera View - Full Screen */}
        <div className="absolute inset-0">
          <WebcamView
            videoRef={videoRef}
            isStreaming={isStreaming}
            error={error}
            cameras={cameras}
            selectedCameraId={selectedCameraId}
            onStartStream={startStream}
            onSwitchCamera={switchCamera}
          />
        </div>
        
        {/* Floating Control Panel */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
            <RecordButton
              isRecording={isRecording}
              isStreaming={isStreaming}
              onToggleRecording={handleToggleRecording}
            />
          </div>
        </div>

        {/* Floating Sidebar */}
        <div className="absolute top-4 right-4 w-80 max-h-[calc(100vh-8rem)] overflow-y-auto z-10">
          <div className="space-y-4">
            <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
              <PatientNameInput
                patientName={patientName}
                onPatientNameChange={setPatientName}
                onClearAll={handleClearAll}
                onGeneratePlaceholder={handleGeneratePlaceholder}
                onClearServiceWorkers={handleClearServiceWorkers}
              />
            </div>
            
            <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
              <VideoGallery
                videos={videos}
                onPlayVideo={setSelectedVideo}
                onDeleteVideo={handleDeleteVideo}
                onToggleHide={handleToggleHide}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Video Playback Dialog */}
      <VideoPlaybackDialog
        video={selectedVideo}
        open={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
};

export default Index;
