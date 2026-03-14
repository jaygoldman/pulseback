import { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SetupWizard } from "./pages/SetupWizard";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Photos } from "./pages/Photos";
import { Albums } from "./pages/Albums";
import { FrameSettings } from "./pages/FrameSettings";
import { Devices } from "./pages/Devices";
import { Users } from "./pages/Users";
import { ServerSettings } from "./pages/ServerSettings";
import { ThemeContext, eras, loadEra, saveEra, type KodakEra } from "./theme";

export default function App() {
  const [era, setEraState] = useState<KodakEra>(loadEra);

  const setEra = useCallback((newEra: KodakEra) => {
    setEraState(newEra);
    saveEra(newEra);
  }, []);

  const theme = eras[era];

  return (
    <ThemeContext.Provider value={{ theme, setEra }}>
      <BrowserRouter>
        <Routes>
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="photos" element={<Photos />} />
            <Route path="albums" element={<Albums />} />
            <Route path="frame-settings" element={<FrameSettings />} />
            <Route path="devices" element={<Devices />} />
            <Route path="users" element={<Users />} />
            <Route path="server-settings" element={<ServerSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}
