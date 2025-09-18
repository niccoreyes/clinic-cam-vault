import React from 'react';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CameraSelectorProps {
  cameras: MediaDeviceInfo[];
  selectedCameraId: string | null;
  onSwitchCamera: (deviceId: string) => void;
  disabled?: boolean;
}

export function CameraSelector({ cameras, selectedCameraId, onSwitchCamera, disabled }: CameraSelectorProps) {
  if (cameras.length <= 1) return null;

  const selectedCamera = cameras.find(camera => camera.deviceId === selectedCameraId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Camera className="h-4 w-4 mr-2" />
          {selectedCamera?.label || 'Select Camera'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {cameras.map((camera) => (
          <DropdownMenuItem
            key={camera.deviceId}
            onClick={() => onSwitchCamera(camera.deviceId)}
            className={selectedCameraId === camera.deviceId ? 'bg-accent' : ''}
          >
            <Camera className="h-4 w-4 mr-2" />
            {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}