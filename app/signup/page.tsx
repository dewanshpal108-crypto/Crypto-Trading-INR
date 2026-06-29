'use client'

import { useState } from 'react'
import axios from "axios"
import Link from 'next/link'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const result = await axios.post("/api/auth/signup", formData);

    setLoading(false)
    console.log("result: ", result.data);
    if (result.data.success) {
      console.log(result.data.message)
      toast(result.data.message, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        // transition: Bounce,
      })
      router.push("/login")
    } else {
      setError(result.data.error || 'Failed to register.')
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
            Create your account
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Start trading crypto in under a minute
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
              <label className="input-label" htmlFor="signup-username">Username</label>
              <input
                id="signup-username"
                className="input-field"
                type="text"
                name="username"
                placeholder="satoshi"
                required
                autoComplete="username"
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                className="input-field"
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                className="input-field"
                type="password"
                name="password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
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
                  <span className="spinner spinner-sm" /> Creating account...
                </span>
              ) : (
                "Create Account"
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
          Already have an account?{" "}
          <Link href="/login" style={{ fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}