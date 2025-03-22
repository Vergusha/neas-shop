import React, { createRef, useState } from 'react';
import AvatarEditorLib from 'react-avatar-editor';
import { FaUndo, FaRedo, FaUpload } from 'react-icons/fa';

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

  const handleSave = () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas();
      onSave(canvas.toDataURL());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">Edit Avatar</h3>
        
        <div className="relative mb-6">
          <div className="dropzone border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary transition-colors">
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
            className="absolute bottom-2 right-2 btn btn-circle btn-sm btn-primary"
          >
            <FaUpload />
          </label>
        </div>

        <div className="space-y-4">
          {/* Zoom control */}
          <div>
            <label className="block text-sm font-medium mb-2">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={imageProperties.scale}
              onChange={handleZoom}
              className="range range-primary w-full"
            />
          </div>

          {/* Rotation controls */}
          <div>
            <label className="block text-sm font-medium mb-2">Rotate</label>
            <div className="flex gap-2">
              <button 
                onClick={() => handleRotate('left')}
                className="btn btn-outline btn-square"
              >
                <FaUndo />
              </button>
              <button 
                onClick={() => handleRotate('right')}
                className="btn btn-outline btn-square"
              >
                <FaRedo />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={onCancel} className="btn btn-ghost">
              Cancel
            </button>
            <button onClick={handleSave} className="btn btn-primary">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarEditor;

