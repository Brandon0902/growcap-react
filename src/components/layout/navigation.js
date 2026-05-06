import { Banknote, ChartNoAxesColumnIncreasing, CircleUserRound, HandCoins, Home } from 'lucide-react';

export const navItems = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/ahorro', label: 'Ahorro', icon: HandCoins },
  { to: '/inversion', label: 'Inversion', icon: ChartNoAxesColumnIncreasing },
  { to: '/prestamos', label: 'Prestamos', icon: Banknote },
  { to: '/perfil', label: 'Perfil', icon: CircleUserRound },
];
