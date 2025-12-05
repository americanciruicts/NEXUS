'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Reset password form
  const [resetData, setResetData] = useState({
    username: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasNumber: false,
    hasSpecialChar: false,
    passwordsMatch: false
  });

  const router = useRouter();
  const { login } = useAuth();

  // Real-time password validation
  useEffect(() => {
    setPasswordValidation({
      minLength: resetData.newPassword.length >= 10,
      hasNumber: /\d/.test(resetData.newPassword),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(resetData.newPassword),
      passwordsMatch: resetData.newPassword !== '' && resetData.newPassword === resetData.confirmPassword
    });
  }, [resetData.newPassword, resetData.confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(formData.username, formData.password);

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
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess(false);

    // Validate passwords match
    if (resetData.newPassword !== resetData.confirmPassword) {
      setResetError('New passwords do not match');
      return;
    }

    // Validate password strength
    if (!passwordValidation.minLength || !passwordValidation.hasNumber || !passwordValidation.hasSpecialChar) {
      setResetError('Password does not meet all requirements');
      return;
    }

    setIsResetting(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: resetData.username,
          old_password: resetData.oldPassword,
          new_password: resetData.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to reset password');
      }

      setResetSuccess(true);
      setTimeout(() => {
        setShowResetPassword(false);
        setResetData({
          username: '',
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setResetSuccess(false);
        setShowOldPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      }, 2000);
    } catch (err) {
      const error = err as Error;
      setResetError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleCancelReset = () => {
    setShowResetPassword(false);
    setResetData({
      username: '',
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setResetError('');
    setResetSuccess(false);
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  // Reset Password View
  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding */}
          <div className="hidden lg:block">
            <div className="mb-8">
              <Image
                src="/nexus-logo.svg"
                alt="NEXUS"
                width={520}
                height={140}
                className="mb-6 brightness-0 invert"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Reset Your Password</h1>
            <p className="text-xl text-blue-100 mb-8">
              Create a new secure password to continue accessing your account
            </p>

            <div className="space-y-4 mt-12">
              <div className="flex items-center gap-4 text-white">
                <CheckCircleIcon className="w-8 h-8 flex-shrink-0" />
                <span className="text-lg">Secure authentication system</span>
              </div>
              <div className="flex items-center gap-4 text-white">
                <CheckCircleIcon className="w-8 h-8 flex-shrink-0" />
                <span className="text-lg">Password encryption</span>
              </div>
              <div className="flex items-center gap-4 text-white">
                <CheckCircleIcon className="w-8 h-8 flex-shrink-0" />
                <span className="text-lg">Account protection</span>
              </div>
            </div>
          </div>

          {/* Right Side - Reset Password Form */}
          <div>
            {/* Mobile Logo */}
            <div className="lg:hidden mb-8 text-center">
              <Image
                src="/nexus-logo.svg"
                alt="NEXUS"
                width={420}
                height={115}
                className="mx-auto mb-4 brightness-0 invert"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <h1 className="text-3xl font-bold text-white">Reset Password</h1>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h2>
              <p className="text-gray-600 mb-8">Enter your details to reset your password</p>

              <form onSubmit={handleResetPassword} className="space-y-6">
                {/* Username Field */}
                <div>
                  <label className="block text-base font-bold text-gray-800 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={resetData.username}
                    onChange={(e) => setResetData({ ...resetData, username: e.target.value })}
                    className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-xl text-gray-900 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-200 transition-all"
                    placeholder="Enter your username"
                  />
                </div>

                {/* Current Password Field */}
                <div>
                  <label className="block text-base font-bold text-gray-800 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      required
                      value={resetData.oldPassword}
                      onChange={(e) => setResetData({ ...resetData, oldPassword: e.target.value })}
                      className="w-full px-5 py-4 pr-14 text-base border-2 border-gray-300 rounded-xl text-gray-900 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-200 transition-all"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                      {showOldPassword ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
                    </button>
                  </div>
                </div>

                {/* New Password Field */}
                <div>
                  <label className="block text-base font-bold text-gray-800 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={resetData.newPassword}
                      onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                      className="w-full px-5 py-4 pr-14 text-base border-2 border-gray-300 rounded-xl text-gray-900 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-200 transition-all"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                      {showNewPassword ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
                    </button>
                  </div>

                  {/* Password Requirements */}
                  {resetData.newPassword && (
                    <div className="mt-3 p-4 bg-indigo-50 rounded-xl space-y-2 border border-indigo-200">
                      <p className="text-xs font-bold text-indigo-900 mb-1">Password Requirements:</p>
                      <div className="flex items-center gap-2">
                        {passwordValidation.minLength ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${passwordValidation.minLength ? 'text-green-700 font-semibold' : 'text-gray-700'}`}>
                          At least 10 characters
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {passwordValidation.hasNumber ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${passwordValidation.hasNumber ? 'text-green-700 font-semibold' : 'text-gray-700'}`}>
                          Contains number
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {passwordValidation.hasSpecialChar ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${passwordValidation.hasSpecialChar ? 'text-green-700 font-semibold' : 'text-gray-700'}`}>
                          Contains special character
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-base font-bold text-gray-800 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={resetData.confirmPassword}
                      onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                      className="w-full px-5 py-4 pr-14 text-base border-2 border-gray-300 rounded-xl text-gray-900 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-200 transition-all"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
                    </button>
                  </div>

                  {/* Password Match Indicator */}
                  {resetData.confirmPassword && (
                    <div className="mt-2 flex items-center gap-2">
                      {passwordValidation.passwordsMatch ? (
                        <>
                          <CheckCircleIcon className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-semibold text-green-700">Passwords match</span>
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="w-5 h-5 text-red-600" />
                          <span className="text-sm font-semibold text-red-600">Passwords do not match</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {resetError && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl">
                    <p className="text-sm text-red-800 font-semibold">{resetError}</p>
                  </div>
                )}

                {/* Success Message */}
                {resetSuccess && (
                  <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-xl flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-800 font-semibold">Password reset successful!</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelReset}
                    className="flex-1 px-6 py-4 text-base bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting || resetSuccess}
                    className="flex-1 px-6 py-4 text-base bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 hover:from-blue-700 hover:via-indigo-800 hover:to-purple-900 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg"
                  >
                    {isResetting ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </div>

            <p className="text-center text-white text-sm mt-6 font-medium">
              © 2025 American Circuits. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Login View
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Side - Branding */}
        <div className="hidden lg:block">
          <div className="mb-8">
            <Image
              src="/nexus-logo.svg"
              alt="NEXUS"
              width={520}
              height={140}
              className="mb-6 brightness-0 invert"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Welcome to NEXUS</h1>
          <p className="text-xl text-blue-100 mb-8">
            Advanced Traveler Management System for modern manufacturing operations
          </p>

          <div className="space-y-4 mt-12">
            <div className="flex items-center gap-4 text-white">
              <CheckCircleIcon className="w-8 h-8 flex-shrink-0" />
              <span className="text-lg">Real-time operation tracking</span>
            </div>
            <div className="flex items-center gap-4 text-white">
              <CheckCircleIcon className="w-8 h-8 flex-shrink-0" />
              <span className="text-lg">Labor management & analytics</span>
            </div>
            <div className="flex items-center gap-4 text-white">
              <CheckCircleIcon className="w-8 h-8 flex-shrink-0" />
              <span className="text-lg">Comprehensive reporting</span>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div>
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Image
              src="/nexus-logo.svg"
              alt="NEXUS"
              width={420}
              height={115}
              className="mx-auto mb-4 brightness-0 invert"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <h1 className="text-3xl font-bold text-white">NEXUS</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h2>
            <p className="text-gray-600 mb-8">Access your dashboard</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-base font-bold text-gray-800 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-xl text-gray-900 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-200 transition-all"
                  placeholder="Enter your username"
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-base font-bold text-gray-800 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-5 py-4 pr-14 text-base border-2 border-gray-300 rounded-xl text-gray-900 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-200 transition-all"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    {showPassword ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl">
                  <p className="text-sm text-red-800 font-semibold">{error}</p>
                </div>
              )}

              {/* Reset Password Link */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-indigo-600 hover:text-indigo-800 font-bold text-base transition-colors underline"
                >
                  Reset Password
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 text-lg bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 hover:from-blue-700 hover:via-indigo-800 hover:to-purple-900 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-xl hover:shadow-2xl"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-white text-sm mt-6 font-medium">
            © 2025 American Circuits. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
