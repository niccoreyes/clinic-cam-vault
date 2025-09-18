export async function generateVideoThumbnail(videoBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      video.currentTime = Math.min(1, video.duration * 0.1); // Seek to 10% or 1 second
    };

    video.onseeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
      
      // Clean up
      URL.revokeObjectURL(video.src);
      
      resolve(thumbnail);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video for thumbnail generation'));
    };

    video.src = URL.createObjectURL(videoBlob);
    video.load();
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}