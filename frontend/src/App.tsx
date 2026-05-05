import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { ThemeProvider } from './context/ThemeContext'
import Login from './components/Login'
import InvoiceExtractor from './components/InvoiceExtractor'
import DiscrepancyReview from './components/DiscrepancyReview'
import DiscrepancyReport from './components/DiscrepancyReport'
import Header from './components/Header'
import Footer from './components/Footer'
import { isAuthenticated } from './services/auth'

const Protected = ({ children }: { children: JSX.Element }) =>
  isAuthenticated() ? children : <Navigate to="/" replace />

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/extractor"
          element={
            <Protected>
              <div className="app">
                <Header />
                <main className="main-content">
                  <InvoiceExtractor />
                </main>
                <Footer />
              </div>
            </Protected>
          }
        />
        <Route
          path="/review"
          element={
            <Protected>
              <div className="app">
                <Header />
                <main className="main-content">
                  <DiscrepancyReview />
                </main>
                <Footer />
              </div>
            </Protected>
          }
        />
        <Route
          path="/report"
          element={
            <Protected>
              <div className="app">
                <Header />
                <main className="main-content">
                  <DiscrepancyReport />
                </main>
                <Footer />
              </div>
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App
