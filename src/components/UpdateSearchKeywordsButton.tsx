import React, { useState } from 'react';
import { runAllUpdates, checkSearchStatus } from '../utils/runAllUpdates';

const UpdateSearchKeywordsButton: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string[]>([]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    setError(null);
    setStatus('Starting maintenance...');
    setProgress([]);

    try {
      // Add progress message
      const addProgress = (message: string) => {
        setProgress(prev => [...prev, message]);
      };

      addProgress('Checking current database status...');
      await checkSearchStatus();

      addProgress('Updating search keywords for all collections...');
      await runAllUpdates();

      addProgress('Verifying database updates...');
      await checkSearchStatus();

      setStatus('✅ All updates completed successfully!');
    } catch (err) {
      console.error('Error during maintenance:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStatus('❌ Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleUpdate}
        disabled={isUpdating}
        className="btn btn-success btn-lg w-full text-lg font-bold shadow-lg hover:scale-105 transition-transform"
      >
        {isUpdating ? (
          <>
            <span className="loading loading-spinner loading-md"></span>
            Running Database Update...
          </>
        ) : (
          'UPDATE DATABASE'
        )}
      </button>

      {/* Progress display */}
      {progress.length > 0 && (
        <div className="mt-4 bg-base-200 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Progress:</h3>
          <ul className="text-sm space-y-1">
            {progress.map((message, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="text-success">✓</span>
                {message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Status message */}
      {status && (
        <div className={`text-sm ${error ? 'text-error' : 'text-success'} font-medium`}>
          {status}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-4 p-4 bg-error/10 border border-error/20 rounded-lg">
          <h3 className="text-error font-semibold mb-2">Error Details:</h3>
          <p className="text-sm text-error">{error}</p>
        </div>
      )}
    </div>
  );
};

export default UpdateSearchKeywordsButton;
