'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(username, password);

      if (success) {
        router.push('/dashboard');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://acidashboard.aci.local:100/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: resetUsername,
          new_password: newPassword
        })
      });

      if (response.ok) {
        setResetMessage('Password reset successfully! You can now login with your new password.');
        setTimeout(() => {
          setShowResetForm(false);
          setResetUsername('');
          setNewPassword('');
          setConfirmPassword('');
          setResetMessage('');
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to reset password');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-container">
      {/* Animated background */}
      <div className="background-animation">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="gradient-orb orb-4"></div>
      </div>

      {/* Circuit pattern overlay */}
      <div className="circuit-pattern"></div>

      {/* Grid overlay for depth */}
      <div className="grid-overlay"></div>

      {/* Floating particles */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className={`particle particle-${i + 1}`}></div>
        ))}
      </div>

      {/* Login card */}
      <div className={`login-card ${mounted ? 'visible' : ''}`}>
        {/* Logo section */}
        <div className="logo-section">
          <Image
            src="/nexus-icon-only.svg"
            alt="NEXUS Icon"
            width={80}
            height={80}
            className="logo-icon"
            priority
          />
          <h1 className="logo-text">NEXUS</h1>
          <p className="logo-tagline">American Circuits Traveler Management</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="error-message">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M10 6v5M10 13.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {error}
          </div>
        )}

        {/* Success message for reset */}
        {resetMessage && (
          <div className="success-message">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M6 10l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {resetMessage}
          </div>
        )}

        {/* Login or Reset Password form */}
        {!showResetForm ? (
          <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your username"
              autoComplete="username"
              className="simple-input"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                autoComplete="current-password"
                className="simple-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`submit-button ${isLoading ? 'loading' : ''}`}
          >
            {isLoading ? (
              <>
                <svg className="spinner" width="20" height="20" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="50" strokeLinecap="round"/>
                </svg>
                Signing In...
              </>
            ) : (
              <>
                Sign In
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>
        </form>
        ) : (
          <form onSubmit={handleResetPassword} className="login-form">
            <div className="input-group">
              <label htmlFor="reset-username">Username</label>
              <input
                id="reset-username"
                type="text"
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
                required
                placeholder="Enter your username"
                className="simple-input"
              />
            </div>

            <div className="input-group">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Enter new password"
                className="simple-input"
              />
            </div>

            <div className="input-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
                className="simple-input"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`submit-button ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? (
                <>
                  <svg className="spinner" width="20" height="20" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="50" strokeLinecap="round"/>
                  </svg>
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowResetForm(false);
                setError('');
                setResetMessage('');
              }}
              className="back-to-login"
            >
              Back to Login
            </button>
          </form>
        )}

        {/* Footer */}
        {!showResetForm && (
          <div className="card-footer">
            <button
              type="button"
              className="forgot-password"
              onClick={() => setShowResetForm(true)}
            >
              Reset Password
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 30%, #6366f1 60%, #7c3aed 100%);
        }

        /* Animated gradient orbs */
        .background-animation {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 0;
        }

        .gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.5;
          animation: float 25s ease-in-out infinite;
        }

        .orb-1 {
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%);
          top: -25%;
          left: -15%;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(124, 58, 237, 0.35) 0%, transparent 70%);
          bottom: -20%;
          right: -15%;
          animation-delay: -6s;
        }

        .orb-3 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(79, 70, 229, 0.3) 0%, transparent 70%);
          top: 50%;
          right: 10%;
          animation-delay: -12s;
        }

        .orb-4 {
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(147, 51, 234, 0.25) 0%, transparent 70%);
          bottom: 40%;
          left: 5%;
          animation-delay: -18s;
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(40px, -40px) scale(1.05);
          }
          50% {
            transform: translate(-30px, 30px) scale(0.95);
          }
          75% {
            transform: translate(-40px, -30px) scale(1.02);
          }
        }

        /* Circuit pattern */
        .circuit-pattern {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.15) 2px, transparent 2px),
            radial-gradient(circle at 80% 70%, rgba(124, 58, 237, 0.12) 2px, transparent 2px),
            radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.08) 1.5px, transparent 1.5px);
          background-size: 80px 80px, 100px 100px, 50px 50px;
          animation: circuitMove 40s linear infinite;
          z-index: 1;
        }

        @keyframes circuitMove {
          0% {
            background-position: 0 0, 50px 50px, 25px 25px;
          }
          100% {
            background-position: 80px 80px, 150px 150px, 75px 75px;
          }
        }

        /* Grid overlay */
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 60px 60px;
          z-index: 1;
        }

        /* Floating particles */
        .particles {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
        }

        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          animation: particleFloat 15s ease-in-out infinite;
        }

        .particle:nth-child(odd) {
          background: rgba(147, 51, 234, 0.6);
        }

        .particle-1 { left: 10%; top: 20%; animation-delay: 0s; }
        .particle-2 { left: 20%; top: 80%; animation-delay: -2s; }
        .particle-3 { left: 30%; top: 40%; animation-delay: -4s; }
        .particle-4 { left: 40%; top: 60%; animation-delay: -6s; }
        .particle-5 { left: 50%; top: 30%; animation-delay: -8s; }
        .particle-6 { left: 60%; top: 70%; animation-delay: -10s; }
        .particle-7 { left: 70%; top: 50%; animation-delay: -12s; }
        .particle-8 { left: 80%; top: 25%; animation-delay: -1s; }
        .particle-9 { left: 90%; top: 85%; animation-delay: -3s; }
        .particle-10 { left: 15%; top: 55%; animation-delay: -5s; }
        .particle-11 { left: 25%; top: 15%; animation-delay: -7s; }
        .particle-12 { left: 35%; top: 75%; animation-delay: -9s; }
        .particle-13 { left: 45%; top: 45%; animation-delay: -11s; }
        .particle-14 { left: 55%; top: 90%; animation-delay: -13s; }
        .particle-15 { left: 65%; top: 35%; animation-delay: -2.5s; }
        .particle-16 { left: 75%; top: 65%; animation-delay: -4.5s; }
        .particle-17 { left: 85%; top: 10%; animation-delay: -6.5s; }
        .particle-18 { left: 95%; top: 55%; animation-delay: -8.5s; }
        .particle-19 { left: 5%; top: 70%; animation-delay: -10.5s; }
        .particle-20 { left: 50%; top: 5%; animation-delay: -12.5s; }

        @keyframes particleFloat {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.6;
          }
          25% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-10px) translateX(-15px);
            opacity: 0.4;
          }
          75% {
            transform: translateY(-30px) translateX(5px);
            opacity: 0.7;
          }
        }

        /* Login card */
        .login-card {
          width: 100%;
          max-width: 480px;
          padding: 48px 44px;
          background: rgba(255, 255, 255, 0.98);
          border-radius: 28px;
          box-shadow:
            0 30px 60px -12px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          position: relative;
          z-index: 10;
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }

        .login-card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Logo section */
        .logo-section {
          text-align: center;
          margin-bottom: 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .logo-section :global(.logo-icon) {
          width: 80px;
          height: 80px;
        }

        .logo-text {
          font-size: 32px;
          font-weight: 700;
          color: #0891b2;
          margin: 0;
          letter-spacing: 4px;
        }

        .logo-tagline {
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
          margin: 0;
        }

        /* Error message */
        .error-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          color: #dc2626;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 24px;
          border: 1px solid rgba(220, 38, 38, 0.2);
        }

        /* Success message */
        .success-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          color: #16a34a;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 24px;
          border: 1px solid rgba(22, 163, 74, 0.2);
        }

        /* Form styles */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-group label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
          transition: color 0.2s;
          z-index: 1;
          flex-shrink: 0;
        }

        .input-wrapper input {
          width: 100%;
          padding: 16px 56px;
          padding-left: 48px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 14px;
          font-size: 15px;
          color: #1a202c;
          outline: none;
          transition: all 0.25s;
          text-indent: 0;
        }

        .input-wrapper input:focus {
          background: #ffffff;
          border-color: #0891b2;
          box-shadow: 0 0 0 4px rgba(8, 145, 178, 0.12);
        }

        .input-wrapper input:focus + .input-icon,
        .input-wrapper:focus-within .input-icon {
          color: #0891b2;
        }

        .input-wrapper input::placeholder {
          color: #94a3b8;
        }

        /* Simple input without icons */
        .simple-input {
          width: 100%;
          padding: 16px 20px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 14px;
          font-size: 15px;
          color: #1a202c;
          outline: none;
          transition: all 0.25s;
        }

        .simple-input:focus {
          background: #ffffff;
          border-color: #0891b2;
          box-shadow: 0 0 0 4px rgba(8, 145, 178, 0.12);
        }

        .simple-input::placeholder {
          color: #94a3b8;
        }

        /* Password field with toggle */
        .password-field {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-field .simple-input {
          padding-right: 52px;
        }

        .password-toggle {
          position: absolute;
          right: 16px;
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
          z-index: 2;
        }

        .password-toggle:hover {
          color: #0891b2;
        }

        /* Submit button */
        .submit-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 18px 24px;
          background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 16px rgba(8, 145, 178, 0.4);
          margin-top: 8px;
          position: relative;
          overflow: hidden;
        }

        .submit-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }

        .submit-button:hover:not(:disabled)::before {
          left: 100%;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 102, 179, 0.5);
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
        }

        .submit-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-button:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
        }

        .submit-button.loading {
          background: linear-gradient(135deg, #64748b 0%, #475569 100%);
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Footer */
        .card-footer {
          text-align: center;
          margin-top: 28px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }

        .forgot-password {
          background: none;
          border: none;
          color: #0891b2;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          padding: 8px 16px;
          border-radius: 8px;
        }

        .forgot-password:hover {
          color: #0e7490;
          background: rgba(0, 102, 179, 0.08);
        }

        .back-to-login {
          width: 100%;
          padding: 14px 24px;
          background: none;
          border: 2px solid #e2e8f0;
          color: #64748b;
          font-size: 15px;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 12px;
        }

        .back-to-login:hover {
          border-color: #0891b2;
          color: #0891b2;
          background: rgba(8, 145, 178, 0.05);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .content-wrapper {
            max-width: 500px;
            padding: 20px;
          }
        }

        @media (max-width: 768px) {
          .page-container {
            padding: 16px;
          }

          .content-wrapper {
            max-width: 100%;
            padding: 16px;
          }

          .login-card {
            padding: 40px 32px;
            border-radius: 28px;
          }

          .logo-section :global(.main-logo) {
            width: 240px;
          }

          .form-title {
            font-size: 24px;
          }

          .form-subtitle {
            font-size: 13px;
          }

          .input-wrapper input {
            padding: 14px 48px 14px 48px;
            font-size: 14px;
          }

          .submit-button {
            padding: 13px 20px;
            font-size: 15px;
          }
        }

        @media (max-width: 520px) {
          .login-card {
            padding: 32px 24px;
            margin: 0;
            border-radius: 24px;
          }

          .logo-section :global(.main-logo) {
            width: 200px;
          }

          .form-title {
            font-size: 22px;
          }

          .form-subtitle {
            font-size: 12px;
            margin-bottom: 24px;
          }

          .form-group {
            gap: 6px;
          }

          .form-label {
            font-size: 13px;
          }

          .input-wrapper input {
            padding: 13px 46px 13px 46px;
            font-size: 14px;
          }

          .input-icon {
            left: 14px;
          }

          .password-toggle {
            right: 14px;
          }

          .icon {
            width: 18px;
            height: 18px;
          }

          .submit-button {
            padding: 12px 18px;
            font-size: 14px;
          }

          .forgot-password {
            font-size: 13px;
          }

          .error-message {
            padding: 12px 14px;
            font-size: 13px;
          }

          .copyright {
            font-size: 11px;
            margin-top: 20px;
          }

          .background-orb {
            filter: blur(80px);
          }

          .orb-1 {
            width: 400px;
            height: 400px;
          }

          .orb-2 {
            width: 350px;
            height: 350px;
          }

          .orb-3 {
            width: 300px;
            height: 300px;
          }
        }

        @media (max-width: 375px) {
          .login-card {
            padding: 28px 20px;
          }

          .logo-section :global(.main-logo) {
            width: 180px;
          }

          .form-title {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  )
}
