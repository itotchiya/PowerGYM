import { useState, useRef, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

/**
 * ImageCropper - Crops images to a fixed aspect ratio for CNI documents
 * Uses ID card aspect ratio (3.375 x 2.125 inches = ~1.59:1)
 */
export function ImageCropper({ open, onClose, imageSrc, onCropComplete, aspectRatio = 1.59 }) {
    const [crop, setCrop] = useState({
        unit: '%',
        width: 90,
        x: 5,
        y: 5,
        aspect: aspectRatio,
    });
    const [completedCrop, setCompletedCrop] = useState(null);
    const imgRef = useRef(null);

    const onImageLoad = useCallback((e) => {
        imgRef.current = e.currentTarget;

        // Set initial crop to center with aspect ratio
        const { naturalWidth, naturalHeight } = e.currentTarget;
        const aspectHeight = naturalWidth / aspectRatio;

        let width = 90;
        let height = (width * naturalHeight / naturalWidth) / aspectRatio * 100;

        if (height > 90) {
            height = 90;
            width = height * aspectRatio * naturalWidth / naturalHeight;
        }

        setCrop({
            unit: '%',
            width: width,
            height: height,
            x: (100 - width) / 2,
            y: (100 - height) / 2,
            aspect: aspectRatio,
        });
    }, [aspectRatio]);

    const getCroppedImg = useCallback(() => {
        if (!completedCrop || !imgRef.current) return null;

        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        canvas.width = completedCrop.width * scaleX;
        canvas.height = completedCrop.height * scaleY;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            canvas.width,
            canvas.height
        );

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const file = new File([blob], 'cropped-cni.jpg', { type: 'image/jpeg' });
                        resolve(file);
                    } else {
                        resolve(null);
                    }
                },
                'image/jpeg',
                0.9
            );
        });
    }, [completedCrop]);

    const handleCropConfirm = async () => {
        const croppedFile = await getCroppedImg();
        if (croppedFile) {
            onCropComplete(croppedFile);
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Crop CNI Document</DialogTitle>
                    <DialogDescription>
                        Adjust the crop area to fit the ID card. Drag to reposition and resize.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-center py-4 max-h-[60vh] overflow-auto">
                    {imageSrc && (
                        <ReactCrop
                            crop={crop}
                            onChange={(c) => setCrop(c)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={aspectRatio}
                            className="max-w-full"
                        >
                            <img
                                ref={imgRef}
                                src={imageSrc}
                                alt="Crop preview"
                                onLoad={onImageLoad}
                                style={{ maxHeight: '50vh', maxWidth: '100%' }}
                            />
                        </ReactCrop>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleCropConfirm} disabled={!completedCrop}>
                        Confirm Crop
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
