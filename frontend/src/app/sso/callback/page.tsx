'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SSOCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'validating' | 'success' | 'error'>('validating')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setErrorMessage('No SSO token provided')
      return
    }

    const validateSSO = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || ''
        const response = await fetch(`${apiBase}/api/auth/sso/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: 'SSO validation failed' }))
          throw new Error(error.detail || 'SSO validation failed')
        }

        const data = await response.json()

        // Store auth data in localStorage (matching NEXUS auth pattern)
        localStorage.setItem('nexus_token', data.access_token)
        localStorage.setItem('nexus_auth', JSON.stringify({
          username: data.user.username,
          first_name: data.user.first_name,
          role: data.user.role,
          isApprover: data.user.is_approver,
          isAuthenticated: true,
          loginTime: Date.now(),
          sso: true,
        }))

        setStatus('success')

        // Full page reload so AuthProvider picks up the new localStorage data
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 500)
      } catch (err: any) {
        setStatus('error')
        setErrorMessage(err.message || 'SSO authentication failed')
      }
    }

    validateSSO()
  }, [searchParams, router])

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '48px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      textAlign: 'center',
      maxWidth: '400px',
      width: '90%',
    }}>
      {status === 'validating' && (
        <>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid #e5e7eb',
            borderTopColor: '#0066B3',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 24px',
          }} />
          <h2 style={{ fontSize: '20px', color: '#1f2937', marginBottom: '8px' }}>
            Signing you in...
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Validating your ACI FORGE credentials
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <div style={{
            width: '48px',
            height: '48px',
            background: '#10b981',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            color: 'white',
            fontSize: '24px',
          }}>
            &#10003;
          </div>
          <h2 style={{ fontSize: '20px', color: '#1f2937', marginBottom: '8px' }}>
            Welcome to NEXUS
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Redirecting to dashboard...
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <div style={{
            width: '48px',
            height: '48px',
            background: '#ef4444',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            color: 'white',
            fontSize: '24px',
          }}>
            &#10007;
          </div>
          <h2 style={{ fontSize: '20px', color: '#1f2937', marginBottom: '8px' }}>
            SSO Login Failed
          </h2>
          <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '24px' }}>
            {errorMessage}
          </p>
          <a
            href="/auth/login"
            style={{
              display: 'inline-block',
              background: '#0066B3',
              color: 'white',
              padding: '10px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Login Manually
          </a>
        </>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function SSOCallbackPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <Suspense fallback={
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '48px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}>
          <p style={{ color: '#6b7280' }}>Loading...</p>
        </div>
      }>
        <SSOCallbackContent />
      </Suspense>
    </div>
  )
}
