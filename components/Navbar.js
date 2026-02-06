import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between h-16 px-6 bg-white shadow-sm">
      {/* Left side - Logo */}
      <div>
        <Link href="/">
          <h1 className="text-xl font-bold text-tigerGreen cursor-pointer">
            TIGERTRUST
          </h1>
        </Link>
      </div>
      
      {/* Right side - Navigation links */}
      <div className="flex items-center space-x-4">
        <Link href="/login" className="text-gray-700 hover:text-tigerGreen transition-colors">
          Log in
        </Link>
        <Link 
          href="/signup"
          className="bg-tigerGreen text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Sign up
        </Link>
      </div>
    </nav>
  )
}