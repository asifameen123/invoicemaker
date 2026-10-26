import React, { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { signIn, signUp, resetPasswordForEmail } from '../lib/supabaseClient';

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode); // 'signin', 'signup', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleModeSwitch = (newMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (mode === 'forgot') {
      setIsLoading(true);
      try {
        await resetPasswordForEmail(email);
        setSuccessMsg('Password reset link sent to your email! Please check your inbox.');
      } catch (err) {
        setErrorMsg(err.message || 'Failed to send password reset email.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please retype carefully.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signin') {
        const { user } = await signIn(email, password);
        if (user) {
          onSuccess(user, 'Signed in successfully!');
          onClose();
        }
      } else if (mode === 'signup') {
        const data = await signUp(email, password);
        if (data?.user) {
          // Check if email confirmation is required by Supabase settings
          if (data.session) {
            onSuccess(data.user, 'Account created and signed in successfully!');
            onClose();
          } else {
            setSuccessMsg('Account created! Please check your email to confirm your account, then sign in.');
            setMode('signin');
          }
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="auth-header-title">
            <div className="auth-icon-badge">
              <Sparkles size={20} className="text-primary" />
            </div>
            <div>
              <h3>
                {mode === 'signin' && 'Welcome Back'}
                {mode === 'signup' && 'Create Your Account'}
                {mode === 'forgot' && 'Reset Password'}
              </h3>
              <p className="modal-subtitle">
                {mode === 'signin' && 'Log in to auto-fill your company details & access previous invoices'}
                {mode === 'signup' && 'Start saving your company profile & invoice history to the cloud'}
                {mode === 'forgot' && 'Enter your email to receive a password reset link'}
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Tab switchers */}
        {mode !== 'forgot' && (
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('signup')}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Alerts */}
        {errorMsg && (
          <div className="auth-alert auth-alert-error">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert auth-alert-success">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label className="input-label" htmlFor="auth-email">
              Email Address
            </label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="auth-email"
                type="email"
                className="input-field auth-input"
                placeholder="you@yourcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="input-group">
              <div className="auth-label-row">
                <label className="input-label" htmlFor="auth-password">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    className="auth-link-text text-sm"
                    onClick={() => handleModeSwitch('forgot')}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field auth-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="input-group">
              <label className="input-label" htmlFor="auth-confirm-password">
                Confirm Password
              </label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="auth-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field auth-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary auth-submit-btn"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>
                {mode === 'signin' && 'Sign In to Account'}
                {mode === 'signup' && 'Create Free Account'}
                {mode === 'forgot' && 'Send Reset Link'}
              </span>
            )}
          </button>

          {mode === 'forgot' && (
            <div className="auth-switch-prompt">
              <button
                type="button"
                className="auth-link-text"
                onClick={() => handleModeSwitch('signin')}
              >
                Back to Sign In
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
