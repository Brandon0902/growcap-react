import { Save, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';
import logoGrowcap from '../../../assets/rombo_blanco.png';
import useForm from '../../../hooks/useForm.js';
import axios from 'axios';

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const { values, handleChange } = useForm({ password: '', password_confirmation: '' });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!email || !token) {
      setFormError('Enlace de recuperación inválido o incompleto.');
      return;
    }

    if (values.password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (values.password !== values.password_confirmation) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/reset-password`, {
        email,
        token,
        password: values.password,
        password_confirmation: values.password_confirmation
      });
      setFormSuccess(response.data.message || 'Contraseña actualizada con éxito.');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Ocurrió un error al restablecer la contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!email || !token) {
    return (
      <div className="form">
        <div className="form-intro">
          <h2>Enlace inválido</h2>
          <p>El enlace de recuperación de contraseña no es válido o está incompleto.</p>
          <div style={{ marginTop: '2rem' }}>
            <Link to="/login" style={{ textDecoration: 'none', color: 'var(--color-primary)' }}>Volver al inicio de sesión</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="login-brand" aria-label="Growcap">
        <span className="brand-mark" aria-hidden="true">
          <img src={logoGrowcap} alt="" className="brand-logo" />
        </span>
        <strong>{import.meta.env.VITE_APP_NAME || 'Growcap'}</strong>
      </div>
      <div className="form-intro">
        <h2>Nueva contraseña</h2>
        <p>Crea una nueva contraseña para <strong>{email}</strong>.</p>
      </div>
      
      {formError && <Alert type="error">{formError}</Alert>}
      {formSuccess && <Alert type="success">{formSuccess}</Alert>}
      
      <div className="motion-form">
        <Input
          autoComplete="new-password"
          id="password"
          label="Nueva contraseña"
          name="password"
          onChange={handleChange}
          placeholder="Minimo 6 caracteres"
          type={showPassword ? 'text' : 'password'}
          value={values.password}
          disabled={isSubmitting || formSuccess}
          action={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}
              aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />
        
        <Input
          autoComplete="new-password"
          id="password_confirmation"
          label="Confirmar nueva contraseña"
          name="password_confirmation"
          onChange={handleChange}
          placeholder="Repite la contraseña"
          type={showConfirmPassword ? 'text' : 'password'}
          value={values.password_confirmation}
          disabled={isSubmitting || formSuccess}
          action={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}
              aria-label={showConfirmPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />
        
        <Button className="icon-button" disabled={isSubmitting || formSuccess} type="submit" style={{ marginTop: '1rem' }}>
          <Save size={20} aria-hidden="true" />
          {isSubmitting ? 'Guardando...' : 'Guardar contraseña'}
        </Button>
      </div>
    </form>
  );
}

export default ResetPasswordPage;
