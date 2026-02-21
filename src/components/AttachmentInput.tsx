 
 import { Button } from "@/components/ui/button";
 import { ImageIcon, FileIcon, MusicIcon, VideoIcon } from "lucide-react";
 import { useRef, RefObject } from "react";
 
 export interface AttachmentInputProps {
   onFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
   onAttachmentChange?: (files: File[] | null) => void;
   isUploading?: boolean;
   
   type?: 'image' | 'video' | 'audio' | 'file';
   disabled?: boolean;
   showLabel?: boolean;
   buttonSize?: string;
   buttonVariant?: string;
   buttonClassName?: string;
   label?: string;
   accept?: string;
   fileInputRef?: RefObject<HTMLInputElement>;
 }
 
 export function AttachmentInput({
   onFileSelect,
   onAttachmentChange,
   isUploading = false,
   
   type = 'image',
   disabled = false,
   showLabel = false,
   buttonSize = "sm",
   buttonVariant = "ghost",
   buttonClassName = "",
   label,
   accept,
   fileInputRef: externalRef
 }: AttachmentInputProps) {
   const internalRef = useRef<HTMLInputElement>(null);
   const fileInputRef = externalRef || internalRef;
 
   const getIcon = () => {
     switch (type) {
       case 'image':
         return <ImageIcon className="h-4 w-4 text-blue-500" />;
       case 'video':
         return <VideoIcon className="h-4 w-4 text-red-500" />;
       case 'audio':
         return <MusicIcon className="h-4 w-4" />;
       case 'file':
         return <FileIcon className="h-4 w-4 text-orange-500" />;
       default:
         return <FileIcon className="h-4 w-4" />;
     }
   };
 
   const getAccept = () => {
     if (accept) return accept;
     
     switch (type) {
       case 'image':
         return 'image/*';
       case 'video':
         return 'video/*';
       case 'audio':
         return 'audio/*';
       case 'file':
         return '*/*';
       default:
         return 'image/*';
     }
   };
 
   const handleClick = () => {
     fileInputRef.current?.click();
   };
 
   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     const files = Array.from(e.target.files || []);
     
     // Call legacy onFileSelect if provided
     if (onFileSelect) {
       onFileSelect(e);
     }
     
     // Call new onAttachmentChange if provided
     if (onAttachmentChange) {
       onAttachmentChange(files.length > 0 ? files : null);
     }
   };
 
   const getLabel = () => {
     if (label) return label;
     
     switch (type) {
       case 'image':
         return 'Imagen';
       case 'video':
         return 'Vídeo';
       case 'audio':
         return 'Audio';
       case 'file':
         return 'Archivo';
       default:
         return 'Archivo';
     }
   };
 
   return (
     <>
       <Button 
         variant={buttonVariant as any} 
         size={buttonSize as any} 
         onClick={handleClick}
         disabled={disabled || isUploading}
         className={`flex items-center gap-1 touch-manipulation select-none active:scale-95 transition-transform ${buttonClassName}`}
       >
         {getIcon()}
         {showLabel && <span className="text-sm">{getLabel()}</span>}
         {isUploading && (
           <div className="flex items-center gap-1">
             <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
           </div>
         )}
       </Button>
       <input
         type="file"
         ref={fileInputRef}
         onChange={handleFileSelect}
         accept={getAccept()}
         className="hidden"
         multiple={type === 'image' || type === 'video'}
         capture={type === 'image' || type === 'video' ? 'environment' : undefined}
       />
     </>
   );
 }
