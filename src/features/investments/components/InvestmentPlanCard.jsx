function InvestmentPlanCard({ description, name }) {
  return (
    <article className="plan-card">
      <h3>{name}</h3>
      <p>{description}</p>
      <span aria-hidden="true">Preparado para solicitud</span>
    </article>
  );
}

export default InvestmentPlanCard;
