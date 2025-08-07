import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { motion, AnimatePresence } from 'framer-motion';

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
  onManualEntry?: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, onClose, onManualEntry }) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{ 
    isMobile: boolean; 
    hasCamera: boolean; 
    isHttps: boolean;
  }>({ isMobile: false, hasCamera: false, isHttps: false });

  // Device detection
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    
    setDeviceInfo({
      isMobile,
      hasCamera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      isHttps
    });
  }, []);

  // Camera initialization with enhanced error handling
  useEffect(() => {
    if (!deviceInfo.isHttps) {
      setError('Camera access requires HTTPS. Please use a secure connection.');
      setIsLoading(false);
      return;
    }

    if (!deviceInfo.hasCamera) {
      setError('No camera detected on this device.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const codeReader = new BrowserMultiFormatReader();
    let initTimeout: NodeJS.Timeout;

    const initializeScanner = async () => {
      try {
        setIsLoading(true);
        
        // Proactively request camera permission
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (permError: any) {
          if (isMounted) {
            setIsLoading(false);
            if (permError.name === 'NotAllowedError') {
              setError('Camera permission denied. Please allow camera access and try again.');
            } else if (permError.name === 'NotFoundError') {
              setError('No camera found. Please ensure your device has a working camera.');
            } else {
              setError('Unable to access camera. Please check your device and browser settings.');
            }
            return;
          }
        }
        
        // Set timeout for initialization
        initTimeout = setTimeout(() => {
          if (isMounted) {
            setError('Camera initialization taking too long. Please check camera permissions.');
            setIsLoading(false);
          }
        }, 10000);

        const controls = await codeReader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (result && isMounted) {
              setScanAttempts(prev => prev + 1);
              onDetected(result.getText());
              controlsRef.current?.stop();
            }
          }
        );
        
        controlsRef.current = controls;
        
        if (isMounted) {
          clearTimeout(initTimeout);
          setIsLoading(false);
          setError(null);
        }
      } catch (err: any) {
        clearTimeout(initTimeout);
        
        if (isMounted) {
          setIsLoading(false);
          setScanAttempts(prev => prev + 1);
          
          // Enhanced error handling
          if (err.name === 'NotAllowedError') {
            setError('Camera permission denied. Please allow camera access in your browser settings.');
          } else if (err.name === 'NotFoundError') {
            setError('No camera found. Please ensure your device has a working camera.');
          } else if (err.name === 'NotReadableError') {
            setError('Camera is busy. Please close other apps using the camera and try again.');
          } else if (err.name === 'OverconstrainedError') {
            setError('Camera constraints not supported. Try a different device or browser.');
          } else if (err.name === 'SecurityError') {
            setError('Camera access blocked by security policy. Please check browser settings.');  
          } else {
            setError(`Camera error: ${err.message || 'Unknown error occurred'}`);
          }
        }
      }
    };

    if (scannerRef.current && deviceInfo.hasCamera && deviceInfo.isHttps) {
      initializeScanner();
    }

    return () => {
      isMounted = false;
      clearTimeout(initTimeout);
      controlsRef.current?.stop();
    };
  }, [deviceInfo]);

  // Improved retry mechanism
  const handleRetry = async () => {
    setError(null);
    setIsLoading(true);
    
    // Check permissions first
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
      if (permissionStatus.state === 'denied') {
        setError('Camera permission is permanently denied. Please enable camera access in your browser settings and refresh the page.');
        setIsLoading(false);
        return;
      }
    } catch (permErr) {
      console.warn('Could not check camera permissions:', permErr);
    }
    
    // Force re-initialization of camera
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    
    // Small delay before retry
    setTimeout(() => {
      setScanAttempts(0);
      // The useEffect will trigger re-initialization
    }, 1000);
  };

  // Manual barcode input
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim().length >= 8) { // Basic barcode length validation
      onDetected(manualBarcode.trim());
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2 sm:p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 p-4 sm:p-6 rounded-xl shadow-2xl w-full max-w-full sm:max-w-md mx-auto border border-gray-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-white">Scan Food Barcode</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] flex items-center justify-center"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Camera Scanner */}
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full aspect-square sm:aspect-[4/3] mb-4 rounded-lg bg-gray-800 flex items-center justify-center"
            >
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 sm:h-8 sm:w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <p className="text-gray-300 text-base sm:text-sm font-medium">Initializing camera...</p>
                <p className="text-gray-400 text-sm sm:text-xs mt-2">This may take a few seconds</p>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4"
            >
              <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-200 font-medium">Camera Error</p>
                </div>
                <p className="text-red-200 text-sm mb-3">{error}</p>
                <div className="flex gap-2">
                  {scanAttempts < 3 && (
                    <button
                      onClick={handleRetry}
                      className="px-3 py-2 sm:py-1 bg-red-600 hover:bg-red-700 text-white text-base sm:text-sm rounded transition-colors min-h-[44px] sm:min-h-[auto]"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    onClick={() => setShowManualInput(true)}
                    className="px-3 py-2 sm:py-1 bg-blue-600 hover:bg-blue-700 text-white text-base sm:text-sm rounded transition-colors min-h-[44px] sm:min-h-[auto]"
                  >
                    Enter Manually
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {!error && !isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              ref={scannerRef}
              className="relative w-full aspect-square sm:aspect-[4/3] mb-4 rounded-lg overflow-hidden bg-gray-800"
            >
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover rounded-lg"
                playsInline
                muted
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Corner markers - larger on mobile for better visibility */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-48 sm:h-24">
                  <div className="absolute top-0 left-0 w-12 h-12 sm:w-6 sm:h-6 border-t-4 border-l-4 sm:border-t-2 sm:border-l-2 border-blue-400"></div>
                  <div className="absolute top-0 right-0 w-12 h-12 sm:w-6 sm:h-6 border-t-4 border-r-4 sm:border-t-2 sm:border-r-2 border-blue-400"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-6 sm:h-6 border-b-4 border-l-4 sm:border-b-2 sm:border-l-2 border-blue-400"></div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 sm:w-6 sm:h-6 border-b-4 border-r-4 sm:border-b-2 sm:border-r-2 border-blue-400"></div>
                </div>
                
                {/* Scanning line animation - more prominent on mobile */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-48 sm:h-24">
                  <div className="absolute top-0 left-0 w-full h-1 sm:h-0.5 bg-blue-400 animate-pulse"></div>
                </div>
              </div>
              
              {/* Instructions overlay - larger text on mobile */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <div className="bg-black bg-opacity-70 rounded px-3 py-2 mx-4">
                  <p className="text-white text-sm sm:text-xs font-medium">Position barcode in the frame</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manual Input Modal */}
        <AnimatePresence>
          {showManualInput && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-600"
            >
              <h3 className="text-white font-medium mb-3">Enter Barcode Manually</h3>
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Enter barcode number..."
                  className="w-full px-3 py-3 sm:py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={manualBarcode.trim().length < 8}
                    className="flex-1 px-3 py-3 sm:py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors text-base sm:text-sm min-h-[44px] sm:min-h-[auto]"
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualInput(false)}
                    className="px-3 py-3 sm:py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-base sm:text-sm min-h-[44px] sm:min-h-[auto]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Device Info */}
        {deviceInfo.isMobile && (
          <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 mb-4">
            <p className="text-blue-200 text-sm text-center">
              💡 Tip: For better scanning, ensure good lighting and hold steady
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {!showManualInput && !error && (
            <button
              onClick={() => setShowManualInput(true)}
              className="w-full px-4 py-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-base sm:text-sm min-h-[44px] sm:min-h-[auto]"
            >
              Enter Barcode Manually
            </button>
          )}
          
          {onManualEntry && (
            <button
              onClick={onManualEntry}
              className="w-full px-4 py-3 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-base sm:text-sm min-h-[44px] sm:min-h-[auto]"
            >
              Add Food Manually Instead
            </button>
          )}
          
          <button 
            onClick={onClose} 
            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium text-base min-h-[44px]"
          >
            Close Scanner
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BarcodeScanner; 