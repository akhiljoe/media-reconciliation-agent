import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleClear = () => {
    setEmail("");
    setPassword("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt:", { email, password });
    // Navigate to extractor page after login
    navigate("/extractor");
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
              required
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="forgot-password">
              <a href="#">Forgot Password?</a>
            </div>

            <button type="submit" className="btn btn-primary">
              Login
            </button>
            <button type="button" className="btn btn-secondary">
              Sign Up
            </button>
            <button type="button" className="btn btn-outline" onClick={handleClear}>
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
