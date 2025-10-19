import React from 'react'

export default function SignUpSimple() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">OZ Kitchen</h1>
          <p className="text-muted-foreground">Sign Up - Simple Test</p>
        </div>
        
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Create Account</h2>
          
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input 
                type="email" 
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input 
                type="password" 
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter your password"
              />
            </div>
            
            <button 
              type="submit"
              className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90"
            >
              Sign Up
            </button>
          </form>
          
          <p className="text-center text-sm mt-4">
            This is a test page to check if the routing works.
          </p>
        </div>
      </div>
    </div>
  )
}
