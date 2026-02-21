import { useState } from "react";
import { AttachmentPreview } from "@/components/media/AttachmentPreview";
import { ImageModal } from "./post/ImageModal";
import { VideoModal } from "./post/VideoModal";
import { File as FileIcon, Download } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";

interface FilePreviewProps {
  file?: File | null;
  onRemove?: () => void;
  url?: string;
  type?: string;
}

export function FilePreview({ file, onRemove, url, type }: FilePreviewProps) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  // If file is provided (for PostCreator)
  if (file) {
    // Create a preview URL from the file
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
    
    return (
      <AttachmentPreview
        previews={[preview]}
        files={[file]}
        onRemove={() => onRemove && onRemove()}
        className="w-full"
        previewClassName="w-full h-48 object-cover"
      />
    );
  }

  // If url/type is provided (for PostContent)
  if (url) {
    const mediaType = type || 'file';
    console.log('Rendering media with URL:', url, 'Type:', mediaType);
    
    // For non-image types, we need to handle differently
    if (mediaType.startsWith('image') || mediaType === 'image') {
      return (
          <>
            <div className="relative flex justify-center">
              <OptimizedImage
                src={url}
                alt="Media"
                className="max-w-full max-h-[400px] object-contain rounded-lg cursor-zoom-in"
                onClick={() => setIsImageModalOpen(true)}
              />
            </div>
            <ImageModal 
              isOpen={isImageModalOpen} 
              onClose={() => setIsImageModalOpen(false)}
              imageUrl={url}
              altText="Media preview"
            />
          </>
      );
    } else if (mediaType.startsWith('video') || mediaType === 'video') {
      return (
        <>
          <div className="relative flex justify-center">
            <video
              src={url}
              controls
              className="max-w-full max-h-[400px] object-contain rounded-lg cursor-pointer"
              onClick={() => setIsVideoModalOpen(true)}
              onError={() => {
                // Silently handle video errors to reduce console spam
              }}
            />
          </div>
          <VideoModal 
            isOpen={isVideoModalOpen} 
            onClose={() => setIsVideoModalOpen(false)}
            videoUrl={url}
            altText="Video preview"
          />
        </>
      );
    } else if (mediaType.startsWith('audio') || mediaType === 'audio') {
      return (
        <div className="relative">
          <audio
            src={url}
            controls
            className="w-full"
            onError={() => {
              // Silently handle audio errors to reduce console spam
            }}
          />
        </div>
      );
    } else {
      // Generic file/document preview with download link
      const fileName = decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'archivo');
      return (
        <div className="w-full border border-border rounded-lg p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon className="h-5 w-5 text-primary" />
            <span className="text-sm truncate" title={fileName}>{fileName}</span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <Download className="h-4 w-4" />
            Descargar
          </a>
        </div>
      );
    }
  }
  
  return null;
}
