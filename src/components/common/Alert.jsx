function Alert({ children, message, type = 'info', style }) {
  const normalizedType = type === 'danger' ? 'error' : type;
  return (
    <div className={`alert alert-${normalizedType}`} role="alert" style={style}>
      {children || message}
    </div>
  );
}

export default Alert;

