const BASE = window.location.hostname === "localhost"
  ? "http://localhost:8002/api"
  : `${window.location.protocol}//${window.location.host}/api`;

// Token SOLO en memoria — nunca en localStorage
// El refresh cookie (HttpOnly) lo restaura tras recargar
let token = null;

const request = async (method, path, body, isRetry = false) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401 && !isRetry) {
    const r = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (r.ok) {
      const data = await r.json();
      token = data.access_token;
      return request(method, path, body, true); // isRetry=true — no bucle infinito
    } else {
      token = null;
      window.location.reload();
      return;
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Error");
  }

  return res.json();
};

export const api = {
  // Auth
  login: async (email, password) => {
    const r = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.detail); }
    const data = await r.json();
    if (data.requires_2fa) return data;
    token = data.access_token;
    return data;
  },

  validate2fa: async (temp_token, code) => {
    const r = await fetch(`${BASE}/auth/2fa/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ temp_token, code }),
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.detail); }
    const data = await r.json();
    token = data.access_token;
    const meRes = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    const user = await meRes.json();
    return { ...data, user };
  },

  // Restaurar sesión al recargar — intenta refresh automático
  restoreSession: async () => {
    try {
      const r = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) return null;
      const data = await r.json();
      token = data.access_token;
      const meRes = await fetch(`${BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!meRes.ok) return null;
      return await meRes.json();
    } catch {
      return null;
    }
  },

  setup2fa:       ()      => request("POST", "/auth/2fa/setup"),
  verifySetup2fa: (code)  => request("POST", "/auth/2fa/verify-setup", { code }),
  disable2fa:     (code)  => request("POST", "/auth/2fa/disable", { code }),
  updateProfile:  (data)  => request("PUT",  "/auth/profile", data),
  changePassword: (data)  => request("POST", "/auth/change-password", data),

  logout: async () => {
    await fetch(`${BASE}/auth/logout`, { method: "POST", credentials: "include" });
    token = null;
  },

  getAgents: () => request("GET", "/auth/users"),

  // Clientes
  getClients:     ()          => request("GET",    "/clients"),
  getClient:      (id)        => request("GET",    `/clients/${id}`),
  createClient:   (data)      => request("POST",   "/clients", data),
  updateClient:   (id, data)  => request("PUT",    `/clients/${id}`, data),
  deleteClient:   (id)        => request("DELETE", `/clients/${id}`),
  addActivity:    (id, note)  => request("POST",   `/clients/${id}/activity`, { note }),
  deleteActivity: (id, actId) => request("DELETE", `/clients/${id}/activity/${actId}`),

  // Pólizas
  getPoliciesByClient: (clientId)  => request("GET",    `/policies/client/${clientId}`),
  getAllPolicies:       ()          => request("GET",    "/policies"),
  createPolicy:        (data)      => request("POST",   "/policies", data),
  updatePolicy:        (id, data)  => request("PUT",    `/policies/${id}`, data),
  deletePolicy:        (id)        => request("DELETE", `/policies/${id}`),

  // Tesis
  addTesisPolicy:    (clientId, data) => request("POST",   `/clients/${clientId}/tesis-policy`, data),
  deleteTesisPolicy: (clientId, id)   => request("DELETE", `/clients/${clientId}/tesis-policy/${id}`),
  addTesisClaim:     (clientId, data) => request("POST",   `/clients/${clientId}/tesis-claim`, data),
  deleteTesisClaim:  (clientId, id)   => request("DELETE", `/clients/${clientId}/tesis-claim/${id}`),

  // Siniestros
  getClaimsByClient: (clientId)  => request("GET",    `/claims/client/${clientId}`),
  getAllClaims:       ()          => request("GET",    "/claims"),
  createClaim:       (data)      => request("POST",   "/claims", data),
  updateClaim:       (id, data)  => request("PUT",    `/claims/${id}`, data),
  deleteClaim:       (id)        => request("DELETE", `/claims/${id}`),
  addClaimActivity:  (id, note)  => request("POST",   `/claims/${id}/activity`, { note }),

  // Documentos
  getDocuments: (entityType, entityId) =>
    request("GET", `/documents/${entityType}/${entityId}`),

  uploadDocument: async (entityType, entityId, file, description = "") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entity_type", entityType);
    formData.append("entity_id", entityId);
    formData.append("description", description);
    const res = await fetch(`${BASE}/documents`, {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: "include",
      body: formData,
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "Error subida"); }
    return res.json();
  },

  deleteDocument: (docId) => request("DELETE", `/documents/${docId}`),

  downloadDocument: async (docId, filename) => {
    const res = await fetch(`${BASE}/documents/file/${docId}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: "include",
    });
    if (!res.ok) throw new Error("Error descarga");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  },

  // Tareas
  getTasks:         ()             => request("GET",    "/tasks"),
  getTasksByClient: (clientId)     => request("GET",    `/tasks/client/${clientId}`),
  createTask:       (data)         => request("POST",   "/tasks", data),
  updateTask:       (id, data)     => request("PUT",    `/tasks/${id}`, data),
  deleteTask:       (id)           => request("DELETE", `/tasks/${id}`),
};
