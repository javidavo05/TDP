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
          async (decodedText) => {
            try {
              // Stop scanner before calling callback to avoid DOM errors
              await scanner.stop();
              setScanning(false);
              // Call callback after stopping
              onScanSuccess(decodedText);
            } catch (stopError) {
              // If stop fails, still call callback and try to clean up
              console.warn("Error stopping scanner:", stopError);
              setScanning(false);
              onScanSuccess(decodedText);
            }
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
        const currentScanner = scannerRef.current;
        // Use a timeout to ensure DOM is stable
        setTimeout(async () => {
          try {
            if (currentScanner && containerRef.current) {
              await currentScanner.stop();
            }
          } catch (err) {
            // Ignore cleanup errors
            console.warn("Error during scanner cleanup:", err);
          } finally {
            scannerRef.current = null;
          }
        }, 100);
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

