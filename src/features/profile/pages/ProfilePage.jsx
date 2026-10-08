import {
  CircleUserRound,
  FileEdit,
  KeyRound,
  RefreshCw,
  Scale,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import BeneficiariesEditModal from '../components/BeneficiariesEditModal.jsx';
import BeneficiariesTermsModal from '../components/BeneficiariesTermsModal.jsx';
import ChangePasswordModal from '../components/ChangePasswordModal.jsx';
import ProfileCorrectionModal from '../components/ProfileCorrectionModal.jsx';
import { normalizeApiError } from '../../../api/apiUtils.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import Card from '../../../components/common/Card.jsx';
import PageHero from '../../../components/common/PageHero.jsx';
import useAuth from '../../auth/hooks/useAuth.js';
import useGrowcapPageMotion from '../../../hooks/useGrowcapPageMotion.js';
import {
  buildProfileViewData,
  formatValue,
  getNestedValue,
  getValue,
  unwrapProfileData,
} from '../services/profileDisplay.js';
import { getMyProfileData } from '../services/profileService.js';

function ProfileSection({ headerAction, items, subtitle, title }) {
  return (
    <Card className="profile-card motion-immediate">
      <div className="profile-card-header-row">
        <div>
          <h2>{title}</h2>
          {subtitle && (
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.86rem' }}>
              {subtitle}
            </p>
          )}
        </div>
        {headerAction}
      </div>
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

  // Modales
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isBeneficiariesModalOpen, setIsBeneficiariesModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionInitialField, setCorrectionInitialField] = useState('apellido');

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

  const { addressData, bankData, beneficiariesList, laboralesData, personalData, userData } =
    buildProfileViewData(profile, user);

  const handleOpenCorrection = (fieldKey = 'apellido') => {
    setCorrectionInitialField(fieldKey);
    setIsCorrectionModalOpen(true);
  };

  const hasBeneficiaries = beneficiariesList && beneficiariesList.length > 0 && beneficiariesList.some((b) => b.nombre);

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
        Consulta tu expediente digital, gestiona tus beneficiarios legales y mantén actualizada tu información.
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
          {/* Datos personales con desglose de Apellidos y botón para solicitar corrección */}
          <ProfileSection
            headerAction={
              <Button
                className="button-secondary icon-button"
                onClick={() => handleOpenCorrection('apellido')}
                type="button"
              >
                <FileEdit size={16} aria-hidden="true" />
                Solicitar corrección
              </Button>
            }
            items={[
              { label: 'Nombre(s)', value: getNestedValue([personalData, user], ['nombre', 'name']) },
              { label: 'Apellidos', value: getNestedValue([personalData, user], ['apellido', 'apellidos', 'last_name']) },
              { label: 'Correo', value: getNestedValue([personalData, user], ['email', 'correo', 'correo_electronico']) },
              { label: 'Telefono', value: getValue(personalData, ['telefono', 'phone', 'celular']) },
              { label: 'RFC', value: getValue(personalData, ['rfc', 'RFC']) },
              ...(getValue(personalData, ['numero_empleado'], '')
                ? [{ label: 'No. Empleado', value: getValue(personalData, ['numero_empleado']) }]
                : []),
              ...(getValue(personalData, ['codigo_cliente'], '')
                ? [{ label: 'Código de Cliente', value: getValue(personalData, ['codigo_cliente']) }]
                : []),
            ]}
            subtitle="Identidad oficial y datos fiscales registrados en tu cuenta."
            title="Datos personales"
          />

          {/* Domicilio */}
          <ProfileSection
            title="Dirección residencial"
            items={[
              { label: 'Estado', value: getNestedValue([addressData, personalData], ['estado', 'estado_nombre', 'nombre_estado', 'id_estado']) },
              { label: 'Municipio', value: getNestedValue([addressData, personalData], ['municipio', 'municipio_nombre', 'nombre_municipio', 'ciudad', 'id_municipio']) },
              { label: 'Calle y número', value: getNestedValue([addressData, personalData], ['calle', 'direccion', 'domicilio']) },
              { label: 'Colonia', value: getNestedValue([addressData, personalData], ['colonia']) },
              { label: 'Código postal', value: getNestedValue([addressData, personalData], ['codigo_postal', 'cp']) },
            ]}
          />

          {/* Información laboral si está disponible */}
          {laboralesData && (
            <ProfileSection
              title="Información laboral"
              items={[
                { label: 'Empresa', value: laboralesData.empresa_nombre || laboralesData.empresa },
                { label: 'Puesto', value: laboralesData.puesto },
              ]}
            />
          )}

          {/* Tarjeta especializada e interactiva para Beneficiarios */}
          <Card className="profile-card motion-immediate">
            <div className="profile-card-header-row">
              <div>
                <h2>Beneficiarios de la cuenta</h2>
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.86rem' }}>
                  Personas designadas para recibir tus fondos y rendimientos en caso de fallecimiento (distribución obligatoria al 100%).
                </p>
              </div>

              <Button
                className="button-secondary icon-button"
                onClick={() => setIsBeneficiariesModalOpen(true)}
                type="button"
              >
                <Users size={16} aria-hidden="true" />
                {hasBeneficiaries ? 'Editar beneficiarios' : 'Asignar beneficiarios'}
              </Button>
            </div>

            {hasBeneficiaries ? (
              <div className="beneficiaries-grid-layout">
                {beneficiariesList.map((beneficiary) => (
                  <div className="beneficiary-card-item" key={beneficiary.slot}>
                    <div className="beneficiary-card-top">
                      <span className="beneficiary-slot-name">
                        {beneficiary.slot === 1 ? 'Beneficiario Principal (1)' : 'Beneficiario Secundario (2)'}
                      </span>
                      <span className="beneficiary-badge-pct">
                        {beneficiary.porcentaje}%
                      </span>
                    </div>
                    <div className="beneficiary-card-name">
                      {beneficiary.nombre || 'No asignado'}
                    </div>
                    <p className="beneficiary-card-phone">
                      {beneficiary.telefono ? `Teléfono: ${beneficiary.telefono}` : 'Sin teléfono de contacto'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                marginBottom: '16px',
              }}>
                <p style={{ margin: '0 0 12px', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  Aún no has configurado tus beneficiarios legales. Asigna a tus beneficiarios para garantizar la protección patrimonial de tus cuentas de ahorro e inversión.
                </p>
                <Button
                  className="icon-button"
                  onClick={() => setIsBeneficiariesModalOpen(true)}
                  type="button"
                >
                  <Users size={16} aria-hidden="true" />
                  Asignar beneficiarios ahora
                </Button>
              </div>
            )}

            <div className="beneficiaries-card-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontSize: '0.85rem', fontWeight: 600 }}>
                <ShieldCheck size={17} />
                <span>Asignación patrimonial debidamente registrada</span>
              </div>

              <button
                className="terms-link-button"
                onClick={() => setIsTermsModalOpen(true)}
                type="button"
              >
                <Scale size={15} />
                Ver términos y condiciones legales
              </button>
            </div>
          </Card>

          {/* Datos bancarios */}
          <ProfileSection
            title="Datos bancarios"
            items={[
              { label: 'Banco', value: getNestedValue([bankData, personalData], ['banco', 'nombre_banco']) },
              { label: 'Cuenta / CLABE', value: getNestedValue([bankData, personalData], ['cuenta', 'numero_cuenta', 'clabe']) },
            ]}
          />

          {/* Seguridad de la cuenta */}
          <Card className="profile-card motion-immediate">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h2>Seguridad de la cuenta</h2>
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
                  Administra tus credenciales de acceso y protege tu información registrada.
                </p>
              </div>
              <Button
                className="button-secondary icon-button"
                onClick={() => setIsPasswordModalOpen(true)}
                type="button"
              >
                <KeyRound size={18} aria-hidden="true" />
                Cambiar contraseña
              </Button>
            </div>
          </Card>

          {/* Modales montados */}
          <ChangePasswordModal
            isOpen={isPasswordModalOpen}
            onClose={() => setIsPasswordModalOpen(false)}
          />

          <BeneficiariesEditModal
            currentBeneficiaries={userData}
            isOpen={isBeneficiariesModalOpen}
            onClose={() => setIsBeneficiariesModalOpen(false)}
            onOpenTerms={() => {
              setIsBeneficiariesModalOpen(false);
              setIsTermsModalOpen(true);
            }}
            onSuccess={loadProfile}
          />

          <BeneficiariesTermsModal
            isOpen={isTermsModalOpen}
            onClose={() => setIsTermsModalOpen(false)}
          />

          <ProfileCorrectionModal
            currentProfileData={personalData}
            empresaNombre={laboralesData?.empresa_nombre || personalData?.empresa_nombre || ''}
            initialField={correctionInitialField}
            isInstitutional={Boolean(laboralesData?.empresa_nombre || (personalData?.id_empresa && Number(personalData.id_empresa) > 0))}
            isOpen={isCorrectionModalOpen}
            numeroEmpleado={getValue(personalData, ['numero_empleado'], '')}
            onClose={() => setIsCorrectionModalOpen(false)}
          />
        </>
      )}
    </div>
  );
}

export default ProfilePage;

