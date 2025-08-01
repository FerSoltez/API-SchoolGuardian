declare module 'multer-storage-cloudinary' {
  import { Request } from 'express';
  import { StorageEngine } from 'multer';
  import { v2 as cloudinary } from 'cloudinary';

  interface CloudinaryStorageOptions {
    cloudinary: typeof cloudinary;
    params?: {
      folder?: string;
      format?: string | ((req: Request, file: Express.Multer.File) => string | Promise<string>);
      public_id?: string | ((req: Request, file: Express.Multer.File) => string);
      transformation?: any;
      allowed_formats?: string[];
      [key: string]: any;
    };
  }

  export class CloudinaryStorage implements StorageEngine {
    constructor(options: CloudinaryStorageOptions);
    _handleFile(req: Request, file: Express.Multer.File, cb: (error?: any, info?: any) => void): void;
    _removeFile(req: Request, file: Express.Multer.File, cb: (error: Error | null) => void): void;
  }
}
