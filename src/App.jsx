import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import PatientListPage from './pages/PatientListPage';
import PatientProfilePage from './pages/PatientProfilePage';
import AgendaPage from './pages/AgendaPage';
import PractitionersPage from './pages/PractitionersPage';
import SettingsModal from './components/SettingsModal';
import ScheduleEncounterModal from './components/encounters/ScheduleEncounterModal';
import Toast from './components/Toast';
import { checkProxyHealth } from './services/fhirApi';
import { useLanguage } from './i18n/LanguageContext';

import ConsultationPage from './pages/ConsultationPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [serverInfo, setServerInfo] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // Form Modal state shared for creating patient
  const [formModal, setFormModal] = useState({ isOpen: false, mode: 'create', patient: null });

  // Toasts
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((type, message, title = '') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Check health on mount
  useEffect(() => {
    checkProxyHealth()
      .then(info => setServerInfo(info))
      .catch(err => {
        console.error('Health check error:', err);
        setServerInfo({ status: 'unreachable', message: err.message });
      });
  }, []);

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Main Clinical Layout with Left Sidebar and Top Header */}
      <AppLayout
        serverInfo={serverInfo}
        onScheduleEncounter={() => setIsScheduleOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      >
        <Routes>
          <Route
            path="/"
            element={
              <PatientListPage
                addToast={addToast}
                formModal={formModal}
                setFormModal={setFormModal}
              />
            }
          />
          <Route
            path="/patients"
            element={
              <PatientListPage
                addToast={addToast}
                formModal={formModal}
                setFormModal={setFormModal}
              />
            }
          />
          <Route
            path="/patient/:id"
            element={
              <PatientProfilePage
                addToast={addToast}
              />
            }
          />
          <Route
            path="/agenda"
            element={
              <AgendaPage
                addToast={addToast}
                onOpenScheduleModal={() => setIsScheduleOpen(true)}
              />
            }
          />
          <Route
            path="/consulta"
            element={
              <ConsultationPage
                addToast={addToast}
              />
            }
          />
          <Route
            path="/consulta/:id"
            element={
              <ConsultationPage
                addToast={addToast}
              />
            }
          />
          <Route
            path="/consultation"
            element={
              <ConsultationPage
                addToast={addToast}
              />
            }
          />
          <Route
            path="/encounters"
            element={
              <AgendaPage
                addToast={addToast}
                onOpenScheduleModal={() => setIsScheduleOpen(true)}
              />
            }
          />
          <Route
            path="/practitioners"
            element={
              <PractitionersPage
                addToast={addToast}
                onOpenScheduleModal={() => setIsScheduleOpen(true)}
              />
            }
          />
          <Route
            path="/medicos"
            element={
              <PractitionersPage
                addToast={addToast}
                onOpenScheduleModal={() => setIsScheduleOpen(true)}
              />
            }
          />
          <Route
            path="/configuracion"
            element={
              <SettingsPage
                addToast={addToast}
                serverInfo={serverInfo}
                onConfigUpdated={(newInfo) => setServerInfo(newInfo)}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                addToast={addToast}
                serverInfo={serverInfo}
                onConfigUpdated={(newInfo) => setServerInfo(newInfo)}
              />
            }
          />
          {/* Fallback */}
          <Route
            path="*"
            element={
              <PatientListPage
                addToast={addToast}
                formModal={formModal}
                setFormModal={setFormModal}
              />
            }
          />
        </Routes>
      </AppLayout>

      {/* Global Server Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        serverInfo={serverInfo}
        onConfigUpdated={(newInfo) => {
          setServerInfo(newInfo);
        }}
      />

      {/* Global Schedule Encounter Modal */}
      <ScheduleEncounterModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onEncounterScheduled={() => {
          addToast('success', t('encounterScheduledToast'), t('toastCreatedTitle'));
        }}
      />
    </div>
  );
}
