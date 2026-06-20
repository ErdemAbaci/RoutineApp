const assert = require("node:assert/strict");

const baseURL = process.env.API_BASE_URL;

if (!baseURL) {
  throw new Error("API_BASE_URL environment variable is required");
}

async function request(path, options = {}) {
  const response = await fetch(`${baseURL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  return {
    status: response.status,
    body,
  };
}

function getFutureTimeOrNull() {
  const now = new Date();
  const turkeyTime = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul",
  }).format(now);
  const [hour] = turkeyTime.split(":").map(Number);

  if (hour >= 22) {
    return null;
  }

  return `${String(hour + 1).padStart(2, "0")}:59`;
}

async function main() {
  await cleanupSmokeRoutines();

  const dashboard = await request("/dashboard");
  assert.equal(dashboard.status, 200, "GET /dashboard should return 200");
  assert.equal(typeof dashboard.body.currentStreak, "number");

  const today = await request("/today");
  assert.equal(today.status, 200, "GET /today should return 200");
  assert.ok(Array.isArray(today.body.items));

  const templates = await request("/routine-templates");
  assert.equal(templates.status, 200, "GET /routine-templates should return 200");
  assert.ok(Array.isArray(templates.body.items));
  assert.ok(templates.body.items.length > 0);

  const scheduledTime = getFutureTimeOrNull() ?? "23:59";
  const title = `Smoke duplicate ${Date.now()}`;
  const draft = {
    title,
    category: "habit",
    frequencyType: "daily",
    scheduledTime,
    reminderEnabled: false,
  };

  const created = await request("/routines", {
    method: "POST",
    body: JSON.stringify(draft),
  });

  if (created.status !== 201) {
    console.error(JSON.stringify(created.body, null, 2));
  }

  assert.equal(created.status, 201, "first POST /routines should create");

  const duplicate = await request("/routines", {
    method: "POST",
    body: JSON.stringify(draft),
  });
  assert.equal(duplicate.status, 409, "duplicate POST /routines should return 409");

  const archived = await request(`/routines/${created.body.id}/archive`, {
    method: "POST",
  });

  if (archived.status !== 200) {
    console.error(JSON.stringify(archived.body, null, 2));
  }

  assert.equal(archived.status, 200, "temporary smoke routine should archive");

  console.log(JSON.stringify({
    ok: true,
    checked: [
      "GET /dashboard",
      "GET /today",
      "GET /routine-templates",
      "POST /routines",
      "duplicate POST /routines -> 409",
      "POST /routines/{id}/archive",
    ],
  }, null, 2));
}

async function cleanupSmokeRoutines() {
  const routines = await request("/routines");

  if (routines.status !== 200 || !Array.isArray(routines.body.items)) {
    return;
  }

  for (const routine of routines.body.items) {
    if (
      routine.status === "active" &&
      typeof routine.title === "string" &&
      routine.title.startsWith("Smoke duplicate")
    ) {
      await request(`/routines/${routine.id}/archive`, {
        method: "POST",
      });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
