export interface AuthResponse {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: 'PARENT' | 'TUTOR';
}

export interface VerifyData {
  email: string;
  otp: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RefreshData {
  refreshToken: string;
}
