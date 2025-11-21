"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  fps?: number;
  qrbox?: { width: number; height: number };
}

/**
 * Helper function to stop all active video tracks
 * This ensures the camera is completely turned off
 */
function stopAllVideoTracks() {
  try {
    // Stop any tracks from active video elements
    const videoElements = document.querySelectorAll("video");
    videoElements.forEach((video) => {
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          if (track.kind === "video" && track.readyState === "live") {
            track.stop();
          }
        });
        video.srcObject = null;
      }
    });
  } catch (err) {
    // Ignore errors during cleanup
  }
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
  const isInitializedRef = useRef(false);
  const hasScannedRef = useRef(false);

  // Use refs for callbacks to avoid re-renders
  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanErrorRef = useRef(onScanError);

  // Update refs when callbacks change
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
    onScanErrorRef.current = onScanError;
  }, [onScanSuccess, onScanError]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Prevent multiple initializations
    if (isInitializedRef.current) {
      return;
    }

    // Check if scanner is already running
    if (scannerRef.current) {
      return;
    }

    isInitializedRef.current = true;
    const scanner = new Html5Qrcode(containerRef.current.id);
    let isScanning = false;

    const startScanning = async () => {
      // Prevent multiple starts
      if (isScanning) return;
      isScanning = true;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps,
            qrbox,
          },
          async (decodedText) => {
            // Prevent processing the same QR code multiple times
            if (hasScannedRef.current) {
              return;
            }
            hasScannedRef.current = true;

            try {
              // Stop scanner before calling callback to avoid DOM errors
              await scanner.stop();
              stopAllVideoTracks();
              setScanning(false);
              isScanning = false;
              scannerRef.current = null;
              isInitializedRef.current = false;
              // Call callback after stopping
              onScanSuccessRef.current(decodedText);
            } catch (stopError) {
              // If stop fails, still call callback and try to clean up
              console.warn("Error stopping scanner:", stopError);
              stopAllVideoTracks();
              setScanning(false);
              isScanning = false;
              scannerRef.current = null;
              isInitializedRef.current = false;
              onScanSuccessRef.current(decodedText);
            }
          },
          (errorMessage) => {
            // Only log errors, don't call callback for every scan error
            // "NotFoundException" is normal during scanning and should be ignored
            if (errorMessage && !errorMessage.includes("NotFoundException")) {
              console.warn("QR Scanner error:", errorMessage);
            }
          }
        );
        scannerRef.current = scanner;
        setScanning(true);
        setError(null);
      } catch (err) {
        isScanning = false;
        isInitializedRef.current = false;
        const errorMessage = (err as Error).message;
        setError(errorMessage);
        if (onScanErrorRef.current) {
          onScanErrorRef.current(errorMessage);
        }
      }
    };

    startScanning();

    // Function to stop scanner and camera
    const stopScanner = async () => {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (err) {
          // Ignore errors - scanner might already be stopped
        }
        scannerRef.current = null;
      }
      // Always stop video tracks to ensure camera is off
      stopAllVideoTracks();
      setScanning(false);
      isScanning = false;
      isInitializedRef.current = false;
      hasScannedRef.current = false;
    };

    // Handle page unload (closing tab/window)
    const handleBeforeUnload = () => {
      stopScanner();
    };

    // Handle page visibility change (tab hidden/visible)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopScanner();
      }
    };

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup function
    return () => {
      // Remove event listeners
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      // Stop scanner immediately
      stopScanner();
    };
  }, [fps, qrbox]); // Removed callbacks from dependencies to prevent re-renders

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
