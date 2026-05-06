import { LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';
import useForm from '../../../hooks/useForm.js';
import { login } from '../services/authService.js';

function LoginPage() {
  const navigate = useNavigate();
  const { values, handleChange } = useForm({ email: '', password: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    await login(values);
    navigate('/', { replace: true });
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-intro">
        <h2>Bienvenido</h2>
        <p>Ingresa tus datos para continuar de forma segura.</p>
      </div>
      <Input
        id="email"
        label="Correo electronico"
        name="email"
        onChange={handleChange}
        placeholder="nombre@correo.com"
        type="email"
        value={values.email}
      />
      <Input
        id="password"
        label="Contrasena"
        name="password"
        onChange={handleChange}
        placeholder="Ingresa tu contrasena"
        type="password"
        value={values.password}
      />
      <Button className="icon-button" type="submit">
        <LogIn size={20} aria-hidden="true" />
        Entrar
      </Button>
      <p className="helper-text">
        Acceso temporal para desarrollo. Despues se conectara con la API.
      </p>
    </form>
  );
}

export default LoginPage;
