import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { MessageCircle, Eye, EyeOff } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import AuthBackgroundAnimation from "../components/AuthBackgroundAnimation";

const Login = () => {
    const { user, loading, login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (loading) return <div className="page-loader">Loading...</div>;
    if (user) return <Navigate to="/chat" replace />;

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            await login(email, password);
            navigate("/chat", { replace: true });
        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to log in. Try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="auth-page">
            <AuthBackgroundAnimation />
            <section className="auth-card">
                <Link to="/login" className="brand">
                    <span className="brand-icon">
                        <MessageCircle size={23} />
                    </span>
                    <span>Connectly</span>
                </Link>

                <div className="auth-heading">
                    <span className="eyebrow">YOUR SPACE TO CONNECT</span>
                    <h1>Welcome back.</h1>
                    <p>Pick up where your conversations left off.</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <label htmlFor="email">Email address</label>
                    <input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                    />

                    <label htmlFor="password">Password</label>
                    <div className="password-field">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {error && <p className="form-error">{error}</p>}

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={submitting}
                    >
                        {submitting ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                <p className="auth-footer">
                    New to Connectly? <Link to="/register">Create an account</Link>
                </p>
            </section>
        </main>
    );
};

export default Login;