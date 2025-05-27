import React, { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, onClose }) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const codeReader = new BrowserMultiFormatReader();

    if (scannerRef.current) {
      codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result) => {
          if (result && isMounted) {
            onDetected(result.getText());
            controlsRef.current?.stop();
          }
        }
      ).then(controls => {
        controlsRef.current = controls;
      });
    }

    return () => {
      isMounted = false;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded shadow-lg">
        <h2 className="text-lg font-bold mb-2">Scan Barcode</h2>
        <div ref={scannerRef} style={{ width: 400, height: 300 }}>
          <video ref={videoRef} style={{ width: 400, height: 300 }} />
        </div>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded">Cancel</button>
      </div>
    </div>
  );
};

export default BarcodeScanner; 