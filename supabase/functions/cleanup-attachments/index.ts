import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "devis-attachments";
const TERMINAL_STATUSES = ["valide", "annule", "refuse"];
const ONE_MONTH_AGO_SQL = "now() - interval '1 month'";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Find devis in terminal state with closed_at older than 1 month
    const { data: devisList, error: devisError } = await supabase
      .from("devis")
      .select("id")
      .in("statut", TERMINAL_STATUSES)
      .not("closed_at", "is", null)
      .lt("closed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (devisError) throw devisError;
    if (!devisList || devisList.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const devisIds = devisList.map((d: any) => d.id);

    // Get attachments for these devis
    const { data: attachments, error: attError } = await supabase
      .from("devis_attachments")
      .select("id, file_path")
      .in("devis_id", devisIds);

    if (attError) throw attError;
    if (!attachments || attachments.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete files from storage in batches of 100
    const paths = attachments.map((a: any) => a.file_path);
    for (let i = 0; i < paths.length; i += 100) {
      const batch = paths.slice(i, i + 100);
      await supabase.storage.from(BUCKET).remove(batch);
    }

    // Delete metadata rows
    const attIds = attachments.map((a: any) => a.id);
    for (let i = 0; i < attIds.length; i += 100) {
      const batch = attIds.slice(i, i + 100);
      await supabase.from("devis_attachments").delete().in("id", batch);
    }

    return new Response(
      JSON.stringify({ deleted: attachments.length, devisCount: devisIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Cleanup error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
