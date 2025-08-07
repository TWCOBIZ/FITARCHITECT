import React, { useEffect, useState } from 'react';
import { exerciseDbService } from '../../services/exerciseDbService';
import { logger } from '../../utils/logger';

interface DiagnosticInfo {
  apiKeyConfigured: boolean;
  apiKeyLength: number;
  serviceAvailable: boolean;
  cacheSize: { gifs: number; exercises: number };
  fallbackGifsAvailable: number;
  recommendations: string[];
}

const ExerciseServiceDiagnostic: React.FC = () => {
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development mode
    if (import.meta.env.DEV) {
      const info = exerciseDbService.getDiagnosticInfo();
      setDiagnosticInfo(info);
      
      // Show warning if API key is not configured
      if (!info.apiKeyConfigured) {
        setIsVisible(true);
        logger.workout.warn('ExerciseDB API key not configured - showing diagnostic banner');
        
        // STANDARD: Auto-dismiss after 3 seconds
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    }
  }, []);

  if (!isVisible || !diagnosticInfo) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-yellow-900/90 backdrop-blur-sm border border-yellow-700 rounded-lg p-4 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-yellow-300 font-semibold mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Exercise GIFs Not Configured
          </h3>
          
          <div className="text-yellow-100 text-sm space-y-1">
            <p>ExerciseDB API key is not set. Exercise GIFs will not be available.</p>
            <p className="font-mono bg-black/30 px-2 py-1 rounded text-xs">
              Add VITE_EXERCISEDB_API_KEY to your .env file
            </p>
          </div>

          <div className="mt-3 text-xs text-yellow-300/80">
            <p>Cache: {diagnosticInfo.cacheSize.gifs} GIFs, {diagnosticInfo.cacheSize.exercises} exercises</p>
            <p>Fallback GIFs available: {diagnosticInfo.fallbackGifsAvailable}</p>
          </div>
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className="ml-4 text-yellow-300 hover:text-yellow-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ExerciseServiceDiagnostic;