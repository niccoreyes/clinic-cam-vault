import React from 'react';
import { Play, Trash2, Calendar, Clock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface VideoThumbnailProps {
  id: string;
  thumbnail: string;
  patientName: string;
  duration: number;
  createdAt: Date;
  hidden?: boolean;
  onPlay: () => void;
  onDelete: () => void;
  onToggleHide?: () => void;
}

export function VideoThumbnail({
  id,
  thumbnail,
  patientName,
  duration,
  createdAt,
  hidden = false,
  onPlay,
  onDelete,
  onToggleHide,
}: VideoThumbnailProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-3 transition-all duration-200 hover:shadow-md">
      <div className="relative aspect-video overflow-hidden rounded-md">
        <img
          src={thumbnail}
          alt={`Video thumbnail for ${patientName}`}
          className="video-thumbnail"
        />
        
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            onClick={onPlay}
            size="sm"
            className="bg-white/90 text-black hover:bg-white"
          >
            <Play className="mr-1 h-4 w-4" />
            Play
          </Button>
        </div>
        
        <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
          {formatDuration(duration)}
        </div>
      </div>
      
      <div className="mt-3 space-y-2">
        <h4 className="font-medium text-foreground text-sm line-clamp-1">
          {hidden ? 'Hidden Patient' : (patientName || 'Unnamed Patient')}
        </h4>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="mr-1 h-3 w-3" />
            {formatDate(createdAt)}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Toggle hide/show patient name */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={onToggleHide}
              aria-label={hidden ? 'Show patient name' : 'Hide patient name'}
              title={hidden ? 'Show patient name' : 'Hide patient name'}
            >
              {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Video</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this video recording? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
