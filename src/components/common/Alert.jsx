function Alert({ children, type = 'info' }) {
  return (
    <div className={`alert alert-${type}`} role="alert">
      {children}
    </div>
  );
}

export default Alert;
