import { useAuth } from "../context/AuthContext";
import { AdminDashboard } from "./AdminDashboard";
import { PMDashboard } from "./PMDashboard";
import { DeveloperDashboard } from "./DeveloperDashboard";

// Routes to the correct dashboard by role. Server-side scoping (not this
// switch) is what actually prevents cross-role data access.
export function Home() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "ADMIN") return <AdminDashboard />;
  if (user.role === "PM") return <PMDashboard />;
  return <DeveloperDashboard />;
}
