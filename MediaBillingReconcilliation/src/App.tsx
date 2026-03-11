import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { ThemeProvider } from './context/ThemeContext'
import Login from './components/Login'
import InvoiceExtractor from './components/InvoiceExtractor'
import DiscrepancyReview from './components/DiscrepancyReview'
import DiscrepancyReport from './components/DiscrepancyReport'
import Header from './components/Header'
import Footer from './components/Footer'

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/extractor"
          element={
            <div className="app">
              <Header />
              <main className="main-content">
                <InvoiceExtractor />
              </main>
              <Footer />
            </div>
          }
        />
        <Route
          path="/review"
          element={
            <div className="app">
              <Header />
              <main className="main-content">
                <DiscrepancyReview />
              </main>
              <Footer />
            </div>
          }
        />
        <Route
          path="/report"
          element={
            <div className="app">
              <Header />
              <main className="main-content">
                <DiscrepancyReport />
              </main>
              <Footer />
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App
