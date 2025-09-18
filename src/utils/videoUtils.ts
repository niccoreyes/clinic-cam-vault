export async function generateVideoThumbnail(videoBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      
      // Seek to a safe position
      video.currentTime = Math.min(0.5, video.duration * 0.1);
    };

    video.onseeked = () => {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        
        // Clean up
        URL.revokeObjectURL(video.src);
        
        resolve(thumbnail);
      } catch (err) {
        // Fallback: create a simple colored rectangle
        ctx.fillStyle = 'hsl(var(--medical))';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Video', canvas.width / 2, canvas.height / 2);
        
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        URL.revokeObjectURL(video.src);
        resolve(thumbnail);
      }
    };

    video.onerror = () => {
      // Fallback: create a simple colored rectangle
      const fallbackCanvas = document.createElement('canvas');
      const fallbackCtx = fallbackCanvas.getContext('2d');
      if (fallbackCtx) {
        fallbackCanvas.width = 320;
        fallbackCanvas.height = 240;
        fallbackCtx.fillStyle = 'hsl(var(--medical))';
        fallbackCtx.fillRect(0, 0, 320, 240);
        fallbackCtx.fillStyle = 'white';
        fallbackCtx.font = '20px sans-serif';
        fallbackCtx.textAlign = 'center';
        fallbackCtx.fillText('Video', 160, 120);
        
        const thumbnail = fallbackCanvas.toDataURL('image/jpeg', 0.8);
        URL.revokeObjectURL(video.src);
        resolve(thumbnail);
      } else {
        reject(new Error('Failed to create fallback thumbnail'));
      }
    };

    video.src = URL.createObjectURL(videoBlob);
    video.load();
  });
}

// Generate next patient number
export function getNextPatientNumber(existingVideos: any[]): string {
  const patientNumbers = existingVideos
    .map(video => {
      const match = video.patientName.match(/^Patient #(\d+)/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(num => num > 0);
  
  const maxNumber = patientNumbers.length > 0 ? Math.max(...patientNumbers) : 0;
  return `Patient #${maxNumber + 1}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}