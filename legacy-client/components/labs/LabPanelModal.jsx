import React, { useEffect, useState } from 'react';
import { X, FlaskConical, Check } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function LabPanelModal({ isOpen, panel, onClose, onSave }) {
  const { language } = useLanguage();
  const [form, setForm] = useState({
    id: '',
    name: '',
    nameEn: '',
    laboratoryName: '',
    date: '',
    status: 'Completado',
    results: []
  });

  useEffect(() => {
    if (!isOpen) return;
    if (panel) {
      setForm({
        id: panel.id,
        name: panel.name || '',
        nameEn: panel.nameEn || '',
        laboratoryName: panel.laboratoryName || 'Laboratorio Clínico Central',
        date: panel.date || new Date().toISOString().slice(0, 10),
        status: panel.status || 'Completado',
        results: panel.results || []
      });
    } else {
      setForm({
        id: '',
        name: '',
        nameEn: '',
        laboratoryName: 'Laboratorio Clínico Central',
        date: new Date().toISOString().slice(0, 10),
        status: 'Completado',
        results: []
      });
    }
  }, [isOpen, panel]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      name: form.name.trim(),
      nameEn: form.nameEn.trim() || form.name.trim()
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#fff',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 40px rgba(15,23,42,0.18)',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f766e' }}>
            <FlaskConical size={18} />
            <strong>
              {panel
                ? (language === 'en' ? 'Edit laboratory study' : 'Editar estudio de laboratorio')
                : (language === 'en' ? 'New laboratory study' : 'Nuevo estudio de laboratorio')}
            </strong>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '1.15rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
            {language === 'en' ? 'Study name *' : 'Nombre del estudio *'}
            <input
              required
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem 0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
            />
          </label>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
            {language === 'en' ? 'English name' : 'Nombre en inglés'}
            <input
              value={form.nameEn}
              onChange={(e) => setForm(prev => ({ ...prev, nameEn: e.target.value }))}
              style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem 0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
            />
          </label>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
            {language === 'en' ? 'Laboratory' : 'Laboratorio'}
            <input
              value={form.laboratoryName}
              onChange={(e) => setForm(prev => ({ ...prev, laboratoryName: e.target.value }))}
              style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem 0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
              {language === 'en' ? 'Date' : 'Fecha'}
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem 0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
              />
            </label>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
              Status
              <select
                value={form.status}
                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem 0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
              >
                <option value="Completado">Completado</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Procesado con IA">Procesado con IA</option>
              </select>
            </label>
          </div>
        </div>
        <div style={{ padding: '0.9rem 1.25rem 1.15rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            {language === 'en' ? 'Cancel' : 'Cancelar'}
          </button>
          <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Check size={14} />
            {language === 'en' ? 'Save study' : 'Guardar estudio'}
          </button>
        </div>
      </form>
    </div>
  );
}
