import { Mail, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';
import logoGrowcap from '../../../assets/rombo_blanco.png';
import useForm from '../../../hooks/useForm.js';
import axios from 'axios';

function ForgotPasswordPage() {
  const { values, handleChange } = useForm({ email: '' });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    if (!values.email) {
      setFormError('Por favor ingresa tu correo electrónico.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, { email: values.email });
      setFormSuccess(response.data.message || 'Se ha enviado un enlace de recuperación a tu correo.');
    } catch (error) {
      setFormError(error.response?.data?.message || 'Ocurrió un error al intentar enviar el correo de recuperación.');
    } finally {
      setIsSubmitting(false);
    }
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
        <h2>Recuperar contraseña</h2>
        <p>Ingresa tu correo para recibir un enlace de recuperación.</p>
      </div>
      
      {formError && <Alert type="error">{formError}</Alert>}
      {formSuccess && <Alert type="success">{formSuccess}</Alert>}
      
      <div className="motion-form">
        <Input
          autoComplete="email"
          id="email"
          label="Correo electrónico"
          name="email"
          onChange={handleChange}
          placeholder="nombre@correo.com"
          type="email"
          value={values.email}
          disabled={isSubmitting}
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <Button className="icon-button" disabled={isSubmitting} type="submit">
            <Mail size={20} aria-hidden="true" />
            {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
          </Button>
          
          <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', textDecoration: 'none', color: 'inherit', fontSize: '0.875rem' }}>
            <ArrowLeft size={16} /> Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </form>
  );
}

export default ForgotPasswordPage;
