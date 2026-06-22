import { useState, useEffect } from "react";
import { DARK, LIGHT } from "./theme";
import { api } from "./api";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ClientList from "./components/ClientList";
import ClientDetail from "./components/ClientDetail";
import Pipeline from "./components/Pipeline";
import Activities from "./components/Activities";
import Claims from "./components/Claims";
import Reports from "./components/Reports";
import Profile from "./components/Profile";
import Notifications from "./components/Notifications";
import Tasks from "./components/Tasks";

if (!document.getElementById("crm-fonts")) {
  const l = document.createElement("link");
  l.id   = "crm-fonts";
  l.rel  = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Jura:wght@300;400;500&family=Syne:wght@400;500;600;700&display=swap";
  document.head.appendChild(l);
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [theme, setTheme]             = useState("dark");
  const [view, setView]               = useState("dashboard");
  const [clients, setClients]         = useState([]);
  const [policies, setPolicies]       = useState([]);
  const [claims, setClaims]           = useState([]);
  const [loading, setLoading]         = useState(false);
  const [loadError, setLoadError]     = useState("");
  const [restoring, setRestoring]     = useState(true); // restaurar sesión al inicio
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile]       = useState(window.innerWidth <= 768);
  const [selectedClientId, setSelectedClientId] = useState(null);

  const T = theme === "dark" ? DARK : LIGHT;

  // Restaurar sesión via refresh cookie al recargar la página
  useEffect(() => {
    api.restoreSession().then(user => {
      if (user) {
        setCurrentUser(user);
        setTheme(user.theme || "dark");
      }
      setRestoring(false);
    });
  }, []);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => { if (currentUser) loadAll(); }, [currentUser]);

  const loadAll = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [c, p, cl] = await Promise.all([
        api.getClients(),
        api.getAllPolicies(),
        api.getAllClaims(),
      ]);
      setClients(c);
      setPolicies(p);
      setClaims(cl);
    } catch (e) {
      setLoadError(e.message || "Error al cargar los datos. Comprueba tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setClients([]); setPolicies([]); setClaims([]);
  };

  const navigateTo = (newView, clientId = null) => {
    setView(newView);
    if (clientId) setSelectedClientId(clientId);
    else if (newView !== "client_detail") setSelectedClientId(null);
    if (isMobile) setSidebarOpen(false);
  };

  // Pantalla de carga mientras restauramos sesión
  if (restoring) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#0A0804", color: "#C9A870",
      fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 12,
      letterSpacing: "0.2em", textTransform: "uppercase" }}>
      Cargando...
    </div>
  );

  if (!currentUser) return (
    <Login onLogin={user => { setCurrentUser(user); setTheme(user.theme || "dark"); }} />
  );

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientPolicies = policies.filter(p => p.client_id === selectedClientId);
  const clientClaims   = claims.filter(c => c.client_id === selectedClientId);

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: T.bgApp, color: T.text,
      fontFamily: "'Instrument Sans', sans-serif", fontSize: "16px",
      "--bg": T.bg, "--bgApp": T.bgApp, "--sidebar": T.sidebar,
      "--card": T.card, "--lift": T.lift, "--border": T.border,
      "--gold": T.gold, "--goldDim": T.goldDim, "--goldHi": T.goldHi,
      "--cream": T.cream, "--mute": T.mute, "--text": T.text,
      "--textSub": T.textSub, "--input": T.input,
      "--hover": T.hover, "--sec": T.sec,
      transition: "background 0.3s, color 0.3s",
    }}>
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 99 }} />
      )}

      <Sidebar
        currentUser={currentUser}
        view={view}
        setView={navigateTo}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        policies={policies}
        clients={clients}
        onNavigate={navigateTo}
      />

      <main style={{
        flex: 1, overflow: "auto",
        marginLeft: isMobile ? 0 : 220,
        padding: isMobile ? "60px 16px 24px" : "32px 40px",
      }}>
        {!isMobile && (
          <div style={{ position: "fixed", top: 16, right: 24, zIndex: 100 }}>
            <Notifications policies={policies} clients={clients} onNavigate={navigateTo} theme={theme} />
          </div>
        )}
        {isMobile && (
          <div style={{ position: "fixed", top: 10, left: 12, right: 12, zIndex: 200,
            display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => setSidebarOpen(o => !o)}
              style={{ background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 6, padding: "6px 10px", cursor: "pointer",
                color: T.gold, fontSize: 18 }}>☰</button>
            <Notifications policies={policies} clients={clients} onNavigate={navigateTo} theme={theme} />
          </div>
        )}

        {loading && (
          <div style={{ fontFamily: "Jura, sans-serif", fontSize: 11, letterSpacing: 2,
            color: T.goldDim, textTransform: "uppercase", marginBottom: 20 }}>
            Cargando...
          </div>
        )}

        {loadError && (
          <div style={{ background: "#3A1A1A", border: "0.5px solid #8B3A3A", color: "#E08080",
            padding: "12px 16px", borderRadius: 6, fontSize: 13, marginBottom: 20,
            fontFamily: "Plus Jakarta Sans, sans-serif", display: "flex",
            justifyContent: "space-between", alignItems: "center" }}>
            <span>⚠ {loadError}</span>
            <button onClick={loadAll}
              style={{ background: "none", border: "0.5px solid #8B3A3A", color: "#E08080",
                borderRadius: 4, padding: "4px 10px", cursor: "pointer",
                fontSize: 11, fontFamily: "Plus Jakarta Sans, sans-serif",
                letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Reintentar
            </button>
          </div>
        )}

        {view === "dashboard"     && <Dashboard clients={clients} policies={policies} claims={claims} onNavigate={navigateTo} />}
        {view === "clients"       && !selectedClientId && (
          <ClientList clients={clients} policies={policies} onRefresh={loadAll}
            currentUser={currentUser}
            onSelect={id => { setSelectedClientId(id); setView("client_detail"); }} />
        )}
        {view === "client_detail" && selectedClient && (
          <ClientDetail client={selectedClient} policies={clientPolicies} claims={clientClaims}
            onRefresh={loadAll} currentUser={currentUser}
            onBack={() => { setSelectedClientId(null); setView("clients"); }} />
        )}
        {view === "pipeline"      && <Pipeline policies={policies} clients={clients} onRefresh={loadAll} currentUser={currentUser} />}
        {view === "activities"    && <Activities policies={policies} clients={clients} onRefresh={loadAll} />}
        {view === "claims"        && <Claims claims={claims} clients={clients} policies={policies} onRefresh={loadAll} currentUser={currentUser} />}
        {view === "tasks"         && <Tasks clients={clients} currentUser={currentUser} />}
        {view === "reports"       && <Reports clients={clients} policies={policies} claims={claims} />}
        {view === "profile"       && (
          <Profile currentUser={currentUser} theme={theme}
            onToggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")}
            onUpdate={setCurrentUser} />
        )}
      </main>
    </div>
  );
}
