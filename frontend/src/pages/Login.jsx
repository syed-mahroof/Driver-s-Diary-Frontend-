import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { authAPI } from '../utils/api';
import '../styles/Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [fpStep, setFpStep] = useState(1); // 1=contact, 2=OTP, 3=new password, 4=success
  const [fpContact, setFpContact] = useState('');
  const [fpOTP, setFpOTP] = useState(['', '', '', '', '', '']);
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');
  const [fpMessage, setFpMessage] = useState('');
  const [fpContactType, setFpContactType] = useState('');
  const otpRefs = useRef([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userData = await login(username, password);
      navigate(userData.isAdmin ? '/admin' : '/driver');
    } catch {}
  };

  const handleForgotOpen = () => {
    setShowForgot(true);
    setFpStep(1);
    setFpContact('');
    setFpOTP(['', '', '', '', '', '']);
    setFpNewPassword('');
    setFpConfirmPassword('');
    setFpError('');
    setFpMessage('');
  };

  const handleForgotClose = () => {
    setShowForgot(false);
    setFpStep(1);
    setFpError('');
    setFpMessage('');
  };

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!fpContact.trim()) {
      setFpError('Please enter your email address.');
      return;
    }
    if (!fpContact.includes('@')) {
      setFpError('Please enter a valid email address.');
      return;
    }
    setFpLoading(true);
    setFpError('');
    try {
      const { data } = await authAPI.forgotPassword(fpContact.trim());
      setFpMessage(data.message);
      setFpContactType(data.contact_type);
      setFpStep(2);
      // Focus first OTP input after render
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setFpError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setFpLoading(false);
    }
  };

  // OTP input handling
  const handleOTPChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // only digits
    const newOTP = [...fpOTP];
    newOTP[index] = value.slice(-1);
    setFpOTP(newOTP);
    setFpError('');
    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !fpOTP[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOTPPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setFpOTP(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otpString = fpOTP.join('');
    if (otpString.length !== 6) {
      setFpError('Please enter the complete 6-digit OTP.');
      return;
    }
    setFpLoading(true);
    setFpError('');
    try {
      await authAPI.verifyOTP(fpContact.trim(), otpString);
      setFpStep(3);
    } catch (err) {
      setFpError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setFpLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (fpNewPassword.length < 6) {
      setFpError('Password must be at least 6 characters.');
      return;
    }
    if (fpNewPassword !== fpConfirmPassword) {
      setFpError('Passwords do not match.');
      return;
    }
    setFpLoading(true);
    setFpError('');
    try {
      await authAPI.resetPassword(fpContact.trim(), fpOTP.join(''), fpNewPassword);
      setFpStep(4);
    } catch (err) {
      setFpError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setFpLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setFpLoading(true);
    setFpError('');
    setFpOTP(['', '', '', '', '', '']);
    try {
      const { data } = await authAPI.forgotPassword(fpContact.trim());
      setFpMessage(data.message);
      setFpError('');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setFpError(err.response?.data?.error || 'Failed to resend OTP.');
    } finally {
      setFpLoading(false);
    }
  };

  // Forgot password flow UI
  if (showForgot) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <img src="/logo.png" alt="Logo" className="logo-img" />
            <h1>Driver's Diary</h1>
            <p className="header-subtext">By <span>HeadGreen!<sup className="brand-tm">™</sup></span></p>
            <h2 style={{ fontSize: '1.2rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>Reset Password</h2>
            <p>
              {fpStep === 1 && 'Enter your registered email address'}
              {fpStep === 2 && 'Enter the OTP sent to you'}
              {fpStep === 3 && 'Create a new password'}
              {fpStep === 4 && 'Password reset complete'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="fp-steps">
            {[1, 2, 3, 4].map(step => (
              <div
                key={step}
                className={`fp-step-dot ${fpStep >= step ? 'active' : ''} ${fpStep === step ? 'current' : ''}`}
              />
            ))}
          </div>

          {fpError && <div className="error-banner">{fpError}</div>}
          {fpMessage && fpStep === 2 && <div className="success-banner">{fpMessage}</div>}

          {/* Step 1: Enter contact */}
          {fpStep === 1 && (
            <form onSubmit={handleSendOTP} className="login-form">
              <div className="form-group">
                <label htmlFor="fp-contact">Email Address</label>
                <input
                  id="fp-contact"
                  type="email"
                  value={fpContact}
                  onChange={e => { setFpContact(e.target.value); setFpError(''); }}
                  placeholder="Enter your registered email"
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-login" disabled={fpLoading}>
                {fpLoading ? <span className="spinner-sm" /> : 'Send OTP'}
              </button>
              <button type="button" className="btn-text" onClick={handleForgotClose}>
                ← Back to Sign In
              </button>
            </form>
          )}

          {/* Step 2: Enter OTP */}
          {fpStep === 2 && (
            <form onSubmit={handleVerifyOTP} className="login-form">
              <div className="otp-input-group" onPaste={handleOTPPaste}>
                {fpOTP.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="otp-input"
                    value={digit}
                    onChange={e => handleOTPChange(i, e.target.value)}
                    onKeyDown={e => handleOTPKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <button type="submit" className="btn-login" disabled={fpLoading}>
                {fpLoading ? <span className="spinner-sm" /> : 'Verify OTP'}
              </button>
              <button type="button" className="btn-text" onClick={handleResendOTP} disabled={fpLoading}>
                Didn't receive it? Resend OTP
              </button>
              <button type="button" className="btn-text" onClick={() => { setFpStep(1); setFpError(''); }}>
                ← Change contact info
              </button>
            </form>
          )}

          {/* Step 3: New password */}
          {fpStep === 3 && (
            <form onSubmit={handleResetPassword} className="login-form">
              <div className="form-group">
                <label htmlFor="fp-new-password">New Password</label>
                <input
                  id="fp-new-password"
                  type="password"
                  value={fpNewPassword}
                  onChange={e => { setFpNewPassword(e.target.value); setFpError(''); }}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="fp-confirm-password">Confirm Password</label>
                <input
                  id="fp-confirm-password"
                  type="password"
                  value={fpConfirmPassword}
                  onChange={e => { setFpConfirmPassword(e.target.value); setFpError(''); }}
                  placeholder="Repeat new password"
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="btn-login" disabled={fpLoading}>
                {fpLoading ? <span className="spinner-sm" /> : 'Reset Password'}
              </button>
            </form>
          )}

          {/* Step 4: Success */}
          {fpStep === 4 && (
            <div className="fp-success">
              <div className="fp-success-icon">✓</div>
              <p className="fp-success-text">Your password has been reset successfully!</p>
              <button className="btn-login" onClick={handleForgotClose}>
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo.png" alt="Logo" className="logo-img" />
          <h1>Driver's Diary</h1>
          <p className="header-subtext">By <span>HeadGreen!</span></p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-banner">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="button" className="forgot-password-link" onClick={handleForgotOpen}>
            Forgot Password?
          </button>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <span className="spinner-sm" />
            ) : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          New driver? <Link to="/register">Create an account</Link>
        </p>
        <p className="login-footer">Works offline after first login</p>
      </div>
    </div>
  );
}
