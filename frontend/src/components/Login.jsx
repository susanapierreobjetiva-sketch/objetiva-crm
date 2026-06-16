import { useState } from "react";
import { api } from "../api";

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

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

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0A0804", fontFamily: "Syne, sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 400, padding: "2.5rem",
        background: "#1C1810", border: "0.5px solid #3A3420",
        borderRadius: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: "0.1em" }}>
            <span style={{ color: "#E0D4B0" }}>OBJ</span><span style={{ color: "#C9A870" }}>CRM</span>
          </div>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#7A6E58", textTransform: "uppercase", marginTop: 4 }}>
            Objetiva Broker · Gestión de Clientes
          </div>
        </div>

        {error && (
          <div style={{ background: "#3A1A1A", border: "0.5px solid #8B3A3A", color: "#E08080",
            padding: "10px 14px", borderRadius: 6, fontSize: 12, marginBottom: 16, textAlign: "center" }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 9, letterSpacing: "0.2em", color: "#A88040",
            textTransform: "uppercase", marginBottom: 8 }}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="usuario@objetivabroker.com"
            style={{ width: "100%", background: "#242018", border: "0.5px solid #3A3420",
              color: "#E0D4B0", padding: "11px 14px", borderRadius: 6,
              fontFamily: "Syne, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 9, letterSpacing: "0.2em", color: "#A88040",
            textTransform: "uppercase", marginBottom: 8 }}>Contraseña</label>
          <div style={{ position: "relative" }}>
            <input type={showPwd ? "text" : "password"} value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{ width: "100%", background: "#242018", border: "0.5px solid #3A3420",
                color: "#E0D4B0", padding: "11px 40px 11px 14px", borderRadius: 6,
                fontFamily: "Syne, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            <button onClick={() => setShowPwd(s => !s)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "#7A6E58", cursor: "pointer", fontSize: 16 }}>
              {showPwd ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <button onClick={handleLogin} disabled={loading}
          style={{ width: "100%", padding: "12px", background: "#C9A870", color: "#0A0804",
            border: "none", borderRadius: 6, fontFamily: "Syne, sans-serif", fontSize: 11,
            fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}
