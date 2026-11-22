export interface AuthResponse {
  user: {
    id: string;
    fullName: string;
    email: string | null;
    role: string;
    status: string;
    studentCode?: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RegisterData {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  fullName?: string; // For backward compatibility
  email: string;
  phone: string;
  address?: string; // Required for TUTOR, optional for PARENT
  password: string;
  role: 'PARENT' | 'TUTOR';
  // Tutor application fields (required when role=TUTOR)
  birthDay?: number;
  birthMonth?: number;
  country?: string;
  city?: string;
  highestQualification?: string;
  expectedMonthlySalaryNGN?: number;
  subjects?: string[];
  levels?: string[];
  yearsOfExperience?: number;
  whyTeach?: string;
  howHeard?: string;
  aboutYou?: string[];
}

export interface VerifyData {
  email: string;
  otp: string;
}

export interface LoginData {
  email: string;
  password: string;
  portal?: 'PARENT' | 'TUTOR' | 'ADMIN';
}

export interface StudentLoginData {
  parentEmail: string;
  studentCode: string;
  studentPin: string;
}

export interface RefreshData {
  refreshToken: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePinData {
  currentPin: string;
  newPin: string;
}
