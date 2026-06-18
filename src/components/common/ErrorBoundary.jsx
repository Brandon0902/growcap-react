import React from 'react';
import Button from './Button.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error de interfaz Growcap:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app-error">
          <section className="card app-error-card" role="alert">
            <span className="page-kicker">Error de interfaz</span>
            <h1>No fue posible cargar esta vista</h1>
            <p>
              La aplicacion encontro un problema al cambiar de pantalla. Recarga la vista para continuar.
            </p>
            <Button onClick={() => window.location.reload()}>
              Recargar
            </Button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
