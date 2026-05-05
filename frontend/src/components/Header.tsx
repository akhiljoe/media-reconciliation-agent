import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { logout, getUser } from '../services/auth';
import './Header.css';

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <span className="logo-icon">📊</span>
          <h1>Billing Reconcilliation</h1>
        </div>
        <div className="header-right">
          <p className="tagline">Automated Invoice Processing & Validation</p>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            <span className="theme-icon theme-icon-light">☀️</span>
            <span className="theme-icon theme-icon-dark">🌙</span>
          </button>
          {user && (
            <button
              className="theme-toggle"
              onClick={handleLogout}
              title={`Logged in as ${user}. Click to sign out.`}
              style={{ marginLeft: 8 }}
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
