import React, { createContext, useContext, useState, useEffect } from 'react';
import { STAFF_DIRECTORY, CLINICAL_ROLES } from '../utils/staffData';

const AuthContext = createContext();

const STORAGE_KEY_USER = 'integramed_auth_user';
const STORAGE_KEY_ROLE = 'integramed_auth_role';
const STORAGE_KEY_IS_AUTH = 'integramed_is_authenticated';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const match = STAFF_DIRECTORY.find(s => s.id === parsed.id || s.email === parsed.email);
        if (match) return match;
      }
    } catch (e) {
      console.warn('Could not read user from storage', e);
    }
    // Default to Dr. Jesús Robledo (Doctor & Admin)
    return STAFF_DIRECTORY[0];
  });

  const [activeRole, setActiveRole] = useState(() => {
    try {
      const savedRole = localStorage.getItem(STORAGE_KEY_ROLE);
      if (savedRole) return savedRole;
    } catch (e) {
      console.warn('Could not read role from storage', e);
    }
    return STAFF_DIRECTORY[0].primaryRole;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const auth = localStorage.getItem(STORAGE_KEY_IS_AUTH);
      return auth === 'true';
    } catch (e) {
      return false;
    }
  });

  // Keep activeRole consistent if user changes
  useEffect(() => {
    if (currentUser && !currentUser.roles.includes(activeRole)) {
      setActiveRole(currentUser.primaryRole || currentUser.roles[0]);
    }
  }, [currentUser, activeRole]);

  // Login method
  const login = (emailOrId, password = '', customRole = null, rememberMe = true) => {
    const trimmed = (emailOrId || '').trim().toLowerCase();
    
    // Find staff member
    const user = STAFF_DIRECTORY.find(s => 
      s.email.toLowerCase() === trimmed ||
      (s.secondaryEmail && s.secondaryEmail.toLowerCase() === trimmed) ||
      s.id === emailOrId
    );

    if (!user) {
      throw new Error('No se encontró ningún usuario con ese correo electrónico');
    }

    // Role to activate
    const chosenRole = (customRole && user.roles.includes(customRole))
      ? customRole
      : (user.primaryRole || user.roles[0]);

    setCurrentUser(user);
    setActiveRole(chosenRole);
    setIsAuthenticated(true);

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
    if (currentUser && currentUser.roles.includes(newRole)) {
      setActiveRole(newRole);
      localStorage.setItem(STORAGE_KEY_ROLE, newRole);
    }
  };

  // Quick switch user (for demo / testing purposes)
  const switchUser = (staffId, desiredRole = null) => {
    const user = STAFF_DIRECTORY.find(s => s.id === staffId);
    if (user) {
      const role = desiredRole && user.roles.includes(desiredRole) 
        ? desiredRole 
        : (user.primaryRole || user.roles[0]);
      setCurrentUser(user);
      setActiveRole(role);
      setIsAuthenticated(true);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEY_ROLE, role);
      localStorage.setItem(STORAGE_KEY_IS_AUTH, 'true');
    }
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
        staffList: STAFF_DIRECTORY,
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
