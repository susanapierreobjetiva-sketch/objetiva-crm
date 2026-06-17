const BASE = window.location.hostname === "localhost"
  ? "http://localhost:8002/api"
  : `${window.location.protocol}//${window.location.host}/api`;

let token = localStorage.getItem("crm_token");

const request = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401) {
    const r = await fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" });
    if (r.ok) {
      const data = await r.json();
      token = data.access_token;
      localStorage.setItem("crm_token", token);
      return request(method, path, body);
    } else {
      localStorage.removeItem("crm_token");
      window.location.reload();
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
  login: (email, password) => fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  }).then(async r => {
    if (!r.ok) { const e = await r.json(); throw new Error(e.detail); }
    const data = await r.json();
    if (data.requires_2fa) return data; // pantalla 2FA
    token = data.access_token;
    localStorage.setItem("crm_token", token);
    return data;
  }),
  validate2fa: (temp_token, code) => fetch(`${BASE}/auth/2fa/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ temp_token, code }),
  }).then(async r => {
    if (!r.ok) { const e = await r.json(); throw new Error(e.detail); }
    const data = await r.json();
    token = data.access_token;
    localStorage.setItem("crm_token", token);
    return data;
  }),
  setup2fa:       ()                    => request("POST", "/auth/2fa/setup"),
  verifySetup2fa: (code)                => request("POST", "/auth/2fa/verify-setup", { code }),
  disable2fa:     (code)                => request("POST", "/auth/2fa/disable", { code }),
  updateProfile:  (data)                => request("PUT",  "/auth/profile", data),
  changePassword: (data)                => request("POST", "/auth/change-password", data),
  logout: () => fetch(`${BASE}/auth/logout`, { method: "POST", credentials: "include" })
    .then(() => { localStorage.removeItem("crm_token"); token = null; }),

  // Clientes
  getClients:     ()          => request("GET",    "/clients"),
  getClient:      (id)        => request("GET",    `/clients/${id}`),
  createClient:   (data)      => request("POST",   "/clients", data),
  updateClient:   (id, data)  => request("PUT",    `/clients/${id}`, data),
  deleteClient:   (id)        => request("DELETE", `/clients/${id}`),
  addActivity:    (id, note)  => request("POST",   `/clients/${id}/activity`, { note }),
  deleteActivity: (id, actId) => request("DELETE", `/clients/${id}/activity/${actId}`),

  // Pólizas
  getPoliciesByClient: (clientId)      => request("GET",    `/policies/client/${clientId}`),
  getAllPolicies:       ()              => request("GET",    "/policies"),
  createPolicy:        (data)          => request("POST",   "/policies", data),
  updatePolicy:        (id, data)      => request("PUT",    `/policies/${id}`, data),
  deletePolicy:        (id)            => request("DELETE", `/policies/${id}`),

  // Tesis histórico
  addTesisPolicy:   (clientId, data) => request("POST",   `/clients/${clientId}/tesis-policy`, data),
  deleteTesisPolicy:(clientId, id)   => request("DELETE", `/clients/${clientId}/tesis-policy/${id}`),
  addTesisClaim:    (clientId, data) => request("POST",   `/clients/${clientId}/tesis-claim`, data),
  deleteTesisClaim: (clientId, id)   => request("DELETE", `/clients/${clientId}/tesis-claim/${id}`),

  // Siniestros
  getClaimsByClient: (clientId)     => request("GET",    `/claims/client/${clientId}`),
  getAllClaims:       ()             => request("GET",    "/claims"),
  createClaim:       (data)         => request("POST",   "/claims", data),
  updateClaim:       (id, data)     => request("PUT",    `/claims/${id}`, data),
  deleteClaim:       (id)           => request("DELETE", `/claims/${id}`),
  addClaimActivity:  (id, note)     => request("POST",   `/claims/${id}/activity`, { note }),
};
