import React from 'react';

export const AuthContext = React.createContext({
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  refreshUser: () => {},
});
