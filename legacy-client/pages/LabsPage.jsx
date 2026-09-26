import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Microscope,
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  Plus,
  Trash2,
  User,
  Activity,
  FileUp,
  FileCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  X,
  ExternalLink,
  Printer,
  Download,
  RotateCcw,
  Pencil
} from 'lucide-react';
import { getPatients, getPatientById, createLabObservation, getPatientLabObservations } from '../services/fhirApi';
import { getPatientFullName, calculateAge, getPatientIdentifier } from '../utils/fhirHelper';
import { useLanguage } from '../i18n/LanguageContext';
import { getLabPanels, saveLabPanel, deleteLabPanel, resetLabPanelsToDefault, loadLabPanelsFromFhir } from '../utils/labsStorage';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import LabPanelModal from '../components/labs/LabPanelModal';

export default function LabsPage({ addToast }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const fileInputRef = useRef(null);

  const patientIdFromUrl = searchParams.get('patientId') || '';

  // Patient State
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(patientIdFromUrl);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);

  // Labs State (Persistent with localStorage)
  const [panels, setPanels] = useState(() => getLabPanels());
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Universal Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    warningText: '',
    icon: 'trash',
    isDanger: true,
    confirmText: '',
    onConfirm: null,
    itemId: '',
    itemName: ''
  });
  const [panelModal, setPanelModal] = useState({ isOpen: false, panel: null });

  // Load patients list
  useEffect(() => {
    let isMounted = true;
    setIsLoadingPatients(true);

    getPatients()
      .then((res) => {
        if (!isMounted) return;
        const patientList = res.patients || [];
        setPatients(patientList);

        if (patientList.length > 0) {
          const targetId = patientIdFromUrl || patientList[0].id;
          setSelectedPatientId(targetId);
          const found = patientList.find(p => p.id === targetId) || patientList[0];
          setSelectedPatient(found);
        }
      })
      .catch((err) => {
        console.error('Error fetching patients for labs:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPatients(false);
      });

    loadLabPanelsFromFhir()
      .then((list) => {
        if (isMounted) setPanels(list);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [patientIdFromUrl]);

  // When patient selection changes
  const handleSelectPatient = (id) => {
    setSelectedPatientId(id);
    setSearchParams({ patientId: id });
    const found = patients.find(p => p.id === id);
    if (found) setSelectedPatient(found);
  };

  // Toggle Panel Accordion
  const handleTogglePanel = (panelId) => {
    setPanels(prev =>
      prev.map(p =>
        p.id === panelId ? { ...p, isExpanded: !p.isExpanded } : p
      )
    );
  };

  // File Upload Handlers (Simulation & Ingestion)
  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) {
      processUploadedFiles(files);
    }
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target?.files || []);
    if (files.length > 0) {
      processUploadedFiles(files);
    }
  };

  const processUploadedFiles = (files) => {
    setIsUploading(true);
    const file = files[0];

    setTimeout(() => {
      // Simulate intelligent OCR extraction into a new panel
      const newPanel = {
        id: `panel-upload-${Date.now()}`,
        name: `Estudio Analizado: ${file.name.replace(/\.[^/.]+$/, '')}`,
        date: new Date().toISOString().split('T')[0],
        dateFormatted: 'Hoy (Carga Digital)',
        laboratoryName: 'Laboratorio de Diagnóstico Digital',
        status: 'Procesado con IA',
        isExpanded: true,
        results: [
          {
            id: `up-1-${Date.now()}`,
            parameter: 'Glucosa en Ayuno',
            value: 102,
            unit: 'mg/dL',
            range: '70 - 99',
            min: 70,
            max: 99,
            status: 'borderline',
            statusLabel: 'Límite',
            trend: [98, 104, 102]
          },
          {
            id: `up-2-${Date.now()}`,
            parameter: 'Hemoglobina Glucosilada (HbA1c)',
            value: 5.7,
            unit: '%',
            range: '< 5.7',
            min: 4.0,
            max: 5.7,
            status: 'stable',
            statusLabel: 'Estable',
            trend: [5.6, 5.6, 5.7]
          },
          {
            id: `up-3-${Date.now()}`,
            parameter: 'Perfil Lipídico - Colesterol LDL',
            value: 138,
            unit: 'mg/dL',
            range: '< 100',
            min: 50,
            max: 100,
            status: 'high',
            statusLabel: 'Alto',
            trend: [120, 130, 138]
          }
        ]
      };

      // Save to FHIR server in background
      if (selectedPatientId) {
        newPanel.results.forEach(res => {
          createLabObservation({
            patientId: selectedPatientId,
            code: '24323-8',
            display: res.parameter,
            value: res.value,
            unit: res.unit,
            referenceRange: res.range
          }).catch(console.warn);
        });
      }

      // Persist to local storage
      saveLabPanel(newPanel);
      setPanels(getLabPanels());
      setUploadedFiles(prev => [...prev, file.name]);
      setIsUploading(false);

      if (addToast) {
        addToast(
          'success',
          language === 'en'
            ? `Study "${file.name}" uploaded and processed. Parameters integrated into FHIR.`
            : `Estudio "${file.name}" cargado y procesado. Parámetros integrados a FHIR.`,
          language === 'en' ? 'Digital Study Processed' : 'Estudio Digital Procesado'
        );
      }
    }, 900);
  };

  const handleSaveLabPanel = (panelData) => {
    saveLabPanel(panelData);
    setPanels(getLabPanels());
    if (addToast) {
      addToast(
        'success',
        language === 'en' ? 'Laboratory study saved' : 'Estudio de laboratorio guardado',
        language === 'en' ? 'Catalog updated' : 'Catálogo actualizado'
      );
    }
  };

  // Delete Lab Panel Confirmation Handlers
  const handleDeletePanelClick = (e, panel) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: language === 'en' ? 'Delete Laboratory Study' : 'Eliminar Estudio de Laboratorio',
      message: language === 'en'
        ? `Are you sure you want to delete the study panel "${panel.name}"?`
        : `¿Está seguro de que desea eliminar el panel de estudio "${panel.name}"?`,
      warningText: language === 'en'
        ? 'All clinical parameters, units and trend graphs in this panel will be removed.'
        : 'Todos los parámetros clínicos, rangos y gráficas de tendencia de este estudio serán eliminados.',
      icon: 'trash',
      isDanger: true,
      confirmText: language === 'en' ? 'Delete Study' : 'Eliminar Estudio',
      itemName: panel.name,
      itemId: panel.id,
      onConfirm: () => {
        const updated = deleteLabPanel(panel.id);
        setPanels(updated);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (addToast) {
          addToast(
            'info',
            language === 'en' ? `Study panel "${panel.name}" deleted.` : `Estudio "${panel.name}" eliminado correctamente.`,
            language === 'en' ? 'Study Deleted' : 'Estudio Eliminado'
          );
        }
      }
    });
  };

  const handleResetPanelsClick = () => {
    setConfirmModal({
      isOpen: true,
      title: language === 'en' ? 'Reset Laboratory Catalog' : 'Restablecer Catálogo de Laboratorios',
      message: language === 'en'
        ? 'Are you sure you want to restore the default sample laboratory studies?'
        : '¿Está seguro de que desea restaurar los paneles y estudios de laboratorio por defecto?',
      warningText: language === 'en'
        ? 'Custom and uploaded study panels will be reset back to the standard clinical demonstration dataset.'
        : 'Los estudios personalizados o cargados manualmente se reemplazarán por el catálogo clínico estándar.',
      icon: 'reset',
      isDanger: false,
      confirmText: language === 'en' ? 'Reset Catalog' : 'Restaurar Catálogo',
      itemName: language === 'en' ? 'Default Diagnostic Panels' : 'Paneles Clínicos Estándar',
      itemId: 'SEED-LABS-CATALOG',
      onConfirm: () => {
        const resetData = resetLabPanelsToDefault();
        setPanels(resetData);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (addToast) {
          addToast(
            'success',
            language === 'en' ? 'Laboratory studies catalog restored to defaults.' : 'Catálogo de laboratorios restaurado a valores por defecto.',
            language === 'en' ? 'Catalog Restored' : 'Catálogo Restaurado'
          );
        }
      }
    });
  };

  // AI Interpretation
  const handleAskAi = (promptText = '') => {
    setIsAiThinking(true);
    setShowAiModal(true);

    const englishAnswer = {
      title: 'Automated clinical findings',
      summary: `Metabolic and lipid profile changes are noted for patient ${patientName || 'the selected patient'}:
• Serum glucose 104 mg/dL (normal 70–99 mg/dL), suggesting impaired fasting glucose / early prediabetes.
• Total cholesterol (218 mg/dL), triglycerides (165 mg/dL) and estimated LDL (138 mg/dL) consistent with mild mixed dyslipidemia.
• Renal function (creatinine 0.85 mg/dL) and uric acid (4.2 mg/dL) are normal, without signs of nephropathy.
• Chest X-ray is normal, without pleuropulmonary involvement.`,
      recommendations: [
        'Order an oral glucose tolerance test and follow-up HbA1c in 3 months.',
        'Start a low-fat nutrition plan with fewer simple carbohydrates.',
        'Consider low-dose statins if cardiovascular SCORE risk is > 5%.'
      ]
    };

    const spanishAnswer = {
      title: 'Evaluación y Hallazgos Clínicos Automatizados',
      summary: `Se observa alteración en el perfil metabólico y lipídico de ${patientName || 'el paciente seleccionado'}:
• Glucosa sérica en 104 mg/dL (rango normal 70-99 mg/dL), lo que sugiere estado de glucemia basal alterada / prediabetes incipiente.
• Colesterol total (218 mg/dL), Triglicéridos (165 mg/dL) y LDL estimado (138 mg/dL) compatibles con Dislipidemia Mixta leve.
• Función renal (Creatinina 0.85 mg/dL) y ácido úrico (4.2 mg/dL) normales sin indicios de nefropatía.
• Radiografía de tórax normal sin compromiso pleuropulmonar.`,
      recommendations: [
        'Solicitar curva de tolerancia oral a la glucosa y HbA1c de control en 3 meses.',
        'Implementar plan nutricional hipograso y bajo en carbohidratos simples.',
        'Considerar inicio de estatinas a dosis bajas si el riesgo cardiovascular SCORE > 5%.'
      ]
    };

    setTimeout(() => {
      setAiAnswer(language === 'en' ? englishAnswer : spanishAnswer);
      setIsAiThinking(false);
    }, 600);
  };

  // Render status badge for laboratory row
  const renderStatusBadge = (status, label) => {
    let bg = '#ecfdf5';
    let color = '#047857';
    let border = '#a7f3d0';

    if (status === 'borderline') {
      bg = '#fffbeb';
      color = '#d97706';
      border = '#fde68a';
    } else if (status === 'high' || status === 'altered') {
      bg = '#fff1f2';
      color = '#e11d48';
      border = '#fecdd3';
    } else if (status === 'low') {
      bg = '#eff6ff';
      color = '#2563eb';
      border = '#bfdbfe';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '0.6875rem',
          fontWeight: 700,
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`
        }}
      >
        {label}
      </span>
    );
  };

  // Render interactive value with color coding
  const renderValueText = (val, status) => {
    let color = '#0f172a';
    if (status === 'borderline') color = '#d97706';
    if (status === 'high' || status === 'altered') color = '#e11d48';
    if (status === 'low') color = '#2563eb';

    return (
      <span style={{ fontSize: '0.9375rem', fontWeight: 800, color }}>
        {val}
      </span>
    );
  };

  // Render Sparkline / Level Bar
  const renderSparklineBar = (val, min, max, status) => {
    let barColor = '#10b981';
    let bgTrack = '#e2e8f0';

    if (status === 'borderline') {
      barColor = '#f59e0b';
    } else if (status === 'high' || status === 'altered') {
      barColor = '#f43f5e';
    } else if (status === 'low') {
      barColor = '#3b82f6';
    }

    // Normalized percentage
    const rangeSpan = (max - min) || 1;
    const offset = val - min;
    const pct = Math.min(Math.max((offset / rangeSpan) * 100, 15), 100);

    return (
      <div
        style={{
          width: '56px',
          height: '6px',
          backgroundColor: bgTrack,
          borderRadius: '9999px',
          overflow: 'hidden',
          position: 'relative'
        }}
        title={`Valor: ${val} (Rango: ${min} - ${max})`}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: '9999px',
            transition: 'width 0.3s ease'
          }}
        />
      </div>
    );
  };

  const patientName = selectedPatient ? getPatientFullName(selectedPatient) : '';
  const patientAge = selectedPatient ? calculateAge(selectedPatient.birthDate) : '';
  const patientFolio = selectedPatient ? getPatientIdentifier(selectedPatient) : '';

  const patientInitials = selectedPatient
    ? `${selectedPatient.name?.[0]?.given?.[0]?.[0] || ''}${selectedPatient.name?.[0]?.family?.[0] || ''}`
    : '';

  return (
    <div
      style={{
        padding: '1.75rem 2rem',
        maxWidth: '1350px',
        margin: '0 auto',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      {/* 1. TOP PATIENT HEADER & SELECTOR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Patient Initials Circle */}
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#a7f3d0',
              color: '#065f46',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 800,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
            }}
          >
            {patientInitials}
          </div>

          <div>
            <h1
              style={{
                fontSize: '1.625rem',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.025em',
                margin: 0
              }}
            >
              {patientName}
            </h1>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{patientAge} {language === 'en' ? 'years old' : 'años'}</span>
              <span>•</span>
              <span style={{ fontWeight: 600, color: '#334155' }}>Folio #{patientFolio}</span>
            </div>
          </div>
        </div>

        {/* Patient Switcher Dropdown */}
        {patients.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
              {language === 'en' ? 'Patient:' : 'Paciente:'}
            </span>
            <select
              value={selectedPatientId}
              onChange={(e) => handleSelectPatient(e.target.value)}
              className="form-input"
              style={{
                height: '38px',
                minWidth: '220px',
                fontSize: '0.8125rem',
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1'
              }}
            >
              {patients.map(p => {
                const name = getPatientFullName(p);
                return (
                  <option key={p.id} value={p.id}>
                    {name} ({calculateAge(p.birthDate)} {language === 'en' ? 'yrs' : 'años'})
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* 2. MAIN 2-COLUMN LAYOUT: LAB PANELS (LEFT) + AI FINDINGS (RIGHT) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.7fr) minmax(320px, 1fr)',
          gap: '1.75rem',
          alignItems: 'start'
        }}
      >
        {/* LEFT COLUMN: Upload Dropzone + Accordion Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* A. Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: isDragOver ? '2px dashed #0d9488' : '2px dashed #cbd5e1',
              borderRadius: '1rem',
              backgroundColor: isDragOver ? '#f0fdfa' : '#fafafa',
              padding: '2rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.dcm,.dicom,.csv"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />

            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: isDragOver ? '#ccfbf1' : '#f1f5f9',
                color: isDragOver ? '#0f766e' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem'
              }}
            >
              {isUploading ? (
                <div className="spinner" style={{ width: '22px', height: '22px' }} />
              ) : (
                <UploadCloud size={24} />
              )}
            </div>

            <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#334155' }}>
              {isUploading
                ? (language === 'en' ? 'Analyzing and extracting laboratory data...' : 'Analizando y extrayendo parámetros clínicos...')
                : (language === 'en' ? 'Drag studies here or select files (PDF, JPG, DICOM)' : 'Arrastra estudios aquí o selecciona archivos (PDF, JPG, DICOM)')}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              {language === 'en' ? 'Automated OCR & FHIR DiagnosticReport integration' : 'Extracción automática OCR e integración directa con FHIR R4'}
            </span>
          </div>

          {/* B. Laboratorios Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Microscope size={22} color="#0d9488" strokeWidth={2.5} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {language === 'en' ? 'Laboratory Studies' : 'Laboratorios'}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setPanelModal({ isOpen: true, panel: null })}
                className="btn btn-outline"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  color: '#0f766e',
                  borderColor: '#99f6e4'
                }}
              >
                <Plus size={13} />
                <span>{language === 'en' ? 'Add study' : 'Agregar estudio'}</span>
              </button>
              <button
                type="button"
                onClick={handleResetPanelsClick}
                className="btn btn-outline"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  color: '#64748b',
                  borderColor: '#cbd5e1'
                }}
                title={language === 'en' ? 'Reset studies catalog' : 'Restablecer catálogo por defecto'}
              >
                <RotateCcw size={13} />
                <span>{language === 'en' ? 'Reset Demo' : 'Restablecer'}</span>
              </button>
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
                {panels.length} {language === 'en' ? 'study panels recorded' : 'estudios registrados'}
              </span>
            </div>
          </div>

          {/* C. Collapsible Panels / Tables */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {panels.map((panel) => {
              return (
                <div
                  key={panel.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '0.875rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                    overflow: 'hidden',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Panel Header (Click to toggle) */}
                  <div
                    onClick={() => handleTogglePanel(panel.id)}
                    style={{
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      backgroundColor: panel.isExpanded ? '#ffffff' : '#fafafa',
                      borderBottom: panel.isExpanded ? '1px solid #f1f5f9' : 'none',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                        {panel.name} — {panel.dateFormatted}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      {panel.status === 'Procesado con IA' && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            backgroundColor: '#ecfdf5',
                            color: '#047857',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Sparkles size={11} />
                          <span>IA Extracción</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPanelModal({ isOpen: true, panel });
                        }}
                        style={{
                          padding: '4px',
                          borderRadius: '6px',
                          color: '#0f766e',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer'
                        }}
                        title={language === 'en' ? 'Edit study panel' : 'Editar panel de estudio'}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePanelClick(e, panel)}
                        className="btn-icon text-danger"
                        style={{
                          padding: '4px',
                          borderRadius: '6px',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer'
                        }}
                        title={language === 'en' ? 'Delete study panel' : 'Eliminar panel de estudio'}
                      >
                        <Trash2 size={16} />
                      </button>
                      {panel.isExpanded ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                    </div>
                  </div>

                  {/* Panel Body / Results Table */}
                  {panel.isExpanded && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                            <th style={{ padding: '0.75rem 1.25rem', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              PARÁMETRO
                            </th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              VALOR
                            </th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              UNIDAD
                            </th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              RANGO
                            </th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              ESTADO
                            </th>
                            <th style={{ padding: '0.75rem 1.25rem', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              HISTÓRICO
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {panel.results.map((row, idx) => {
                            return (
                              <tr
                                key={row.id || idx}
                                style={{
                                  borderBottom: idx === panel.results.length - 1 ? 'none' : '1px solid #f8fafc',
                                  transition: 'background-color 0.12s ease'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fbfcfd')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                                  {row.parameter}
                                </td>
                                <td style={{ padding: '0.875rem 1rem' }}>
                                  {renderValueText(row.value, row.status)}
                                </td>
                                <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: '#64748b' }}>
                                  {row.unit}
                                </td>
                                <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: '#475569', fontWeight: 500 }}>
                                  {row.range}
                                </td>
                                <td style={{ padding: '0.875rem 1rem' }}>
                                  {renderStatusBadge(row.status, row.statusLabel)}
                                </td>
                                <td style={{ padding: '0.875rem 1.25rem' }}>
                                  {renderSparklineBar(row.value, row.min, row.max, row.status)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: AI FINDINGS & CLINICAL CORRELATION CARD */}
        <div style={{ position: 'sticky', top: '88px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Card Resumen de Hallazgos (Exact inspiration) */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {language === 'en' ? 'Findings Summary' : 'Resumen de Hallazgos'}
              </h3>

              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  backgroundColor: '#d1fae5',
                  color: '#065f46',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  letterSpacing: '0.05em'
                }}
              >
                IA
              </span>
            </div>

            {/* Findings List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.5rem' }}>
              {/* Item 1: Glucosa */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                <span style={{ color: '#d97706', marginTop: '2px' }}>⚠️</span>
                <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.4 }}>
                  <strong style={{ color: '#0f172a' }}>Glucosa 104 mg/dL</strong> <span style={{ color: '#64748b' }}>(límite)</span>
                </div>
              </div>

              {/* Item 2: LDL */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                <span style={{ color: '#e11d48', marginTop: '2px' }}>🛑</span>
                <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.4 }}>
                  <strong style={{ color: '#0f172a' }}>LDL 138 mg/dL</strong> <span style={{ color: '#64748b' }}>(alterado - derivado de panel lipídico)</span>
                </div>
              </div>

              {/* Item 3: Colesterol / Triglicéridos */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                <span style={{ color: '#e11d48', marginTop: '2px' }}>🛑</span>
                <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.4 }}>
                  <strong style={{ color: '#0f172a' }}>Colesterol 218 mg/dL</strong> y Triglicéridos 165 mg/dL <span style={{ color: '#64748b' }}>(dislipidemia leve)</span>
                </div>
              </div>

              {/* Item 4: Rx Torax */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                <span style={{ color: '#10b981', marginTop: '2px' }}>✅</span>
                <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.4 }}>
                  <strong style={{ color: '#0f172a' }}>Rx Tórax normal.</strong> Sin alteraciones pleuropulmonares.
                </div>
              </div>
            </div>

            {/* CTA Button: Indagar más */}
            <button
              type="button"
              onClick={() => handleAskAi()}
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                borderRadius: '0.625rem',
                border: '1px solid #0d9488',
                backgroundColor: '#ffffff',
                color: '#0f766e',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0fdfa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              <Search size={16} />
              <span>{language === 'en' ? 'Inquire deeper with AI' : 'Indagar más'}</span>
            </button>
          </div>

          {/* Quick Action Shortcuts */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: '0.875rem',
              border: '1px solid #e2e8f0',
              padding: '1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem'
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              {language === 'en' ? 'Quick Actions' : 'Acciones Rápidas'}
            </span>

            <button
              type="button"
              onClick={() => navigate(`/recetas?patientId=${selectedPatientId}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              <span>{language === 'en' ? 'Prescribe treatment based on labs' : 'Prescribir receta según laboratorios'}</span>
              <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />
            </button>

            <button
              type="button"
              onClick={() => navigate(`/consulta?patientId=${selectedPatientId}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              <span>{language === 'en' ? 'Open SOAP Clinical Encounter' : 'Abrir consulta médica (SOAP)'}</span>
              <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />
            </button>
          </div>
        </div>
      </div>

      {/* AI Interpretation Modal */}
      {showAiModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowAiModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1.25rem',
              maxWidth: '560px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#ccfbf1',
                    color: '#0f766e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {language === 'en' ? 'Clinical AI Lab Correlation' : 'Correlación Clínica Inteligente'}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {patientName} • FHIR Observations
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {isAiThinking ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  {language === 'en' ? 'Analyzing laboratory parameters against clinical guidelines...' : 'Analizando valores de laboratorio según guías clínicas...'}
                </p>
              </div>
            ) : aiAnswer ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    color: '#334155',
                    whiteSpace: 'pre-line'
                  }}
                >
                  {aiAnswer.summary}
                </div>

                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                    {language === 'en' ? 'Evidence-based recommendations:' : 'Recomendaciones basadas en evidencia:'}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6 }}>
                    {aiAnswer.recommendations?.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAiModal(false);
                      navigate(`/consulta?patientId=${selectedPatientId}`);
                    }}
                    className="btn btn-primary"
                    style={{ backgroundColor: '#0d9488' }}
                  >
                    {language === 'en' ? 'Incorporate into Clinical Note' : 'Incorporar a Nota Médica'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Delete / Reset Universal Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        warningText={confirmModal.warningText}
        icon={confirmModal.icon}
        isDanger={confirmModal.isDanger}
        confirmText={confirmModal.confirmText}
        itemName={confirmModal.itemName}
        itemId={confirmModal.itemId}
      />
      <LabPanelModal
        isOpen={panelModal.isOpen}
        panel={panelModal.panel}
        onClose={() => setPanelModal({ isOpen: false, panel: null })}
        onSave={handleSaveLabPanel}
      />
    </div>
  );
}
