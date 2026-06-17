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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile]       = useState(window.innerWidth <= 768);
  const [selectedClientId, setSelectedClientId] = useState(null);

  const T = theme === "dark" ? DARK : LIGHT;

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => { if (currentUser) loadAll(); }, [currentUser]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, p, cl] = await Promise.all([
        api.getClients(),
        api.getAllPolicies(),
        api.getAllClaims(),
      ]);
      setClients(c);
      setPolicies(p);
      setClaims(cl);
    } catch {}
    finally { setLoading(false); }
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

  if (!currentUser) return <Login onLogin={user => { setCurrentUser(user); setTheme(user.theme || "dark"); }} />;

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientPolicies = policies.filter(p => p.client_id === selectedClientId);
  const clientClaims   = claims.filter(c => c.client_id === selectedClientId);

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: T.bgApp, color: T.text,
      fontFamily: "'Instrument Sans', sans-serif", fontSize: '16px',
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
      />

      <main style={{
        flex: 1, overflow: "auto",
        marginLeft: isMobile ? 0 : 220,
        padding: isMobile ? "60px 16px 24px" : "32px 40px",
      }}>
        {isMobile && (
          <button onClick={() => setSidebarOpen(o => !o)}
            style={{ position: "fixed", top: 12, left: 12, zIndex: 200,
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 6, padding: "6px 10px", cursor: "pointer",
              color: T.gold, fontSize: 18,
              backdropFilter: "none", isolation: "isolate" }}>☰</button>
        )}

        {loading && (
          <div style={{ fontFamily: "Jura, sans-serif", fontSize: 11, letterSpacing: 2,
            color: T.goldDim, textTransform: "uppercase", marginBottom: 20 }}>
            Cargando...
          </div>
        )}

        {view === "dashboard" && (
          <Dashboard clients={clients} policies={policies} claims={claims} onNavigate={navigateTo} />
        )}

        {view === "clients" && !selectedClientId && (
          <ClientList
            clients={clients} policies={policies}
            onRefresh={loadAll} currentUser={currentUser}
            onSelect={id => { setSelectedClientId(id); setView("client_detail"); }}
          />
        )}

        {view === "client_detail" && selectedClient && (
          <ClientDetail
            client={selectedClient}
            policies={clientPolicies}
            claims={clientClaims}
            onRefresh={loadAll}
            currentUser={currentUser}
            onBack={() => { setSelectedClientId(null); setView("clients"); }}
          />
        )}

        {view === "pipeline" && (
          <Pipeline policies={policies} clients={clients} onRefresh={loadAll} currentUser={currentUser} />
        )}

        {view === "activities" && (
          <Activities policies={policies} clients={clients} onRefresh={loadAll} />
        )}

        {view === "claims" && (
          <Claims claims={claims} clients={clients} policies={policies} onRefresh={loadAll} currentUser={currentUser} />
        )}
        {view === "reports" && (
          <Reports clients={clients} policies={policies} claims={claims} />
        )}
      </main>
    </div>
  );
}
