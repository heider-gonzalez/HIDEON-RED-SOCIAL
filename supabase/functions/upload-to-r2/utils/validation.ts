export interface UploadRequest {
  fileName: string;
  contentType: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateUploadRequest(body: any): { data: UploadRequest; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  const fileName = String(body?.fileName || '').trim();
  const contentType = String(body?.contentType || '').trim();

  if (!fileName) {
    errors.push({
      field: 'fileName',
      message: 'File name is required'
    });
  }

  if (!contentType) {
    errors.push({
      field: 'contentType',
      message: 'Content type is required'
    });
  }

  if (!fileName.match(/\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|ogg)$/i)) {
    errors.push({
      field: 'fileName',
      message: 'Invalid file type. Allowed types: jpg, jpeg, png, gif, webp, mp4, webm, mov, ogg'
    });
  }

  if (fileName.length > 255) {
    errors.push({
      field: 'fileName',
      message: 'File name too long (max 255 characters)'
    });
  }

  if (fileName.length > 0 && fileName[0] === '/') {
    errors.push({
      field: 'fileName',
      message: 'File name cannot start with /'
    });
  }

  return {
    data: { fileName, contentType },
    errors
  };
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/^\/+/, '') // Remove leading slashes
    .replace(/[^a-zA-Z0-9._-]/g, '') // Remove invalid characters
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .substring(0, 100); // Limit length
}
