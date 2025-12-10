import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RoleSelection } from '@/pages/RoleSelection';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Dashboard Pages
import { GymDashboard } from '@/pages/dashboard/GymDashboard';
import { SuperAdminDashboard } from '@/pages/superadmin/SuperAdminDashboard';
import { GymRequestsPage } from '@/pages/superadmin/GymRequestsPage';

// Gym Client Pages
import { MembersPage } from '@/pages/members/MembersPage';
import { MemberProfilePage } from '@/pages/members/MemberProfilePage';
import { ExpiringSoonPage } from '@/pages/ExpiringSoonPage';
import { WarningsPage } from '@/pages/WarningsPage';
import { DeletedMembersPage } from '@/pages/DeletedMembersPage';
import { PlansPage } from '@/pages/PlansPage';
import { SettingsPage } from '@/pages/SettingsPage';

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
        <Route
          path="/"
          element={!user ? <LandingPage /> : (
            userProfile?.role === 'superadmin' ? <Navigate to="/superadmin/dashboard" /> :
              !session ? <Navigate to="/select-role" /> : <Navigate to="/dashboard" />
          )}
        />
        <Route
          path="/login"
          element={!user ? <LoginPage /> : (
            userProfile?.role === 'superadmin' ? <Navigate to="/superadmin/dashboard" /> :
              !session ? <Navigate to="/select-role" /> : <Navigate to="/dashboard" />
          )}
        />

        {/* Role Selection */}
        <Route
          path="/select-role"
          element={
            user && userProfile?.role === 'gymclient' && !session ? (
              <RoleSelection />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />

        {/* Super Admin Routes */}
        <Route
          path="/superadmin/dashboard"
          element={
            <ProtectedRoute requireSuperAdmin>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/requests"
          element={
            <ProtectedRoute requireSuperAdmin>
              <GymRequestsPage />
            </ProtectedRoute>
          }
        />

        {/* Gym Client Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <GymDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/members"
          element={
            <ProtectedRoute>
              <MembersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/members/:memberId"
          element={
            <ProtectedRoute>
              <MemberProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/expiring-soon"
          element={
            <ProtectedRoute>
              <ExpiringSoonPage />
            </ProtectedRoute>
          }
        />

        {/* Owner-Only Routes */}
        <Route
          path="/warnings"
          element={
            <ProtectedRoute requireOwner>
              <WarningsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/deleted"
          element={
            <ProtectedRoute requireOwner>
              <DeletedMembersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/plans"
          element={
            <ProtectedRoute requireOwner>
              <PlansPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute requireOwner>
              <SettingsPage />
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
