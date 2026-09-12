import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "./NotificationBell";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">Agency Dashboard</Link>
        <div className="topbar-right">
          {user && (
            <>
              <span className="role-pill">{user.role}</span>
              <span>{user.name}</span>
              <NotificationBell />
              <button className="link-btn" onClick={handleLogout}>Logout</button>
            </>
          )}
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
