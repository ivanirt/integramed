/**
 * Medication Catalog, Pharmacy Inventory & Patient Dispensation Storage for IntegraMed
 * Aligned with HL7 FHIR R4 Medication, MedicationKnowledge, MedicationDispense and InventoryReport
 */

export const INITIAL_MEDICATIONS = [
  {
    id: 'med-paracetamol-500',
    brandName: 'Tempra Forte',
    genericName: 'Paracetamol',
    code: 'SSA-010.000.0104.00 / ATC N02BE01',
    category: 'Analgésicos y Antipiréticos',
    dosageForm: 'Tabletas',
    strength: '500 mg',
    presentation: 'Caja con 20 tabletas',
    route: 'Oral',
    stock: 185,
    minStock: 40,
    maxStock: 500,
    reorderPoint: 60,
    batchNumber: 'LOTE-PAR-2408',
    expiryDate: '2026-10-31',
    costPrice: 45.00,
    unitPrice: 95.00,
    controlFraction: 'Fracción V (Libre acceso)',
    requiresPrescription: false,
    storageTemp: '15°C - 30°C (Ambiente seco)',
    storageLocation: 'Estante A-01 / Nivel 2',
    supplier: 'Sanofi Aventis México',
    movements: [
      { id: 'm-1', type: 'in', quantity: 200, reason: 'Compra a proveedor', date: '2026-08-01', user: 'Lic. Edith Alvarez' },
      { id: 'm-2', type: 'out', quantity: 15, reason: 'Dispensación receta #REC-8491', date: '2026-08-15', user: 'Enf. Lluvia Robledo' }
    ]
  },
  {
    id: 'med-amoxicilina-clavulanico',
    brandName: 'Augmentin 875/125',
    genericName: 'Amoxicilina / Ácido Clavulánico',
    code: 'SSA-010.000.1972.00 / ATC J01CR02',
    category: 'Antibióticos Sistémicos',
    dosageForm: 'Comprimidos',
    strength: '875 mg / 125 mg',
    presentation: 'Caja con 14 comprimidos recubiertos',
    route: 'Oral',
    stock: 28, // Low stock warning
    minStock: 30,
    maxStock: 200,
    reorderPoint: 45,
    batchNumber: 'LOTE-AUG-2401',
    expiryDate: '2026-03-31', // Near expiry warning
    costPrice: 220.00,
    unitPrice: 430.00,
    controlFraction: 'Fracción IV (Antibiótico con receta médica retenida)',
    requiresPrescription: true,
    storageTemp: '15°C - 25°C (Lugar fresco y seco)',
    storageLocation: 'Estante B-03 / Gaveta Antibióticos',
    supplier: 'GlaxoSmithKline México',
    movements: [
      { id: 'm-3', type: 'in', quantity: 50, reason: 'Reabastecimiento', date: '2026-07-10', user: 'Lic. Edith Alvarez' },
      { id: 'm-4', type: 'out', quantity: 22, reason: 'Dispensación consultas urgencias', date: '2026-08-20', user: 'Enf. Carmen Saldaña' }
    ]
  },
  {
    id: 'med-losartan-50',
    brandName: 'Cozaar',
    genericName: 'Losartán Potásico',
    code: 'SSA-010.000.2520.00 / ATC C09CA01',
    category: 'Antihipertensivos & Cardiovascular',
    dosageForm: 'Grageas',
    strength: '50 mg',
    presentation: 'Caja con 30 grageas',
    route: 'Oral',
    stock: 140,
    minStock: 50,
    maxStock: 400,
    reorderPoint: 70,
    batchNumber: 'LOTE-LOS-2412',
    expiryDate: '2027-05-30',
    costPrice: 110.00,
    unitPrice: 245.00,
    controlFraction: 'Fracción IV (Venta con receta)',
    requiresPrescription: true,
    storageTemp: '15°C - 30°C',
    storageLocation: 'Estante C-01 / Cardiología',
    supplier: 'Organon México S. de R.L.',
    movements: []
  },
  {
    id: 'med-insulina-glargina',
    brandName: 'Lantus SoloStar',
    genericName: 'Insulina Glargina',
    code: 'SSA-010.000.4158.00 / ATC A10AE04',
    category: 'Endocrinología & Diabetes',
    dosageForm: 'Solución Inyectable en Pluma',
    strength: '100 UI/ml (3 ml)',
    presentation: 'Caja con 5 plumas precargadas',
    route: 'Subcutánea',
    stock: 18,
    minStock: 15,
    maxStock: 80,
    reorderPoint: 25,
    batchNumber: 'LOTE-INS-9812',
    expiryDate: '2026-12-15',
    costPrice: 780.00,
    unitPrice: 1350.00,
    controlFraction: 'Fracción IV (Venta con receta)',
    requiresPrescription: true,
    storageTemp: '2°C - 8°C (Cadena de Frío - Refrigerador Clínico)',
    storageLocation: 'Refrigerador Farmacia 1 / Bandeja A',
    supplier: 'Sanofi Aventis México',
    movements: []
  },
  {
    id: 'med-ketorolaco-trometamina',
    brandName: 'Dolac Inyectable',
    genericName: 'Ketorolaco Trometamina',
    code: 'SSA-010.000.3411.00 / ATC M01AB15',
    category: 'Antiinflamatorios y Analgésicos AINEs',
    dosageForm: 'Solución Inyectable en Ampolleta',
    strength: '30 mg / 1 ml',
    presentation: 'Caja con 3 ampolletas',
    route: 'Intravenosa / Intramuscular',
    stock: 95,
    minStock: 30,
    maxStock: 250,
    reorderPoint: 50,
    batchNumber: 'LOTE-KET-2409',
    expiryDate: '2027-01-31',
    costPrice: 55.00,
    unitPrice: 130.00,
    controlFraction: 'Fracción IV (Venta con receta)',
    requiresPrescription: true,
    storageTemp: '15°C - 30°C (Protéjase de la luz)',
    storageLocation: 'Estante A-04 / Inyectables Urgencias',
    supplier: 'Laboratorios Senosiain S.A.',
    movements: []
  },
  {
    id: 'med-omeprazol-40',
    brandName: 'Losec IV',
    genericName: 'Omeprazol Sódico',
    code: 'SSA-010.000.5187.00 / ATC A02BC01',
    category: 'Gastroenterología & Antiulcerosos',
    dosageForm: 'Frasco Ámpula Liofilizado',
    strength: '40 mg con diluyente 10 ml',
    presentation: 'Caja con 1 frasco ámpula y ampolleta',
    route: 'Intravenosa',
    stock: 82,
    minStock: 25,
    maxStock: 200,
    reorderPoint: 40,
    batchNumber: 'LOTE-OME-2415',
    expiryDate: '2026-08-31',
    costPrice: 65.00,
    unitPrice: 160.00,
    controlFraction: 'Fracción IV (Venta con receta)',
    requiresPrescription: true,
    storageTemp: '15°C - 30°C',
    storageLocation: 'Estante D-02 / Terapia Intravenosa',
    supplier: 'AstraZeneca México',
    movements: []
  },
  {
    id: 'med-salbutamol-aerosol',
    brandName: 'Ventolin Aerosol',
    genericName: 'Sulfato de Salbutamol',
    code: 'SSA-010.000.0432.00 / ATC R03AC02',
    category: 'Neumología & Broncodilatadores',
    dosageForm: 'Aerosol Inhalador',
    strength: '100 mcg / dosis (200 dosis)',
    presentation: 'Frasco presurizado con inhalador',
    route: 'Inhalatoria',
    stock: 54,
    minStock: 20,
    maxStock: 150,
    reorderPoint: 35,
    batchNumber: 'LOTE-SAL-2403',
    expiryDate: '2027-02-28',
    costPrice: 95.00,
    unitPrice: 210.00,
    controlFraction: 'Fracción IV (Venta con receta)',
    requiresPrescription: true,
    storageTemp: 'No congelar, menor a 30°C',
    storageLocation: 'Estante E-01 / Vías Respiratorias',
    supplier: 'GlaxoSmithKline México',
    movements: []
  },
  {
    id: 'med-metformina-850',
    brandName: 'Dabex',
    genericName: 'Clorhidrato de Metformina',
    code: 'SSA-010.000.5165.00 / ATC A10BA02',
    category: 'Endocrinología & Diabetes',
    dosageForm: 'Tabletas',
    strength: '850 mg',
    presentation: 'Caja con 60 tabletas',
    route: 'Oral',
    stock: 110,
    minStock: 35,
    maxStock: 300,
    reorderPoint: 55,
    batchNumber: 'LOTE-MET-2411',
    expiryDate: '2027-08-31',
    costPrice: 70.00,
    unitPrice: 175.00,
    controlFraction: 'Fracción IV (Venta con receta)',
    requiresPrescription: true,
    storageTemp: '15°C - 30°C',
    storageLocation: 'Estante C-03 / Diabetes',
    supplier: 'Merck S.A. de C.V.',
    movements: []
  }
];

export const INITIAL_STOCK_INGRESSES = [
  {
    id: 'ing-2026-001',
    medicationId: 'med-paracetamol-500',
    medicationName: 'Paracetamol (Tempra Forte)',
    batchNumber: 'LOTE-PAR-2408',
    quantity: 200,
    unitCost: 45.00,
    totalCost: 9000.00,
    supplier: 'Sanofi Aventis México',
    invoiceNumber: 'FAC-SANOFI-8821',
    receiptDate: '2026-08-01',
    expiryDate: '2026-10-31',
    storageLocation: 'Estante A-01 / Nivel 2',
    receivedBy: 'Lic. Edith Alvarez',
    notes: 'Recepción conforme con sello de calidad e inspección visual'
  },
  {
    id: 'ing-2026-002',
    medicationId: 'med-amoxicilina-clavulanico',
    medicationName: 'Amoxicilina / Ácido Clavulánico (Augmentin)',
    batchNumber: 'LOTE-AUG-2401',
    quantity: 50,
    unitCost: 220.00,
    totalCost: 11000.00,
    supplier: 'GlaxoSmithKline México',
    invoiceNumber: 'FAC-GSK-4412',
    receiptDate: '2026-07-10',
    expiryDate: '2026-03-31',
    storageLocation: 'Estante B-03 / Gaveta Antibióticos',
    receivedBy: 'Lic. Edith Alvarez',
    notes: 'Lote prioritario para urgencias y consulta general'
  },
  {
    id: 'ing-2026-003',
    medicationId: 'med-insulina-glargina',
    medicationName: 'Insulina Glargina (Lantus SoloStar)',
    batchNumber: 'LOTE-INS-9812',
    quantity: 25,
    unitCost: 780.00,
    totalCost: 19500.00,
    supplier: 'Sanofi Aventis México',
    invoiceNumber: 'FAC-SANOFI-9104',
    receiptDate: '2026-08-18',
    expiryDate: '2026-12-15',
    storageLocation: 'Refrigerador Farmacia 1 / Bandeja A',
    receivedBy: 'Enf. Carmen Saldaña',
    notes: 'Verificación de cadena de frío a 4.2°C al momento de descarga'
  }
];

export const INITIAL_DISPENSATIONS = [
  {
    id: 'disp-2026-001',
    patientId: 'patient-mariana-silva',
    patientName: 'Mariana Silva Ruiz',
    patientIdentifier: 'CLI-2026-0419',
    medicationId: 'med-losartan-50',
    medicationName: 'Losartán Potásico (Cozaar)',
    quantity: 30,
    dosageInstructions: '1 tableta vía oral cada 12 horas por 30 días',
    prescriberDoctor: 'Dra. María Elena Rostro',
    prescriptionFolio: 'REC-2026-0842',
    dispenseDate: '2026-09-02',
    dispenseTime: '10:45',
    status: 'completed', // 'completed' | 'partial' | 'cancelled'
    dispensedBy: 'Enf. Lluvia Robledo',
    notes: 'Paciente acude con receta vigente de consulta externa'
  },
  {
    id: 'disp-2026-002',
    patientId: 'patient-carlos-mendoza',
    patientName: 'Carlos Mendoza Cruz',
    patientIdentifier: 'CLI-2026-0891',
    medicationId: 'med-amoxicilina-clavulanico',
    medicationName: 'Amoxicilina / Ácido Clavulánico (Augmentin)',
    quantity: 14,
    dosageInstructions: '1 comprimido cada 12 horas con alimentos por 7 días',
    prescriberDoctor: 'Dr. Roberto Mendoza',
    prescriptionFolio: 'REC-2026-0914',
    dispenseDate: '2026-09-05',
    dispenseTime: '16:20',
    status: 'completed',
    dispensedBy: 'Lic. Edith Alvarez',
    notes: 'Receta de antibiótico sellada y retenida conforme a Fracción IV'
  },
  {
    id: 'disp-2026-003',
    patientId: 'patient-sofia-garcia',
    patientName: 'Sofía García Morales',
    patientIdentifier: 'CLI-2026-0155',
    medicationId: 'med-salbutamol-aerosol',
    medicationName: 'Sulfato de Salbutamol (Ventolin Aerosol)',
    quantity: 1,
    dosageInstructions: '2 disparos cada 6 horas en caso de crisis asmática',
    prescriberDoctor: 'Dr. Alejandro Peña',
    prescriptionFolio: 'REC-2026-0955',
    dispenseDate: '2026-09-06',
    dispenseTime: '11:15',
    status: 'completed',
    dispensedBy: 'Enf. Carmen Saldaña',
    notes: 'Se brinda orientación sobre uso correcto de aerocámara'
  }
];

const MEDS_STORAGE_KEY = 'integramed_medications_inventory';
const INGRESS_STORAGE_KEY = 'integramed_stock_ingresses';
const DISPENSE_STORAGE_KEY = 'integramed_patient_dispensations';

// ==========================================
// 1. MEDICATIONS CATALOG & STOCK
// ==========================================

export function getMedications() {
  try {
    const raw = localStorage.getItem(MEDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error reading medications inventory', e);
  }
  try {
    localStorage.setItem(MEDS_STORAGE_KEY, JSON.stringify(INITIAL_MEDICATIONS));
  } catch {}
  return INITIAL_MEDICATIONS;
}

export function saveMedications(medsList) {
  try {
    localStorage.setItem(MEDS_STORAGE_KEY, JSON.stringify(medsList));
  } catch (e) {
    console.error('Failed to save medications', e);
  }
  return medsList;
}

export function saveMedication(medData) {
  const list = getMedications();
  const id = medData.id || `med-${Date.now()}`;
  const cleanMed = {
    ...medData,
    id,
    stock: Number(medData.stock) || 0,
    minStock: Number(medData.minStock) || 10,
    maxStock: Number(medData.maxStock) || 100,
    reorderPoint: Number(medData.reorderPoint) || 20,
    costPrice: Number(medData.costPrice) || 0,
    unitPrice: Number(medData.unitPrice) || 0,
    movements: medData.movements || []
  };

  const index = list.findIndex(m => m.id === id);
  let updated;
  if (index >= 0) {
    updated = [...list];
    updated[index] = { ...updated[index], ...cleanMed };
  } else {
    updated = [cleanMed, ...list];
  }
  saveMedications(updated);
  return updated;
}

export function deleteMedication(medId) {
  const list = getMedications();
  const updated = list.filter(m => m.id !== medId);
  saveMedications(updated);
  return updated;
}

export function adjustMedicationStock(medId, { type, quantity, reason, user }) {
  const list = getMedications();
  const index = list.findIndex(m => m.id === medId);
  if (index >= 0) {
    const updated = [...list];
    const med = { ...updated[index] };
    const qty = Number(quantity) || 0;
    
    if (type === 'in') {
      med.stock = (med.stock || 0) + qty;
    } else if (type === 'out') {
      med.stock = Math.max(0, (med.stock || 0) - qty);
    } else if (type === 'adjustment') {
      med.stock = qty;
    }

    const movement = {
      id: `mov-${Date.now()}`,
      type,
      quantity: qty,
      reason: reason || 'Ajuste de inventario',
      date: new Date().toISOString().split('T')[0],
      user: user || 'Administrador Clínico'
    };

    med.movements = [movement, ...(med.movements || [])];
    updated[index] = med;
    saveMedications(updated);
    return { updatedList: updated, med };
  }
  return null;
}

// ==========================================
// 2. STOCK INGRESSES (ENTRADAS DE ALMACÉN)
// ==========================================

export function getStockIngresses() {
  try {
    const raw = localStorage.getItem(INGRESS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading stock ingresses', e);
  }
  try {
    localStorage.setItem(INGRESS_STORAGE_KEY, JSON.stringify(INITIAL_STOCK_INGRESSES));
  } catch {}
  return INITIAL_STOCK_INGRESSES;
}

export function saveStockIngresses(ingList) {
  try {
    localStorage.setItem(INGRESS_STORAGE_KEY, JSON.stringify(ingList));
  } catch (e) {
    console.error('Failed to save stock ingresses', e);
  }
  return ingList;
}

export function saveStockIngress(ingressData) {
  const ingresses = getStockIngresses();
  const id = ingressData.id || `ing-${Date.now()}`;
  const now = new Date();
  const dateStr = ingressData.receiptDate || now.toISOString().split('T')[0];
  const qty = Number(ingressData.quantity) || 0;
  const unitCost = Number(ingressData.unitCost) || 0;
  const totalCost = ingressData.totalCost ? Number(ingressData.totalCost) : (qty * unitCost);

  const cleanRecord = {
    ...ingressData,
    id,
    receiptDate: dateStr,
    quantity: qty,
    unitCost,
    totalCost
  };

  const index = ingresses.findIndex(i => i.id === id);
  let updatedIngresses;
  const isNew = index < 0;

  if (index >= 0) {
    updatedIngresses = [...ingresses];
    updatedIngresses[index] = cleanRecord;
  } else {
    updatedIngresses = [cleanRecord, ...ingresses];
  }
  saveStockIngresses(updatedIngresses);

  // If newly registered, automatically add stock to the medication and log movement
  if (isNew && cleanRecord.medicationId && qty > 0) {
    const meds = getMedications();
    const medIdx = meds.findIndex(m => m.id === cleanRecord.medicationId);
    if (medIdx >= 0) {
      const med = { ...meds[medIdx] };
      med.stock = (med.stock || 0) + qty;
      if (cleanRecord.batchNumber) med.batchNumber = cleanRecord.batchNumber;
      if (cleanRecord.expiryDate) med.expiryDate = cleanRecord.expiryDate;
      if (cleanRecord.storageLocation) med.storageLocation = cleanRecord.storageLocation;
      if (unitCost > 0) med.costPrice = unitCost;

      const movement = {
        id: `mov-ing-${Date.now()}`,
        type: 'in',
        quantity: qty,
        reason: `Entrada Almacén: Factura ${cleanRecord.invoiceNumber || id} - ${cleanRecord.supplier || 'Proveedor'}`,
        date: dateStr,
        user: cleanRecord.receivedBy || 'Farmacia Central'
      };
      med.movements = [movement, ...(med.movements || [])];
      meds[medIdx] = med;
      saveMedications(meds);
    }
  }

  return { ingresses: updatedIngresses, record: cleanRecord };
}

export function deleteStockIngress(ingressId) {
  const ingresses = getStockIngresses();
  const target = ingresses.find(i => i.id === ingressId);
  const filtered = ingresses.filter(i => i.id !== ingressId);
  saveStockIngresses(filtered);

  // If deleting an ingress, reverse the stock addition if possible
  if (target && target.medicationId && target.quantity) {
    const meds = getMedications();
    const medIdx = meds.findIndex(m => m.id === target.medicationId);
    if (medIdx >= 0) {
      const med = { ...meds[medIdx] };
      med.stock = Math.max(0, (med.stock || 0) - Number(target.quantity));
      meds[medIdx] = med;
      saveMedications(meds);
    }
  }

  return filtered;
}

// ==========================================
// 3. PATIENT DISPENSATIONS (DISPENSACIÓN)
// ==========================================

export function getPatientDispensations() {
  try {
    const raw = localStorage.getItem(DISPENSE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading patient dispensations', e);
  }
  try {
    localStorage.setItem(DISPENSE_STORAGE_KEY, JSON.stringify(INITIAL_DISPENSATIONS));
  } catch {}
  return INITIAL_DISPENSATIONS;
}

export function savePatientDispensations(dispList) {
  try {
    localStorage.setItem(DISPENSE_STORAGE_KEY, JSON.stringify(dispList));
  } catch (e) {
    console.error('Failed to save patient dispensations', e);
  }
  return dispList;
}

export function savePatientDispensation(dispenseData) {
  const dispensations = getPatientDispensations();
  const id = dispenseData.id || `disp-${Date.now()}`;
  const now = new Date();
  const dateStr = dispenseData.dispenseDate || now.toISOString().split('T')[0];
  const timeStr = dispenseData.dispenseTime || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const qty = Number(dispenseData.quantity) || 1;

  const cleanRecord = {
    ...dispenseData,
    id,
    dispenseDate: dateStr,
    dispenseTime: timeStr,
    quantity: qty,
    status: dispenseData.status || 'completed'
  };

  const index = dispensations.findIndex(d => d.id === id);
  let updatedDispensations;
  const isNew = index < 0;

  if (index >= 0) {
    updatedDispensations = [...dispensations];
    updatedDispensations[index] = cleanRecord;
  } else {
    updatedDispensations = [cleanRecord, ...dispensations];
  }
  savePatientDispensations(updatedDispensations);

  // If newly dispensed, deduct stock from medication and log movement
  if (isNew && cleanRecord.medicationId && qty > 0) {
    const meds = getMedications();
    const medIdx = meds.findIndex(m => m.id === cleanRecord.medicationId);
    if (medIdx >= 0) {
      const med = { ...meds[medIdx] };
      med.stock = Math.max(0, (med.stock || 0) - qty);

      const movement = {
        id: `mov-disp-${Date.now()}`,
        type: 'out',
        quantity: qty,
        reason: `Dispensación: ${cleanRecord.patientName || 'Paciente'} (Receta ${cleanRecord.prescriptionFolio || 'S/F'})`,
        date: dateStr,
        user: cleanRecord.dispensedBy || 'Farmacia'
      };
      med.movements = [movement, ...(med.movements || [])];
      meds[medIdx] = med;
      saveMedications(meds);
    }
  }

  return { dispensations: updatedDispensations, record: cleanRecord };
}

export function deletePatientDispensation(dispenseId) {
  const dispensations = getPatientDispensations();
  const target = dispensations.find(d => d.id === dispenseId);
  const filtered = dispensations.filter(d => d.id !== dispenseId);
  savePatientDispensations(filtered);

  // If deleting/cancelling a dispensation, restore the stock
  if (target && target.medicationId && target.quantity) {
    const meds = getMedications();
    const medIdx = meds.findIndex(m => m.id === target.medicationId);
    if (medIdx >= 0) {
      const med = { ...meds[medIdx] };
      med.stock = (med.stock || 0) + Number(target.quantity);
      meds[medIdx] = med;
      saveMedications(meds);
    }
  }

  return filtered;
}

// ==========================================
// 4. RESET ALL PHARMACY DATA
// ==========================================

export function resetMedicationsData() {
  saveMedications(INITIAL_MEDICATIONS);
  saveStockIngresses(INITIAL_STOCK_INGRESSES);
  savePatientDispensations(INITIAL_DISPENSATIONS);
  return {
    medications: INITIAL_MEDICATIONS,
    ingresses: INITIAL_STOCK_INGRESSES,
    dispensations: INITIAL_DISPENSATIONS
  };
}
