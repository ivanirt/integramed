import assert from "node:assert/strict";
import test from "node:test";
import {
  bundleEntryBlockedForNonAdmin,
  isPractitionerMutation,
  parseFhirTarget,
} from "../src/lib/fhir-path.js";

test("the shared FHIR normalizer sees every practitioner write shape", () => {
  const prefixed = parseFhirTarget("fhir/Practitioner/1");
  assert.equal(prefixed.ok, true);
  assert.equal(prefixed.rawType, "Practitioner");
  assert.equal(prefixed.id, "1");
  assert.equal(prefixed.nonCanonical, false);

  const absolute = parseFhirTarget("https://example.com/Practitioner/abc");
  assert.equal(absolute.rawType, "Practitioner");
  assert.equal(absolute.id, "abc");

  const dotted = parseFhirTarget("./Practitioner/1");
  assert.equal(dotted.rawType, "Practitioner");
  assert.equal(dotted.id, "1");

  const canonical = parseFhirTarget("Practitioner/1");
  assert.equal(canonical.rawType, "Practitioner");
  assert.equal(canonical.id, "1");

  const lower = parseFhirTarget("/api/fhir/practitioner/1");
  assert.equal(lower.rawType, "practitioner");
  assert.equal(lower.canonical, "Practitioner");
  assert.equal(lower.nonCanonical, true);
  assert.equal(lower.id, "1");

  const encoded = parseFhirTarget("fhir%2FPractitioner%2F1");
  assert.equal(encoded.rawType, "Practitioner");
  assert.equal(encoded.id, "1");

  assert.equal(parseFhirTarget("%%%").ok, false);
});

test("bundle entries without a resource use the same normalizer", () => {
  const urls = [
    "fhir/Practitioner/1",
    "https://example.com/Practitioner/abc",
    "./Practitioner/1",
    "Practitioner/1",
  ];
  for (const url of urls) {
    assert.equal(
      bundleEntryBlockedForNonAdmin({ request: { method: "DELETE", url } }),
      true,
      url,
    );
  }
  assert.equal(bundleEntryBlockedForNonAdmin({ request: { method: "GET", url: "Practitioner/1" } }), false);
  assert.equal(bundleEntryBlockedForNonAdmin({ request: { method: "DELETE", url: "%%%" } }), true);
  assert.equal(
    bundleEntryBlockedForNonAdmin({ request: { method: "DELETE", url: "Patient/1" } }),
    false,
  );
});

test("protocol-relative FHIR urls fail closed", () => {
  assert.equal(parseFhirTarget("//evil.example/Practitioner/1").ok, false);
  assert.equal(parseFhirTarget("//evil.example/fhir/Practitioner/1").ok, false);
  assert.equal(parseFhirTarget("\\\\evil.example\\Practitioner\\1").ok, false);
  assert.equal(parseFhirTarget("%2F%2Fevil.example/Practitioner/1").ok, false);
  assert.equal(parseFhirTarget("https://example.com//evil.example/Practitioner/1").ok, false);
  assert.equal(
    bundleEntryBlockedForNonAdmin({ request: { method: "PUT", url: "//evil.example/Practitioner/1" } }),
    true,
  );
  assert.equal(parseFhirTarget("https://example.com/Practitioner/abc").rawType, "Practitioner");
  assert.equal(parseFhirTarget("/fhir/Practitioner/1").rawType, "Practitioner");
  assert.equal(parseFhirTarget("/fhir//evil.com/Patient").ok, false);
  assert.equal(parseFhirTarget("NotARealType/1").ok, false);
  assert.equal(parseFhirTarget("/fhir/Patient/1").canonical, "Patient");
});

test("X-HTTP-Method-Override does not change the FHIR method", () => {
  const read = {
    method: "GET",
    path: "/api/fhir/Practitioner/1",
    headers: { "x-http-method-override": "DELETE" },
  };
  assert.equal(isPractitionerMutation(read), false);
  const write = {
    method: "PUT",
    path: "/api/fhir/Practitioner/1",
    headers: { "x-http-method-override": "GET" },
  };
  assert.equal(isPractitionerMutation(write), true);
});
