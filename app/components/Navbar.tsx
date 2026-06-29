'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSelector } from 'react-redux'
import { RootState } from '@/lib/store'

const navLinks = [
  { href: '/ticker', label: 'Markets', icon: '📊' },
  { href: '/spot/BTC_INR', label: 'Trade', icon: '⚡' },
  { href: '/portfolio', label: 'Portfolio', icon: '💼' },
  { href: '/add-balance', label: 'Deposit', icon: '💳' },
]

export default function Navbar() {
  const pathname = usePathname()
  const user = useSelector((state: RootState) => state.auth.user)

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '64px',
      padding: '0 24px',
      background: 'rgba(11, 14, 17, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-primary)',
    }}>
      {/* Logo Section */}
      <Link href="/" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 700,
          color: '#fff',
          boxShadow: '0 0 16px rgba(0, 192, 135, 0.25)',
        }}>
          ₿
        </div>
        <span style={{
          fontSize: '1.1rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>
          TradeX
        </span>
      </Link>

      {/* Navigation Links */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}>
        {navLinks.map((link) => {
          const isActive = pathname === link.href || pathname?.startsWith(link.href.split('/').slice(0, 2).join('/') + '/')

          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: isActive ? 'var(--accent-green)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-green-muted)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-primary)'
                  e.currentTarget.style.background = 'var(--bg-tertiary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-secondary)'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <span style={{ fontSize: '14px' }}>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Auth Section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        {user ? (
          <Link href="/profile" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 14px',
            borderRadius: '8px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-primary)',
            textDecoration: 'none',
            transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-secondary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-primary)'
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              color: '#fff',
            }}>
              {user?.username?.charAt(0)?.toUpperCase()}
            </div>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}>
              {user?.username}
            </span>
          </Link>
        ) : (
          <>
            <Link href="/login" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
              Login
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
