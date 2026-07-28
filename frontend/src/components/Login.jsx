import { useState } from "react";
import { api } from "../api";
import { DARK, LIGHT } from "../theme";

export default function Login({ onLogin, theme, onToggleTheme }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const [step, setStep]         = useState("login"); // login | 2fa
  const [tempToken, setTempToken] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");

  const T = theme === "dark" ? DARK : LIGHT; // panel derecho, sigue el modo activo
  const L = DARK;                            // panel izquierdo, SIEMPRE oscuro (intencional)

  const handleLogin = async () => {
    if (!email || !password) return setError("Rellena todos los campos");
    setLoading(true); setError("");
    try {
      const data = await api.login(email, password);
      if (data.requires_2fa) {
        setTempToken(data.temp_token);
        setStep("2fa");
        setLoading(false);
        return;
      }
      onLogin(data.user);
    } catch (e) {
      setError(e.message || "Credenciales incorrectas");
    }
    setLoading(false);
  };

  const isMobile = window.innerWidth <= 768;

  const handle2fa = async () => {
    if (!twoFaCode) return setError("Introduce el código");
    setLoading(true); setError("");
    try {
      const data = await api.validate2fa(tempToken, twoFaCode);
      onLogin(data.user);
    } catch (e) {
      setError(e.message || "Código incorrecto");
    }
    setLoading(false);
  };

  if (step === "2fa") return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: T.bg, fontFamily: "Plus Jakarta Sans, sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 400, padding: "2.5rem",
        background: T.card, border: `0.5px solid ${T.border}`,
        borderRadius: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <svg viewBox="0 0 120 120" width="72" height="72" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 16 }}>
            <rect width="120" height="120" rx="20" fill={L.bgApp}/>
            <circle cx="60" cy="60" r="46" fill="none" stroke={L.gold} strokeWidth="2.5"/>
            <text x="60" y="56" textAnchor="middle" fontFamily="Georgia,serif" fontSize="22" fill={L.gold} letterSpacing="1">OBJ</text>
            <line x1="30" y1="63" x2="90" y2="63" stroke={L.gold} strokeWidth="0.8" opacity="0.6"/>
            <text x="60" y="76" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="9" fill={L.gold} letterSpacing="5" opacity="0.8">CRM</text>
          </svg>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 6 }}>Verificación en dos pasos</div>
          <div style={{ fontSize: 13, color: T.textSub }}>Introduce el código de Google Authenticator</div>
        </div>

        {error && (
          <div style={{ background: `${T.error}22`, border: `0.5px solid ${T.error}`, color: T.error,
            padding: "10px 14px", borderRadius: 6, fontSize: 13, marginBottom: 20, textAlign: "center" }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 10, letterSpacing: "0.2em", color: T.goldDim,
            textTransform: "uppercase", marginBottom: 8 }}>Código 6 dígitos</label>
          <input
            value={twoFaCode}
            onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={e => e.key === "Enter" && handle2fa()}
            placeholder="000000"
            maxLength={6}
            style={{ width: "100%", background: T.input, border: `0.5px solid ${T.border}`,
              color: T.text, padding: "16px", borderRadius: T.r, textAlign: "center",
              fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 28, letterSpacing: "0.4em",
              outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <button onClick={handle2fa} disabled={loading}
          style={{ width: "100%", padding: "14px", background: T.card, color: T.gold,
            border: `1px solid ${T.gold}`, borderRadius: T.r, fontFamily: "Plus Jakarta Sans, sans-serif",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, marginBottom: 16 }}>
          {loading ? "Verificando..." : "Verificar"}
        </button>

        <button onClick={() => { setStep("login"); setError(""); setTwoFaCode(""); }}
          style={{ width: "100%", padding: "10px", background: "none", color: T.textSub,
            border: `0.5px solid ${T.border}`, borderRadius: T.r,
            fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 11, cursor: "pointer",
            letterSpacing: "0.1em", textTransform: "uppercase" }}>
          ← Volver al login
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      flexDirection: isMobile ? "column" : "row",
      fontFamily: "Plus Jakarta Sans, sans-serif",
      "--input": T.input, "--text": T.text, "--border": T.border,
    }}>
      {/* Lado izquierdo — Branding (siempre oscuro, intencional) */}
      <div style={{
        flex: isMobile ? "none" : 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: isMobile ? "40px 24px 24px" : "48px",
        position: "relative", overflow: "hidden",
        background: L.bg,
        borderRight: !isMobile ? `2px solid ${L.gold}` : "none",
        borderBottom: isMobile ? `2px solid ${L.gold}` : "none",
      }}>
        {/* Grid de puntos decorativo */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04 }}>
          <defs>
            <pattern id="dots" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="0.8" fill={L.gold}/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)"/>
        </svg>

        {/* Logo círculo */}
        <svg viewBox="0 0 120 120" width={isMobile ? 100 : 160} height={isMobile ? 100 : 160} xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 28, zIndex: 1 }}>
          <rect width="120" height="120" rx="20" fill={L.bgApp}/>
          <circle cx="60" cy="60" r="46" fill="none" stroke={L.gold} strokeWidth="2.5"/>
          <circle cx="60" cy="60" r="38" fill="none" stroke={L.gold} strokeWidth="0.5" opacity="0.3"/>
          <text x="60" y="56" textAnchor="middle" fontFamily="Georgia,serif" fontSize="22" fill={L.gold} letterSpacing="1">OBJ</text>
          <line x1="30" y1="63" x2="90" y2="63" stroke={L.gold} strokeWidth="0.8" opacity="0.6"/>
          <text x="60" y="76" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="9" fill={L.gold} letterSpacing="5" opacity="0.8">CRM</text>
        </svg>

        <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 8, zIndex: 1 }}>
          <span style={{ color: L.text }}>OBJ</span><span style={{ color: L.gold }}>CRM</span>
        </div>
        <div style={{ fontSize: 13, color: L.textSub, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 40, zIndex: 1 }}>
          Objetiva Broker
        </div>

        {!isMobile && <div style={{ width: 40, height: "0.5px", background: L.border, marginBottom: 40, zIndex: 1 }}/>}

        {!isMobile && <div style={{ fontSize: 13, color: L.mute, textAlign: "center", lineHeight: 1.8, letterSpacing: "0.05em", maxWidth: 220, zIndex: 1 }}>
          Gestión integral de clientes, pólizas y siniestros
        </div>}

        {!isMobile && <div style={{ position: "absolute", bottom: 24, fontSize: 10, color: L.mute, letterSpacing: "0.1em", zIndex: 1 }}>
          © 2026 OBJETIVA BROKER
        </div>}
      </div>

      {/* Lado derecho — Formulario (sigue el modo activo) */}
      <div style={{
        flex: 1, background: T.bg, display: "flex",
        flexDirection: "column", justifyContent: "center", position: "relative",
        padding: isMobile ? "32px 24px 48px" : "48px",
      }}>
        {/* Toggle tema */}
        <button onClick={onToggleTheme}
          style={{ position: "absolute", top: 16, right: 16, zIndex: 10,
            background: "none", border: `1px solid ${T.gold}`,
            color: T.gold, cursor: "pointer", borderRadius: T.r,
            padding: "6px 12px", fontSize: 11, fontFamily: "Plus Jakarta Sans, sans-serif",
            letterSpacing: "0.05em" }}>
          {theme === "dark" ? "Modo claro" : "Modo oscuro"}
        </button>

        <div style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 6 }}>Gestión de clientes y pólizas</div>
        <div style={{ fontSize: 13, color: T.textSub, marginBottom: 36, letterSpacing: "0.02em" }}>
          Accede a tu cuenta para continuar
        </div>

        {error && (
          <div style={{ background: `${T.error}22`, border: `0.5px solid ${T.error}`, color: T.error,
            padding: "10px 14px", borderRadius: 6, fontSize: 12, marginBottom: 20, textAlign: "center" }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 10, letterSpacing: "0.2em", color: T.goldDim,
            textTransform: "uppercase", marginBottom: 8 }}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="usuario@objetivabroker.com"
            style={{ width: "100%", background: T.input, border: `0.5px solid ${T.border}`,
              color: T.text, padding: "13px 16px", borderRadius: T.r,
              fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }}/>
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "block", fontSize: 10, letterSpacing: "0.2em", color: T.goldDim,
            textTransform: "uppercase", marginBottom: 8 }}>Contraseña</label>
          <div style={{ position: "relative" }}>
            <input type={showPwd ? "text" : "password"} value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{ width: "100%", background: T.input, border: `0.5px solid ${T.border}`,
                color: T.text, padding: "13px 44px 13px 16px", borderRadius: T.r,
                fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }}/>
            <button onClick={() => setShowPwd(s => !s)}
              style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: T.mute, cursor: "pointer", fontSize: 16 }}>
              {showPwd ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <button onClick={handleLogin} disabled={loading}
          style={{ width: "100%", padding: "14px", background: T.card, color: T.gold,
            border: `1px solid ${T.gold}`, borderRadius: T.r, fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 11,
            fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {!isMobile && <div style={{ marginTop: 32, textAlign: "center", fontSize: 10, color: T.mute, letterSpacing: "0.1em" }}>
          GESTIÓN DE CLIENTES · PÓLIZAS · SINIESTROS
        </div>}
        {isMobile && <div style={{ marginTop: 24, textAlign: "center", fontSize: 10, color: T.mute, letterSpacing: "0.08em" }}>
          © 2026 OBJETIVA BROKER
        </div>}
      </div>
    </div>
  );
}
