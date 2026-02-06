'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (step === 3) {
      router.push('/module1/verified')
    }
  }, [step, router])

  const handleNextStep = async (currentStep: number) => {
    setLoading(true)
    setError('')
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Simulate 10% chance of error
    if (Math.random() < 0.1) {
      setError('Verification step failed. Please try again.')
      setLoading(false)
      return
    }
    
    setStep(currentStep + 1)
    setLoading(false)
  }

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-tigerGreen mb-4">
              Welcome to TigerTrust!
            </h2>
            <p className="text-gray-600 mb-6">
              Welcome! Click to start your identity setup.
            </p>
            <button
              onClick={() => handleNextStep(0)}
              disabled={loading}
              className="bg-tigerGreen text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Setup'}
            </button>
          </div>
        )
      
      case 1:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-tigerGreen mb-4">
              Create Your Profile
            </h2>
            <p className="text-gray-600 mb-6">
              Create Your TigerTrust Profile.
            </p>
            <button
              onClick={() => handleNextStep(1)}
              disabled={loading}
              className="bg-tigerGreen text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        )
      
      case 2:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-tigerGreen mb-4">
              Generate Decentralized ID
            </h2>
            <p className="text-gray-600 mb-4">
              Generate Your Decentralized ID (DID).
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-600">Your DID will be:</p>
              <code className="text-tigerGreen font-mono">did:tigertrust:user123</code>
            </div>
            <button
              onClick={() => handleNextStep(2)}
              disabled={loading}
              className="bg-tigerGreen text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate DID'}
            </button>
          </div>
        )
      
      default:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-tigerGreen mb-4">
              Human Identity Verification
            </h2>
            <p className="text-gray-600 mb-4">
              Verify Human Identity.
            </p>
            <p className="text-sm text-yellow-600 mb-6 italic">
              Note: This is a simulated liveness check for demo purposes.
            </p>
            <button
              onClick={() => handleNextStep(3)}
              disabled={loading}
              className="bg-tigerGreen text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Start Liveness Check'}
            </button>
          </div>
        )
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-6 py-12 bg-white">
      <div className="max-w-md w-full bg-white shadow-xl rounded-lg border p-8">
        <h1 className="text-3xl font-bold text-center text-tigerGreen mb-8">
          Identity Verification
        </h1>
        
        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i < step ? 'bg-tigerGreen' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Error display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tigerGreen"></div>
          </div>
        )}
        
        {/* Step content */}
        {renderStepContent()}
      </div>
    </div>
  )
}