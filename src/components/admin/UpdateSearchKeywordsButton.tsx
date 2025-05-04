import React, { useState } from 'react';
import { checkSearchStatus } from '../../utils/runAllUpdates';

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

      // addProgress('Updating search keywords for all collections...');
      // await runAllUpdates();

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
        className="w-full text-lg font-bold transition-transform shadow-lg btn btn-success btn-lg hover:scale-105"
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
        <div className="p-4 mt-4 rounded-lg bg-base-200">
          <h3 className="mb-2 font-semibold">Progress:</h3>
          <ul className="space-y-1 text-sm">
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
        <div className="p-4 mt-4 border rounded-lg bg-error/10 border-error/20">
          <h3 className="mb-2 font-semibold text-error">Error Details:</h3>
          <p className="text-sm text-error">{error}</p>
        </div>
      )}
    </div>
  );
};

export default UpdateSearchKeywordsButton;
