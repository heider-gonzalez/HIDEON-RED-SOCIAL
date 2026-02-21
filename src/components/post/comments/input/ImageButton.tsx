
import { AttachmentInput } from "@/components/media/AttachmentInput";

interface ImageButtonProps {
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export function ImageButton({ onImageChange, fileInputRef }: ImageButtonProps) {
  return (
    <AttachmentInput
      type="image"
      fileInputRef={fileInputRef}
      onAttachmentChange={(files) => {
        if (files && files.length > 0 && onImageChange) {
          // Instead of creating our own synthetic event which would be complex and error-prone,
          // we can create a new File input element, set its files property, and dispatch a change event
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          
          // Use the DataTransfer API to set files
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(files[0]);
          fileInput.files = dataTransfer.files;
          
          // Create a proper React ChangeEvent
          const nativeEvent = new Event('change', { bubbles: true });
          const reactChangeEvent = {
            nativeEvent,
            currentTarget: fileInput,
            target: fileInput,
            bubbles: nativeEvent.bubbles,
            cancelable: nativeEvent.cancelable,
            defaultPrevented: nativeEvent.defaultPrevented,
            eventPhase: nativeEvent.eventPhase,
            isTrusted: nativeEvent.isTrusted,
            preventDefault: () => nativeEvent.preventDefault(),
            isDefaultPrevented: () => nativeEvent.defaultPrevented,
            stopPropagation: () => nativeEvent.stopPropagation(),
            isPropagationStopped: () => false,
            persist: () => {},
            timeStamp: nativeEvent.timeStamp,
            type: nativeEvent.type
          } as unknown as React.ChangeEvent<HTMLInputElement>;
          
          // Pass the event to the handler
          onImageChange(reactChangeEvent);
        }
      }}
      showLabel={true}
      buttonSize="sm"
      buttonClassName="text-blue-500"
      label="Imagen/Video"
      accept="image/*,video/*"
    />
  );
}
