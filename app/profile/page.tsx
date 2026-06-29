'use client'

import { useSelector, useDispatch } from "react-redux"
import { useState } from "react"
import { RootState } from "@/lib/store"
import { logout } from "@/lib/authSlice"
import Link from "next/link"
import axios from "axios"

export default function ProfilePage() {
    const user = useSelector((state: RootState) => state.auth.user)
    const [loading, setLoading] = useState<boolean>(true)
    const dispatch = useDispatch()

    async function handleLogout()
    {

        const result  = await axios.post("/api/auth/logout", {});
        
        if(result.data.success)
        {
            dispatch(logout());
            window.location.href = "/login";
            setLoading(false);
        }else
        {
            alert(result.data.error);
            setLoading(false);
        }
    }
    
    if (!user) {
        return (
             <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
            </div>
        )
    }

    return (
        <div className="page-center" style={{ padding: "24px" }}>
            <div className="animate-fade-in-up" style={{ width: "100%", maxWidth: "480px" }}>
                {/* Profile Header Card */}
                <div className="card-static" style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "36px 28px",
                    marginBottom: "20px",
                }}>
                    {/* Avatar */}
                    <div style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "32px",
                        fontWeight: 700,
                        color: "#fff",
                        marginBottom: "16px",
                        boxShadow: "0 0 32px rgba(0, 192, 135, 0.2)",
                    }}>
                        {user.username.charAt(0).toUpperCase()}
                    </div>

                    <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "4px" }}>
                        {user.username}
                    </h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                        {user.email}
                    </p>

                    <span className="badge badge-green" style={{ marginTop: "12px" }}>
                        Verified
                    </span>
                </div>

                {/* Info Cards */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginBottom: "20px",
                }}>
                    <div className="card-static" style={{ padding: "20px", textAlign: "center" }}>
                        <div style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            marginBottom: "8px",
                            fontWeight: 500,
                        }}>
                            User ID
                        </div>
                        <div style={{
                            fontSize: "0.8rem",
                            fontFamily: "var(--font-mono)",
                            color: "var(--text-primary)",
                            wordBreak: "break-all",
                        }}>
                            {user.id.slice(0, 8)}...
                        </div>
                    </div>

                    <div className="card-static" style={{ padding: "20px", textAlign: "center" }}>
                        <div style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            marginBottom: "8px",
                            fontWeight: 500,
                        }}>
                            Status
                        </div>
                        <div style={{
                            fontSize: "0.875rem",
                            color: "var(--accent-green)",
                            fontWeight: 600,
                        }}>
                            Active
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="card-static" style={{ padding: "8px", marginBottom: "20px" }}>
                    <Link href="/portfolio" style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 16px",
                        borderRadius: "8px",
                        textDecoration: "none",
                        color: "var(--text-primary)",
                        fontSize: "0.9rem",
                        transition: "background 150ms",
                    }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)" }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                    >
                        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span>💼</span> Portfolio
                        </span>
                        <span style={{ color: "var(--text-tertiary)" }}>→</span>
                    </Link>

                    <Link href="/profile/history" style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 16px",
                        borderRadius: "8px",
                        textDecoration: "none",
                        color: "var(--text-primary)",
                        fontSize: "0.9rem",
                        transition: "background 150ms",
                    }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)" }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                    >
                        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span>📜</span> Order History
                        </span>
                        <span style={{ color: "var(--text-tertiary)" }}>→</span>
                    </Link>

                    <Link href="/add-balance" style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 16px",
                        borderRadius: "8px",
                        textDecoration: "none",
                        color: "var(--text-primary)",
                        fontSize: "0.9rem",
                        transition: "background 150ms",
                    }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)" }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                    >
                        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span>💳</span> Add Balance
                        </span>
                        <span style={{ color: "var(--text-tertiary)" }}>→</span>
                    </Link>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="btn btn-danger btn-full"
                >
                    Logout
                </button>
            </div>
        </div>
    )
}