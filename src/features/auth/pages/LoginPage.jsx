import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';
import logoGrowcap from '../../../assets/rombo_blanco.png';
import useForm from '../../../hooks/useForm.js';
import useAuth from '../hooks/useAuth.js';

function getRedirectTarget(location) {
  const target = location.state?.from;

  if (!target || typeof target.pathname !== 'string') {
    return '/';
  }

  if (target.pathname === '/login') {
    return '/';
  }

  return `${target.pathname}${target.search || ''}${target.hash || ''}`;
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = getRedirectTarget(location);
  const { isAuthenticated, isLoading, login } = useAuth();
  const { values, handleChange } = useForm({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isInactiveSession = location.state?.reason === 'inactivity';

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTarget]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError('');
    setIsSubmitting(true);

    try {
      await login(values);
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      setFieldErrors(error.fieldErrors || {});
      setFormError(error.message || 'No fue posible iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldError = (field) => {
    const error = fieldErrors[field];
    return Array.isArray(error) ? error[0] : error;
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="login-brand" aria-label="Growcap">
        <span className="brand-mark" aria-hidden="true">
          <img src={logoGrowcap} alt="" className="brand-logo" />
        </span>
        <strong>{import.meta.env.VITE_APP_NAME || 'Growcap'}</strong>
      </div>
      <div className="form-intro">
        <h2>Bienvenido</h2>
        <p>Ingresa tus datos para continuar de forma segura.</p>
      </div>
      {formError && <Alert type="error">{formError}</Alert>}
      {!formError && isInactiveSession && (
        <Alert type="info">Tu sesión finalizó por inactividad.</Alert>
      )}
      <div className="motion-form">
        <Input
          autoCapitalize="none"
          autoComplete="username"
          autoCorrect="off"
          enterKeyHint="next"
          error={getFieldError('email')}
          id="email"
          inputMode="email"
          label="Correo electrónico o usuario"
          name="email"
          onChange={handleChange}
          placeholder="nombre@correo.com"
          spellCheck={false}
          type="text"
          value={values.email}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Input
            action={
              <button
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted, #64748b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  margin: '-4px',
                  borderRadius: '6px',
                }}
                type="button"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            autoCapitalize="none"
            autoComplete="current-password"
            autoCorrect="off"
            enterKeyHint="done"
            error={getFieldError('password')}
            id="password"
            inputMode="text"
            label="Contraseña"
            name="password"
            onChange={handleChange}
            placeholder="Ingresa tu contraseña"
            spellCheck={false}
            type={showPassword ? 'text' : 'password'}
            value={values.password}
          />
          <Link to="/forgot-password" style={{ fontSize: '0.875rem', alignSelf: 'flex-end', textDecoration: 'none', color: 'var(--color-primary, #007bff)' }}>
            ¿Olvidé mi contraseña?
          </Link>
        </div>
        <Button className="icon-button" disabled={isSubmitting || isLoading} type="submit" style={{ marginTop: '1rem' }}>
          <LogIn size={20} aria-hidden="true" />
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </div>
      <p className="helper-text">Usa las credenciales registradas en Growcap para continuar.</p>
    </form>
  );
}

export default LoginPage;
