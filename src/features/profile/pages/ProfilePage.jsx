import { CircleUserRound, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeApiError } from '../../../api/apiUtils.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import Card from '../../../components/common/Card.jsx';
import PageHero from '../../../components/common/PageHero.jsx';
import useAuth from '../../auth/hooks/useAuth.js';
import useGrowcapPageMotion from '../../../hooks/useGrowcapPageMotion.js';
import { buildProfileViewData, formatValue, getNestedValue, getValue, unwrapProfileData } from '../services/profileDisplay.js';
import { getMyProfileData } from '../services/profileService.js';

function ProfileSection({ items, title }) {
  return (
    <Card className="profile-card motion-immediate">
      <h2>{title}</h2>
      <dl className="profile-list">
        {items.map(({ label, value }) => (
          <div className="profile-list-row" key={label}>
            <dt>{label}</dt>
            <dd>{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function ProfilePage() {
  const pageRef = useRef(null);
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  useGrowcapPageMotion(pageRef, { desktopScroll: false });

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await getMyProfileData();
      setProfile(unwrapProfileData(response.data));
    } catch (requestError) {
      const normalized = normalizeApiError(requestError, 'No fue posible cargar tus datos.');
      setError(normalized.message);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const { addressData, bankData, beneficiariesText, personalData } = buildProfileViewData(profile, user);

  return (
    <div className="page profile-page motion-page" ref={pageRef}>
      <PageHero
        eyebrow="Perfil"
        icon={CircleUserRound}
        stats={[
          { label: 'Sesion', value: error ? 'Revisar' : 'Activa' },
          { label: 'Cuenta', value: 'Growcap' },
        ]}
        title="Mis datos"
      >
        Consulta la informacion registrada en tu cuenta antes de iniciar nuevas solicitudes.
      </PageHero>

      {error && (
        <Alert type="error">
          {error}
          <Button className="button-secondary balance-retry icon-button" onClick={loadProfile}>
            <RefreshCw size={18} aria-hidden="true" />
            Reintentar
          </Button>
        </Alert>
      )}

      {isLoading && <div className="loading">Cargando tus datos...</div>}

      {!isLoading && !error && (
        <>
          <ProfileSection
            title="Datos personales"
            items={[
              { label: 'Nombre', value: getNestedValue([personalData, user], ['nombre', 'name', 'nombre_completo']) },
              { label: 'Correo', value: getNestedValue([personalData, user], ['email', 'correo', 'correo_electronico']) },
              { label: 'Telefono', value: getValue(personalData, ['telefono', 'phone', 'celular']) },
              { label: 'RFC', value: getValue(personalData, ['rfc', 'RFC']) },
            ]}
          />

          <ProfileSection
            title="Direccion"
            items={[
              { label: 'Estado', value: getNestedValue([addressData, personalData], ['estado', 'estado_nombre', 'nombre_estado', 'id_estado']) },
              { label: 'Municipio', value: getNestedValue([addressData, personalData], ['municipio', 'municipio_nombre', 'nombre_municipio', 'ciudad', 'id_municipio']) },
              { label: 'Calle', value: getNestedValue([addressData, personalData], ['calle', 'direccion', 'domicilio']) },
              { label: 'Colonia', value: getNestedValue([addressData, personalData], ['colonia']) },
              { label: 'Codigo postal', value: getNestedValue([addressData, personalData], ['codigo_postal', 'cp']) },
            ]}
          />

          <ProfileSection
            title="Banco y beneficiarios"
            items={[
              { label: 'Banco', value: getNestedValue([bankData, personalData], ['banco', 'nombre_banco']) },
              { label: 'Cuenta', value: getNestedValue([bankData, personalData], ['cuenta', 'numero_cuenta', 'clabe']) },
              { label: 'Beneficiarios', value: beneficiariesText },
            ]}
          />
        </>
      )}
    </div>
  );
}

export default ProfilePage;
