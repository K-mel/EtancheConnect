import { FaHome, FaFileInvoiceDollar, FaEnvelope, FaUsers, FaCog } from 'react-icons/fa';

export const ADMIN_TABS = [
  { id: 'apercu', label: 'Aperçu', icon: FaHome },
  { id: 'devis', label: 'Devis', icon: FaFileInvoiceDollar },
  { id: 'messages', label: 'Messages', icon: FaEnvelope },
  { id: 'utilisateurs', label: 'Utilisateurs', icon: FaUsers },
  { id: 'parametres', label: 'Paramètres', icon: FaCog }
];

export const USER_TABS = [
  { id: 'apercu', label: 'Aperçu', icon: FaHome },
  { id: 'devis', label: 'Devis', icon: FaFileInvoiceDollar },
  { id: 'parametres', label: 'Paramètres', icon: FaCog }
];
