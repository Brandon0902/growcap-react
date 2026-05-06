function PageHero({ actions, children, eyebrow, icon: Icon, stats = [], title }) {
  return (
    <section className="page-hero">
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
        {children && <p>{children}</p>}
        {actions && <div className="hero-actions">{actions}</div>}
      </div>
      {stats.length > 0 && (
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
