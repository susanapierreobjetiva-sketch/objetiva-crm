import { useState } from "react";
import { api } from "../api";

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const [theme, setTheme]       = useState("dark");

  const D = {
    bgLeft:   theme === "dark" ? "#0A0804"  : "#F5F0E8",
    bgRight:  theme === "dark" ? "#1C1810"  : "#FFFFFF",
    divider:  theme === "dark" ? "#2A2418"  : "#E8E0D0",
    dots:     theme === "dark" ? "#C9A870"  : "#C9A870",
    dotsOp:   theme === "dark" ? 0.04       : 0.08,
    logoRect: theme === "dark" ? "#1A1208"  : "#F0E8D8",
    title:    theme === "dark" ? "#E0D4B0"  : "#2A1F0A",
    subtitle: theme === "dark" ? "#7A6E58"  : "#8A7A60",
    divline:  theme === "dark" ? "#3A3420"  : "#D8CEB8",
    desc:     theme === "dark" ? "#5A5040"  : "#7A6A50",
    copy:     theme === "dark" ? "#3A3020"  : "#B0A080",
    welcome:  theme === "dark" ? "#E0D4B0"  : "#2A1F0A",
    welcsub:  theme === "dark" ? "#5A5040"  : "#8A7A60",
    inputBg:  theme === "dark" ? "#242018"  : "#F8F4EC",
    inputBdr: theme === "dark" ? "#3A3420"  : "#D8CEB8",
    inputClr: theme === "dark" ? "#E0D4B0"  : "#2A1F0A",
    label:    theme === "dark" ? "#A88040"  : "#8A6830",
    eyeClr:   theme === "dark" ? "#7A6E58"  : "#A89878",
    footer:   theme === "dark" ? "#3A3020"  : "#C0B090",
  };

  const handleLogin = async () => {
    if (!email || !password) return setError("Rellena todos los campos");
    setLoading(true); setError("");
    try {
      const data = await api.login(email, password);
      onLogin(data.user);
    } catch (e) {
      setError(e.message || "Credenciales incorrectas");
    }
    setLoading(false);
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      flexDirection: isMobile ? "column" : "row",
      background: D.bgLeft, fontFamily: "Plus Jakarta Sans, sans-serif",
    }}>
      {/* Toggle tema */}
      <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
        style={{ position: "fixed", top: 16, right: 16, zIndex: 10,
          background: "none", border: `0.5px solid ${D.divline}`,
          color: D.subtitle, cursor: "pointer", borderRadius: 6,
          padding: "6px 12px", fontSize: 11, fontFamily: "Plus Jakarta Sans, sans-serif",
          letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {theme === "dark" ? "☀ Modo claro" : "☾ Modo oscuro"}
      </button>

      {/* Lado izquierdo — Branding */}
      <div style={{
        flex: isMobile ? "none" : 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: isMobile ? "40px 24px 24px" : "48px",
        position: "relative", overflow: "hidden",
        background: D.bgLeft,
      }}>
        {/* Grid de puntos decorativo */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04 }}>
          <defs>
            <pattern id="dots" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="0.8" fill="#C9A870"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)"/>
        </svg>

        {/* Logo círculo */}
        <svg viewBox="0 0 120 120" width={isMobile ? 100 : 160} height={isMobile ? 100 : 160} xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 28, zIndex: 1 }}>
          <rect width="120" height="120" rx="20" fill={D.logoRect}/>
          <circle cx="60" cy="60" r="46" fill="none" stroke="#C9A870" strokeWidth="2.5"/>
          <circle cx="60" cy="60" r="38" fill="none" stroke="#C9A870" strokeWidth="0.5" opacity="0.3"/>
          <text x="60" y="56" textAnchor="middle" fontFamily="Georgia,serif" fontSize="22" fill="#C9A870" letterSpacing="1">OBJ</text>
          <line x1="30" y1="63" x2="90" y2="63" stroke="#C9A870" strokeWidth="0.8" opacity="0.6"/>
          <text x="60" y="76" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="9" fill="#C9A870" letterSpacing="5" opacity="0.8">CRM</text>
        </svg>

        <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 8, zIndex: 1 }}>
          <span style={{ color: D.title }}>OBJ</span><span style={{ color: "#C9A870" }}>CRM</span>
        </div>
        <div style={{ fontSize: 13, color: D.subtitle, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 40, zIndex: 1 }}>
          Objetiva Broker
        </div>

        {!isMobile && <div style={{ width: 40, height: "0.5px", background: D.divline, marginBottom: 40, zIndex: 1 }}/>}

        {!isMobile && <div style={{ fontSize: 13, color: D.desc, textAlign: "center", lineHeight: 1.8, letterSpacing: "0.05em", maxWidth: 220, zIndex: 1 }}>
          Gestión integral de clientes, pólizas y siniestros
        </div>}

        {!isMobile && <div style={{ position: "absolute", bottom: 24, fontSize: 10, color: D.copy, letterSpacing: "0.1em", zIndex: 1 }}>
          © 2026 OBJETIVA BROKER
        </div>}
      </div>

      {/* Divisor */}
      {!isMobile && <div style={{ width: "0.5px", background: D.divider, flexShrink: 0 }}/>}
      {isMobile && <div style={{ height: "0.5px", background: D.divider, flexShrink: 0 }}/>}

      {/* Lado derecho — Formulario */}
      <div style={{
        flex: 1, background: D.bgRight, display: "flex",
        flexDirection: "column", justifyContent: "center",
        padding: isMobile ? "32px 24px 48px" : "48px",
      }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: D.welcome, marginBottom: 6 }}>Bienvenido</div>
        <div style={{ fontSize: 13, color: D.welcsub, marginBottom: 36, letterSpacing: "0.02em" }}>
          Accede a tu cuenta para continuar
        </div>

        {error && (
          <div style={{ background: "#3A1A1A", border: "0.5px solid #8B3A3A", color: "#E08080",
            padding: "10px 14px", borderRadius: 6, fontSize: 12, marginBottom: 20, textAlign: "center" }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 10, letterSpacing: "0.2em", color: D.label,
            textTransform: "uppercase", marginBottom: 8 }}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="usuario@objetivabroker.com"
            style={{ width: "100%", background: D.inputBg, border: `0.5px solid ${D.inputBdr}`,
              color: D.inputClr, padding: "13px 16px", borderRadius: 6,
              fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }}/>
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "block", fontSize: 10, letterSpacing: "0.2em", color: D.label,
            textTransform: "uppercase", marginBottom: 8 }}>Contraseña</label>
          <div style={{ position: "relative" }}>
            <input type={showPwd ? "text" : "password"} value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{ width: "100%", background: D.inputBg, border: `0.5px solid ${D.inputBdr}`,
                color: D.inputClr, padding: "13px 44px 13px 16px", borderRadius: 6,
                fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }}/>
            <button onClick={() => setShowPwd(s => !s)}
              style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: D.eyeClr, cursor: "pointer", fontSize: 16 }}>
              {showPwd ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <button onClick={handleLogin} disabled={loading}
          style={{ width: "100%", padding: "14px", background: "#C9A870", color: "#0A0804",
            border: "none", borderRadius: 6, fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 11,
            fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {!isMobile && <div style={{ marginTop: 32, textAlign: "center", fontSize: 10, color: D.footer, letterSpacing: "0.1em" }}>
          GESTIÓN DE CLIENTES · PÓLIZAS · SINIESTROS
        </div>}
        {isMobile && <div style={{ marginTop: 24, textAlign: "center", fontSize: 10, color: D.footer, letterSpacing: "0.08em" }}>
          © 2026 OBJETIVA BROKER
        </div>}
      </div>
    </div>
  );
}
