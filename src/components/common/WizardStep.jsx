function WizardStep({ children, description, question }) {
  return (
    <div className="guided-step">
      <div className="guided-step-copy">
        <h3>{question}</h3>
        <p>{description}</p>
      </div>
      <div className="guided-step-control">
        {children}
      </div>
    </div>
  );
}

export default WizardStep;
