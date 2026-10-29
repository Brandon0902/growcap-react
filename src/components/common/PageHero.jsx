function PageHero({ actions, children, eyebrow, icon: Icon, stats = [], title }) {
  const hasStats = Array.isArray(stats) && stats.length > 0;

  return (
    <section className={`page-hero ${!hasStats ? 'page-hero--no-stats' : ''}`}>
      <div className="hero-index" aria-hidden="true">
        GC
      </div>
      <div className="page-hero-copy">
        {eyebrow && (
          <span className="page-kicker">
            {Icon && <Icon size={20} aria-hidden="true" />}
            {eyebrow}
          </span>
        )}
        <h1>{title}</h1>
        {children && (typeof children === 'string' ? <p>{children}</p> : <div className="page-hero-content">{children}</div>)}
        {actions && <div className="hero-actions">{actions}</div>}
      </div>
      {hasStats && (
        <div className="hero-stat-stack" aria-label="Indicadores destacados">
          {stats.map((stat) => (
            <div className="hero-stat" key={stat.label}>
              <span className="hero-stat-rule" aria-hidden="true" />
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default PageHero;
