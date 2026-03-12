import { Injectable } from '@nestjs/common';
import { SazedStorage } from './common/lib/Disk/SazedStorage';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello world';
  }

  async test(image: Express.Multer.File) {
    try {
      const { originalname: fileName, mimetype, size, buffer: fileBuffer } = image;

      await SazedStorage.put(fileName, fileBuffer);

      return {
        success: true,
        message: 'Image uploaded successfully',
        data: {
          fileName,
          mimeType: mimetype,
          size,
          driver: SazedStorage.getConfig()?.driver ?? 'unknown',
        },
        url: SazedStorage.url(fileName),
      };
    } catch (error) {
      const driver = SazedStorage.getConfig()?.driver ?? 'unknown';
      const isNetworkError =
        (error as any)?.code === 'NetworkingError' ||
        String(error).includes('NetworkingError');

      throw new Error(
        isNetworkError
          ? `Storage connection failed: the "${driver}" driver is unreachable. ` +
            `Verify your storage service is running and your environment variables are correct.`
          : `Failed to upload image: ${(error as Error)?.message ?? error}`,
      );
    }
  }
}
