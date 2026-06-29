'use client'

import { useState } from "react"
import { useDispatch } from "react-redux"
import { setAuthUser } from "@/lib/authSlice"
import Link from "next/link"
import {toast} from 'react-toastify'
import axios from "axios"           

export default function LoginPage() {
    const dispatch = useDispatch()
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(event.currentTarget)
        const result = await axios.post("/api/auth/login", formData);
        
        setLoading(false)

        if (result.data.success && result.data.user) {
            dispatch(setAuthUser(result.data.user))
            window.location.href = "/profile";
            toast("Login successful!", {
                    position: "top-right",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "dark"
                  })
            } else {
            setError(result.data.error || 'Failed to login.')
        }
    }

    return (
        <div className="page-center" style={{ padding: "24px" }}>
            <div className="animate-fade-in-up" style={{ width: "100%", maxWidth: "420px" }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "32px" }}>
                    <div style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "#fff",
                        margin: "0 auto 16px",
                        boxShadow: "0 0 24px rgba(0, 192, 135, 0.2)",
                    }}>
                        ₿
                    </div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>
                        Welcome back
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        Sign in to access your trading dashboard
                    </p>
                </div>

                {/* Form Card */}
                <div className="card-static" style={{ padding: "28px" }}>
                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: "20px" }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                        <div className="input-group">
                            <label className="input-label" htmlFor="login-email">Email</label>
                            <input
                                id="login-email"
                                className="input-field"
                                type="email"
                                name="email"
                                placeholder="you@example.com"
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label" htmlFor="login-password">Password</label>
                            <input
                                id="login-password"
                                className="input-field"
                                type="password"
                                name="password"
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary btn-full"
                            style={{ marginTop: "4px", height: "46px" }}
                        >
                            {loading ? (
                                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span className="spinner spinner-sm" /> Signing in...
                                </span>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer link */}
                <p style={{
                    textAlign: "center",
                    marginTop: "20px",
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                }}>
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" style={{ fontWeight: 600 }}>
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    )
}