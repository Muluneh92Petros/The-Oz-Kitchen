import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AuthDebugger() {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const checkUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const checkAdmin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        setError('No authenticated user found');
        setLoading(false);
        return;
      }

      // First check if the admins table exists
      const { error: tableError } = await supabase
        .from('admins')
        .select('count')
        .limit(1);

      if (tableError) {
        setResult({
          error: 'The admins table might not exist yet',
          details: tableError,
          solution: 'Click "Create Admin Table" button below to create the table'
        });
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('id', userData.user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      setResult({
        user: userData.user,
        adminRecord: data,
        message: data 
          ? `User is ${data.is_active ? 'an active' : 'an inactive'} admin with role: ${data.role}` 
          : 'User is not an admin'
      });
    } catch (err) {
      console.error('Admin check error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error checking admin status');
    } finally {
      setLoading(false);
    }
  };
  
  const createAdminTable = async () => {
    setLoading(true);
    setError(null);
    try {
      // Create the admins table using SQL
      const { error } = await supabase.rpc('create_admin_table');
      
      if (error) {
        // If the RPC doesn't exist, we'll create the function first
        await supabase.rpc('exec_sql', {
          sql_query: `
            CREATE OR REPLACE FUNCTION create_admin_table()
            RETURNS void
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
              CREATE TABLE IF NOT EXISTS admins (
                id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'admin', 'staff')),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
              );
            END;
            $$;
          `
        });
        
        // Now try to create the table again
        const { error: retryError } = await supabase.rpc('create_admin_table');
        if (retryError) throw retryError;
      }
      
      setResult({
        message: 'Admin table created successfully',
        next_step: 'Now click "Make Current User Admin" to add yourself as an admin'
      });
    } catch (err) {
      console.error('Create table error:', err);
      setError(err instanceof Error ? err.message : 'Error creating admin table');
    } finally {
      setLoading(false);
    }
  };

  const makeCurrentUserAdmin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        setError('No authenticated user found');
        setLoading(false);
        return;
      }
      
      // First check if the admins table exists
      const { error: tableError } = await supabase
        .from('admins')
        .select('count')
        .limit(1);

      if (tableError) {
        setError('The admins table does not exist. Please click "Create Admin Table" first.');
        setLoading(false);
        return;
      }
      
      // Insert the current user as an admin
      const { data, error } = await supabase
        .from('admins')
        .insert([
          {
            id: userData.user.id,
            email: userData.user.email,
            full_name: userData.user.email?.split('@')[0] || 'Admin User',
            role: 'super_admin',
            is_active: true
          }
        ])
        .select();
      
      if (error) {
        // If there's a conflict (user already exists), update instead
        if (error.code === '23505') { // Unique violation
          const { data: updateData, error: updateError } = await supabase
            .from('admins')
            .update({
              is_active: true,
              role: 'super_admin'
            })
            .eq('id', userData.user.id)
            .select();
            
          if (updateError) throw updateError;
          setResult({
            message: 'User already exists as admin, updated to active super_admin',
            user: userData.user,
            adminRecord: updateData
          });
        } else {
          throw error;
        }
      } else {
        setResult({
          message: 'Successfully added current user as admin',
          user: userData.user,
          adminRecord: data
        });
      }
    } catch (err) {
      console.error('Make admin error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const addAdminManually = async () => {
    if (!userId || !email) {
      setError('User ID and email are required');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('admins')
        .insert([
          {
            id: userId,
            email: email,
            full_name: 'Admin User',
            role: 'super_admin',
            is_active: true
          }
        ])
        .select();
      
      if (error) throw error;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Auth Debugger</h2>
      
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={checkSession}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Check Session
          </button>
          
          <button
            onClick={checkUser}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Check Current User
          </button>
          
          <button
            onClick={checkAdmin}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Check Admin Status
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4 border-t pt-4">
          <h3 className="w-full font-medium mb-2">Admin Setup:</h3>
          <button
            onClick={createAdminTable}
            disabled={loading}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            1. Create Admin Table
          </button>
          
          <button
            onClick={makeCurrentUserAdmin}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            2. Make Current User Admin
          </button>
        </div>
        
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">Add Admin Manually</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User ID (UUID)"
              className="px-3 py-2 border rounded flex-1"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="px-3 py-2 border rounded flex-1"
            />
            <button
              onClick={addAdminManually}
              disabled={loading || !userId || !email}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              Add Admin
            </button>
          </div>
        </div>
        
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        
        {result && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-2">Result:</h3>
            <pre className="text-xs overflow-auto max-h-60 bg-gray-100 p-2 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
