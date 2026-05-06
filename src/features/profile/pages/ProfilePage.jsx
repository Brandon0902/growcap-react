import { CircleUserRound } from 'lucide-react';
import Card from '../../../components/common/Card.jsx';
import PageHero from '../../../components/common/PageHero.jsx';
import { getUser } from '../../../utils/storage.js';

function ProfilePage() {
  const user = getUser();

  return (
    <div className="page">
      <PageHero
        eyebrow="Perfil"
        icon={CircleUserRound}
        stats={[
          { label: 'Sesion', value: 'Activa' },
          { label: 'Cuenta', value: 'Growcap' },
        ]}
        title="Datos de usuario"
      >
        Consulta la informacion principal de tu cuenta antes de iniciar nuevas solicitudes.
      </PageHero>

      <Card className="profile-card">
        <dl className="profile-list">
          <dt>Nombre</dt>
          <dd>{user?.name || 'Usuario Growcap'}</dd>
          <dt>Correo</dt>
          <dd>{user?.email || 'Sin correo registrado'}</dd>
        </dl>
      </Card>
    </div>
  );
}

export default ProfilePage;
