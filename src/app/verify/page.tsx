'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CameraVerification } from '@/components/verification/camera-verification'
import { VerificationResults } from '@/components/verification/verification-results'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

interface VerificationResult {
  success: boolean
  verified: boolean
  confidence?: number
  message?: string
  error?: string
}

export default function VerifyPage() {
  const router = useRouter()
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)

  const handleCapture = async (imageData: string) => {
    setIsVerifying(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/verify/human`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          wallet_address: 'demo-wallet-address', // Replace with actual wallet address
        }),
      })

      const data = await response.json()
      setResult(data)
      setIsVerifying(false)
    } catch (error) {
      console.error('Error verifying:', error)
      setResult({
        success: false,
        verified: false,
        error: 'Failed to connect to verification service',
      })
      setIsVerifying(false)
    }
  }

  const handleReset = () => {
    setResult(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Human Verification
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Complete facial verification to prove you're human
          </p>
        </div>

        {/* Main Content */}
        {!result ? (
          <CameraVerification onCapture={handleCapture} isVerifying={isVerifying} />
        ) : (
          <VerificationResults result={result} onReset={handleReset} />
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/module1/onboard')}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Onboarding
          </button>
        </div>
      </div>
    </div>
  )
}
