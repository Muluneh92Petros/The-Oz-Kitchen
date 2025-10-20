import React from 'react'
import SignInForm from '@/components/auth/SignInForm'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

export default function SignIn() {
  return (
    <ProtectedRoute requireAuth={false}>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src="https://api.builder.io/api/v1/image/assets/TEMP/ca87422a8faf30fea1aaea80c57344f579cee4ef?width=258" 
              alt="OZ Kitchen" 
              className="w-20 h-20 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-foreground">OZ Kitchen</h1>
            <p className="text-muted-foreground">Fresh, Affordable Lunchboxes</p>
          </div>
          
          <SignInForm />
        </div>
      </div>
    </ProtectedRoute>
  )
}
