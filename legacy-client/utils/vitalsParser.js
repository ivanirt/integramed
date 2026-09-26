/**
 * FHIR Observation Vitals Parser & Normalizer
 */

export const LOINC_CODES = {
  HEART_RATE: '8867-4',
  TEMPERATURE: '8310-5',
  RESPIRATORY_RATE: '9279-1',
  OXYGEN_SATURATION: '59408-5',
  HEIGHT: '8302-2',
  WEIGHT: '29463-7',
  BMI: '39156-5',
  BP_PANEL_1: '55284-4',
  BP_PANEL_2: '85354-9',
  BP_SYSTOLIC: '8480-6',
  BP_DIASTOLIC: '8462-4'
};

/**
 * Extracts a LOINC code from an observation's code object.
 */
function getObservationLoincCode(obs) {
  if (!obs?.code) return null;
  const coding = obs.code.coding?.find(c => c.system?.includes('loinc') || /^[0-9]+-[0-9]+$/.test(c.code));
  if (coding?.code) return coding.code;
  return obs.code.coding?.[0]?.code || null;
}

/**
 * Extracts numeric value and unit from an observation or component.
 */
function getValueAndUnit(quantityObj) {
  if (!quantityObj) return { value: null, unit: '' };
  const val = typeof quantityObj.value === 'number' ? quantityObj.value : parseFloat(quantityObj.value);
  let unit = quantityObj.unit || quantityObj.code || '';
  
  // Normalize units
  if (unit === 'Cel' || unit === 'degC') unit = '°C';
  if (unit === '[degF]' || unit === 'degF') unit = '°F';
  if (unit === '/min') unit = 'bpm';
  if (unit === '%') unit = '%';
  if (unit === 'kg/m2') unit = 'kg/m²';
  if (unit === 'mm[Hg]') unit = 'mmHg';

  return {
    value: isNaN(val) ? null : val,
    unit
  };
}

/**
 * Parses raw FHIR Observation array into structured time series.
 */
export function parseVitalObservations(observations = []) {
  const result = {
    heartRate: [],
    temperature: [],
    respiratoryRate: [],
    oxygenSaturation: [],
    height: [],
    weight: [],
    bmi: [],
    bloodPressure: [],
    allReadings: []
  };

  if (!Array.isArray(observations) || observations.length === 0) {
    return result;
  }

  // Temporary map for matching systolic & diastolic on same date/encounter if separated
  const bpByDate = new Map();

  observations.forEach((obs) => {
    if (!obs || obs.resourceType !== 'Observation') return;

    const dateStr = obs.effectiveDateTime || obs.issued || obs.meta?.lastUpdated;
    if (!dateStr) return;

    const timestamp = new Date(dateStr).getTime();
    if (isNaN(timestamp)) return;

    const loinc = getObservationLoincCode(obs);
    const displayName = obs.code?.text || obs.code?.coding?.[0]?.display || 'Observation';

    // 1. Check Blood Pressure Panels (55284-4, 85354-9) or components
    if (loinc === LOINC_CODES.BP_PANEL_1 || loinc === LOINC_CODES.BP_PANEL_2 || obs.component?.length > 0) {
      let systolic = null;
      let diastolic = null;
      let unit = 'mmHg';

      obs.component?.forEach((comp) => {
        const compCode = comp.code?.coding?.[0]?.code || '';
        const { value: compVal, unit: compUnit } = getValueAndUnit(comp.valueQuantity);
        if (compUnit) unit = compUnit;

        if (compCode === LOINC_CODES.BP_SYSTOLIC || comp.code?.text?.toLowerCase().includes('systolic') || comp.code?.coding?.[0]?.display?.toLowerCase().includes('systolic')) {
          systolic = compVal;
        } else if (compCode === LOINC_CODES.BP_DIASTOLIC || comp.code?.text?.toLowerCase().includes('diastolic') || comp.code?.coding?.[0]?.display?.toLowerCase().includes('diastolic')) {
          diastolic = compVal;
        }
      });

      if (systolic !== null || diastolic !== null) {
        bpByDate.set(dateStr, {
          id: obs.id,
          date: dateStr,
          timestamp,
          systolic: systolic !== null ? systolic : bpByDate.get(dateStr)?.systolic,
          diastolic: diastolic !== null ? diastolic : bpByDate.get(dateStr)?.diastolic,
          unit,
          status: obs.status || 'final'
        });

        result.allReadings.push({
          id: obs.id,
          date: dateStr,
          timestamp,
          type: 'Blood Pressure',
          code: '55284-4',
          value: `${systolic ?? '-'}/${diastolic ?? '-'}`,
          unit,
          status: obs.status || 'final'
        });
        return;
      }
    }

    // Direct Systolic
    if (loinc === LOINC_CODES.BP_SYSTOLIC) {
      const { value, unit } = getValueAndUnit(obs.valueQuantity);
      if (value !== null) {
        const existing = bpByDate.get(dateStr) || { id: obs.id, date: dateStr, timestamp, unit: unit || 'mmHg', status: obs.status };
        existing.systolic = value;
        bpByDate.set(dateStr, existing);
      }
      return;
    }

    // Direct Diastolic
    if (loinc === LOINC_CODES.BP_DIASTOLIC) {
      const { value, unit } = getValueAndUnit(obs.valueQuantity);
      if (value !== null) {
        const existing = bpByDate.get(dateStr) || { id: obs.id, date: dateStr, timestamp, unit: unit || 'mmHg', status: obs.status };
        existing.diastolic = value;
        bpByDate.set(dateStr, existing);
      }
      return;
    }

    // 2. Standard single-value vital signs
    const { value, unit } = getValueAndUnit(obs.valueQuantity);
    if (value === null) return;

    const dataPoint = {
      id: obs.id,
      date: dateStr,
      timestamp,
      value: Math.round(value * 100) / 100,
      unit,
      status: obs.status || 'final'
    };

    switch (loinc) {
      case LOINC_CODES.HEART_RATE:
        result.heartRate.push(dataPoint);
        result.allReadings.push({ ...dataPoint, type: 'Heart Rate', code: loinc });
        break;

      case LOINC_CODES.TEMPERATURE:
        result.temperature.push(dataPoint);
        result.allReadings.push({ ...dataPoint, type: 'Temperature', code: loinc });
        break;

      case LOINC_CODES.RESPIRATORY_RATE:
        result.respiratoryRate.push(dataPoint);
        result.allReadings.push({ ...dataPoint, type: 'Respiratory Rate', code: loinc });
        break;

      case LOINC_CODES.OXYGEN_SATURATION:
        result.oxygenSaturation.push(dataPoint);
        result.allReadings.push({ ...dataPoint, type: 'Oxygen Saturation', code: loinc });
        break;

      case LOINC_CODES.HEIGHT:
        result.height.push(dataPoint);
        result.allReadings.push({ ...dataPoint, type: 'Height', code: loinc });
        break;

      case LOINC_CODES.WEIGHT:
        result.weight.push(dataPoint);
        result.allReadings.push({ ...dataPoint, type: 'Weight', code: loinc });
        break;

      case LOINC_CODES.BMI:
        result.bmi.push(dataPoint);
        result.allReadings.push({ ...dataPoint, type: 'BMI', code: loinc });
        break;

      default:
        // Other vital signs
        result.allReadings.push({ ...dataPoint, type: displayName, code: loinc || 'N/A' });
        break;
    }
  });

  // Sort blood pressure readings and push into result
  result.bloodPressure = Array.from(bpByDate.values()).sort((a, b) => a.timestamp - b.timestamp);

  // Sort all individual vital sign series chronologically (oldest to newest for charts)
  ['heartRate', 'temperature', 'respiratoryRate', 'oxygenSaturation', 'height', 'weight', 'bmi'].forEach((key) => {
    result[key].sort((a, b) => a.timestamp - b.timestamp);
  });

  // Sort table readings newest to oldest
  result.allReadings.sort((a, b) => b.timestamp - a.timestamp);

  return result;
}
