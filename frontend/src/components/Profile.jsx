import { useState } from "react";
import { api } from "../api";
import { DARK, LIGHT } from "../theme";

export default function Profile({ currentUser, theme, onToggleTheme, onUpdate }) {
  const T0 = theme === "dark" ? DARK : LIGHT;

  const [section, setSection]   = useState("personal");
  const [toast, setToast]       = useState("");
  const [loading, setLoading]   = useState(false);

  // Personal
  const [name, setName]         = useState(currentUser.name || "");
  const [dept, setDept]         = useState(currentUser.dept || "");

  // Contraseña
  const [pwdActual, setPwdActual]   = useState("");
  const [pwdNueva, setPwdNueva]     = useState("");
  const [pwdRepeat, setPwdRepeat]   = useState("");

  // 2FA
  const [qrCode, setQrCode]         = useState("");
  const [secret2fa, setSecret2fa]   = useState("");
  const [code2fa, setCode2fa]       = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [disable2faCode, setDisable2faCode] = useState("");
  const [step2fa, setStep2fa]       = useState("idle"); // idle | setup | backup

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const T = {
    card:    T0.card,
    border:  T0.border,
    gold:    T0.gold,
    text:    T0.text,
    mute:    T0.mute,
    lift:    T0.lift,
    input:   { width: "100%", background: T0.lift, border: `0.5px solid ${T0.border}`,
               color: T0.text, padding: "12px 16px", borderRadius: 6,
               fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 14,
               outline: "none", boxSizing: "border-box" },
    label:   { display: "block", fontSize: 11, letterSpacing: "0.15em", color: T0.mute,
               textTransform: "uppercase", marginBottom: 8,
               fontFamily: "Plus Jakarta Sans, sans-serif" },
    btn:     { padding: "12px 24px", background: T0.gold, color: T0.bgApp,
               border: "none", borderRadius: 6, cursor: "pointer",
               fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 11,
               fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" },
    btnOut:  { padding: "12px 24px", background: "none", color: T0.gold,
               border: `0.5px solid ${T0.goldDim}`, borderRadius: 6, cursor: "pointer",
               fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 11,
               letterSpacing: "0.15em", textTransform: "uppercase" },
  };

  const handleSavePersonal = async () => {
    setLoading(true);
    try {
      await api.updateProfile({ name, dept });
      onUpdate({ ...currentUser, name, dept });
      showToast("Perfil actualizado ✓");
    } catch (e) { showToast(e.message || "Error"); }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (!pwdActual || !pwdNueva) return showToast("Rellena todos los campos");
    if (pwdNueva !== pwdRepeat) return showToast("Las contraseñas no coinciden");
    if (pwdNueva.length < 8) return showToast("Mínimo 8 caracteres");
    setLoading(true);
    try {
      await api.changePassword({ current_password: pwdActual, new_password: pwdNueva });
      setPwdActual(""); setPwdNueva(""); setPwdRepeat("");
      showToast("Contraseña actualizada ✓");
    } catch (e) { showToast(e.message || "Error"); }
    setLoading(false);
  };

  const handleSetup2fa = async () => {
    setLoading(true);
    try {
      const data = await api.setup2fa();
      setQrCode(data.qr);
      setSecret2fa(data.secret);
      setStep2fa("setup");
    } catch (e) { showToast(e.message || "Error"); }
    setLoading(false);
  };

  const handleVerify2fa = async () => {
    if (code2fa.length !== 6) return showToast("Código de 6 dígitos");
    setLoading(true);
    try {
      const data = await api.verifySetup2fa(code2fa);
      setBackupCodes(data.backup_codes);
      setStep2fa("backup");
      onUpdate({ ...currentUser, totp_enabled: true });
      showToast("2FA activado ✓");
    } catch (e) { showToast(e.message || "Código incorrecto"); }
    setLoading(false);
  };

  const handleDisable2fa = async () => {
    if (!disable2faCode) return showToast("Introduce el código");
    setLoading(true);
    try {
      await api.disable2fa(disable2faCode);
      setDisable2faCode(""); setStep2fa("idle");
      onUpdate({ ...currentUser, totp_enabled: false });
      showToast("2FA desactivado");
    } catch (e) { showToast(e.message || "Código incorrecto"); }
    setLoading(false);
  };

  const SECTIONS = [
    { id: "personal",     label: "Datos personales" },
    { id: "password",     label: "Contraseña" },
    { id: "2fa",          label: "Doble factor (2FA)" },
    { id: "preferences",  label: "Preferencias" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          background: T0.card, border: `1px solid ${T0.goldDim}`, color: T0.gold,
          padding: "11px 22px", borderRadius: 6, fontSize: 12, zIndex: 200,
          fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: 1.5, textTransform: "uppercase" }}>
          {toast}
        </div>
      )}

      <div>
        <div style={{ fontSize: 13, letterSpacing: "0.2em", color: T0.gold,
          textTransform: "uppercase", marginBottom: 8, fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          Cuenta
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 700, color: T0.text, margin: 0,
          fontFamily: "Plus Jakarta Sans, sans-serif" }}>Mi Perfil</h1>
      </div>

      {/* Avatar + info */}
      <div style={{ background: T0.card, border: `0.5px solid ${T0.border}`,
        borderRadius: 8, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: T0.lift,
          border: `2px solid ${T0.goldDim}`, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 20, fontWeight: 700,
          color: currentUser.color || T0.gold, flexShrink: 0 }}>
          {currentUser.avatar}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T0.text,
            fontFamily: "Plus Jakarta Sans, sans-serif" }}>{currentUser.name}</div>
          <div style={{ fontSize: 13, color: T0.mute, fontFamily: "Plus Jakarta Sans, sans-serif",
            marginTop: 2 }}>{currentUser.email} · {currentUser.role}</div>
          {currentUser.totp_enabled && (
            <div style={{ fontSize: 11, color: "#27ae60", fontFamily: "Plus Jakarta Sans, sans-serif",
              marginTop: 4, letterSpacing: "0.08em" }}>🔒 2FA ACTIVO</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            style={{ padding: "8px 18px", borderRadius: 999, cursor: "pointer",
              fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 11,
              fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
              border: section === s.id ? `0.5px solid ${T0.gold}` : `0.5px solid ${T0.border}`,
              background: section === s.id ? T0.gold : "none",
              color: section === s.id ? T0.bgApp : T0.textSub }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Personal */}
      {section === "personal" && (
        <div style={{ background: T0.card, border: `0.5px solid ${T0.border}`,
          borderRadius: 8, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T0.gold,
            fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 4 }}>Información personal</div>
          <div>
            <label style={T.label}>Nombre completo</label>
            <input value={name} onChange={e => setName(e.target.value)} style={T.input} />
          </div>
          <div>
            <label style={T.label}>Departamento</label>
            <input value={dept} onChange={e => setDept(e.target.value)} style={T.input} />
          </div>
          <div>
            <label style={T.label}>Email</label>
            <input value={currentUser.email} disabled
              style={{ ...T.input, opacity: 0.5, cursor: "not-allowed" }} />
          </div>
          <div>
            <label style={T.label}>Rol</label>
            <input value={currentUser.role} disabled
              style={{ ...T.input, opacity: 0.5, cursor: "not-allowed" }} />
          </div>
          <button onClick={handleSavePersonal} disabled={loading} style={T.btn}>
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      )}

      {/* Contraseña */}
      {section === "password" && (
        <div style={{ background: T0.card, border: `0.5px solid ${T0.border}`,
          borderRadius: 8, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T0.gold,
            fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 4 }}>Cambiar contraseña</div>
          <div>
            <label style={T.label}>Contraseña actual</label>
            <input type="password" value={pwdActual} onChange={e => setPwdActual(e.target.value)} style={T.input} />
          </div>
          <div>
            <label style={T.label}>Nueva contraseña</label>
            <input type="password" value={pwdNueva} onChange={e => setPwdNueva(e.target.value)} style={T.input} />
          </div>
          <div>
            <label style={T.label}>Repetir nueva contraseña</label>
            <input type="password" value={pwdRepeat} onChange={e => setPwdRepeat(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleChangePassword()} style={T.input} />
          </div>
          <div style={{ fontSize: 12, color: T0.mute, fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Mínimo 8 caracteres. Usa mayúsculas, números y símbolos para mayor seguridad.
          </div>
          <button onClick={handleChangePassword} disabled={loading} style={T.btn}>
            {loading ? "Actualizando..." : "Cambiar contraseña"}
          </button>
        </div>
      )}

      {/* 2FA */}
      {section === "2fa" && (
        <div style={{ background: T0.card, border: `0.5px solid ${T0.border}`,
          borderRadius: 8, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T0.gold,
            fontFamily: "Plus Jakarta Sans, sans-serif" }}>Autenticación en dos factores</div>

          {!currentUser.totp_enabled && step2fa === "idle" && (
            <>
              <div style={{ fontSize: 14, color: T0.mute, fontFamily: "Plus Jakarta Sans, sans-serif",
                lineHeight: 1.7 }}>
                El 2FA añade una capa extra de seguridad. Cada vez que inicies sesión necesitarás
                introducir un código de 6 dígitos generado por Google Authenticator.
              </div>
              <button onClick={handleSetup2fa} disabled={loading} style={T.btn}>
                {loading ? "Generando..." : "Activar 2FA con Google Authenticator"}
              </button>
            </>
          )}

          {step2fa === "setup" && (
            <>
              <div style={{ fontSize: 14, color: T0.text, fontFamily: "Plus Jakarta Sans, sans-serif",
                lineHeight: 1.7 }}>
                1. Instala <strong>Google Authenticator</strong> en tu móvil<br/>
                2. Escanea el código QR con la app<br/>
                3. Introduce el código de 6 dígitos que aparece
              </div>
              {qrCode && (
                <div style={{ textAlign: "center" }}>
                  <img src={`data:image/png;base64,${qrCode}`} alt="QR 2FA"
                    style={{ width: 200, height: 200, border: "4px solid white", borderRadius: 8 }} />
                  <div style={{ fontSize: 11, color: T0.mute, marginTop: 12,
                    fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em" }}>
                    Clave manual: <code style={{ color: T0.gold }}>{secret2fa}</code>
                  </div>
                </div>
              )}
              <div>
                <label style={T.label}>Código de verificación</label>
                <input value={code2fa}
                  onChange={e => setCode2fa(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={e => e.key === "Enter" && handleVerify2fa()}
                  placeholder="000000" maxLength={6}
                  style={{ ...T.input, textAlign: "center", fontSize: 24, letterSpacing: "0.4em" }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep2fa("idle")} style={T.btnOut}>Cancelar</button>
                <button onClick={handleVerify2fa} disabled={loading} style={{ ...T.btn, flex: 1 }}>
                  {loading ? "Verificando..." : "Confirmar y activar"}
                </button>
              </div>
            </>
          )}

          {step2fa === "backup" && (
            <>
              <div style={{ background: "#0A1A0A", border: "0.5px solid #2A9D6A",
                borderRadius: 8, padding: 20 }}>
                <div style={{ fontSize: 13, color: "#27ae60", fontFamily: "Plus Jakarta Sans, sans-serif",
                  fontWeight: 600, marginBottom: 12 }}>✅ 2FA activado correctamente</div>
                <div style={{ fontSize: 13, color: T0.text, fontFamily: "Plus Jakarta Sans, sans-serif",
                  marginBottom: 16, lineHeight: 1.6 }}>
                  Guarda estos códigos de backup en un lugar seguro. Los necesitarás si pierdes el móvil.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {backupCodes.map((code, i) => (
                    <div key={i} style={{ background: T0.lift, padding: "8px 12px",
                      borderRadius: 6, fontFamily: "monospace", fontSize: 14,
                      color: T0.gold, letterSpacing: "0.1em", textAlign: "center" }}>
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setStep2fa("idle")} style={T.btn}>Entendido</button>
            </>
          )}

          {currentUser.totp_enabled && step2fa === "idle" && (
            <>
              <div style={{ background: "#0A1A0A", border: "0.5px solid #2A9D6A",
                borderRadius: 8, padding: 16, fontSize: 14, color: "#27ae60",
                fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                🔒 El 2FA está activo en tu cuenta
              </div>
              <div>
                <label style={T.label}>Introduce tu código para desactivar</label>
                <input value={disable2faCode}
                  onChange={e => setDisable2faCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000" maxLength={6}
                  style={{ ...T.input, textAlign: "center", fontSize: 24, letterSpacing: "0.4em" }} />
              </div>
              <button onClick={handleDisable2fa} disabled={loading}
                style={{ ...T.btn, background: "#8B3A3A" }}>
                {loading ? "Desactivando..." : "Desactivar 2FA"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Preferencias */}
      {section === "preferences" && (
        <div style={{ background: T0.card, border: `0.5px solid ${T0.border}`,
          borderRadius: 8, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T0.gold,
            fontFamily: "Plus Jakarta Sans, sans-serif" }}>Preferencias de apariencia</div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px", background: T0.lift, borderRadius: 8,
            border: `0.5px solid ${T0.border}` }}>
            <div>
              <div style={{ fontSize: 15, color: T0.text, fontFamily: "Plus Jakarta Sans, sans-serif",
                fontWeight: 500 }}>Tema de la interfaz</div>
              <div style={{ fontSize: 13, color: T0.mute, fontFamily: "Plus Jakarta Sans, sans-serif",
                marginTop: 2 }}>Actualmente: {theme === "dark" ? "Modo oscuro" : "Modo claro"}</div>
            </div>
            <button onClick={onToggleTheme}
              style={{ ...T.btnOut, whiteSpace: "nowrap" }}>
              {theme === "dark" ? "☀ Cambiar a claro" : "☾ Cambiar a oscuro"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}