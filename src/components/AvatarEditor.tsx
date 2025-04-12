import React, { createRef, useState } from 'react';
import AvatarEditorLib from 'react-avatar-editor';
import { FaUndo, FaRedo, FaUpload } from 'react-icons/fa';
import { compressImageToBase64 } from '../utils/imageUtils';

interface AvatarEditorProps {
  initialImage: string;
  onSave: (imageData: string) => void;
  onCancel: () => void;
}

interface ImageProperties {
  image: string | File;
  position: { x: number; y: number };
  scale: number;
  rotate: number;
}

const AvatarEditor: React.FC<AvatarEditorProps> = ({ initialImage, onSave, onCancel }) => {
  const editorRef = createRef<AvatarEditorLib>();
  const [uploading, setUploading] = useState(false);
  const [isFileSelected, setIsFileSelected] = useState(false);
  const [imageProperties, setImageProperties] = useState<ImageProperties>({
    image: initialImage,
    position: { x: 0.5, y: 0.5 },
    scale: 1,
    rotate: 0
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageProperties(prev => ({
        ...prev,
        image: e.target.files![0]
      }));
      setIsFileSelected(true);
    }
  };

  const handleZoom = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageProperties(prev => ({
      ...prev,
      scale: parseFloat(e.target.value)
    }));
  };

  const handleRotate = (direction: 'left' | 'right') => {
    setImageProperties(prev => ({
      ...prev,
      rotate: direction === 'left' 
        ? (prev.rotate - 90) % 360 
        : (prev.rotate + 90) % 360
    }));
  };

  const handleSave = async () => {
    if (editorRef.current) {
      setUploading(true);
      try {
        const canvas = editorRef.current.getImageScaledToCanvas();
        // Сжимаем изображение до очень маленького размера
        const compressedImage = await compressImageToBase64(canvas, 20);
        
        // Проверяем размер сжатого изображения
        if (compressedImage.length > 240 * 1024) {
          throw new Error('Image is too large even after compression');
        }

        // Передаем в родительский компонент
        await onSave(compressedImage);
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Failed to process image. Please try a smaller image or lower quality.');
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
        <h3 className="text-xl font-bold mb-4 dark:text-gray-100">Edit Avatar</h3>
        
        <div className="relative mb-6">
          <div className="dropzone border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:border-[#003D2D] dark:hover:border-[#95c672] transition-colors">
            <AvatarEditorLib
              ref={editorRef}
              image={imageProperties.image}
              width={250}
              height={250}
              border={50}
              color={[200, 200, 200, 0.6]}
              scale={imageProperties.scale}
              rotate={imageProperties.rotate}
              position={imageProperties.position}
              onPositionChange={(position) => 
                setImageProperties(prev => ({ ...prev, position }))
              }
              className="mx-auto"
            />
            
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              id="avatar-upload"
            />
          </div>
          
          <label 
            htmlFor="avatar-upload"
            className="absolute bottom-2 right-2 btn btn-circle btn-sm bg-[#003D2D] hover:bg-[#005040] dark:bg-[#95c672] dark:hover:bg-[#7fb356] text-white dark:text-gray-900"
          >
            <FaUpload />
          </label>
        </div>

        <div className="space-y-4">
          {/* Zoom control */}
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={imageProperties.scale}
              onChange={handleZoom}
              className="range w-full"
            />
          </div>

          {/* Rotation controls */}
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Rotate</label>
            <div className="flex gap-2">
              <button 
                onClick={() => handleRotate('left')}
                className="btn btn-outline border-[#003D2D] hover:bg-[#003D2D] hover:border-[#003D2D] dark:border-[#95c672] dark:hover:bg-[#95c672] dark:hover:border-[#95c672] dark:text-[#95c672] dark:hover:text-gray-900"
              >
                <FaUndo />
              </button>
              <button 
                onClick={() => handleRotate('right')}
                className="btn btn-outline border-[#003D2D] hover:bg-[#003D2D] hover:border-[#003D2D] dark:border-[#95c672] dark:hover:bg-[#95c672] dark:hover:border-[#95c672] dark:text-[#95c672] dark:hover:text-gray-900"
              >
                <FaRedo />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 mt-6">
            <button 
              onClick={onCancel} 
              className="btn btn-ghost dark:text-gray-200"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={!isFileSelected || uploading}
              className={`w-full py-2 px-4 rounded-lg text-white ${
                isFileSelected 
                  ? 'bg-gradient-to-r from-[#003D2D] to-[#005040] hover:from-[#005040] hover:to-[#006050] dark:from-[#95c672] dark:to-[#7fb356] dark:hover:from-[#7fb356] dark:hover:to-[#6fa346] dark:text-gray-900' 
                  : 'bg-gray-400 dark:bg-gray-600'
              } transition-colors`}
            >
              {uploading ? 'Uploading...' : 'Save Avatar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarEditor;

