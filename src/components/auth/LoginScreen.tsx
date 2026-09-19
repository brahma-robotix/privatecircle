import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';

export const LoginScreen: React.FC = () => {
  const {
    users,
    login,
    authMode,
    setAuthMode,
    supabaseSignIn,
    supabaseSignUp,
    supabaseResetPassword,
  } = useApp();

  const [tab, setTab] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [selectedEmail, setSelectedEmail] = useState<string>(users[0]?.email || '');

  // Form states (passwords are transient only, never persisted)
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-detect invite code & email from query params (e.g. ?invite=PRIV-XXXX-EML)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('invite') || params.get('code');
      const emailParam = params.get('email');

      if (codeParam) {
        setInviteCode(codeParam.trim());
        setTab('signup');
        setSuccessMessage(`Circle invitation code ${codeParam.trim()} detected! Complete registration below.`);
      }
      if (emailParam) {
        setEmail(emailParam.trim());
      }
    }
  }, []);

  // --------------------------------------------------------------------------
  // Supabase Auth Handlers
  // --------------------------------------------------------------------------
  const handleSupabaseSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    const { error } = await supabaseSignIn(email.trim(), password);
    setLoading(false);

    if (error) {
      setErrorMessage(error);
    } else {
      // Clear sensitive form state immediately
      setPassword('');
    }
  };

  const handleSupabaseSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your name or nickname.');
      return;
    }
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify and try again.');
      return;
    }

    setLoading(true);
    const { error } = await supabaseSignUp(
      email.trim(),
      password,
      name.trim(),
      inviteCode.trim()
    );
    setLoading(false);

    if (error) {
      setErrorMessage(error);
    } else {
      setPassword('');
      setConfirmPassword('');
      setInviteCode('');
      setSuccessMessage(
        'Account created successfully! If email confirmation is enabled on your Supabase project, check your inbox to verify your address.'
      );
      setTab('signin');
    }
  };

  const handleSupabaseForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter the email address for your account.');
      return;
    }

    setLoading(true);
    const { success, error } = await supabaseResetPassword(email.trim());
    setLoading(false);

    if (error) {
      setErrorMessage(error);
    } else if (success) {
      setSuccessMessage(
        'Password reset link dispatched! Please check your email inbox to reset your password.'
      );
    }
  };

  // --------------------------------------------------------------------------
  // Mock Mode Handlers (Local Testing Fallback)
  // --------------------------------------------------------------------------
  const handleSelectMockLogin = (userId: string) => {
    setErrorMessage(null);
    setLoading(true);
    setTimeout(() => {
      login(userId);
      setLoading(false);
    }, 250);
  };

  const handleMockEmailFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const user = users.find(
      (u) => u.email.toLowerCase() === selectedEmail.trim().toLowerCase()
    );

    if (!user) {
      setErrorMessage(
        `Email "${selectedEmail}" is not recognized in this private circle. Please select an approved demo account.`
      );
      return;
    }

    if (user.status === 'suspended') {
      setErrorMessage(
        `This account is currently suspended by circle admins. Please contact Alex (admin@example.test).`
      );
      return;
    }

    setLoading(true);
    setTimeout(() => {
      login(user.id);
      setLoading(false);
    }, 250);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Header cluster */}
        <div className="login-header">
          <div className="login-logo-circle">⭕</div>
          <h2>Welcome to PrivateCircle</h2>
          <p className="login-subtitle">
            An invite-only, private communication circle. Strictly no public feeds, no tracking, and no discovery.
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="error-alert" role="alert" style={{ marginBottom: '1.25rem' }}>
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Global Success Banner */}
        {successMessage && (
          <div className="auth-success-alert" role="status">
            <span>✓ {successMessage}</span>
          </div>
        )}

        {/* ================================================================== */}
        {/* SUPABASE CLOUD AUTH VIEW */}
        {/* ================================================================== */}
        {authMode === 'supabase' && (
          <div className="supabase-auth-section">
            {/* Tabs */}
            <div className="auth-nav-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'signin'}
                className={`auth-nav-tab ${tab === 'signin' ? 'active' : ''}`}
                onClick={() => {
                  setTab('signin');
                  setErrorMessage(null);
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'signup'}
                className={`auth-nav-tab ${tab === 'signup' ? 'active' : ''}`}
                onClick={() => {
                  setTab('signup');
                  setErrorMessage(null);
                }}
              >
                Create Account
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'forgot'}
                className={`auth-nav-tab ${tab === 'forgot' ? 'active' : ''}`}
                onClick={() => {
                  setTab('forgot');
                  setErrorMessage(null);
                }}
              >
                Forgot Password
              </button>
            </div>

            {/* TAB 1: SIGN IN */}
            {tab === 'signin' && (
              <form onSubmit={handleSupabaseSignIn} className="login-form">
                <div className="form-group">
                  <label htmlFor="auth-email">Email Address</label>
                  <input
                    id="auth-email"
                    type="email"
                    className="text-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="auth-password">Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="auth-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      className="text-input"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary btn-block"
                  disabled={loading}
                >
                  {loading ? 'Authenticating...' : 'Sign In to PrivateCircle'}
                </button>
              </form>
            )}

            {/* TAB 2: CREATE ACCOUNT */}
            {tab === 'signup' && (
              <form onSubmit={handleSupabaseSignUp} className="login-form">
                <div className="form-group">
                  <label htmlFor="signup-name">Your Name</label>
                  <input
                    id="signup-name"
                    type="text"
                    className="text-input"
                    placeholder="e.g. Alex or Maya"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="signup-email">Email Address</label>
                  <input
                    id="signup-email"
                    type="email"
                    className="text-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="signup-invite-code">Invitation Code</label>
                  <input
                    id="signup-invite-code"
                    type="text"
                    className="text-input"
                    placeholder="Enter circle invite code (e.g. INV-xxxx)"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    disabled={loading}
                    autoComplete="off"
                    style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  />
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                    🔒 PrivateCircle is strictly invite-only. Enter the code issued by your circle admin (initial circle founder can register directly).
                  </span>
                </div>

                <div className="form-group">
                  <label htmlFor="signup-password">Password (min. 6 characters)</label>
                  <div className="password-input-wrapper">
                    <input
                      id="signup-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      className="text-input"
                      placeholder="Choose a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {password.length > 0 && password.length < 6 && (
                    <span style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '4px', display: 'block' }}>
                      ⚠️ Must be at least 6 characters (currently {password.length})
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="signup-confirm-password">Confirm Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="signup-confirm-password"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      className="text-input"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: password === confirmPassword ? '#10b981' : '#ef4444',
                        marginTop: '4px',
                        display: 'block',
                      }}
                    >
                      {password === confirmPassword ? '✓ Passwords match' : '⚠️ Passwords do not match'}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn-primary btn-block"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Register Private Account'}
                </button>
              </form>
            )}

            {/* TAB 3: FORGOT PASSWORD */}
            {tab === 'forgot' && (
              <form onSubmit={handleSupabaseForgot} className="login-form">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Enter your registered email address and we will dispatch a secure link to reset your password.
                </p>

                <div className="form-group">
                  <label htmlFor="forgot-email">Account Email</label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="text-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary btn-block"
                  disabled={loading}
                >
                  {loading ? 'Dispatching Link...' : 'Send Password Reset Link'}
                </button>
              </form>
            )}

            {/* Dev Mode Switcher */}
            <div className="auth-dev-switch-box">
              <button
                type="button"
                className="auth-dev-switch-btn"
                onClick={() => setAuthMode('mock')}
                title="Switch to local simulated accounts"
              >
                <span>🧪 Switch to Demo / Mock Mode</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* PROTOTYPE DEMO / MOCK MODE VIEW */}
        {/* ================================================================== */}
        {authMode === 'mock' && (
          <div className="mock-demo-section">
            <div className="demo-notice">
              <span className="demo-badge">PROTOTYPE DEMO</span>
              <p>
                This application is running locally. No passwords or cloud services are used. Choose a mock account below to begin testing.
              </p>
            </div>

            <div className="quick-login-section">
              <h3>Quick 1-Click Demo Login</h3>
              <div className="quick-login-grid">
                {users.map((user) => {
                  const isAdmin = user.role === 'admin';
                  const isSuspended = user.status === 'suspended';

                  return (
                    <button
                      key={user.id}
                      className={`account-card ${isSuspended ? 'account-suspended' : ''}`}
                      onClick={() => handleSelectMockLogin(user.id)}
                      disabled={loading}
                    >
                      <div
                        className="account-avatar"
                        style={{ backgroundColor: user.avatarBg }}
                      >
                        {user.name.charAt(0)}
                      </div>
                      <div className="account-info">
                        <div className="account-name-row">
                          <span className="account-name">{user.name}</span>
                          <Badge
                            label={isAdmin ? 'Admin' : 'Member'}
                            variant={isAdmin ? 'primary' : 'neutral'}
                          />
                          {isSuspended && (
                            <Badge label="Suspended" variant="danger" />
                          )}
                        </div>
                        <span className="account-email">{user.email}</span>
                      </div>
                      <span className="login-arrow">➔</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="login-divider">
              <span>or sign in by email selection</span>
            </div>

            <form onSubmit={handleMockEmailFormSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email-select">Select Demo Email:</label>
                <select
                  id="email-select"
                  value={selectedEmail}
                  onChange={(e) => setSelectedEmail(e.target.value)}
                  className="select-input"
                  disabled={loading}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.name} ({user.email}) - {user.role.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="btn-primary btn-block"
                disabled={loading}
              >
                {loading ? 'Entering PrivateCircle...' : 'Enter as Selected User'}
              </button>
            </form>

            {/* Switch back to Supabase */}
            <div className="auth-dev-switch-box">
              <button
                type="button"
                className="auth-dev-switch-btn"
                onClick={() => setAuthMode('supabase')}
                title="Switch back to Supabase Cloud Authentication"
              >
                <span>⚡ Switch to Supabase Cloud Auth</span>
              </button>
            </div>
          </div>
        )}

        <div className="login-footer">
          <p>
            🔒 Privacy Guarantee: End-to-end invite-only space. Passwords are never stored in browser storage.
          </p>
        </div>
      </div>
    </div>
  );
};
