// Stores the whole app state (settings + transactions) as one JSON blob in Netlify Blobs.
// Every request must carry a valid Auth0 access token (Authorization: Bearer <token>);
// it's verified by asking Auth0's own /userinfo endpoint, so nothing here needs to know
// how to check a JWT signature. Signed-out visitors get 401 and nothing else.

import { getStore } from "@netlify/blobs";

const AUTH0_DOMAIN = "sothuchi.us.auth0.com";
const STORE_NAME = "so-thu-chi";
const STATE_KEY = "state";

async function verifyToken(token) {
  if (!token) return null;
  try {
    const res = await fetch("https://" + AUTH0_DOMAIN + "/userinfo", {
      headers: { Authorization: "Bearer " + token }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "content-type": "application/json" }
  });
}

export default async (req) => {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const user = await verifyToken(token);
  if (!user) return json({ error: "unauthorized" }, 401);

  const store = getStore(STORE_NAME);

  if (req.method === "GET") {
    const data = await store.get(STATE_KEY, { type: "json" });
    return json(data || { settings: null, tx: {} });
  }

  if (req.method === "PUT" || req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return json({ error: "invalid_json" }, 400);
    }
    if (typeof body !== "object" || body === null) return json({ error: "invalid_body" }, 400);
    await store.setJSON(STATE_KEY, { settings: body.settings || null, tx: body.tx || {} });
    return json({ ok: true });
  }

  return json({ error: "method_not_allowed" }, 405);
};
