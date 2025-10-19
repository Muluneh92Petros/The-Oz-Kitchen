import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function ManualSQLInstructions() {
  const [userId, setUserId] = useState('180e9293-1f1c-4655-b6a1-1bb9be98c1ce');
  const [email, setEmail] = useState('erdunoabel47@gmail.com');
  const [fullName, setFullName] = useState('Admin User');

  // Get current user info when component mounts
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setUserId(data.user.id);
          setEmail(data.user.email || '');
          setFullName(data.user.email?.split('@')[0] || 'Admin User');
        }
      } catch (err) {
        console.error('Error getting current user:', err);
      }
    };
    
    getCurrentUser();
  }, []);

  const sqlScript = `-- Create admins table if it doesn't exist
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'admin', 'staff')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add your user as an admin
INSERT INTO admins (id, email, full_name, role, is_active)
VALUES (
  '${userId}', 
  '${email}', 
  '${fullName}',
  'super_admin',
  true
)
ON CONFLICT (id) DO UPDATE 
SET is_active = true, role = 'super_admin';`;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Manual SQL Instructions</h2>
      <p className="mb-4">If the automatic methods don't work, run this SQL in your Supabase SQL Editor:</p>
      
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>
      
      <pre className="text-xs overflow-auto max-h-80 bg-gray-100 p-4 rounded">
        {sqlScript}
      </pre>
      
      <div className="mt-4">
        <p className="text-sm text-gray-600">
          1. Copy this SQL script
        </p>
        <p className="text-sm text-gray-600">
          2. Go to your <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Supabase Dashboard</a>
        </p>
        <p className="text-sm text-gray-600">
          3. Open the SQL Editor
        </p>
        <p className="text-sm text-gray-600">
          4. Paste and run the SQL script
        </p>
        <p className="text-sm text-gray-600">
          5. Return to the <a href="/admin" className="text-blue-500 underline">Admin Panel</a>
        </p>
      </div>
    </div>
  );
}
