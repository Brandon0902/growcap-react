import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProfileViewData, getNestedValue } from '../src/features/profile/services/profileDisplay.js';

test('profile display reads address, bank and beneficiaries from user_data payload', () => {
  const profile = {
    cliente: {
      id: 7,
      nombre: 'Ana',
      email: 'ana@example.com',
      telefono: '555',
    },
    user_data: {
      rfc: 'LOAA010101AA1',
      id_estado: '11',
      estado_nombre: 'Jalisco',
      id_municipio: 22,
      municipio_nombre: 'Guadalajara',
      direccion: 'Calle 1',
      colonia: 'Centro',
      cp: '76000',
      banco: 'Grow Bank',
      cuenta: '1234567890',
      beneficiario: 'Luis Lopez',
      beneficiario_telefono: '5551112222',
      porcentaje_1: 60,
      beneficiario_02: 'Mia Lopez',
      beneficiario_telefono_02: '5553334444',
      porcentaje_2: 40,
    },
  };

  const view = buildProfileViewData(profile, {});

  assert.equal(view.personalData.rfc, 'LOAA010101AA1');
  assert.equal(getNestedValue([view.addressData, view.personalData], ['estado', 'estado_nombre', 'nombre_estado', 'id_estado']), 'Jalisco');
  assert.equal(getNestedValue([view.addressData, view.personalData], ['municipio', 'municipio_nombre', 'nombre_municipio', 'ciudad', 'id_municipio']), 'Guadalajara');
  assert.equal(getNestedValue([view.addressData, view.personalData], ['direccion']), 'Calle 1');
  assert.equal(getNestedValue([view.addressData, view.personalData], ['colonia']), 'Centro');
  assert.equal(getNestedValue([view.addressData, view.personalData], ['cp']), '76000');
  assert.equal(getNestedValue([view.bankData, view.personalData], ['banco']), 'Grow Bank');
  assert.equal(getNestedValue([view.bankData, view.personalData], ['cuenta']), '1234567890');
  assert.equal(view.beneficiariesText, 'Luis Lopez (60% - 5551112222), Mia Lopez (40% - 5553334444)');
});


