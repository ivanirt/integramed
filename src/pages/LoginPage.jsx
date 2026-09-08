import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Shield,
  Stethoscope,
  Activity,
  HeartPulse,
  Users,
  ShieldCheck,
  FlaskConical,
  Sparkles,
  Info,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { CLINICAL_ROLES, getStaffFullName } from '../utils/staffStorage';
import { checkProxyHealth } from '../services/fhirApi';

export default function LoginPage({ addToast }) {
  const navigate = useNavigate();
  const { login, switchUser, currentUser, staffList } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const currentDirectory = staffList && staffList.length > 0 ? staffList : [];
  const initialStaff = currentDirectory[0] || null;

  const [email, setEmail] = useState(initialStaff?.email || 'jesus.robledo@integramed.com');
  const [password, setPassword] = useState(initialStaff?.password || 'IntegraMed27');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(initialStaff);
  const [selectedRole, setSelectedRole] = useState(initialStaff?.primaryRole || 'doctor');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [fhirHealth, setFhirHealth] = useState({ status: 'checking', message: '' });

  useEffect(() => {
    checkProxyHealth()
      .then(info => setFhirHealth(info))
      .catch(err => setFhirHealth({ status: 'unreachable', message: err.message }));
  }, []);

  // Role icon helper
  const renderRoleIcon = (roleId, size = 16) => {
    switch (roleId) {
      case 'doctor':
        return <Stethoscope size={size} />;
      case 'therapist':
        return <Activity size={size} />;
      case 'nurse':
        return <HeartPulse size={size} />;
      case 'receptionist':
        return <Users size={size} />;
      case 'admin':
        return <ShieldCheck size={size} />;
      case 'lab':
        return <FlaskConical size={size} />;
      default:
        return <Shield size={size} />;
    }
  };

  // Handle Submit
  const handleLogin = (e) => {
    e?.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      try {
        const { user, role } = login(email, password, selectedRole, rememberMe);
        if (addToast) {
          addToast(
            'success',
            `${language === 'en' ? 'Welcome back' : 'Bienvenido(a)'}, ${getStaffFullName(user)} (${CLINICAL_ROLES[role]?.[language === 'en' ? 'labelEn' : 'labelEs'] || role})`,
            language === 'en' ? 'Session Started' : 'Sesión Iniciada'
          );
        }
        if (role === 'admin') {
          navigate('/configuracion');
        } else {
          navigate('/');
        }
      } catch (err) {
        setErrorMessage(err.message || 'Error al iniciar sesión');
        setIsLoading(false);
      }
    }, 450);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      {/* LEFT COLUMN: Hero Brand Panel */}
      <div
        style={{
          flex: '1 1 52%',
          background: 'linear-gradient(145deg, #04382c 0%, #064e3b 45%, #0d5c46 100%)',
          color: '#ffffff',
          padding: '2.5rem 3.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle Ambient Background Lighting */}
        <div
          style={{
            position: 'absolute',
            top: '-15%',
            right: '-15%',
            width: '550px',
            height: '550px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(52, 211, 153, 0.18) 0%, rgba(6, 78, 59, 0) 70%)',
            pointerEvents: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-10%',
            left: '-10%',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(6, 78, 59, 0) 70%)',
            pointerEvents: 'none'
          }}
        />

        {/* Top Brand Header */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '0.625rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  backgroundColor: '#ffffff',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#064e3b',
                  fontWeight: 900,
                  fontSize: '0.875rem'
                }}
              >
                +
              </div>
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em', color: '#ffffff' }}>
              IntegraMed
            </span>
          </div>

          {/* Language Switcher in Login */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '9999px',
              padding: '3px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <button
              type="button"
              onClick={() => setLanguage('es')}
              style={{
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: language === 'es' ? '#ffffff' : 'transparent',
                color: language === 'es' ? '#064e3b' : 'rgba(255,255,255,0.85)',
                transition: 'all 0.15s ease'
              }}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              style={{
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: language === 'en' ? '#ffffff' : 'transparent',
                color: language === 'en' ? '#064e3b' : 'rgba(255,255,255,0.85)',
                transition: 'all 0.15s ease'
              }}
            >
              EN
            </button>
          </div>
        </div>

        {/* Bottom Headline & Description with Server Connection Status */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: '1rem',
              letterSpacing: '-0.03em',
              color: '#ffffff'
            }}
          >
            {language === 'en'
              ? 'Comprehensive, smart and compassionate healthcare.'
              : 'Atención médica integral, inteligente y humana.'}
          </h1>
          <p
            style={{
              fontSize: '0.9375rem',
              lineHeight: 1.6,
              color: 'rgba(255, 255, 255, 0.85)',
              maxWidth: '520px',
              margin: '0 0 2rem 0'
            }}
          >
            {language === 'en'
              ? 'Clinical platform for physicians, therapists, nursing and front desk with evidence-based intelligence.'
              : 'Plataforma clínica para médicos, terapeutas, enfermería y recepción con asistencia basada en evidencia.'}
          </p>

          {/* Server Connection Status */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.625rem',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(8px)',
              borderRadius: '9999px',
              padding: '0.5rem 1.15rem',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: fhirHealth.status === 'connected'
                  ? '#10b981'
                  : fhirHealth.status === 'checking'
                    ? '#fbbf24'
                    : '#f87171',
                boxShadow: fhirHealth.status === 'connected'
                  ? '0 0 0 3px rgba(16, 185, 129, 0.3)'
                  : '0 0 0 3px rgba(248, 113, 113, 0.25)'
              }}
            />
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.01em' }}>
              {fhirHealth.status === 'connected'
                ? (language === 'en' ? 'FHIR R4 Server Connected' : 'Servidor FHIR R4 Conectado')
                : fhirHealth.status === 'checking'
                  ? (language === 'en' ? 'Checking FHIR server…' : 'Verificando servidor FHIR…')
                  : (language === 'en' ? 'FHIR server unreachable' : 'Servidor FHIR no disponible')}
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Login Form & Multi-Role Practitioner Access */}
      <div
        style={{
          flex: '1 1 48%',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2.5rem',
          overflowY: 'auto'
        }}
      >
        <div style={{ width: '100%', maxWidth: '440px' }}>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontSize: '1.875rem',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.025em',
                marginBottom: '0.5rem'
              }}
            >
              {language === 'en' ? 'Welcome' : 'Bienvenido'}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
              {language === 'en'
                ? 'Enter your credentials to access your clinical portal'
                : 'Ingresa tus credenciales para acceder a tu consultorio'}
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.75rem',
                padding: '0.875rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: '#b91c1c',
                fontSize: '0.8125rem',
                fontWeight: 500
              }}
            >
              <AlertCircle size={18} flexShrink={0} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            {/* Email Field */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '0.375rem'
                }}
              >
                {language === 'en' ? 'Email Address' : 'Correo electrónico'}
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    const match = currentDirectory.find(s => 
                      s.email?.toLowerCase() === e.target.value.toLowerCase() ||
                      s.secondaryEmail?.toLowerCase() === e.target.value.toLowerCase()
                    );
                    if (match) {
                      setSelectedStaff(match);
                      setSelectedRole(match.primaryRole || match.roles[0]);
                    }
                  }}
                  placeholder="dr.morales@clinica.com"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.625rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.625rem',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0d9488';
                    e.target.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '0.375rem'
                }}
              >
                {language === 'en' ? 'Password' : 'Contraseña'}
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.625rem 0.75rem 2.625rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.625rem',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0d9488';
                    e.target.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Multi-role Active Selection (when user has multiple roles) */}
            {selectedStaff && selectedStaff.roles.length > 1 && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.75rem',
                  padding: '0.875rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                    {language === 'en' ? 'Select Active Role for this Session:' : 'Rol activo para esta sesión:'}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: '#0d9488', fontWeight: 700 }}>
                    {selectedStaff.roles.length} {language === 'en' ? 'roles assigned' : 'roles asignados'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {selectedStaff.roles.map(roleKey => {
                    const rConfig = CLINICAL_ROLES[roleKey];
                    const isSelected = selectedRole === roleKey;
                    return (
                      <button
                        key={roleKey}
                        type="button"
                        onClick={() => setSelectedRole(roleKey)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          padding: '0.375rem 0.75rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          border: isSelected ? `2px solid ${rConfig.color}` : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? rConfig.bgColor : '#ffffff',
                          color: isSelected ? rConfig.color : '#64748b',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {renderRoleIcon(roleKey, 14)}
                        <span>{language === 'en' ? rConfig.labelEn : rConfig.labelEs}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Options Row: Remember Me & Forgot Password */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                fontSize: '0.8125rem'
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: '#0d9488',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                />
                <span>{language === 'en' ? 'Remember me' : 'Mantener sesión iniciada'}</span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0d9488',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {language === 'en' ? 'Forgot password?' : '¿Olvidaste tu contraseña?'}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.8125rem 1.5rem',
                backgroundColor: '#0d5c46',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.625rem',
                fontSize: '0.9375rem',
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(13, 92, 70, 0.25)',
                transition: 'all 0.15s ease',
                opacity: isLoading ? 0.75 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#0a4937';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#0d5c46';
              }}
            >
              {isLoading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                  <span>{language === 'en' ? 'Authenticating...' : 'Accediendo...'}</span>
                </>
              ) : (
                <>
                  <span>{language === 'en' ? 'Sign In' : 'Entrar'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Legal Compliance Footer */}
          <div
            style={{
              marginTop: '2rem',
              textAlign: 'center',
              fontSize: '0.6875rem',
              color: '#94a3b8',
              lineHeight: 1.5
            }}
          >
            {language === 'en'
              ? 'By signing in, you agree to our Privacy Policy and Regulatory Compliance under NOM-024 / HIPAA.'
              : 'Al iniciar sesión aceptas las Políticas de Privacidad y Cumplimiento Normativo NOM-024 / HIPAA.'}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
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
          onClick={() => setShowForgotModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1rem',
              maxWidth: '420px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#ccfbf1',
                  color: '#0d9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Lock size={20} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {language === 'en' ? 'Password Recovery' : 'Recuperación de Contraseña'}
              </h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {language === 'en'
                ? 'For security reasons, access credentials can be reset by contacting your IntegraMed clinic administrator or IT coordinator.'
                : 'Por motivos de seguridad y normatividad clínica NOM-024, el restablecimiento de contraseñas es coordinado con el Administrador Clínico de IntegraMed.'}
            </p>

            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '0.625rem',
                padding: '0.75rem 1rem',
                fontSize: '0.8125rem',
                color: '#334155',
                marginBottom: '1.25rem'
              }}
            >
              <strong>{language === 'en' ? 'Clinic IT Support:' : 'Soporte TI / Coordinación:'}</strong>
              <div style={{ marginTop: '2px', color: '#0d9488' }}>soporte@integramed.com • Ext. 104</div>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {language === 'en' ? 'Understood' : 'Entendido'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
