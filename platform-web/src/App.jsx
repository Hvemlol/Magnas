import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Browse from './pages/Browse';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Saved from './pages/Saved';
import ManufacturerProfile from './pages/ManufacturerProfile';
import ProductDetail from './pages/ProductDetail';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Elements from './pages/Elements';
import ElementDetail from './pages/ElementDetail';
import ArchitectProfile from './pages/ArchitectProfile';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Browse />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="Manufacturer">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved"
            element={
              <ProtectedRoute role="Architect">
                <Saved />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute role="Architect">
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute role="Architect">
                <ProjectDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/elements"
            element={
              <ProtectedRoute role="Architect">
                <Elements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/elements/:id"
            element={
              <ProtectedRoute role="Architect">
                <ElementDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute role="Architect">
                <ArchitectProfile />
              </ProtectedRoute>
            }
          />
          <Route path="/manufacturer/:id" element={<ManufacturerProfile />} />
          <Route path="/product/:id"      element={<ProductDetail />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
