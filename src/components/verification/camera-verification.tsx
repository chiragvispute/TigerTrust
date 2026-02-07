'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FacialOverlay } from './facial-overlay';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff } from 'lucide-react';

interface CameraVerificationProps {
  onCapture: (imageData: string) => void;
  isVerifying: boolean;
}

export function CameraVerification({ onCapture, isVerifying }: CameraVerificationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraError('Unable to access camera. Please grant permission and try again.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCountdown(null);
  }, []);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !isCameraActive) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    onCapture(imageData);
  }, [isCameraActive, onCapture]);

  const handleCapture = useCallback(() => {
    setCountdown(3);
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      captureImage();
      setCountdown(null);
    }
  }, [countdown, captureImage]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Camera Container */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 shadow-2xl">
        <div className="aspect-video relative">
          {/* Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
          />

          {/* Placeholder when camera is off */}
          {!isCameraActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-gray-700/50 flex items-center justify-center">
                  <CameraOff className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-gray-400">Camera is not active</p>
              </div>
            </div>
          )}

          {/* Facial Overlay */}
          {isCameraActive && (
            <FacialOverlay
              isDetecting={true}
              faceDetected={false}
              qualityScore={undefined}
            />
          )}

          {/* Countdown Overlay */}
          {countdown !== null && countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-8xl font-bold text-white animate-pulse">
                  {countdown}
                </div>
                <p className="text-xl text-white mt-4">Get ready...</p>
              </div>
            </div>
          )}

          {/* Status Indicators */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {/* Camera Status */}
            <div className={`px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium ${
              isCameraActive 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
              {isCameraActive ? 'Camera Active' : 'Camera Inactive'}
            </div>

            {/* Ready Status */}
            {isCameraActive && (
              <div className="px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                Ready to Capture
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/20 backdrop-blur-sm">
            <div className="bg-red-500/90 text-white px-6 py-4 rounded-lg max-w-md text-center">
              <p className="font-medium">{cameraError}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-6 flex justify-center gap-4">
        {!isCameraActive ? (
          <Button
            onClick={startCamera}
            size="lg"
            className="bg-tigerGreen hover:bg-green-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg"
            disabled={isVerifying}
          >
            <Camera className="w-5 h-5 mr-2" />
            Start Camera
          </Button>
        ) : (
          <>
            <Button
              onClick={stopCamera}
              variant="outline"
              size="lg"
              className="px-6 py-6 text-lg rounded-xl border-2"
              disabled={isVerifying}
            >
              <CameraOff className="w-5 h-5 mr-2" />
              Stop Camera
            </Button>

            <Button
              onClick={handleCapture}
              size="lg"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg"
              disabled={isVerifying || countdown !== null}
            >
              {isVerifying ? (
                <>
                  <svg className="w-5 h-5 mr-2 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 mr-2" />
                  {countdown !== null ? 'Capturing...' : 'Verify Human'}
                </>
              )}
            </Button>
          </>
        )}
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Verification Tips:</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Ensure good lighting - face the light source</li>
          <li>• Position your face in the center of the frame</li>
          <li>• Look directly at the camera</li>
          <li>• Remove glasses or hats if possible</li>
          <li>• Keep your eyes open during capture</li>
        </ul>
      </div>
    </div>
  );
}
