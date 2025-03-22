export const compressImageToBase64 = (
  canvas: HTMLCanvasElement,
  maxSizeKB: number = 20 // Уменьшаем максимальный размер до 20KB
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const compress = (canvas: HTMLCanvasElement, targetSize: number): string => {
      let quality = 0.8;
      let result: string;
      let currentSize: number;
      
      // Уменьшаем размер canvas
      const scaleCanvas = (scale: number) => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width * scale;
        tempCanvas.height = canvas.height * scale;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        return tempCanvas;
      };

      // Начинаем с масштабирования, если изображение слишком большое
      let scaledCanvas = canvas;
      if (canvas.width > 300 || canvas.height > 300) {
        const scale = Math.min(300 / canvas.width, 300 / canvas.height);
        scaledCanvas = scaleCanvas(scale);
      }

      do {
        result = scaledCanvas.toDataURL('image/jpeg', quality);
        currentSize = result.length;
        quality *= 0.9;
      } while (currentSize > targetSize * 1024 && quality > 0.1);

      return result;
    };

    try {
      const result = compress(canvas, maxSizeKB);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};
