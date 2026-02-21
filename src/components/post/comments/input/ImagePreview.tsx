
import { AttachmentPreview } from "@/components/media/AttachmentPreview";

interface ImagePreviewProps {
  imagePreview: string | null;
  onRemoveImage: () => void;
}

export function ImagePreview({ imagePreview, onRemoveImage }: ImagePreviewProps) {
  if (!imagePreview) return null;
  
  // Create a placeholder file object since we don't have the original file here
  const imageFile = new File([], "preview.jpg", { type: "image/jpeg" });
  
  return (
    <AttachmentPreview
      previews={[imagePreview]}
      files={[imageFile]}
      onRemove={() => onRemoveImage()}
    />
  );
}
