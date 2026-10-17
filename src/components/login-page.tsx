import { useState, type FormEvent } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useAuth } from '../contexts/auth'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const redirectTo = useRouterState({
    select: (state) => (state.location.search as { redirect?: string }).redirect ?? '/app',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)

    try {
      await signIn(String(formData.get('email') ?? ''), String(formData.get('password') ?? ''))
      await navigate({ to: redirectTo as never, replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-form-side" aria-labelledby="login-title">
        <div className="login-brand" aria-label="eventOS">
          <span className="login-brand-mark">E</span>
          <span>event<span className="login-brand-accent">OS</span></span>
        </div>

        <div className="login-form-wrap">
          <p className="login-kicker">ADMINISTRATOR ACCESS</p>
          <h1 id="login-title">Welcome back</h1>
          <p className="login-intro">Sign in to manage your events and bring people together.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="username" placeholder="you@company.com" required disabled={isSubmitting} />
            </div>
            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required disabled={isSubmitting} />
            </div>
            {error && <p role="alert" className="login-error">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="login-submit">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="login-security"><span aria-hidden="true">◈</span> Secure administrator access</p>
        </div>

        <p className="login-footer">© {new Date().getFullYear()} eventOS</p>
      </section>

      <aside className="login-story" aria-label="Event OS for Africa">
        <div className="login-story-top"><span className="login-story-dot" /> Made for Africa’s event builders</div>
        <svg className="login-africa" viewBox="0 0 430 540" role="img" aria-label="Map silhouette of Africa">
          <defs>
            <pattern id="africa-lines" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="#0f766e" />
              <path d="M0 0V8" stroke="#99f6e4" strokeOpacity=".72" strokeWidth="2" />
            </pattern>
          </defs>
          <path fill="url(#africa-lines)" d="M83 25 137 15 174 27 211 22 243 41 271 47 292 66 326 77 342 103 365 111 360 137 379 154 367 177 376 201 355 219 359 243 339 260 344 285 327 300 320 329 302 347 294 373 277 390 266 420 249 446 235 480 218 514 204 494 193 461 177 438 159 417 151 391 141 371 129 346 115 324 102 299 94 273 79 250 74 222 59 201 65 176 50 152 61 127 55 105 69 85 65 63 78 47Z" />
          <path d="M350 418c7-5 13-3 16 2l-5 11-10 1-5-7z" fill="url(#africa-lines)" />
        </svg>
        <div className="login-story-copy">
          <p className="login-story-eyebrow">EVENTS, ROOTED HERE</p>
          <h2>Make room<br />for what brings<br />us together.</h2>
          <p>One place to create, manage, and grow unforgettable events across Africa.</p>
          <div className="login-story-rule" />
          <span className="login-story-caption">Built for the people who make it happen.</span>
        </div>
      </aside>
    </main>
  )
}
