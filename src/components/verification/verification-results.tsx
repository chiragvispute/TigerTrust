'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

interface VerificationResult {
  success: boolean;
  verified: boolean;
  confidence: number;
  message: string;
  details?: {
    face_quality: number;
    blur_level: number;
    eyes_open: {
      left: number;
      right: number;
    };
    head_pose: {
      yaw: number;
      pitch: number;
      roll: number;
    };
  };
  issues?: string[];
  timestamp?: number;
}

interface VerificationResultsProps {
  result: VerificationResult | null;
  onReset: () => void;
}

export function VerificationResults({ result, onReset }: VerificationResultsProps) {
  const router = useRouter();
  
  if (!result) return null;

  const { verified, message, details, issues } = result;
  const confidence = result.confidence ?? 0;

  return (
    <div className="space-y-6">
      {/* Main Result Card */}
      <Card className={`p-8 text-center border-2 ${
        verified 
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-500' 
          : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-500'
      }`}>
        <div className="flex flex-col items-center gap-4">
          {verified ? (
            <div className="relative">
              <div className="absolute inset-0 animate-ping bg-green-400 rounded-full opacity-75" />
              <CheckCircle2 className="w-24 h-24 text-green-600 dark:text-green-400 relative" />
            </div>
          ) : (
            <div className="relative">
              <svg className="w-24 h-24 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2"></circle>
                <line x1="15" y1="9" x2="9" y2="15" strokeWidth="2"></line>
                <line x1="9" y1="9" x2="15" y2="15" strokeWidth="2"></line>
              </svg>
            </div>
          )}
          
          <div>
            <h2 className={`text-3xl font-bold mb-2 ${
              verified ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
            }`}>
              {verified ? 'Human Verified!' : 'Verification Failed'}
            </h2>
            <p className={`text-lg ${
              verified ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
            }`}>
              {message}
            </p>
          </div>

          {/* Confidence Score */}
          <div className="w-full max-w-md">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Confidence Score
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {confidence.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ease-out ${
                  confidence > 70 ? 'bg-green-600' : confidence > 50 ? 'bg-yellow-600' : 'bg-red-600'
                }`}
                style={{ width: `${Math.min(confidence, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Issues (if any) */}
      {issues && issues.length > 0 && (
        <Card className="p-6 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                Issues Detected:
              </h3>
              <ul className="space-y-1">
                {issues.map((issue, index) => (
                  <li key={index} className="text-yellow-800 dark:text-yellow-200 text-sm">
                    • {issue}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Detailed Metrics */}
      {details && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Face Quality */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 2a9 9 0 0 1 9 9v4a9 9 0 0 1-9 9m0-18a9 9 0 0 0-9 9v4a9 9 0 0 0 9 9m0-18v18" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="8" cy="10" r="1" fill="currentColor"/>
                  <circle cx="16" cy="10" r="1" fill="currentColor"/>
                  <path d="M8 15s1.5 2 4 2 4-2 4-2" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Face Quality
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Quality Score</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {details.face_quality.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Blur Level</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {details.blur_level.toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>

          {/* Eye Status */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="3" strokeWidth="2"/>
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Eye Detection
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Left Eye</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {details.eyes_open.left.toFixed(0)}% Open
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Right Eye</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {details.eyes_open.right.toFixed(0)}% Open
                </span>
              </div>
            </div>
          </Card>

          {/* Head Pose */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Head Position
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Yaw</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {details.head_pose.yaw.toFixed(1)}°
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Pitch</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {details.head_pose.pitch.toFixed(1)}°
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Roll</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {details.head_pose.roll.toFixed(1)}°
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4">
        {verified ? (
          <>
            <button
              onClick={() => router.push('/loan/dashboard')}
              className="px-8 py-4 bg-gradient-to-r from-tigerGreen to-green-600 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-semibold shadow-lg transition-all duration-300 flex items-center gap-2 text-lg group"
            >
              Continue to Loan Dashboard
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onReset}
              className="px-6 py-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl font-medium shadow-lg transition-all"
            >
              Verify Again
            </button>
          </>
        ) : (
          <button
            onClick={onReset}
            className="px-6 py-3 bg-tigerGreen hover:bg-green-700 text-white rounded-xl font-medium shadow-lg transition-all"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
