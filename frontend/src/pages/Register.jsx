import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import '../styles/Login.css';

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState('');
  const { register, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email.trim()) {
      setLocalError('Email address is required.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    try {
      await register({
        name: form.name,
        phone: form.phone,
        email: form.email,
        username: form.username,
        password: form.password,
      });
      navigate('/driver');
    } catch {}
  };

  return (
    <div className="login-page">
      <div className="login-card register-card">
        <div className="login-logo">
          <img src="/logo.png" alt="Logo" className="logo-img" />
          <h1>Driver's Diary</h1>
          <p className="header-subtext">By <span>HeadGreen!<sup className="brand-tm">™</sup></span></p>
          <p className="logo-description">Driver Monitoring System</p>
          <h2 style={{ fontSize: '1.2rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>Create Account</h2>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {(localError || error) && (
            <div className="error-banner">{localError || error}</div>
          )}

          <div className="form-group">
            <label htmlFor="name">Driver Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter full name"
              required
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email <span className="required-dot" title="Required">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter email address"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)', fontWeight: 400 }}>(optional)</span></label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              autoComplete="tel"
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="Choose username"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? <span className="spinner-sm" /> : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
