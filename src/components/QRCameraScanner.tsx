import React, { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import jsQR from "jsqr";

interface QRCameraScannerProps {
  onScanSuccess: (data: string) => void;
  onClose: () => void;
  activeJobLocation?: string;
}

export default function QRCameraScanner({
  onScanSuccess,
  onClose,
  activeJobLocation,
}: QRCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // Play a native, elegant audio synthesizer beep to give real-time acoustic feedback upon successful scan
  const playSuccessBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // high pure A5 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio feedback error:", e);
    }
  };

  const startCamera = async () => {
    // Clean up any existing stream before starting a new one
    stopCamera();

    try {
      setCameraError(null);
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video is playing
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        
        // Start decoding frame loop
        requestRef.current = requestAnimationFrame(tick);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setHasPermission(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera access denied. Please grant camera permissions in your browser address bar.");
      } else {
        setCameraError(`Could not access camera: ${err.message || "Unknown error"}. Try switching cameras.`);
      }
    }
  };

  const stopCamera = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // The rendering frame tick
  const tick = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || scanned) {
      requestRef.current = requestAnimationFrame(tick);
      return;
    }

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        // Set canvas boundaries to match the incoming video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw active video frame into the canvas buffer
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Fetch image pixels to analyze QR signature
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          setScanned(true);
          playSuccessBeep();
          stopCamera();
          onScanSuccess(code.data);
          return; // Stop the tick
        }
      }
    }

    requestRef.current = requestAnimationFrame(tick);
  };

  // Start camera stream on mount and clean up on unmount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  return (
    <div className="space-y-4">
      <div className="relative w-full h-64 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center">
        {/* Invisible canvas used for frame analysis */}
        <canvas ref={canvasRef} className="hidden" />

        {hasPermission === true && !cameraError ? (
          <>
            {/* Live Camera Feed */}
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Scanning Laser HUD */}
            <motion.div
              animate={{ y: [16, 240, 16] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              className="absolute left-4 right-4 h-1.5 bg-amber-500/80 shadow-[0_0_12px_#f59e0b] z-20 pointer-events-none"
            />

            {/* Target Alignment brackets */}
            <div className="absolute inset-x-8 inset-y-8 pointer-events-none z-10 border-2 border-transparent">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-500 rounded-tl-md" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-500 rounded-tr-md" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-500 rounded-bl-md" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-500 rounded-br-md" />
            </div>

            {/* Glowing Scan Status Overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-xs px-3 py-1 rounded-full border border-slate-800 text-[9px] font-mono text-amber-400 font-bold uppercase tracking-widest z-20 flex items-center space-x-1.5 shadow-sm">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </span>
              <span>Camera Scan Active</span>
            </div>

            {/* Switch Camera Button (Front/Back) */}
            <button
              type="button"
              onClick={toggleCameraFacing}
              title="Switch Camera View"
              className="absolute top-4 right-4 bg-slate-950/85 hover:bg-slate-900 border border-slate-800 text-slate-300 p-2 rounded-xl cursor-pointer transition-all z-20 shadow-lg"
            >
              <RefreshCw className="w-4 h-4 text-amber-500" />
            </button>
          </>
        ) : hasPermission === false || cameraError ? (
          <div className="text-center z-10 px-6 space-y-3 select-none">
            <CameraOff className="w-10 h-10 text-red-500 mx-auto" />
            <p className="text-xs font-black text-red-400 uppercase tracking-wider leading-normal">
              Camera Access Required
            </p>
            <p className="text-[10px] text-slate-400 leading-normal max-w-xs mx-auto">
              {cameraError || "Please authorize camera access to enable automatic QR scanning."}
            </p>
            <button
              type="button"
              onClick={startCamera}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-[10px] uppercase rounded-lg cursor-pointer transition-all font-mono"
            >
              Retry Camera Access
            </button>
          </div>
        ) : (
          <div className="text-center z-10 space-y-2 select-none">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-black text-amber-400 uppercase tracking-widest animate-pulse font-mono">
              Booting Camera Feed...
            </p>
          </div>
        )}
      </div>

      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
          Align the QR code displayed on the builder's screen or printed site board inside the brackets. Scans are processed 100% offline and securely.
        </p>
      </div>
    </div>
  );
}
