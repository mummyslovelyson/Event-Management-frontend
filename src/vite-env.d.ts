/// <reference types="vite/client" />

declare module '*.jsx' {
  const component: any;
  export default component;
}

declare module '*.js' {
  const content: any;
  export default content;
}

declare module '@/context/*' {
  const content: any;
  export default content;
  export const AuthProvider: any;
  export const useAuth: any;
}

declare module '@/api/*' {
  const content: any;
  export default content;
  export const registerUser: any;
  export const loginUser: any;
  export const loginAdmin: any;
  export const forgotPassword: any;
  export const resetPassword: any;
  export const verifyEmail: any;
  export const logoutUser: any;
}

