function text(value) {
  return String(value || '').trim();
}

export function hasSoapContent(soap = {}) {
  if (
    text(soap.subjective)
    || text(soap.physicalExam)
    || text(soap.assessment)
    || text(soap.plan)
  ) {
    return true;
  }
  if (Array.isArray(soap.diagnoses) && soap.diagnoses.length > 0) return true;
  return false;
}

export function isEmptyEncounter(encounter = {}, soap = {}) {
  if (hasSoapContent(soap) || hasSoapContent(encounter)) return false;
  return true;
}

export function isEmptyLabPanel(panel = {}) {
  const results = Array.isArray(panel.results) ? panel.results : [];
  if (results.length === 0) return true;
  return results.every((row) => row.value === '' || row.value == null);
}

export function isEmptyDiagnosticReport(report = {}) {
  const results = report.result;
  if (Array.isArray(results) && results.length > 0) return false;
  if (Array.isArray(report.presentedForm) && report.presentedForm.length > 0) return false;
  if (text(report.conclusion)) return false;
  return true;
}

export function isEmptyMedicationRequest(resource = {}) {
  const name = resource.medicationCodeableConcept?.text
    || resource.medicationCodeableConcept?.coding?.[0]?.display
    || resource.medicationReference?.display;
  return !text(name);
}

export function isEmptyObservation(resource = {}) {
  if (resource.valueQuantity?.value != null) return false;
  if (text(resource.valueString) || text(resource.valueCodeableConcept?.text)) return false;
  if (Array.isArray(resource.component) && resource.component.some((c) => c.valueQuantity?.value != null || text(c.valueString))) {
    return false;
  }
  return true;
}
