import imageCompression from 'browser-image-compression';

/**
 * Compress an avatar image for optimal storage and loading
 * @param {File|Blob} file - The image file to compress
 * @param {number} maxSizeKB - Maximum size in KB (default: 300)
 * @param {number} maxDimension - Maximum width/height in pixels (default: 400)
 * @returns {Promise<Blob>} - The compressed image blob
 */
export const compressAvatar = async (file, maxSizeKB = 300, maxDimension = 400) => {
    const options = {
        maxSizeMB: maxSizeKB / 1024,
        maxWidthOrHeight: maxDimension,
        useWebWorker: true,
        fileType: 'image/jpeg',
    };

    try {
        const compressedFile = await imageCompression(file, options);
        console.log(`Avatar compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`);
        return compressedFile;
    } catch (error) {
        console.error('Avatar compression failed:', error);
        return file; // Return original if compression fails
    }
};

/**
 * Compress a general image (like CNI documents)
 * @param {File|Blob} file - The image file to compress
 * @param {number} maxSizeMB - Maximum size in MB (default: 0.8)
 * @param {number} maxDimension - Maximum width/height in pixels (default: 1920)
 * @returns {Promise<Blob>} - The compressed image blob
 */
export const compressImage = async (file, maxSizeMB = 0.8, maxDimension = 1920) => {
    const options = {
        maxSizeMB,
        maxWidthOrHeight: maxDimension,
        useWebWorker: true,
    };

    try {
        const compressedFile = await imageCompression(file, options);
        console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
        return compressedFile;
    } catch (error) {
        console.error('Image compression failed:', error);
        return file; // Return original if compression fails
    }
};
