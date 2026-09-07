/**
 * Laboratory Panels and Diagnostic Studies Storage for IntegraMed
 * Features:
 * - Persistent storage in LocalStorage
 * - FHIR-compatible Observation & DiagnosticReport modeling
 * - Standardized CRUD: getLabPanels, saveLabPanel, deleteLabPanel, resetLabPanelsToDefault
 */

export const INITIAL_LAB_PANELS = [
  {
    id: 'panel-quimica-6',
    name: 'Química Sanguínea de 6 Elementos',
    nameEn: 'Comprehensive Metabolic Panel (6 Parameters)',
    date: '2026-09-02',
    dateFormatted: '02 Sep 2026',
    laboratoryName: 'Laboratorio Clínico Central',
    status: 'Completado',
    isExpanded: true,
    patientId: 'all',
    results: [
      {
        id: 'r-1',
        parameter: 'Creatinina',
        parameterEn: 'Creatinine',
        value: 0.85,
        unit: 'mg/dL',
        range: '0.5 - 1.2',
        min: 0.5,
        max: 1.2,
        status: 'stable',
        statusLabel: 'Estable',
        trend: [0.82, 0.84, 0.85]
      },
      {
        id: 'r-2',
        parameter: 'Ácido Úrico',
        parameterEn: 'Uric Acid',
        value: 4.2,
        unit: 'mg/dL',
        range: '2.4 - 5.7',
        min: 2.4,
        max: 5.7,
        status: 'stable',
        statusLabel: 'Estable',
        trend: [4.5, 4.3, 4.2]
      },
      {
        id: 'r-3',
        parameter: 'Glucosa',
        parameterEn: 'Glucose (Fasting)',
        value: 104,
        unit: 'mg/dL',
        range: '70 - 99',
        min: 70,
        max: 99,
        status: 'borderline',
        statusLabel: 'Límite',
        trend: [92, 98, 104]
      },
      {
        id: 'r-4',
        parameter: 'Colesterol Total',
        parameterEn: 'Total Cholesterol',
        value: 218,
        unit: 'mg/dL',
        range: '< 200',
        min: 120,
        max: 200,
        status: 'high',
        statusLabel: 'Alto',
        trend: [195, 205, 218]
      },
      {
        id: 'r-5',
        parameter: 'Triglicéridos',
        parameterEn: 'Triglycerides',
        value: 165,
        unit: 'mg/dL',
        range: '< 150',
        min: 50,
        max: 150,
        status: 'high',
        statusLabel: 'Alto',
        trend: [140, 155, 165]
      },
      {
        id: 'r-6',
        parameter: 'Urea Sérica',
        parameterEn: 'Blood Urea Nitrogen',
        value: 28.4,
        unit: 'mg/dL',
        range: '15 - 45',
        min: 15,
        max: 45,
        status: 'stable',
        statusLabel: 'Estable',
        trend: [26.0, 27.5, 28.4]
      }
    ]
  },
  {
    id: 'panel-biometria',
    name: 'Biometría Hemática Completa',
    nameEn: 'Complete Blood Count (CBC)',
    date: '2026-08-15',
    dateFormatted: '15 Ago 2026',
    laboratoryName: 'Laboratorio de Hematología Integral',
    status: 'Completado',
    isExpanded: false,
    patientId: 'all',
    results: [
      {
        id: 'bh-1',
        parameter: 'Leucocitos Totales',
        parameterEn: 'White Blood Cells (WBC)',
        value: 6.8,
        unit: '10^3/µL',
        range: '4.5 - 11.0',
        min: 4.5,
        max: 11.0,
        status: 'stable',
        statusLabel: 'Estable',
        trend: [7.1, 6.9, 6.8]
      },
      {
        id: 'bh-2',
        parameter: 'Hemoglobina',
        parameterEn: 'Hemoglobin',
        value: 13.5,
        unit: 'g/dL',
        range: '12.0 - 15.5',
        min: 12.0,
        max: 15.5,
        status: 'stable',
        statusLabel: 'Estable',
        trend: [13.2, 13.4, 13.5]
      },
      {
        id: 'bh-3',
        parameter: 'Hematocrito',
        parameterEn: 'Hematocrit',
        value: 41.2,
        unit: '%',
        range: '36.0 - 46.0',
        min: 36.0,
        max: 46.0,
        status: 'stable',
        statusLabel: 'Estable',
        trend: [40.5, 41.0, 41.2]
      },
      {
        id: 'bh-4',
        parameter: 'Plaquetas',
        parameterEn: 'Platelets',
        value: 240,
        unit: '10^3/µL',
        range: '150 - 450',
        min: 150,
        max: 450,
        status: 'stable',
        statusLabel: 'Estable',
        trend: [230, 235, 240]
      },
      {
        id: 'bh-5',
        parameter: 'Linfocitos',
        parameterEn: 'Lymphocytes',
        value: 32,
        unit: '%',
        range: '20 - 40',
        min: 20,
        max: 40,
        status: 'stable',
        statusLabel: 'Estable',
        trend: [30, 31, 32]
      }
    ]
  },
  {
    id: 'panel-tiroideo',
    name: 'Perfil Tiroideo Integral (TSH, T3, T4)',
    nameEn: 'Comprehensive Thyroid Panel (TSH, T3, T4)',
    date: '2026-01-18',
    dateFormatted: '18 Ene 2026',
    laboratoryName: 'Laboratorio Endocrinológico Central',
    status: 'Completado',
    isExpanded: false,
    patientId: 'all',
    results: [
      {
        id: 'pt-1',
        parameter: 'Hormona Estimulante de Tiroides (TSH)',
        parameterEn: 'Thyroid Stimulating Hormone (TSH)',
        value: 2.15,
        unit: 'µUI/mL',
        range: '0.4 - 4.0',
        min: 0.4,
        max: 4.0,
        status: 'stable',
        statusLabel: 'Estable',
        trend: [2.3, 2.2, 2.15]
      },
      {
        id: 'pt-2',
        parameter: 'Tiroxina Libre (T4 Libre)',
        parameterEn: 'Free Thyroxine (Free T4)',
        value: 1.18,
        unit: 'ng/dL',
        range: '0.8 - 1.8',
        min: 0.8,
        max: 1.8,
        status: 'stable',
        statusLabel: 'Estable',
        trend: [1.15, 1.16, 1.18]
      }
    ]
  }
];

const LABS_STORAGE_KEY = 'integramed_labs_panels';

/**
 * Get all laboratory panels from localStorage
 */
export function getLabPanels() {
  try {
    const raw = localStorage.getItem(LABS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading lab panels from storage', e);
  }
  // Initialize storage
  try {
    localStorage.setItem(LABS_STORAGE_KEY, JSON.stringify(INITIAL_LAB_PANELS));
  } catch (e) {}
  return INITIAL_LAB_PANELS;
}

/**
 * Save lab panels list to localStorage
 */
export function saveLabPanels(panels) {
  try {
    localStorage.setItem(LABS_STORAGE_KEY, JSON.stringify(panels));
  } catch (e) {
    console.error('Error saving lab panels', e);
  }
  return panels;
}

/**
 * Save or update a single lab panel
 */
export function saveLabPanel(panelData) {
  const list = getLabPanels();
  const id = panelData.id || `panel-${Date.now()}`;
  const now = new Date();
  const dateFormatted = `${now.getDate().toString().padStart(2, '0')} ${now.toLocaleString('es-MX', { month: 'short' })} ${now.getFullYear()}`;

  const cleanRecord = {
    ...panelData,
    id,
    date: panelData.date || now.toISOString().split('T')[0],
    dateFormatted: panelData.dateFormatted || dateFormatted,
    status: panelData.status || 'Completado',
    laboratoryName: panelData.laboratoryName || 'Laboratorio Clínico Central',
    results: panelData.results || []
  };

  const index = list.findIndex(p => p.id === id);
  let updated;
  if (index >= 0) {
    updated = [...list];
    updated[index] = cleanRecord;
  } else {
    updated = [cleanRecord, ...list];
  }

  saveLabPanels(updated);
  return cleanRecord;
}

/**
 * Delete a lab panel
 */
export function deleteLabPanel(panelId) {
  const list = getLabPanels();
  const filtered = list.filter(p => p.id !== panelId);
  saveLabPanels(filtered);
  return filtered;
}

/**
 * Reset lab panels back to default seed
 */
export function resetLabPanelsToDefault() {
  saveLabPanels(INITIAL_LAB_PANELS);
  return INITIAL_LAB_PANELS;
}
