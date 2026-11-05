import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import AuthBackgroundAnimation from "../components/AuthBackgroundAnimation";

const Register = () => {
    const { user, loading, register } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (loading) return <div className="page-loader">Loading...</div>;
    if (user) return <Navigate to="/chat" replace />;

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 8 || password.length > 72) {
            setError("Password must be between 8 and 72 characters.");
            return;
        }

        setSubmitting(true);

        try {
            await register(username, email, password);
            navigate("/chat", { replace: true });
        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to create your account."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="auth-page">
            <AuthBackgroundAnimation />
            <section className="auth-card">
                <Link to="/register" className="brand">
                    <span className="brand-icon">
                        <MessageCircle size={23} />
                    </span>
                    <span>Connectly</span>
                </Link>

                <div className="auth-heading">
                    <span className="eyebrow">LET'S GET YOU CONNECTED</span>
                    <h1>Create your account.</h1>
                    <p>A little hello can start a great conversation.</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <label htmlFor="username">Username</label>
                    <input
                        id="username"
                        type="text"
                        placeholder="Choose a username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        minLength={3}
                        maxLength={30}
                        autoComplete="username"
                        required
                    />

                    <label htmlFor="register-email">Email address</label>
                    <input
                        id="register-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                    />

                    <label htmlFor="register-password">Password</label>
                    <input
                        id="register-password"
                        type="password"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        maxLength={72}
                        autoComplete="new-password"
                        required
                    />

                    <label htmlFor="confirm-password">Confirm password</label>
                    <input
                        id="confirm-password"
                        type="password"
                        placeholder="Enter your password again"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                    />

                    {error && <p className="form-error">{error}</p>}

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={submitting}
                    >
                        {submitting ? "Creating account..." : "Create account"}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </section>
        </main>
    );
};

export default Register;