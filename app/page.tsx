import Link from "next/link";

export default function HomePage() {
  return (
    <div className="landing">
      <div className="landing-content">
        <header>
          <p className="landing-brand">
            Milestones<span>AI Running</span>
          </p>
          <Link className="landing-nav" href="/login">
            Logg inn
          </Link>
        </header>

        <main>
          <span className="landing-eyebrow">AI-drevet løpetrener</span>
          <h1>
            Løp mot
            <br />
            <em>målene dine</em>
          </h1>
          <p className="landing-lead">
            Daglige treningsråd fra Garmin og Gemini — tilpasset formen og
            målene dine.
          </p>

          <ul className="landing-features">
            <li>
              <span className="landing-tick" aria-hidden="true">
                ✓
              </span>
              Synker automatisk med Garmin Connect
            </li>
            <li>
              <span className="landing-tick" aria-hidden="true">
                ✓
              </span>
              AI-analyse av hver økt med Gemini
            </li>
            <li>
              <span className="landing-tick" aria-hidden="true">
                ✓
              </span>
              Personlig plan mot ditt neste løp
            </li>
          </ul>

          <div className="landing-actions">
            <Link className="btn btn-primary" href="/login">
              Kom i gang
            </Link>
            <Link className="btn landing-ghost" href="/login">
              Logg inn
            </Link>
          </div>

          <p className="landing-footnote">
            Personlig løpetrener med Garmin + Gemini.
          </p>
        </main>
      </div>
    </div>
  );
}
