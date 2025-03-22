import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, RotateCw, Upload, Save } from 'lucide-react';

interface AvatarEditorProps {
  initialImage: string;
  onSave: (imageData: string) => void;
  onCancel: () => void;
}

interface ImageProperties {
  originalImage: string | File | null;
  croppedImage: string | null;
  position: { x: number; y: number };
  scale: number;
  rotate: number;
}

const AvatarEditor: React.FC<AvatarEditorProps> = ({ initialImage, onSave, onCancel }) => {
  const [imageProperties, setImageProperties] = useState<ImageProperties>({
    originalImage: initialImage || null,
    croppedImage: null,
    position: { x: 0.5, y: 0.5 },
    scale: 1,
    rotate: 0
  });

  const { originalImage, croppedImage, position, scale, rotate } = imageProperties;
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Load the initial image
  useEffect(() => {
    if (initialImage) {
      setImageProperties(prev => ({
        ...prev,
        originalImage: initialImage
      }));
    }
  }, [initialImage]);
  
  // Create and store image reference when image changes
  useEffect(() => {
    if (!originalImage) return;
    
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      renderCanvas();
    };
    
    if (typeof originalImage === 'string') {
      img.src = originalImage;
    } else {
      img.src = URL.createObjectURL(originalImage);
    }
    
    return () => {
      if (typeof originalImage !== 'string') {
        URL.revokeObjectURL(img.src);
      }
    };
  }, [originalImage]);
  
  // Re-render canvas when properties change
  useEffect(() => {
    renderCanvas();
  }, [scale, rotate, position]);
  
  const renderCanvas = () => {
    if (!canvasRef.current || !imageRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    if (!ctx) return;
    
    // Set canvas size to match container
    const containerSize = Math.min(containerRef.current.clientWidth, 250);
    canvas.width = containerSize;
    canvas.height = containerSize;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create circular clipping path
    ctx.save();
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2);
    ctx.clip();
    
    // Fill with background color
    ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate center of canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Translate to center of canvas
    ctx.translate(centerX, centerY);
    
    // Rotate around center
    ctx.rotate((rotate * Math.PI) / 180);
    
    // Calculate scaled dimensions
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    
    // Calculate position based on x,y (0-1 range)
    const x = -scaledWidth * position.x;
    const y = -scaledHeight * position.y;
    
    // Draw the image
    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
    
    // Restore context
    ctx.restore();
  };
  
  function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setImageProperties(prevState => ({
        ...prevState,
        originalImage: file,
        croppedImage: null
      }));
    }
  }
  
  function handleDragOver(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
  }
  
  function handleAdd(e: React.ChangeEvent<HTMLInputElement>): void {
    if (e.target.files && e.target.files[0]) {
      setImageProperties(prevState => ({
        ...prevState,
        originalImage: e.target.files![0],
        croppedImage: null
      }));
    }
  }
  
  function handleZoom(e: React.ChangeEvent<HTMLInputElement>): void {
    const scale = +e.target.value;
    setImageProperties(prevState => ({ ...prevState, scale }));
  }
  
  function handleRotate(direction: "left" | "right"): void {
    setImageProperties(prevState => ({
      ...prevState,
      rotate:
        direction === "left"
          ? (prevState.rotate - 90) % 360
          : (prevState.rotate + 90) % 360
    }));
  }
  
  // Mouse and touch event handlers for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    e.preventDefault();
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const deltaX = (e.clientX - dragStart.x) / (containerRef.current?.clientWidth || 250) / scale;
    const deltaY = (e.clientY - dragStart.y) / (containerRef.current?.clientHeight || 250) / scale;
    
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    
    setImageProperties(prevState => ({
      ...prevState,
      position: {
        x: Math.max(0, Math.min(1, prevState.position.x - deltaX)),
        y: Math.max(0, Math.min(1, prevState.position.y - deltaY))
      }
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const getCroppingRect = (): { x: number; y: number; width: number; height: number } => {
    // This is a simplified version - in a real implementation this would calculate 
    // the actual cropping rectangle based on position, scale, and rotation
    return {
      x: position.x,
      y: position.y,
      width: 1 / scale,
      height: 1 / scale
    };
  };
  
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canvasRef.current) return;
    
    setIsProcessing(true);
    
    try {
      // Get the cropping rectangle data for debugging
      const croppingRect = getCroppingRect();
      console.log('Cropping rect:', croppingRect);
      
      // Get the canvas with the cropped image
      const canvas = canvasRef.current;
      const imageData = canvas.toDataURL('image/png');
      
      // Update cropped image in state
      setImageProperties(prevState => ({
        ...prevState,
        croppedImage: imageData
      }));
      
      // Call the onSave callback
      onSave(imageData);
    } catch (error) {
      console.error('Error saving avatar:', error);
      alert('Failed to save avatar. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Edit Avatar</h2>
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Left section - Editor */}
          <div className="flex-1">
            <div className="avatar-section">
              <p className="mb-2 text-gray-600">Drag and Drop an Image:</p>
              
              <div 
                ref={containerRef}
                className="dropzone border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 cursor-move max-w-xs mx-auto"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Canvas for rendering the image */}
                <canvas 
                  ref={canvasRef} 
                  className="rounded-full mx-auto"
                  width={250}
                  height={250}
                ></canvas>
              </div>
              
              <form className="mt-6" onSubmit={handleSave}>
                <div className="mb-4">
                  <label className="btn btn-primary w-full flex justify-center items-center gap-2">
                    <Upload size={18} /> Upload
                    <input
                      type="file"
                      onChange={handleAdd}
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zoom
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={scale}
                    onChange={handleZoom}
                    className="range range-sm w-full"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rotate
                  </label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => handleRotate('left')}
                      className="btn btn-sm flex-1"
                    >
                      <RotateCcw size={16} className="mr-1" /> Left
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleRotate('right')}
                      className="btn btn-sm flex-1"
                    >
                      <RotateCw size={16} className="mr-1" /> Right
                    </button>
                  </div>
                </div>
                
                <button 
                  type="submit"
                  className="mt-6 btn btn-primary w-full"
                  disabled={isProcessing || !originalImage}
                >
                  {isProcessing ? (
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                  ) : (
                    <Save size={18} className="mr-2" />
                  )}
                  Crop / Save
                </button>
              </form>
            </div>
          </div>
          
          {/* Right section - Preview & Info */}
          <div className="flex-1">
            <ul className="space-y-2 mb-6">
              <li className="flex justify-between">
                <span className="font-semibold">Image:</span> 
                <span>{typeof originalImage === 'object' && originalImage ? originalImage.name : String(originalImage).substring(0, 20) + '...'}</span>
              </li>
              <li className="flex justify-between">
                <span className="font-semibold">Zoom:</span> 
                <span>{scale.toFixed(2)}x</span>
              </li>
              <li className="flex justify-between">
                <span className="font-semibold">Rotate:</span> 
                <span>{rotate}°</span>
              </li>
              <li className="flex justify-between">
                <span className="font-semibold">Position X:</span> 
                <span>{position.x.toFixed(5)}</span>
              </li>
              <li className="flex justify-between">
                <span className="font-semibold">Position Y:</span> 
                <span>{position.y.toFixed(5)}</span>
              </li>
            </ul>
            
            {croppedImage && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Cropped Image:</h3>
                <div className="w-48 h-48 mx-auto border-4 border-primary rounded-full overflow-hidden">
                  <img 
                    src={croppedImage} 
                    alt="Cropped preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            
            <div className="mt-8 p-3 bg-blue-50 text-blue-700 rounded text-sm">
              <h3 className="font-semibold mb-2">How to use:</h3>
              <p>• Drag on the image to position it</p>
              <p>• Use zoom slider to resize the image</p>
              <p>• Rotate buttons turn the image 90 degrees</p>
              <p>• Click "Crop / Save" when you're happy with the result</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarEditor;

