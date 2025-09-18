import React, { useState, useEffect } from 'react';
import { WebcamView } from '@/components/WebcamView';
import { RecordButton } from '@/components/RecordButton';
import { PatientNameInput } from '@/components/PatientNameInput';
import { VideoGallery } from '@/components/VideoGallery';
import { VideoPlaybackDialog } from '@/components/VideoPlaybackDialog';
import { useWebcam } from '@/hooks/useWebcam';
import { saveVideo, getVideos, deleteVideo } from '@/lib/database';
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-medical text-white">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Medical Video Recorder
                </h1>
                <p className="text-sm text-muted-foreground">
                  Professional patient session recording
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4 text-success" />
                  <span className="text-success">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Left Column - Webcam and Recording */}
          <div className="lg:col-span-2 space-y-6">
            <WebcamView
              videoRef={videoRef}
              isStreaming={isStreaming}
              error={error}
              cameras={cameras}
              selectedCameraId={selectedCameraId}
              onStartStream={startStream}
              onSwitchCamera={switchCamera}
            />
            
            <div className="flex justify-center">
              <RecordButton
                isRecording={isRecording}
                isStreaming={isStreaming}
                onToggleRecording={handleToggleRecording}
              />
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            <PatientNameInput
              patientName={patientName}
              onPatientNameChange={setPatientName}
              onClearAll={handleClearAll}
              onGeneratePlaceholder={handleGeneratePlaceholder}
            />
            
            <VideoGallery
              videos={videos}
              onPlayVideo={setSelectedVideo}
              onDeleteVideo={handleDeleteVideo}
            />
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
