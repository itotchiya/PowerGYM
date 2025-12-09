import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RoleSelectionPage } from '@/pages/RoleSelectionPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Temporary dashboard placeholder
function DashboardPlaceholder() {
  const { userProfile, session, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
          <div className="space-y-2">
            <p><strong>Role:</strong> {userProfile?.role}</p>
            {session && <p><strong>Subrole:</strong> {session.subrole}</p>}
            {userProfile?.gymId && <p><strong>Gym ID:</strong> {userProfile.gymId}</p>}
          </div>
          <button
            onClick={signOut}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { user, userProfile, session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/dashboard" />} />
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />

        {/* Role Selection */}
        <Route
          path="/select-role"
          element={
            user && userProfile?.role === 'gymclient' && !session ? (
              <RoleSelectionPage />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPlaceholder />
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
