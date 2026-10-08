/**
 * Utilidades de formateo para nombres de usuario, saludos según la hora y fechas formales.
 */

export function toTitleCase(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getUserDisplayName(user) {
  if (!user) return 'Usuario';
  const nombre = (user.nombre || user.name || '').trim();
  const apellido = (user.apellido || '').trim();

  if (nombre && apellido) {
    return toTitleCase(`${nombre} ${apellido}`);
  }
  if (nombre) {
    return toTitleCase(nombre);
  }
  if (user.user) {
    return user.user;
  }
  return 'Usuario';
}

export function getUserFirstName(user) {
  if (!user) return '';
  const raw = (user.nombre || user.name || user.user || '').trim();
  if (!raw) return '';
  const firstWord = raw.split(/\s+/)[0];
  return toTitleCase(firstWord);
}

export function getUserInitials(user) {
  if (!user) return 'GC';
  const nombre = (user.nombre || user.name || '').trim();
  const apellido = (user.apellido || '').trim();

  if (nombre && apellido) {
    return (nombre.charAt(0) + apellido.charAt(0)).toUpperCase();
  }
  if (nombre) {
    const parts = nombre.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return nombre.slice(0, 2).toUpperCase();
  }
  if (user.user) {
    return user.user.slice(0, 2).toUpperCase();
  }
  return 'GC';
}

export function getTimeGreeting(now = new Date()) {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) {
    return 'Buenos días';
  }
  if (hour >= 12 && hour < 19) {
    return 'Buenas tardes';
  }
  return 'Buenas noches';
}

export function getFullGreeting(user, now = new Date()) {
  const greeting = getTimeGreeting(now);
  const firstName = getUserFirstName(user);
  return firstName ? `${greeting}, ${firstName}` : greeting;
}

export function getFormalDate(date = new Date()) {
  const weekday = new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(date);
  const day = date.getDate();
  const month = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(date);

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
  return `${capitalize(weekday)}, ${day} de ${capitalize(month)}`;
}
