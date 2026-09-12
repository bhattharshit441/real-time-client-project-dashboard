import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@agency.dev");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="center-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Agency Dashboard</h1>
        <p className="muted">Sign in to continue</p>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        <label>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        {error && <div className="error-text">{error}</div>}
        <button type="submit" disabled={submitting}>{submitting ? "Signing in..." : "Sign in"}</button>
        <div className="seed-hint">
          Seeded accounts (password: Password123!):<br />
          admin@agency.dev · priya.pm@agency.dev · ravi.dev@agency.dev
        </div>
      </form>
    </div>
  );
}
