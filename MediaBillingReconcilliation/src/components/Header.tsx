import { useTheme } from '../context/ThemeContext';
import './Header.css';

const Header = () => {
  const { theme, toggleTheme } = useTheme();

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
        </div>
      </div>
    </header>
  );
};

export default Header;
