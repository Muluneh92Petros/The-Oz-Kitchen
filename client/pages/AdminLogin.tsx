import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { adminApi } from '../lib/adminApi';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { signIn, signOut, user } = useAuth();
  const navigate = useNavigate();

  // Check admin status when user changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const adminStatus = await adminApi.isAdmin(user.id);
          setIsAdmin(adminStatus);
          if (adminStatus) {
            setSuccess('Admin access confirmed! Redirecting...');
            setTimeout(() => {
              navigate('/admin');
            }, 1500);
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { user: signedInUser, error: signInError } = await signIn(email, password);
      
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (signedInUser) {
        setSuccess('Login successful! Checking admin status...');
        // Admin check will happen in useEffect
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setSuccess('Signing out... Please wait.');
    setError('');
    setLoading(true);
    
    setTimeout(async () => {
      try {
        await signOut();
        setSuccess('');
        setLoading(false);
      } catch (err) {
        console.error('Error signing out:', err);
        setError('Error signing out. Please try again.');
        setLoading(false);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a4d4d] via-[#1a4d4d] to-[#1a4d4d] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#f59e42] to-[#f59e42] rounded-full mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">OZ Kitchen Admin</h1>
            <p className="text-gray-600">Sign in to manage your kitchen</p>
          </div>

          {user && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-800 mb-2">You're already signed in as:</p>
              <p className="text-blue-700">{user.email}</p>
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200"
                  disabled={loading}
                >
                  {loading ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}
            
            {user && !isAdmin && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
                Your account is authenticated but does not have admin access.
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f59e42] focus:border-transparent transition"
                placeholder="admin@ozkitchen.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f59e42] focus:border-transparent transition"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#f59e42] to-[#f59e42] text-white font-semibold py-3 px-6 rounded-lg hover:from-[#e68d31] hover:to-[#e68d31] focus:ring-4 focus:ring-orange-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Admin access only
          </div>
        </div>
      </div>
    </div>
  );
}
