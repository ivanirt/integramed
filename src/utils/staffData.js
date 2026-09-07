/**
 * Staff & Practitioners Database for IntegraMed
 * Supports multi-role assignments per practitioner:
 * - 2 Doctores: Jesús Robledo, Edgar Robledo
 * - 2 Terapeutas: Edgar Robledo, Sofía Mendiola
 * - 3 Enfermeras: Lluvia Robledo, Carmen Saldaña, Mariana Domínguez
 * - 1 Recepcionista: Edith Alvarez
 * - 3 Administradores: Jesús Robledo, Edith Alvarez, Roberto Méndez
 * - 2 Laboratoristas: Edith Alvarez, Luis Fernando Garza
 */

export const CLINICAL_ROLES = {
  doctor: {
    id: 'doctor',
    labelEs: 'Médico / Doctor',
    labelEn: 'Physician / Doctor',
    badgeClass: 'badge-emerald',
    icon: 'Stethoscope',
    color: '#0d9488',
    bgColor: '#ccfbf1'
  },
  therapist: {
    id: 'therapist',
    labelEs: 'Terapeuta Físico',
    labelEn: 'Physical Therapist',
    badgeClass: 'badge-teal',
    icon: 'Activity',
    color: '#0284c7',
    bgColor: '#e0f2fe'
  },
  nurse: {
    id: 'nurse',
    labelEs: 'Enfermería',
    labelEn: 'Nurse',
    badgeClass: 'badge-blue',
    icon: 'HeartPulse',
    color: '#e11d48',
    bgColor: '#ffe4e6'
  },
  receptionist: {
    id: 'receptionist',
    labelEs: 'Recepción',
    labelEn: 'Receptionist',
    badgeClass: 'badge-amber',
    icon: 'Users',
    color: '#d97706',
    bgColor: '#fef3c7'
  },
  admin: {
    id: 'admin',
    labelEs: 'Administrador',
    labelEn: 'Administrator',
    badgeClass: 'badge-purple',
    icon: 'ShieldCheck',
    color: '#7c3aed',
    bgColor: '#ede9fe'
  },
  lab: {
    id: 'lab',
    labelEs: 'Laboratorista',
    labelEn: 'Lab Technician',
    badgeClass: 'badge-indigo',
    icon: 'FlaskConical',
    color: '#4f46e5',
    bgColor: '#e0e7ff'
  }
};

export const STAFF_DIRECTORY = [
  {
    id: 'staff-jesus-robledo',
    givenName: 'Jesús',
    familyName: 'Robledo',
    prefix: 'Dr.',
    gender: 'male',
    email: 'jesus.robledo@integramed.com',
    secondaryEmail: 'dr.morales@clinica.com', // Match screenshot placeholder
    password: 'IntegraMed27',
    phone: '+52 55 5234 8101',
    roles: ['doctor', 'admin'],
    primaryRole: 'doctor',
    specialty: 'Medicina Interna & Dirección Médica',
    license: 'Céd. Prof. 7849201-ESP',
    avatarBg: '#0f766e',
    avatarText: '#ffffff'
  },
  {
    id: 'staff-edgar-robledo',
    givenName: 'Edgar',
    familyName: 'Robledo',
    prefix: 'Dr.',
    gender: 'male',
    email: 'edgar.robledo@integramed.com',
    password: 'IntegraMed27',
    phone: '+52 55 5234 8102',
    roles: ['doctor', 'therapist'],
    primaryRole: 'doctor',
    specialty: 'Medicina General & Fisioterapia Integral',
    license: 'Céd. Prof. 839210-MED',
    avatarBg: '#0369a1',
    avatarText: '#ffffff'
  },
  {
    id: 'staff-sofia-mendiola',
    givenName: 'Sofía',
    familyName: 'Mendiola',
    prefix: 'Lic.',
    gender: 'female',
    email: 'sofia.mendiola@integramed.com',
    password: 'IntegraMed27',
    phone: '+52 55 5234 8103',
    roles: ['therapist'],
    primaryRole: 'therapist',
    specialty: 'Fisioterapia y Rehabilitación Neurológica',
    license: 'Céd. Prof. 719204-TER',
    avatarBg: '#0284c7',
    avatarText: '#ffffff'
  },
  {
    id: 'staff-lluvia-robledo',
    givenName: 'Lluvia',
    familyName: 'Robledo',
    prefix: 'Enf.',
    gender: 'female',
    email: 'lluvia.robledo@integramed.com',
    password: 'IntegraMed27',
    phone: '+52 55 5234 8104',
    roles: ['nurse'],
    primaryRole: 'nurse',
    specialty: 'Enfermería General y Terapia Intensiva',
    license: 'Céd. Prof. 658291-ENF',
    avatarBg: '#be123c',
    avatarText: '#ffffff'
  },
  {
    id: 'staff-carmen-saldana',
    givenName: 'Carmen',
    familyName: 'Saldaña',
    prefix: 'Enf.',
    gender: 'female',
    email: 'carmen.saldana@integramed.com',
    password: 'IntegraMed27',
    phone: '+52 55 5234 8105',
    roles: ['nurse'],
    primaryRole: 'nurse',
    specialty: 'Enfermería Clínica y Triage de Urgencias',
    license: 'Céd. Prof. 592817-ENF',
    avatarBg: '#e11d48',
    avatarText: '#ffffff'
  },
  {
    id: 'staff-mariana-dominguez',
    givenName: 'Mariana',
    familyName: 'Domínguez',
    prefix: 'Enf.',
    gender: 'female',
    email: 'mariana.dominguez@integramed.com',
    password: 'IntegraMed27',
    phone: '+52 55 5234 8106',
    roles: ['nurse'],
    primaryRole: 'nurse',
    specialty: 'Enfermería Pediátrica y Vacunación',
    license: 'Céd. Prof. 483921-ENF',
    avatarBg: '#db2777',
    avatarText: '#ffffff'
  },
  {
    id: 'staff-edith-alvarez',
    givenName: 'Edith',
    familyName: 'Alvarez',
    prefix: 'Lic.',
    gender: 'female',
    email: 'edith.alvarez@integramed.com',
    password: 'IntegraMed27',
    phone: '+52 55 5234 8107',
    roles: ['receptionist', 'lab', 'admin'],
    primaryRole: 'receptionist',
    specialty: 'Atención a Pacientes, Toma de Muestras y Operaciones',
    license: 'Céd. Prof. 394821-ADM',
    avatarBg: '#d97706',
    avatarText: '#ffffff'
  },
  {
    id: 'staff-luis-fernando-garza',
    givenName: 'Luis Fernando',
    familyName: 'Garza',
    prefix: 'QFB.',
    gender: 'male',
    email: 'luis.garza@integramed.com',
    password: 'IntegraMed27',
    phone: '+52 55 5234 8108',
    roles: ['lab'],
    primaryRole: 'lab',
    specialty: 'Química Clínica, Hematología y Microbiología',
    license: 'Céd. Prof. 284910-QFB',
    avatarBg: '#4f46e5',
    avatarText: '#ffffff'
  },
  {
    id: 'staff-roberto-mendez',
    givenName: 'Roberto',
    familyName: 'Méndez',
    prefix: 'Ing.',
    gender: 'male',
    email: 'roberto.mendez@integramed.com',
    password: 'IntegraMed27',
    phone: '+52 55 5234 8109',
    roles: ['admin'],
    primaryRole: 'admin',
    specialty: 'Administración Hospitalaria y TI Médica',
    license: 'Céd. Prof. 192847-ING',
    avatarBg: '#6d28d9',
    avatarText: '#ffffff'
  }
];

export function getStaffFullName(staff) {
  if (!staff) return '';
  return `${staff.prefix || ''} ${staff.givenName} ${staff.familyName}`.trim();
}
