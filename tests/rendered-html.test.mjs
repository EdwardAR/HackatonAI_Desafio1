import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the customer landing", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Entiende cada cambio/);
  assert.match(html, /Sin dudas ni sorpresas/);
  assert.match(html, /href="\/acceso"/);
  assert.match(html, /Causas verificadas/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("server-renders access and guarded dashboard routes", async () => {
  const [access, dashboard] = await Promise.all([render("/acceso"), render("/dashboard")]);
  assert.equal(access.status, 200);
  assert.match(await access.text(), /Ingresa tu número móvil/);
  assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /Verificando tu acceso/);
});

test("demo session helpers validate without storing PII", async () => {
  const session = await import("../app/lib/demo-session.ts");
  assert.equal(session.normalizePhone("+51 987-654-321"), "987654321");
  assert.equal(session.normalizePhone("987-654-321"), "987654321");
  assert.equal(session.isValidPeruvianMobile("987654321"), true);
  assert.equal(session.isValidPeruvianMobile("887654321"), false);
  assert.equal(session.maskPhone("987654321"), "*** *** 321");
  assert.equal(session.isValidDemoOtp("123456"), true);
  assert.equal(session.isValidDemoOtp("654321"), false);

  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  session.createDemoSession(storage);
  assert.deepEqual([...values.entries()], [["claria_demo_session", "active"]]);
  assert.equal(session.hasDemoSession(storage), true);
  session.clearDemoSession(storage);
  assert.equal(values.size, 0);
});

test("routes keep the finished product structure", async () => {
  const [page, layout, packageJson, dashboardRoute] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /LandingPage/);
  assert.match(layout, /generateMetadata/);
  assert.match(dashboardRoute, /DemoSessionGuard/);
  assert.doesNotMatch(`${page}${layout}${packageJson}`, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});
