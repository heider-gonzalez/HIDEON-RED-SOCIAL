// Type definitions for Deno environment
declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
}

// Type definitions for s3_lite_client
declare module "https://deno.land/x/s3_lite_client@0.7.0/mod.ts" {
  export class S3Client {
    constructor(config: {
      endPoint: string;
      region: string;
      accessKey: string;
      secretKey: string;
      bucket: string;
      useSSL: boolean;
    });
    
    getPresignedUrl(
      method: string,
      key: string,
      options?: { expirySeconds?: number }
    ): Promise<string>;
  }
}
