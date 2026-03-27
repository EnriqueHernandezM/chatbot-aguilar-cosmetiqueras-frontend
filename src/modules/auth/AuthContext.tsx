import { clearAccessToken, setAccessToken } from "@/api/authStorage";
import { useCallback, useState, type ReactNode } from "react";
import { loginUser, logoutUser } from "@/api/userApi";
import { User } from "@/modules/types";
import { AuthContext } from "@/modules/auth/authContext.shared";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("agent_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const response = await loginUser({ email, password });
    const authenticatedUser: User = {
      id: response.user.id,
      name: response.user.role === "admin" ? "Administrador" : response.user.role,
      email,
      role: response.user.role,
    };

    setUser(authenticatedUser);
    localStorage.setItem("agent_user", JSON.stringify(authenticatedUser));
    setAccessToken(response.access_token);

    return true;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      localStorage.removeItem("agent_user");
      clearAccessToken();
    }
  }, []);

  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>{children}</AuthContext.Provider>;
}
