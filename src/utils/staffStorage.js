/**
 * Staff & Practitioners Database & Persistent Storage for IntegraMed
 * Features:
 * - Multi-role staff directory
 * - Specialties, licenses & subspecialties
 * - Courses, certifications & CME training tracking
 * - Shift assignments (morning, afternoon, full-time, night, rotating), hours & consulting rooms
 * - User account details & secure password management
 * - LocalStorage persistence with fallback to initial seed
 */

import {
  loadPayloadCollection,
  upsertPayloadItem,
  deletePayloadItem,
  preferRemote
} from '../services/fhirPayloadStore.js';

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
  },
  pharmacist: {
    id: 'pharmacist',
    labelEs: 'Farmacia',
    labelEn: 'Pharmacist',
    badgeClass: 'badge-teal',
    icon: 'Pill',
    color: '#059669',
    bgColor: '#ecfdf5'
  }
};

export const SHIFT_TYPES = {
  morning: {
    id: 'morning',
    labelEs: 'Turno Matutino',
    labelEn: 'Morning Shift',
    defaultHours: '07:00 - 15:00',
    color: '#0284c7',
    bgColor: '#e0f2fe',
    badgeClass: 'badge-sky'
  },
  afternoon: {
    id: 'afternoon',
    labelEs: 'Turno Vespertino',
    labelEn: 'Afternoon Shift',
    defaultHours: '14:00 - 21:30',
    color: '#d97706',
    bgColor: '#fef3c7',
    badgeClass: 'badge-amber'
  },
  full_time: {
    id: 'full_time',
    labelEs: 'Turno Completo / Mixto',
    labelEn: 'Full-time / Split Shift',
    defaultHours: '08:30 - 18:30',
    color: '#059669',
    bgColor: '#ecfdf5',
    badgeClass: 'badge-emerald'
  },
  night: {
    id: 'night',
    labelEs: 'Turno Nocturno / Guardia',
    labelEn: 'Night Shift / On Call',
    defaultHours: '20:00 - 08:00',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    badgeClass: 'badge-purple'
  },
  rotating: {
    id: 'rotating',
    labelEs: 'Turno Rotativo',
    labelEn: 'Rotating Shift',
    defaultHours: 'Rotación según rol',
    color: '#4f46e5',
    bgColor: '#e0e7ff',
    badgeClass: 'badge-indigo'
  }
};

export const INITIAL_STAFF_DIRECTORY = [
  {
    id: 'staff-jesus-robledo',
    givenName: 'Jesús',
    familyName: 'Robledo',
    prefix: 'Dr.',
    gender: 'male',
    email: 'jesus.robledo@integramed.com',
    secondaryEmail: 'dr.morales@clinica.com',
    password: 'IntegraMed27',
    phone: '+52 55 5234 8101',
    roles: ['doctor', 'admin'],
    primaryRole: 'doctor',
    preferredLanguage: 'es',
    status: 'active',
    avatarBg: '#0f766e',
    avatarText: '#ffffff',
    // Especialidades y Credenciales
    specialty: 'Medicina Interna & Dirección Médica',
    subspecialties: ['Cardiología Preventiva', 'Metabolismo Clínico', 'Cuidados Críticos'],
    license: 'Céd. Prof. 7849201-ESP',
    specialtyLicense: 'Céd. Esp. 948102-INT',
    university: 'Universidad Nacional Autónoma de México (UNAM)',
    yearsExperience: 18,
    consultingRoom: 'Consultorio 101 (Ala Médica Principal)',
    // Turno y Horario
    shiftInfo: {
      shiftType: 'full_time',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startTime: '08:00',
      endTime: '17:00',
      breakTime: '14:00 - 15:00',
      consultationDurationMin: 30
    },
    // Cursos y Certificaciones
    courses: [
      {
        id: 'c-jr-1',
        title: 'Soporte Vital Cardiovascular Avanzado (ACLS)',
        institution: 'American Heart Association (AHA)',
        issueDate: '2024-02-15',
        expiryDate: '2026-02-15',
        hours: 48,
        status: 'vigente',
        credentialId: 'AHA-ACLS-88492'
      },
      {
        id: 'c-jr-2',
        title: 'Certificación en Ecografía Clínica y POCUS en Urgencias',
        institution: 'Colegio Mexicano de Medicina Interna',
        issueDate: '2023-10-10',
        expiryDate: '2025-10-10',
        hours: 60,
        status: 'vigente',
        credentialId: 'CMMI-POCUS-1948'
      },
      {
        id: 'c-jr-3',
        title: 'Diplomado en Gestión y Liderazgo de Instituciones de Salud',
        institution: 'Tecnológico de Monterrey',
        issueDate: '2022-08-20',
        expiryDate: '2027-08-20',
        hours: 120,
        status: 'vigente',
        credentialId: 'ITESM-DIR-58210'
      }
    ]
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
    preferredLanguage: 'es',
    status: 'active',
    avatarBg: '#0369a1',
    avatarText: '#ffffff',
    // Especialidades y Credenciales
    specialty: 'Medicina General & Fisioterapia Integral',
    subspecialties: ['Rehabilitación Traumatológica', 'Medicina del Deporte', 'Biomecánica'],
    license: 'Céd. Prof. 839210-MED',
    specialtyLicense: 'Céd. Esp. 729104-FIS',
    university: 'Universidad Autónoma de Nuevo León (UANL)',
    yearsExperience: 12,
    consultingRoom: 'Consultorio 104 y Sala de Terapia Física',
    // Turno y Horario
    shiftInfo: {
      shiftType: 'morning',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      startTime: '07:30',
      endTime: '15:00',
      breakTime: '13:00 - 13:30',
      consultationDurationMin: 45
    },
    // Cursos y Certificaciones
    courses: [
      {
        id: 'c-er-1',
        title: 'Certificación en Terapia Manual Ortopédica y Punción Seca',
        institution: 'International Academy of Orthopedic Medicine (IAOM)',
        issueDate: '2024-04-10',
        expiryDate: '2026-04-10',
        hours: 80,
        status: 'vigente',
        credentialId: 'IAOM-TMO-9481'
      },
      {
        id: 'c-er-2',
        title: 'Soporte Vital Básico y Manejo del Trauma Prehospitalario (BLS/PHTLS)',
        institution: 'Cruz Roja Mexicana & AHA',
        issueDate: '2023-11-05',
        expiryDate: '2025-11-05',
        hours: 40,
        status: 'vigente',
        credentialId: 'CRM-BLS-49102'
      },
      {
        id: 'c-er-3',
        title: 'Electromiografía y Valoración Funcional del Músculo',
        institution: 'Sociedad Mexicana de Medicina Física',
        issueDate: '2023-01-15',
        expiryDate: '2025-01-15',
        hours: 50,
        status: 'por_vencer',
        credentialId: 'SMMF-EMG-1029'
      }
    ]
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
    preferredLanguage: 'es',
    status: 'active',
    avatarBg: '#0284c7',
    avatarText: '#ffffff',
    // Especialidades y Credenciales
    specialty: 'Fisioterapia y Rehabilitación Neurológica',
    subspecialties: ['Neurodesarrollo Bobath', 'Reeducación Postural Global (RPG)', 'Ergonomía Clínica'],
    license: 'Céd. Prof. 719204-TER',
    specialtyLicense: 'Céd. Esp. 610928-NEU',
    university: 'Universidad Iberoamericana',
    yearsExperience: 9,
    consultingRoom: 'Cabina de Neuro-rehabilitación 2',
    // Turno y Horario
    shiftInfo: {
      shiftType: 'afternoon',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startTime: '13:30',
      endTime: '21:00',
      breakTime: '17:00 - 17:30',
      consultationDurationMin: 45
    },
    // Cursos y Certificaciones
    courses: [
      {
        id: 'c-sm-1',
        title: 'Concepto Bobath en la Rehabilitación de Adultos con Daño Cerebral',
        institution: 'International Bobath Instructors Training Association (IBITA)',
        issueDate: '2023-09-12',
        expiryDate: '2026-09-12',
        hours: 110,
        status: 'vigente',
        credentialId: 'IBITA-BOB-7729'
      },
      {
        id: 'c-sm-2',
        title: 'Prescripción de Ejercicio Terapéutico en Adultos Mayores',
        institution: 'Asociación Mexicana de Fisioterapia',
        issueDate: '2024-01-20',
        expiryDate: '2026-01-20',
        hours: 35,
        status: 'vigente',
        credentialId: 'AMEFI-EJ-3829'
      }
    ]
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
    preferredLanguage: 'es',
    status: 'active',
    avatarBg: '#be123c',
    avatarText: '#ffffff',
    // Especialidades y Credenciales
    specialty: 'Enfermería General y Terapia Intensiva',
    subspecialties: ['Terapia de Infusión Segura', 'Monitoreo Hemodinámico', 'Cuidados Críticos'],
    license: 'Céd. Prof. 658291-ENF',
    specialtyLicense: 'Céd. Esp. 581902-UCI',
    university: 'Escuela Nacional de Enfermería y Obstetricia (ENEO-UNAM)',
    yearsExperience: 14,
    consultingRoom: 'Estación de Enfermería A y Sala de Choque',
    // Turno y Horario
    shiftInfo: {
      shiftType: 'morning',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startTime: '07:00',
      endTime: '15:00',
      breakTime: '11:00 - 11:30',
      consultationDurationMin: 20
    },
    // Cursos y Certificaciones
    courses: [
      {
        id: 'c-lr-1',
        title: 'Certificación en Accesos Vasculares y Catéteres Centrales PICC',
        institution: 'Infusion Nurses Society (INS México)',
        issueDate: '2024-05-18',
        expiryDate: '2027-05-18',
        hours: 60,
        status: 'vigente',
        credentialId: 'INS-PICC-39481'
      },
      {
        id: 'c-lr-2',
        title: 'Soporte Vital Avanzado en Trauma y Reanimación (ATCN)',
        institution: 'Society of Trauma Nurses',
        issueDate: '2023-06-10',
        expiryDate: '2025-06-10',
        hours: 45,
        status: 'vigente',
        credentialId: 'STN-ATCN-9201'
      },
      {
        id: 'c-lr-3',
        title: 'Manejo Integral y Curación Avanzada de Heridas y Estomas',
        institution: 'Asociación Mexicana de Heridas y Cicatrización',
        issueDate: '2022-11-30',
        expiryDate: '2025-11-30',
        hours: 50,
        status: 'vigente',
        credentialId: 'AMHC-HER-1849'
      }
    ]
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
    preferredLanguage: 'es',
    status: 'active',
    avatarBg: '#e11d48',
    avatarText: '#ffffff',
    // Especialidades y Credenciales
    specialty: 'Enfermería Clínica y Triage de Urgencias',
    subspecialties: ['Triage Manchester', 'Soporte Vital Pediátrico', 'Farmacología Clínica'],
    license: 'Céd. Prof. 592817-ENF',
    specialtyLicense: '',
    university: 'Universidad Autónoma Metropolitana (UAM Xochimilco)',
    yearsExperience: 8,
    consultingRoom: 'Módulo de Triage y Toma de Signos Vitales',
    // Turno y Horario
    shiftInfo: {
      shiftType: 'afternoon',
      workingDays: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      startTime: '14:00',
      endTime: '21:30',
      breakTime: '17:30 - 18:00',
      consultationDurationMin: 15
    },
    // Cursos y Certificaciones
    courses: [
      {
        id: 'c-cs-1',
        title: 'Protocolo de Clasificación de Urgencias Médicas Triage Manchester',
        institution: 'Grupo Español de Triage Manchester',
        issueDate: '2023-08-14',
        expiryDate: '2025-08-14',
        hours: 30,
        status: 'vigente',
        credentialId: 'GETM-TRIAGE-582'
      },
      {
        id: 'c-cs-2',
        title: 'Soporte Vital Cardiovascular Básico (BLS Provider)',
        institution: 'American Heart Association',
        issueDate: '2024-02-10',
        expiryDate: '2026-02-10',
        hours: 20,
        status: 'vigente',
        credentialId: 'AHA-BLS-83921'
      }
    ]
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
    preferredLanguage: 'es',
    status: 'active',
    avatarBg: '#db2777',
    avatarText: '#ffffff',
    // Especialidades y Credenciales
    specialty: 'Enfermería Pediátrica y Vacunación',
    subspecialties: ['Esquemas Nacionales de Vacunación', 'Control de Niño Sano', 'Atención Neonatal'],
    license: 'Céd. Prof. 483921-ENF',
    specialtyLicense: 'Céd. Esp. 391029-PED',
    university: 'Universidad Veracruzana',
    yearsExperience: 7,
    consultingRoom: 'Consultorio Pediátrico y Sala de Inmunizaciones',
    // Turno y Horario
    shiftInfo: {
      shiftType: 'morning',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startTime: '08:00',
      endTime: '15:30',
      breakTime: '12:00 - 12:30',
      consultationDurationMin: 20
    },
    // Cursos y Certificaciones
    courses: [
      {
        id: 'c-md-1',
        title: 'Soporte Vital Avanzado Pediátrico (PALS)',
        institution: 'American Heart Association (AHA)',
        issueDate: '2023-11-20',
        expiryDate: '2025-11-20',
        hours: 40,
        status: 'vigente',
        credentialId: 'AHA-PALS-72910'
      },
      {
        id: 'c-md-2',
        title: 'Cadena de Frío y Normativa de Vacunación NOM-036-SSA2',
        institution: 'Centro Nacional para la Salud de la Infancia y la Adolescencia (CeNSIA)',
        issueDate: '2024-03-01',
        expiryDate: '2026-03-01',
        hours: 35,
        status: 'vigente',
        credentialId: 'CENSIA-VAC-984'
      }
    ]
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
    preferredLanguage: 'es',
    status: 'active',
    avatarBg: '#d97706',
    avatarText: '#ffffff',
    // Especialidades y Credenciales
    specialty: 'Atención a Pacientes, Toma de Muestras y Operaciones',
    subspecialties: ['Flebotomía Clínica', 'Atención al Paciente y Triage Administrativo', 'Facturación Médica'],
    license: 'Céd. Prof. 394821-ADM',
    specialtyLicense: '',
    university: 'Universidad del Valle de México (UVM)',
    yearsExperience: 10,
    consultingRoom: 'Recepción Central & Módulo de Toma de Muestras 1',
    // Turno y Horario
    shiftInfo: {
      shiftType: 'full_time',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      startTime: '08:00',
      endTime: '17:00',
      breakTime: '13:30 - 14:30',
      consultationDurationMin: 15
    },
    // Cursos y Certificaciones
    courses: [
      {
        id: 'c-ea-1',
        title: 'Técnicas de Flebotomía y Manejo de Muestras Biológicas',
        institution: 'Asociación Mexicana de Bioquímica Clínica',
        issueDate: '2023-05-15',
        expiryDate: '2026-05-15',
        hours: 45,
        status: 'vigente',
        credentialId: 'AMBC-FLEB-4921'
      },
      {
        id: 'c-ea-2',
        title: 'Estándares de Seguridad del Paciente y Cumplimiento NOM-004-SSA3',
        institution: 'Consejo de Salubridad General',
        issueDate: '2024-01-10',
        expiryDate: '2026-01-10',
        hours: 30,
        status: 'vigente',
        credentialId: 'CSG-CS-89210'
      }
    ]
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
    preferredLanguage: 'es',
    status: 'active',
    avatarBg: '#4f46e5',
    avatarText: '#ffffff',
    // Especialidades y Credenciales
    specialty: 'Química Clínica, Hematología y Microbiología',
    subspecialties: ['Inmunoserología', 'Biología Molecular', 'Control de Calidad Analítica'],
    license: 'Céd. Prof. 284910-QFB',
    specialtyLicense: 'Céd. Esp. 194820-BIO',
    university: 'Universidad Autónoma Metropolitana (UAM Iztapalapa)',
    yearsExperience: 11,
    consultingRoom: 'Laboratorio de Análisis Clínicos - Módulo Central',
    // Turno y Horario
    shiftInfo: {
      shiftType: 'morning',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      startTime: '07:00',
      endTime: '15:00',
      breakTime: '11:30 - 12:00',
      consultationDurationMin: 15
    },
    // Cursos y Certificaciones
    courses: [
      {
        id: 'c-lg-1',
        title: 'Control Estadístico de Calidad y Validación de Métodos en Laboratorio',
        institution: 'Westgard Quality Corporation & AMBC',
        issueDate: '2024-03-22',
        expiryDate: '2027-03-22',
        hours: 50,
        status: 'vigente',
        credentialId: 'WESTGARD-QC-992'
      },
      {
        id: 'c-lg-2',
        title: 'Interpretación de Citometría Hemática y Frotis de Sangre Periférica',
        institution: 'Colegio Nacional de Químicos Farmacéuticos Biólogos',
        issueDate: '2023-07-19',
        expiryDate: '2025-07-19',
        hours: 40,
        status: 'vigente',
        credentialId: 'CNQFB-HEM-4819'
      }
    ]
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
    preferredLanguage: 'es',
    status: 'active',
    avatarBg: '#6d28d9',
    avatarText: '#ffffff',
    // Especialidades y Credenciales
    specialty: 'Administración Hospitalaria y TI Médica',
    subspecialties: ['Arquitectura HL7 FHIR R4', 'Seguridad de Datos en Salud (HIPAA/ISO 27799)', 'Gestión Operativa'],
    license: 'Céd. Prof. 192847-ING',
    specialtyLicense: '',
    university: 'Instituto Politécnico Nacional (UPIITA-IPN)',
    yearsExperience: 15,
    consultingRoom: 'Oficina de Dirección Administrativa y Sistemas',
    // Turno y Horario
    shiftInfo: {
      shiftType: 'full_time',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startTime: '09:00',
      endTime: '18:00',
      breakTime: '14:00 - 15:00',
      consultationDurationMin: 30
    },
    // Cursos y Certificaciones
    courses: [
      {
        id: 'c-rm-1',
        title: 'HL7 FHIR R4 Implementation Specialist & Interoperability Certification',
        institution: 'Health Level Seven International (HL7)',
        issueDate: '2023-10-05',
        expiryDate: '2026-10-05',
        hours: 80,
        status: 'vigente',
        credentialId: 'HL7-FHIR-89210'
      },
      {
        id: 'c-rm-2',
        title: 'Certificación en Ciberseguridad y Privacidad de Datos Médicos (HCISPP)',
        institution: '(ISC)²',
        issueDate: '2024-02-28',
        expiryDate: '2027-02-28',
        hours: 60,
        status: 'vigente',
        credentialId: 'ISC2-HCISPP-4829'
      }
    ]
  }
];

const STORAGE_KEY = 'integramed_practitioners_data';

/**
 * Retrieve current staff list from localStorage or initialize with seed
 */
export function getStaffList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(item => ({
          ...item,
          preferredLanguage: item.preferredLanguage === 'en' ? 'en' : 'es'
        }));
      }
    }
  } catch (e) {
    console.warn('Error reading staff directory from storage, using initial directory', e);
  }
  // Initialize storage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STAFF_DIRECTORY));
  } catch (e) {
    // Ignore storage write issues
  }
  return INITIAL_STAFF_DIRECTORY;
}

/**
 * Save complete staff list to localStorage
 */
export function saveStaffList(staffArray) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(staffArray));
  } catch (e) {
    console.error('Failed to save staff list', e);
  }
}

/**
 * Get a single practitioner by ID or email
 */
export function getStaffById(idOrEmail) {
  const list = getStaffList();
  if (!idOrEmail) return list[0];
  const query = idOrEmail.toLowerCase().trim();
  return list.find(s => s.id === idOrEmail || s.email.toLowerCase() === query || (s.secondaryEmail && s.secondaryEmail.toLowerCase() === query)) || null;
}

/**
 * Save or update a practitioner member
 */
export function saveStaffMember(staffMember) {
  const { aiApiKey, ...safeMember } = staffMember || {};
  const list = getStaffList();
  const index = list.findIndex(s => s.id === safeMember.id);
  let updatedList;
  if (index >= 0) {
    updatedList = [...list];
    updatedList[index] = { ...updatedList[index], ...safeMember };
    delete updatedList[index].aiApiKey;
  } else {
    updatedList = [safeMember, ...list];
  }
  saveStaffList(updatedList);

  const saved = updatedList.find(s => s.id === staffMember.id) || staffMember;
  upsertPayloadItem({
    resourceType: 'Practitioner',
    kind: 'practitioner',
    item: saved,
    buildBase: (p) => ({
      active: p.status !== 'inactive',
      name: [
        {
          use: 'official',
          prefix: p.prefix ? [p.prefix] : undefined,
          family: p.familyName || '',
          given: p.givenName ? String(p.givenName).split(/\s+/).filter(Boolean) : []
        }
      ],
      gender: p.gender || 'unknown',
      telecom: [
        ...(p.email ? [{ system: 'email', value: p.email, use: 'work' }] : []),
        ...(p.phone ? [{ system: 'phone', value: p.phone, use: 'work' }] : [])
      ],
      qualification: p.specialty ? [{ code: { text: p.specialty } }] : undefined
    })
  }).then((remote) => {
    if (remote?.fhirId) {
      const next = getStaffList().map((s) => (s.id === remote.id ? { ...s, fhirId: remote.fhirId } : s));
      saveStaffList(next);
    }
  }).catch((err) => console.info('FHIR Practitioner sync skipped:', err.message));

  return updatedList;
}

/**
 * Update a practitioner password
 */
export function updateStaffPassword(staffId, newPassword) {
  const list = getStaffList();
  const index = list.findIndex(s => s.id === staffId);
  if (index >= 0) {
    const updatedList = [...list];
    updatedList[index] = {
      ...updatedList[index],
      password: newPassword,
      lastPasswordChange: new Date().toISOString()
    };
    saveStaffList(updatedList);
    return updatedList[index];
  }
  return null;
}

/**
 * Update a practitioner language preference
 */
export function updateStaffLanguage(staffId, newLanguage) {
  const list = getStaffList();
  const index = list.findIndex(s => s.id === staffId);
  if (index >= 0) {
    const updatedList = [...list];
    updatedList[index] = {
      ...updatedList[index],
      preferredLanguage: newLanguage
    };
    saveStaffList(updatedList);
    return updatedList[index];
  }
  return null;
}

/**
 * Add a course to a practitioner
 */
export function addCourseToStaff(staffId, courseData) {
  const list = getStaffList();
  const index = list.findIndex(s => s.id === staffId);
  if (index >= 0) {
    const updatedList = [...list];
    const member = updatedList[index];
    const newCourse = {
      id: `course-${Date.now()}`,
      title: courseData.title || 'Curso Clínico',
      institution: courseData.institution || 'Institución Médica',
      issueDate: courseData.issueDate || new Date().toISOString().split('T')[0],
      expiryDate: courseData.expiryDate || '',
      hours: Number(courseData.hours) || 20,
      status: courseData.status || 'vigente',
      credentialId: courseData.credentialId || `CERT-${Math.floor(Math.random() * 90000 + 10000)}`
    };
    member.courses = [newCourse, ...(member.courses || [])];
    saveStaffList(updatedList);
    return member;
  }
  return null;
}

/**
 * Remove a course from a practitioner
 */
export function removeCourseFromStaff(staffId, courseId) {
  const list = getStaffList();
  const index = list.findIndex(s => s.id === staffId);
  if (index >= 0) {
    const updatedList = [...list];
    const member = updatedList[index];
    member.courses = (member.courses || []).filter(c => c.id !== courseId);
    saveStaffList(updatedList);
    return member;
  }
  return null;
}

/**
 * Delete a practitioner
 */
export function deleteStaffMember(staffId) {
  const list = getStaffList();
  const target = list.find(s => s.id === staffId);
  const filtered = list.filter(s => s.id !== staffId);
  saveStaffList(filtered);
  if (target?.fhirId) deletePayloadItem('Practitioner', target.fhirId);
  return filtered;
}

export async function loadStaffFromFhir() {
  const remote = await loadPayloadCollection('Practitioner', 'practitioner');
  const merged = preferRemote(remote, getStaffList());
  const withPasswords = merged.map((remoteItem) => {
    const local = getStaffList().find((s) => s.id === remoteItem.id || s.email === remoteItem.email);
    return {
      ...remoteItem,
      password: remoteItem.password || local?.password || 'IntegraMed27',
      preferredLanguage: (local?.preferredLanguage === 'en' || local?.preferredLanguage === 'es')
        ? local.preferredLanguage
        : (remoteItem.preferredLanguage === 'en' ? 'en' : 'es'),
      aiApiKey: local?.aiApiKey || '',
      aiBaseUrl: remoteItem.aiBaseUrl || local?.aiBaseUrl,
      aiModel: remoteItem.aiModel || local?.aiModel
    };
  });
  saveStaffList(withPasswords);
  return withPasswords;
}

/**
 * Reset all practitioners data back to initial seed
 */
export function resetStaffToDefault() {
  saveStaffList(INITIAL_STAFF_DIRECTORY);
  return INITIAL_STAFF_DIRECTORY;
}

/**
 * Update a practitioner consultation default duration in minutes
 */
export function updateStaffConsultationDuration(staffId, minutes) {
  const list = getStaffList();
  const index = list.findIndex(s => s.id === staffId);
  if (index >= 0) {
    const updatedList = [...list];
    const shiftInfo = updatedList[index].shiftInfo || {};
    updatedList[index] = {
      ...updatedList[index],
      shiftInfo: {
        ...shiftInfo,
        consultationDurationMin: Number(minutes) || 30
      }
    };
    saveStaffList(updatedList);
    return updatedList[index];
  }
  return null;
}

/**
 * Helper to get full name with title
 */
export function getStaffFullName(staff) {
  if (!staff) return '';
  return `${staff.prefix || ''} ${staff.givenName || ''} ${staff.familyName || ''}`.trim();
}
