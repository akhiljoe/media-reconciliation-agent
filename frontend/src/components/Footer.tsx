import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <p>© 2025 AI Marketing Campaign Generator | Powered by OpenAI GPT-4o</p>
        <div className="footer-links">
          <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer">
            OpenAI
          </a>
          <span>•</span>
          <a href="https://vitejs.dev/" target="_blank" rel="noopener noreferrer">
            Vite
          </a>
          <span>•</span>
          <a href="https://react.dev/" target="_blank" rel="noopener noreferrer">
            React
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
