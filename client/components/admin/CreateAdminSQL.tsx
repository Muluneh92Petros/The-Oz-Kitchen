import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function CreateAdminSQL() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runSQL = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!userData.user) {
        setError('No authenticated user found');
        setLoading(false);
        return;
      }

      // Run SQL to create admins table and add current user
      const { error: sqlError } = await supabase.rpc('exec_sql', {
        sql_query: `
          -- Create admins table if it doesn't exist
          CREATE TABLE IF NOT EXISTS admins (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'admin', 'staff')),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
          );

          -- Add current user as admin
          INSERT INTO admins (id, email, full_name, role, is_active)
          VALUES (
            '${userData.user.id}', 
            '${userData.user.email}', 
            '${userData.user.email?.split('@')[0] || 'Admin User'}',
            'super_admin',
            true
          )
          ON CONFLICT (id) DO UPDATE 
          SET is_active = true, role = 'super_admin';
        `
      });
      
      if (sqlError) {
        // If the exec_sql function doesn't exist, we need to use a different approach
        if (sqlError.message.includes('function exec_sql') || sqlError.message.includes('does not exist')) {
          setError('The exec_sql function does not exist in your database. Please run the SQL manually in the Supabase SQL Editor.');
          setResult({
            manualSQL: `
-- Create admins table if it doesn't exist
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'admin', 'staff')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add current user as admin
INSERT INTO admins (id, email, full_name, role, is_active)
VALUES (
  '${userData.user.id}', 
  '${userData.user.email}', 
  '${userData.user.email?.split('@')[0] || 'Admin User'}',
  'super_admin',
  true
)
ON CONFLICT (id) DO UPDATE 
SET is_active = true, role = 'super_admin';
            `
          });
        } else {
          throw sqlError;
        }
      } else {
        // Verify the user is now an admin
        const { data, error: verifyError } = await supabase
          .from('admins')
          .select('*')
          .eq('id', userData.user.id)
          .maybeSingle();
        
        if (verifyError) throw verifyError;
        
        setResult({
          success: true,
          message: 'Admin table created and user added successfully',
          adminRecord: data
        });
      }
    } catch (err) {
      console.error('SQL error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error running SQL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Direct SQL Setup</h2>
      
      <div className="mb-4">
        <p className="text-gray-700 mb-2">
          This will attempt to create the admins table and add your current user as an admin directly using SQL.
        </p>
        <button
          onClick={runSQL}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Running SQL...' : 'Run SQL Setup'}
        </button>
      </div>
      
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
          
          {result?.manualSQL && (
            <div className="mt-4">
              <p className="font-medium">Please run this SQL manually in the Supabase SQL Editor:</p>
              <pre className="text-xs overflow-auto max-h-60 bg-gray-100 p-2 rounded mt-2">
                {result.manualSQL}
              </pre>
            </div>
          )}
        </div>
      )}
      
      {result?.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <p className="font-medium">{result.message}</p>
          {result.adminRecord && (
            <pre className="text-xs overflow-auto max-h-40 bg-gray-100 p-2 rounded mt-2">
              {JSON.stringify(result.adminRecord, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
