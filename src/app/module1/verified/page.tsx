'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function IdentityVerifiedPage() {
  const router = useRouter()

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-6 py-12 bg-white">
      <div className="max-w-lg w-full bg-white shadow-xl rounded-lg border p-8">
        {/* Success image */}
        <div className="flex justify-center mb-6">
          <img
            src="/images/success-checkmark.png"
            alt="Success"
            className="w-20 h-20 text-tigerGreen"
          />
        </div>
        
        <h1 className="text-3xl font-bold text-center text-tigerGreen mb-8">
          Your Identity is Verified!
        </h1>
        
        {/* Details box */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8 space-y-4">
          <div>
            <p className="text-sm text-gray-600">Wallet Address:</p>
            <p className="font-mono text-gray-800">Simulated Wallet: G3X...ABC</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Decentralized ID (DID):</p>
            <p className="font-mono text-gray-800">Simulated DID: did:tigertrust:user123</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Human Verification Status:</p>
            <p className="font-semibold text-green-600">✓ Verified</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Profile Status:</p>
            <p className="font-semibold text-green-600">✓ Ready for Lending</p>
          </div>
        </div>
        
        {/* Action button */}
        <button
          onClick={handleGoToDashboard}
          className="w-full bg-tigerGreen text-white py-4 text-lg font-semibold rounded-lg hover:bg-green-700 transition-colors"
        >
          Go to Dashboard
        </button>
        
        <p className="text-xs text-gray-500 text-center mt-4">
          Note: This is a demonstration of the TigerTrust verification process. 
          No actual blockchain transactions or identity verification occurred.
        </p>
      </div>
    </div>
  )
}