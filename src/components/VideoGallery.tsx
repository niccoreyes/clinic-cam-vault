import React from 'react';
import { VideoThumbnail } from './VideoThumbnail';
import { VideoIcon, Folder } from 'lucide-react';

interface VideoRecord {
  id: string;
  patientName: string;
  blob: Blob;
  thumbnail: string;
  duration: number;
  createdAt: Date;
}

interface VideoGalleryProps {
  videos: VideoRecord[];
  onPlayVideo: (video: VideoRecord) => void;
  onDeleteVideo: (id: string) => void;
}

export function VideoGallery({ videos, onPlayVideo, onDeleteVideo }: VideoGalleryProps) {
  return (
    <div className="sidebar-card">
      <div className="flex items-center space-x-2 mb-4">
        <VideoIcon className="h-5 w-5 text-medical" />
        <h3 className="text-lg font-semibold text-foreground">Older Videos</h3>
        <span className="text-sm text-muted-foreground">({videos.length})</span>
      </div>
      
      {videos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Folder className="mx-auto h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm">No recordings yet</p>
          <p className="text-xs mt-1">Your patient video recordings will appear here</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {videos
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((video) => (
              <VideoThumbnail
                key={video.id}
                id={video.id}
                thumbnail={video.thumbnail}
                patientName={video.patientName}
                duration={video.duration}
                createdAt={video.createdAt}
                onPlay={() => onPlayVideo(video)}
                onDelete={() => onDeleteVideo(video.id)}
              />
            ))}
        </div>
      )}
    </div>
  );
}