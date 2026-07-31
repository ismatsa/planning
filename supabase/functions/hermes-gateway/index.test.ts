import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveAssistantContent, buildResultPayload, resolveSessionId } from './content.ts';

Deno.test("complete-job utilise body.message", () => {
  assertEquals(
    resolveAssistantContent({ message: "Bonjour ! Je suis l'assistant Powertech." }, "completed"),
    "Bonjour ! Je suis l'assistant Powertech.",
  );
});

Deno.test("complete-job retombe sur result.message", () => {
  assertEquals(
    resolveAssistantContent({ result: { message: "Devis créé." } }, "completed"),
    "Devis créé.",
  );
});

Deno.test("complete-job retombe sur summary puis message technique", () => {
  assertEquals(resolveAssistantContent({ summary: "Résumé" }, "completed"), "Résumé");
  assertEquals(resolveAssistantContent({}, "completed"), "Action réalisée.");
  assertEquals(resolveAssistantContent({ message: "   " }, "failed"), "Erreur lors du traitement.");
});

Deno.test("buildResultPayload conserve les données structurées", () => {
  const payload = buildResultPayload(
    {
      result: { devis_id: "42" },
      summary: "Devis brouillon créé",
      action: "devis.create",
      warnings: ["Prix estimé"],
      missing_fields: ["vin"],
    },
    "completed",
  );
  assertEquals(payload.devis_id, "42");
  assertEquals(payload.summary, "Devis brouillon créé");
  assertEquals(payload.action, "devis.create");
  assertEquals(payload.warnings, ["Prix estimé"]);
  assertEquals(payload.missing_fields, ["vin"]);
  assertEquals(payload.status, "completed");
});

Deno.test("resolveSessionId lit les alias de session Hermes", () => {
  assertEquals(resolveSessionId({ hermes_session_id: "sess_1" }), "sess_1");
  assertEquals(resolveSessionId({ session_id: "sess_2" }), "sess_2");
  assertEquals(resolveSessionId({ result: { hermes_session_id: "sess_3" } }), "sess_3");
  assertEquals(resolveSessionId({ message: "hello" }), null);
});
