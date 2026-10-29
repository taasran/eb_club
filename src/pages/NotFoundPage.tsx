import ThemeToggle from "../components/ThemeToggle"

export default function NotFoundPage() {
  return (
    <main className="admin-page">
      <section className="admin-login">
        <ThemeToggle className="recovery-theme" />
        <div className="eyebrow">PAGE NOT FOUND</div>
        <h1>That page is unavailable.</h1>
        <p>Use the website home page or open the club admin dashboard.</p>
        <div className="hero-actions">
          <a className="button primary" href="/">
            Go to home
          </a>
          <a className="button secondary" href="/admin">
            Open admin
          </a>
        </div>
      </section>
    </main>
  )
}
