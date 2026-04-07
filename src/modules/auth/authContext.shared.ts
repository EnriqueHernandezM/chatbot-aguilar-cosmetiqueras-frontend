import { createContext } from "react";
import { User } from "@/modules/types";

export const AUTH_SESSION_EXPIRED_EVENT = "auth:session-expired";

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
