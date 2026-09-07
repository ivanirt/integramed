/**
 * Clinical and Diagnostic Services Database & Persistent Storage for IntegraMed
 * Features:
 * - Comprehensive catalog of medical consultations, physical therapy, diagnostic imaging, clinical laboratories, and procedures
 * - CPT / LOINC / NOM-024 codes and clinical departments
 * - Preparation instructions, standard duration, pricing, and turnaround times
 * - LocalStorage persistence with fallback to initial seed
 */

export const SERVICE_CATEGORIES = {
  consulta_especialidad: {
    id: 'consulta_especialidad',
    labelEs: 'Consultas de Especialidad',
    labelEn: 'Specialty Consultations',
    color: '#0284c7',
    bgColor: '#e0f2fe',
    badgeClass: 'badge-sky',
    icon: 'Stethoscope'
  },
  imagenologia_diagnostico: {
    id: 'imagenologia_diagnostico',
    labelEs: 'Imagenología & Diagnóstico',
    labelEn: 'Imaging & Diagnostics',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    badgeClass: 'badge-purple',
    icon: 'Radio'
  },
  laboratorio_clinico: {
    id: 'laboratorio_clinico',
    labelEs: 'Laboratorio Clínico',
    labelEn: 'Clinical Laboratory',
    color: '#059669',
    bgColor: '#ecfdf5',
    badgeClass: 'badge-emerald',
    icon: 'FlaskConical'
  },
  terapia_rehabilitacion: {
    id: 'terapia_rehabilitacion',
    labelEs: 'Terapia Física & Rehabilitación',
    labelEn: 'Physical Therapy & Rehab',
    color: '#d97706',
    bgColor: '#fef3c7',
    badgeClass: 'badge-amber',
    icon: 'Activity'
  },
  procedimientos_menores: {
    id: 'procedimientos_menores',
    labelEs: 'Procedimientos Clínicos & Curaciones',
    labelEn: 'Clinical Procedures & Wound Care',
    color: '#e11d48',
    bgColor: '#ffe4e6',
    badgeClass: 'badge-rose',
    icon: 'Sparkles'
  },
  urgencias_triage: {
    id: 'urgencias_triage',
    labelEs: 'Urgencias & Triage',
    labelEn: 'Urgent Care & Triage',
    color: '#dc2626',
    bgColor: '#fee2e2',
    badgeClass: 'badge-red',
    icon: 'AlertCircle'
  }
};

export const INITIAL_CLINICAL_SERVICES = [
  {
    id: 'serv-med-interna',
    code: 'CPT-99205',
    nameEs: 'Consulta de Medicina Interna de Alta Complejidad',
    nameEn: 'Complex Internal Medicine Consultation',
    category: 'consulta_especialidad',
    department: 'Medicina Interna',
    descriptionEs: 'Evaluación clínica integral de patologías crónicas, comorbilidades múltiples y desórdenes metabólicos complejos con enfoque preventivo.',
    descriptionEn: 'Comprehensive clinical evaluation of chronic conditions, multiple comorbidities, and complex metabolic disorders.',
    durationMinutes: 45,
    price: 950,
    currency: 'MXN',
    requiresAppointment: true,
    preparationInstructionsEs: 'Presentar estudios previos de laboratorio, lista de medicamentos actuales y carnet de salud.',
    preparationInstructionsEn: 'Bring prior lab tests, current medication list, and health log.',
    turnaroundTimeEs: 'Inmediato (en consulta)',
    turnaroundTimeEn: 'Immediate (in consultation)',
    sampleType: 'N/A',
    equipmentRequired: 'Estetoscopio Littmann, Tensiómetro WelchAllyn, Oxímetro',
    availableLocations: ['loc-campus-central', 'loc-clinica-norte'],
    status: 'available',
    createdAt: '2026-01-10T08:00:00Z'
  },
  {
    id: 'serv-ecocardio-doppler',
    code: 'CPT-93306',
    nameEs: 'Ecocardiograma Transtorácico Doppler Color',
    nameEn: 'Transthoracic Color Doppler Echocardiogram',
    category: 'imagenologia_diagnostico',
    department: 'Cardiología & Imagenología',
    descriptionEs: 'Ultrasonido cardíaco dinámico de alta resolución para valoración de función ventricular, fracción de eyección y anatomía valvular.',
    descriptionEn: 'High-resolution dynamic cardiac ultrasound evaluating ventricular function, ejection fraction, and valve anatomy.',
    durationMinutes: 40,
    price: 2400,
    currency: 'MXN',
    requiresAppointment: true,
    preparationInstructionsEs: 'No requiere ayuno estricto. Llevar ropa cómoda de dos piezas.',
    preparationInstructionsEn: 'No strict fasting required. Wear comfortable two-piece clothing.',
    turnaroundTimeEs: 'Mismo día (1 hora posterior)',
    turnaroundTimeEn: 'Same day (1 hour post exam)',
    sampleType: 'N/A',
    equipmentRequired: 'Ecógrafo Cardiovascular Philips CX50 / Sonda Sectorial',
    availableLocations: ['loc-campus-central'],
    status: 'available',
    createdAt: '2026-01-12T09:00:00Z'
  },
  {
    id: 'serv-quimica-sanguinea-6',
    code: 'LOINC-24323-8',
    nameEs: 'Química Sanguínea de 6 Elementos (Glucosa, Urea, Creatinina, Ácido Úrico, Colesterol, Triglicéridos)',
    nameEn: 'Basic Metabolic Panel 6 Parameters',
    category: 'laboratorio_clinico',
    department: 'Laboratorio Clínico Central',
    descriptionEs: 'Panel bioquímico básico para evaluación de función renal, perfil glucémico y screening de lípidos.',
    descriptionEn: 'Basic metabolic and lipid screening panel assessing glucose, kidney function, and lipids.',
    durationMinutes: 15,
    price: 380,
    currency: 'MXN',
    requiresAppointment: false,
    preparationInstructionsEs: 'Ayuno estricto de 8 a 12 horas. Ingesta de agua simple permitida.',
    preparationInstructionsEn: 'Strict fasting for 8 to 12 hours. Plain water allowed.',
    turnaroundTimeEs: 'Mismo día (2 horas)',
    turnaroundTimeEn: 'Same day (2 hours)',
    sampleType: 'Sangre venosa (Suero 3 mL)',
    equipmentRequired: 'Analizador Bioquímico Beckman Coulter AU480',
    availableLocations: ['loc-campus-central', 'loc-clinica-norte', 'loc-pediatria-sur'],
    status: 'available',
    createdAt: '2026-01-15T07:30:00Z'
  },
  {
    id: 'serv-biometria-hematica',
    code: 'LOINC-58410-2',
    nameEs: 'Citometría Hemática Completa con Frotis y Diferencial (BH)',
    nameEn: 'Complete Blood Count (CBC) with Differential',
    category: 'laboratorio_clinico',
    department: 'Laboratorio Clínico Central',
    descriptionEs: 'Conteo completo de glóbulos rojos, glóbulos blancos con diferencial, plaquetas e índices eritrocitarios.',
    descriptionEn: 'Complete blood count including RBC, WBC differential, platelets, and erythrocyte indices.',
    durationMinutes: 10,
    price: 260,
    currency: 'MXN',
    requiresAppointment: false,
    preparationInstructionsEs: 'Ayuno mínimo de 4 horas recomendado.',
    preparationInstructionsEn: 'Minimum 4-hour fasting recommended.',
    turnaroundTimeEs: 'Mismo día (1 hora)',
    turnaroundTimeEn: 'Same day (1 hour)',
    sampleType: 'Sangre total con EDTA (Tubo lila)',
    equipmentRequired: 'Citómetro Hematológico Mindray BC-6800 Plus',
    availableLocations: ['loc-campus-central', 'loc-clinica-norte', 'loc-pediatria-sur'],
    status: 'available',
    createdAt: '2026-01-15T08:00:00Z'
  },
  {
    id: 'serv-sesion-fisioterapia',
    code: 'CPT-97110',
    nameEs: 'Sesión de Fisioterapia y Terapia Manual Ortopédica',
    nameEn: 'Orthopedic Manual Physical Therapy Session',
    category: 'terapia_rehabilitacion',
    department: 'Medicina Física & Rehabilitación',
    descriptionEs: 'Sesión personalizada de terapia física que incluye movilización articular, electroterapia, termoterapia, ultrasonido terapéutico y ejercicio funcional.',
    descriptionEn: 'Personalized physical therapy including joint mobilization, electrotherapy, ultrasound, and functional exercises.',
    durationMinutes: 50,
    price: 650,
    currency: 'MXN',
    requiresAppointment: true,
    preparationInstructionsEs: 'Asistir con ropa deportiva holgada o flexible y calzado adecuado.',
    preparationInstructionsEn: 'Wear comfortable athletic clothing and proper footwear.',
    turnaroundTimeEs: 'Inmediato (al término de la sesión)',
    turnaroundTimeEn: 'Immediate (post session)',
    sampleType: 'N/A',
    equipmentRequired: 'Equipo Combo Electroterapia Chattanooga Intelect, Ultrasonido 1/3 MHz',
    availableLocations: ['loc-campus-central', 'loc-clinica-norte'],
    status: 'available',
    createdAt: '2026-01-18T10:00:00Z'
  },
  {
    id: 'serv-rehab-bobath',
    code: 'CPT-97530',
    nameEs: 'Neuro-rehabilitación Integral (Concepto Bobath)',
    nameEn: 'Neurological Rehabilitation (Bobath Concept)',
    category: 'terapia_rehabilitacion',
    department: 'Medicina Física & Rehabilitación',
    descriptionEs: 'Terapia especializada para pacientes con secuelas de EVC, traumatismo craneoencefálico, Parkinson o lesiones medulares.',
    descriptionEn: 'Specialized neurological therapy for patients recovering from stroke, TBI, Parkinson\'s, or spinal cord injuries.',
    durationMinutes: 60,
    price: 850,
    currency: 'MXN',
    requiresAppointment: true,
    preparationInstructionsEs: 'Venir acompañado de un familiar o cuidador. Traer ropa cómoda.',
    preparationInstructionsEn: 'Come accompanied by a caregiver. Wear comfortable clothing.',
    turnaroundTimeEs: 'Inmediato',
    turnaroundTimeEn: 'Immediate',
    sampleType: 'N/A',
    equipmentRequired: 'Mesa Bobath eléctrica, Barras paralelas de marcha, Bipedestador',
    availableLocations: ['loc-campus-central'],
    status: 'available',
    createdAt: '2026-01-20T11:00:00Z'
  },
  {
    id: 'serv-usg-abdominal',
    code: 'CPT-76700',
    nameEs: 'Ultrasonido Abdominal Integral de Alta Definición',
    nameEn: 'Complete High-Resolution Abdominal Ultrasound',
    category: 'imagenologia_diagnostico',
    department: 'Imagenología & Radiología',
    descriptionEs: 'Exploración ecográfica de hígado, vesícula biliar, vías biliares, páncreas, bazo, riñones y aorta abdominal.',
    descriptionEn: 'Comprehensive ultrasound evaluation of liver, gallbladder, pancreas, spleen, kidneys, and abdominal aorta.',
    durationMinutes: 30,
    price: 1100,
    currency: 'MXN',
    requiresAppointment: true,
    preparationInstructionsEs: 'Ayuno estricto de 6 a 8 horas para visualización vesicular adecuada.',
    preparationInstructionsEn: 'Strict fasting 6 to 8 hours for optimal gallbladder visualization.',
    turnaroundTimeEs: 'Mismo día (30 min con reporte)',
    turnaroundTimeEn: 'Same day (30 min with report)',
    sampleType: 'N/A',
    equipmentRequired: 'Ecógrafo General Electric LOGIQ P9 / Transductor Convexo',
    availableLocations: ['loc-campus-central', 'loc-clinica-norte'],
    status: 'available',
    createdAt: '2026-01-22T09:30:00Z'
  },
  {
    id: 'serv-electrocardiograma',
    code: 'CPT-93000',
    nameEs: 'Electrocardiograma de 12 Derivaciones en Reposo con Interpretación',
    nameEn: '12-Lead Resting Electrocardiogram with Interpretation',
    category: 'imagenologia_diagnostico',
    department: 'Cardiología & Urgencias',
    descriptionEs: 'Registro eléctrico de la actividad miocárdica para detección de arritmias, isquemia, bloqueos de rama y alteraciones electrolíticas.',
    descriptionEn: '12-lead electrical tracing detecting arrhythmias, myocardial ischemia, bundle branch blocks, and electrolyte shifts.',
    durationMinutes: 15,
    price: 450,
    currency: 'MXN',
    requiresAppointment: false,
    preparationInstructionsEs: 'No aplicarse cremas ni lociones corporales en el tórax el día del estudio.',
    preparationInstructionsEn: 'Do not apply body lotions or creams to the chest area.',
    turnaroundTimeEs: 'Inmediato (15 min con trazado impreso)',
    turnaroundTimeEn: 'Immediate (15 min with printed tracing)',
    sampleType: 'N/A',
    equipmentRequired: 'Electrocardiógrafo Digital Nihon Kohden Cardiofax M',
    availableLocations: ['loc-campus-central', 'loc-clinica-norte', 'loc-pediatria-sur'],
    status: 'available',
    createdAt: '2026-01-25T08:00:00Z'
  },
  {
    id: 'serv-puncion-seca',
    code: 'CPT-20552',
    nameEs: 'Punción Seca en Puntos Gatillo Miofasciales',
    nameEn: 'Dry Needling for Myofascial Trigger Points',
    category: 'procedimientos_menores',
    department: 'Medicina del Deporte & Fisioterapia',
    descriptionEs: 'Técnica semi-invasiva con agujas estériles de acupuntura para desactivación de puntos dolorosos y contracturas musculares rebeldes.',
    descriptionEn: 'Trigger point dry needling technique to alleviate severe myofascial muscle contractures.',
    durationMinutes: 25,
    price: 550,
    currency: 'MXN',
    requiresAppointment: true,
    preparationInstructionsEs: 'Informar sobre uso de anticoagulantes. Piel limpia sin cremas.',
    preparationInstructionsEn: 'Inform about anticoagulant medications. Clean skin without lotions.',
    turnaroundTimeEs: 'Inmediato',
    turnaroundTimeEn: 'Immediate',
    sampleType: 'N/A',
    equipmentRequired: 'Agujas estériles para punción seca Seirin / Agupunt',
    availableLocations: ['loc-campus-central', 'loc-clinica-norte'],
    status: 'available',
    createdAt: '2026-01-28T12:00:00Z'
  },
  {
    id: 'serv-curacion-heridas',
    code: 'CPT-16020',
    nameEs: 'Curación Avanzada de Heridas y Manejo de Estomas',
    nameEn: 'Advanced Wound Care and Stoma Management',
    category: 'procedimientos_menores',
    department: 'Enfermería Clínica & Cirugía Menor',
    descriptionEs: 'Limpieza estéril, debridación selectiva y colocación de apósitos bioactivos o hidrocoloides para heridas quirúrgicas y úlceras.',
    descriptionEn: 'Sterile cleansing, selective debridement, and bioactive hydrocolloid dressing for surgical wounds and ulcers.',
    durationMinutes: 30,
    price: 480,
    currency: 'MXN',
    requiresAppointment: false,
    preparationInstructionsEs: 'Traer apósitos especiales en caso de requerir prescripción de marca específica.',
    preparationInstructionsEn: 'Bring special prescribed dressings if specific brand is required.',
    turnaroundTimeEs: 'Inmediato',
    turnaroundTimeEn: 'Immediate',
    sampleType: 'N/A',
    equipmentRequired: 'Set de curación quirúrgica estéril, apósitos hidrocelulares',
    availableLocations: ['loc-campus-central', 'loc-clinica-norte', 'loc-pediatria-sur'],
    status: 'available',
    createdAt: '2026-01-30T10:00:00Z'
  },
  {
    id: 'serv-pediatria-control',
    code: 'CPT-99382',
    nameEs: 'Control de Niño Sano y Consulta Pediátrica Integral',
    nameEn: 'Well-Child Care & Pediatric Comprehensive Exam',
    category: 'consulta_especialidad',
    department: 'Pediatría & Neonatología',
    descriptionEs: 'Evaluación de crecimiento somatometría, hitos del neurodesarrollo, esquema de vacunación y nutrición infantil.',
    descriptionEn: 'Growth assessment, somatometry, neurodevelopment milestones, vaccination review, and child nutrition.',
    durationMinutes: 30,
    price: 800,
    currency: 'MXN',
    requiresAppointment: true,
    preparationInstructionsEs: 'Traer cartilla nacional de vacunación y registros de peso/talla previos.',
    preparationInstructionsEn: 'Bring child immunization card and previous growth charts.',
    turnaroundTimeEs: 'Inmediato',
    turnaroundTimeEn: 'Immediate',
    sampleType: 'N/A',
    equipmentRequired: 'Infantómetro Seca, Báscula pediátrica, Otoscopio WelchAllyn',
    availableLocations: ['loc-campus-central', 'loc-pediatria-sur'],
    status: 'available',
    createdAt: '2026-02-01T09:00:00Z'
  },
  {
    id: 'serv-perfil-tiroideo',
    code: 'LOINC-24322-0',
    nameEs: 'Perfil Tiroideo Completo (TSH, T3 Total, T3 Libre, T4 Total, T4 Libre, Yodo Proteico)',
    nameEn: 'Comprehensive Thyroid Function Panel',
    category: 'laboratorio_clinico',
    department: 'Laboratorio Clínico Central',
    descriptionEs: 'Determinación inmunoenzimática cuantitativa de hormonas tiroideas para diagnóstico de hipo/hipertiroidismo y control endocrino.',
    descriptionEn: 'Immunoenzymatic quantification of thyroid hormones diagnosing hypo/hyperthyroidism.',
    durationMinutes: 15,
    price: 720,
    currency: 'MXN',
    requiresAppointment: false,
    preparationInstructionsEs: 'Ayuno de 8 horas. No tomar levotiroxina antes de la toma matutina de muestra.',
    preparationInstructionsEn: '8 hours fasting. Do not take morning levothyroxine prior to blood draw.',
    turnaroundTimeEs: '24 horas',
    turnaroundTimeEn: '24 hours',
    sampleType: 'Sangre venosa (Suero 4 mL)',
    equipmentRequired: 'Analizador de Quimioluminiscencia Abbott ARCHITECT i1000SR',
    availableLocations: ['loc-campus-central', 'loc-clinica-norte'],
    status: 'available',
    createdAt: '2026-02-05T07:30:00Z'
  },
  {
    id: 'serv-triage-urgencias',
    code: 'CPT-99283',
    nameEs: 'Evaluación y Clasificación de Triage Manchester en Urgencias',
    nameEn: 'Manchester Emergency Triage Assessment',
    category: 'urgencias_triage',
    department: 'Urgencias Médicas',
    descriptionEs: 'Evaluación clínica rápida y sistemática para determinar nivel de prioridad asistencial (Rojo, Naranja, Amarillo, Verde, Azul).',
    descriptionEn: 'Rapid systematic clinical evaluation prioritizing emergency care level (Manchester System).',
    durationMinutes: 10,
    price: 350,
    currency: 'MXN',
    requiresAppointment: false,
    preparationInstructionsEs: 'Atención continua 24/7 sin cita previa.',
    preparationInstructionsEn: 'Continuous 24/7 care, walk-ins welcome.',
    turnaroundTimeEs: 'Inmediato (< 5 min)',
    turnaroundTimeEn: 'Immediate (< 5 min)',
    sampleType: 'N/A',
    equipmentRequired: 'Monitor de Signos Vitales Mindray ePM 12M, Glucómetro Capilar',
    availableLocations: ['loc-campus-central', 'loc-clinica-norte'],
    status: 'available',
    createdAt: '2026-02-10T00:00:00Z'
  }
];

const STORAGE_KEY = 'integramed_clinical_services_catalog';

/**
 * Get all clinical & diagnostic services
 */
export function getClinicalServices() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading clinical services, using defaults', e);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CLINICAL_SERVICES));
  } catch (e) {}
  return INITIAL_CLINICAL_SERVICES;
}

/**
 * Save complete clinical services list
 */
export function saveClinicalServicesList(servicesArray) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servicesArray));
  } catch (e) {
    console.error('Failed to save clinical services', e);
  }
}

/**
 * Save or update a clinical service
 */
export function saveClinicalService(serviceData) {
  const list = getClinicalServices();
  const index = list.findIndex(s => s.id === serviceData.id);
  let updatedList;
  if (index >= 0) {
    updatedList = [...list];
    updatedList[index] = {
      ...updatedList[index],
      ...serviceData,
      updatedAt: new Date().toISOString()
    };
  } else {
    const newService = {
      ...serviceData,
      id: serviceData.id || `serv-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: serviceData.status || 'available'
    };
    updatedList = [newService, ...list];
  }
  saveClinicalServicesList(updatedList);
  return updatedList;
}

/**
 * Toggle clinical service status between 'available' and 'temporarily_unavailable'
 */
export function toggleClinicalServiceStatus(serviceId) {
  const list = getClinicalServices();
  const index = list.findIndex(s => s.id === serviceId);
  if (index >= 0) {
    const updatedList = [...list];
    const current = updatedList[index].status || 'available';
    updatedList[index] = {
      ...updatedList[index],
      status: current === 'available' ? 'temporarily_unavailable' : 'available',
      updatedAt: new Date().toISOString()
    };
    saveClinicalServicesList(updatedList);
    return updatedList;
  }
  return list;
}

/**
 * Delete a clinical service
 */
export function deleteClinicalService(serviceId) {
  const list = getClinicalServices();
  const filtered = list.filter(s => s.id !== serviceId);
  saveClinicalServicesList(filtered);
  return filtered;
}

/**
 * Reset clinical services to default seed
 */
export function resetClinicalServicesToDefault() {
  saveClinicalServicesList(INITIAL_CLINICAL_SERVICES);
  return INITIAL_CLINICAL_SERVICES;
}
