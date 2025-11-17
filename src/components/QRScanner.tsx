"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  fps?: number;
  qrbox?: { width: number; height: number };
}

export function QRScanner({
  onScanSuccess,
  onScanError,
  fps = 10,
  qrbox = { width: 250, height: 250 },
}: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scanner = new Html5Qrcode(containerRef.current.id);

    const startScanning = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps,
            qrbox,
          },
          (decodedText) => {
            onScanSuccess(decodedText);
            setScanning(false);
            scanner.stop();
          },
          (errorMessage) => {
            if (onScanError) {
              onScanError(errorMessage);
            }
          }
        );
        scannerRef.current = scanner;
        setScanning(true);
        setError(null);
      } catch (err) {
        const errorMessage = (err as Error).message;
        setError(errorMessage);
        if (onScanError) {
          onScanError(errorMessage);
        }
      }
    };

    startScanning();

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current = null;
          })
          .catch(() => {
            // Ignore stop errors
          });
      }
    };
  }, [fps, qrbox, onScanSuccess, onScanError]);

  return (
    <div className="w-full">
      <div
        id="qr-reader"
        ref={containerRef}
        className="w-full max-w-md mx-auto"
      />
      {error && (
        <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded">
          {error}
        </div>
      )}
      {scanning && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Escaneando código QR...
        </div>
      )}
    </div>
  );
}

