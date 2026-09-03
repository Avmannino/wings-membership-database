import { useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

import "./LoginPage.css";

function LoginPage() {
  const {
    user,
    loading,
    login,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] =
    useState(false);

  if (loading) {
    return null;
  }

  if (user) {
    return <Navigate to="/check-in" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      await login(
        email.trim(),
        password
      );
    } catch (loginError) {
      console.error(loginError);

      setError(
        "The email or password you entered is incorrect."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          WINGS ARENA
        </div>

        <div className="login-subtitle">
          Membership Database
        </div>

        <h1>Staff Sign In</h1>

        <p className="login-description">
          Sign in to access member check-in and
          membership management.
        </p>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >
          <label>
            <span>Email</span>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>Password</span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={submitting}
          >
            {submitting
              ? "Signing In..."
              : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;