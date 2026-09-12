import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getStaffList,
  getStaffById,
  saveStaffMember,
  updateStaffPassword,
  updateStaffLanguage,
  updateStaffConsultationDuration,
  saveStaffList,
  deleteStaffMember,
  resetStaffToDefault,
  loadStaffFromFhir,
  persistStaffMember,
  CLINICAL_ROLES
} from '../utils/staffStorage';
import { useLanguage } from '../i18n/LanguageContext';

const AuthContext = createContext();

const STORAGE_KEY_USER = 'integramed_auth_user';
const STORAGE_KEY_ROLE = 'integramed_auth_role';
const STORAGE_KEY_IS_AUTH = 'integramed_is_authenticated';

export function AuthProvider({ children }) {
  const [staffList, setStaffList] = useState(() => getStaffList());

  const refreshStaff = useCallback(() => {
    const list = getStaffList();
    setStaffList(list);
    return list;
  }, []);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const list = getStaffList();
        const match = list.find(s => s.id === parsed.id || s.email === parsed.email);
        if (match) return match;
      }
    } catch (e) {
      console.warn('Could not read user from storage', e);
    }
    return null;
  });

  const [activeRole, setActiveRole] = useState(() => {
    try {
      const savedRole = localStorage.getItem(STORAGE_KEY_ROLE);
      if (savedRole) return savedRole;
    } catch (e) {
      console.warn('Could not read role from storage', e);
    }
    return 'doctor';
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const auth = localStorage.getItem(STORAGE_KEY_IS_AUTH);
      return auth === 'true';
    } catch (e) {
      return false;
    }
  });

  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    loadStaffFromFhir()
      .then(async (list) => {
        const hasIvan = list.some((s) => s.id === 'staff-ivan-renteria' || s.email === 'ivan_renteria@integramed.com');
        if (!hasIvan) {
          await persistStaffMember({
            id: 'staff-ivan-renteria',
            givenName: 'Ivan',
            familyName: 'Renteria',
            prefix: 'Lic.',
            gender: 'male',
            email: 'ivan_renteria@integramed.com',
            roles: ['therapist'],
            primaryRole: 'therapist',
            specialty: 'Fisioterapia',
            consultingRoom: 'Consultorio fisioterapia',
            organizationId: 'org-clinica-yeshua',
            locationId: 'loc-yeshua-fisioterapia',
            preferredLanguage: 'es',
            status: 'active',
            avatarBg: '#0284c7',
            avatarText: '#ffffff'
          });
        }
        const next = getStaffList();
        setStaffList(next);
        setCurrentUser((prev) => {
          const match = next.find((s) => s.id === prev?.id || s.email === prev?.email);
          if (!match) return isAuthenticated ? (next[0] || prev) : prev;
          return {
            ...match,
            preferredLanguage: match.preferredLanguage === 'en' || prev?.preferredLanguage === 'en' ? 'en' : (match.preferredLanguage || prev?.preferredLanguage || 'es')
          };
        });
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Keep activeRole consistent if user changes
  useEffect(() => {
    if (currentUser && !currentUser.roles?.includes(activeRole)) {
      setActiveRole(currentUser.primaryRole || currentUser.roles?.[0] || 'doctor');
    }
  }, [currentUser, activeRole]);

  // Apply the logged-in user's language only (do not use the default staff record while logged out)
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    const preferred = currentUser.preferredLanguage === 'en' ? 'en' : 'es';
    if (preferred !== language) {
      setLanguage(preferred);
    }
  }, [isAuthenticated, currentUser?.id, currentUser?.preferredLanguage, language, setLanguage]);

  // Method to update preferred language directly on current user profile
  const updateUserLanguage = (newLang) => {
    if (!currentUser) return;
    setLanguage(newLang);
    updateStaffLanguage(currentUser.id, newLang);
    const updatedUser = { ...currentUser, preferredLanguage: newLang };
    setCurrentUser(updatedUser);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
    refreshStaff();
    return updatedUser;
  };

  // Login method
  const login = (emailOrId, password = '', customRole = null, rememberMe = true) => {
    const trimmed = (emailOrId || '').trim().toLowerCase();
    const currentDirectory = getStaffList();
    
    // Find staff member
    let user = currentDirectory.find(s => 
      s.email?.toLowerCase() === trimmed ||
      (s.secondaryEmail && s.secondaryEmail.toLowerCase() === trimmed) ||
      s.id === emailOrId
    );

    if (!user) {
      throw new Error('No se encontró ningún usuario con ese correo electrónico');
    }

    // Password validation (Supports user.password or master IntegraMed27)
    const validPassword = user.password || 'IntegraMed27';
    if (password && password !== validPassword && password !== 'IntegraMed27' && password !== '••••••••') {
      throw new Error('Contraseña incorrecta. Utilice la contraseña asignada o IntegraMed27');
    }

    // Role to activate
    const chosenRole = (customRole && user.roles?.includes(customRole))
      ? customRole
      : (user.primaryRole || user.roles?.[0] || 'doctor');

    setCurrentUser(user);
    setActiveRole(chosenRole);
    setIsAuthenticated(true);

    const preferred = user.preferredLanguage === 'en' || user.preferredLanguage === 'es'
      ? user.preferredLanguage
      : language;
    setLanguage(preferred);
    if (user.preferredLanguage !== preferred) {
      updateStaffLanguage(user.id, preferred);
      user = { ...user, preferredLanguage: preferred };
      setCurrentUser(user);
    }

    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEY_ROLE, chosenRole);
      localStorage.setItem(STORAGE_KEY_IS_AUTH, 'true');
    } else {
      sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      sessionStorage.setItem(STORAGE_KEY_ROLE, chosenRole);
      sessionStorage.setItem(STORAGE_KEY_IS_AUTH, 'true');
    }

    return { user, role: chosenRole };
  };

  // Logout method
  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY_IS_AUTH);
    sessionStorage.removeItem(STORAGE_KEY_IS_AUTH);
  };

  // Switch role for active multi-role user
  const switchRole = (newRole) => {
    if (currentUser && currentUser.roles?.includes(newRole)) {
      setActiveRole(newRole);
      localStorage.setItem(STORAGE_KEY_ROLE, newRole);
    }
  };

  // Quick switch user (for demo / testing purposes)
  const switchUser = (staffId, desiredRole = null) => {
    const currentDirectory = getStaffList();
    const user = currentDirectory.find(s => s.id === staffId);
    if (user) {
      const role = desiredRole && user.roles?.includes(desiredRole) 
        ? desiredRole 
        : (user.primaryRole || user.roles?.[0] || 'doctor');
      setCurrentUser(user);
      setActiveRole(role);
      setIsAuthenticated(true);
      setLanguage(user.preferredLanguage === 'en' ? 'en' : 'es');
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEY_ROLE, role);
      localStorage.setItem(STORAGE_KEY_IS_AUTH, 'true');
    }
  };

  // Update a practitioner's password and sync current session if affected
  const updatePassword = (staffId, newPassword) => {
    const updated = updateStaffPassword(staffId, newPassword);
    refreshStaff();
    if (currentUser && currentUser.id === staffId) {
      setCurrentUser(updated);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    }
    return updated;
  };

  // Save / update a full practitioner record
  const savePractitioner = (practitionerData) => {
    saveStaffMember(practitionerData);
    const updatedList = refreshStaff();
    if (currentUser && currentUser.id === practitionerData.id) {
      const updatedUser = updatedList.find(s => s.id === practitionerData.id);
      if (updatedUser) {
        setCurrentUser(updatedUser);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
        if (updatedUser.preferredLanguage) {
          setLanguage(updatedUser.preferredLanguage);
        }
      }
    }

    return updatedList;
  };

  // Update a practitioner's default consultation duration
  const updateConsultationDuration = (staffId, minutes) => {
    const updated = updateStaffConsultationDuration(staffId, minutes);
    refreshStaff();
    if (currentUser && currentUser.id === staffId && updated) {
      setCurrentUser(updated);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    }
    return updated;
  };

  // Delete a practitioner record
  const deletePractitioner = (staffId) => {
    const remaining = deleteStaffMember(staffId);
    refreshStaff();
    if (currentUser && currentUser.id === staffId && remaining.length > 0) {
      setCurrentUser(remaining[0]);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(remaining[0]));
    }
    return remaining;
  };

  // Reset all staff to default seed
  const resetStaff = () => {
    const defaultList = resetStaffToDefault();
    setStaffList(defaultList);
    setCurrentUser(defaultList[0]);
    setActiveRole(defaultList[0].primaryRole);
    if (defaultList[0]?.preferredLanguage) {
      setLanguage(defaultList[0].preferredLanguage);
    }
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(defaultList[0]));
    localStorage.setItem(STORAGE_KEY_ROLE, defaultList[0].primaryRole);
    return defaultList;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        activeRole,
        isAuthenticated,
        login,
        logout,
        switchRole,
        switchUser,
        updateUserLanguage,
        updateConsultationDuration,
        staffList,
        refreshStaff,
        updatePassword,
        savePractitioner,
        deletePractitioner,
        resetStaff,
        rolesConfig: CLINICAL_ROLES
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
