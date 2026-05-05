import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/auth";
import "./Login.css";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleClear = () => {
    setEmail("");
    setPassword("");
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password required.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/extractor");
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error;
      if (status === 429) {
        setError(msg || "Too many failed attempts. Wait a minute.");
      } else if (status === 401) {
        setError(msg || "Invalid email or password.");
      } else if (status === 400) {
        setError(msg || "Bad request.");
      } else {
        setError("Login service unreachable. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Left Section */}
      <div className="left-panel">
        <div className="left-content">
          <h1 className="title">Media Billing Reconciliation</h1>
          <p className="subtitle">
            Media Billing Reconciliation using Agentic AI.
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="right-panel">
        <div className="login-card">
          <div className="login-header">
            <div className="shield-icon">🛡️</div>
            <h2>Login to Continue</h2>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="john.doe@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              disabled={submitting}
              required
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={submitting}
              required
            />

            {error && (
              <div
                className="login-error"
                role="alert"
                style={{
                  color: "#c62828",
                  background: "#fdecea",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  margin: "8px 0",
                  fontSize: "0.9em",
                }}
              >
                {error}
              </div>
            )}

            <div className="forgot-password">
              <a href="#">Forgot Password?</a>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Login"}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleClear}
              disabled={submitting}
            >
              Clear
            </button>
          </form>

          <p className="powered-text">Powered by Agentic AI</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
