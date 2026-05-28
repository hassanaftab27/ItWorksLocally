import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "@/features/auth/SessionProvider";
import { Layout } from "@/app/Layout";
import { LoginPage } from "@/pages/Login";
import { HomePage } from "@/pages/Home";
import { ChannelPage } from "@/pages/ChannelPage";
import { AdminUsersPage } from "@/pages/AdminUsers";
import { AdminCategoriesPage } from "@/pages/AdminCategories";
import { NotFoundPage } from "@/pages/NotFound";
import { isAdmin } from "@/lib/permissions";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, session } = useSession();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { loading, profile } = useSession();
  if (loading) return <FullPageSpinner />;
  if (!isAdmin(profile)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function FullPageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center text-muted-foreground">
      Loading...
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="channels/:channelName" element={<ChannelPage />} />
          <Route
            path="admin/users"
            element={
              <RequireAdmin>
                <AdminUsersPage />
              </RequireAdmin>
            }
          />
          <Route
            path="admin/categories"
            element={
              <RequireAdmin>
                <AdminCategoriesPage />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
