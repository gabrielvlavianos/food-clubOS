import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["google_maps_api_key", "kitchen_address", "driver_prep_time_minutes"]);

    if (settingsError) {
      return new Response(
        JSON.stringify({ error: "Failed to load settings" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const settingsMap = Object.fromEntries(
      settings.map((s: any) => [s.key, s.value])
    );

    const apiKey = settingsMap.google_maps_api_key;
    const kitchenAddress = settingsMap.kitchen_address || "Rua Clodomiro Amazonas, 134";
    const driverPrepTime = parseInt(settingsMap.driver_prep_time_minutes || "10");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Google Maps API key not configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: schedules, error: schedulesError } = await supabase
      .from("delivery_schedules")
      .select("id, delivery_address")
      .not("delivery_address", "is", null);

    if (schedulesError) {
      return new Response(
        JSON.stringify({ error: "Failed to load delivery schedules" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const schedule of schedules) {
      try {
        const googleMapsUrl = new URL(
          "https://maps.googleapis.com/maps/api/distancematrix/json"
        );
        googleMapsUrl.searchParams.append("origins", kitchenAddress);
        googleMapsUrl.searchParams.append("destinations", schedule.delivery_address);
        googleMapsUrl.searchParams.append("mode", "driving");
        googleMapsUrl.searchParams.append("departure_time", "now");
        googleMapsUrl.searchParams.append("traffic_model", "best_guess");
        googleMapsUrl.searchParams.append("key", apiKey);

        const response = await fetch(googleMapsUrl.toString());
        const data = await response.json();

        if (data.status === "OK") {
          const element = data.rows[0]?.elements[0];
          if (element && element.status === "OK") {
            const durationInSeconds = element.duration_in_traffic?.value || element.duration.value;
            const travelTimeMinutes = Math.ceil(durationInSeconds / 60);

            const { error: updateError } = await supabase
              .from("delivery_schedules")
              .update({ travel_time_minutes: travelTimeMinutes })
              .eq("id", schedule.id);

            if (updateError) {
              errorCount++;
              errors.push(`Failed to update schedule ${schedule.id}`);
            } else {
              successCount++;
            }
          } else {
            errorCount++;
            errors.push(`Route not found for: ${schedule.delivery_address}`);
          }
        } else {
          errorCount++;
          errors.push(`Google Maps error for: ${schedule.delivery_address}`);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        errorCount++;
        errors.push(`Exception for schedule ${schedule.id}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalSchedules: schedules.length,
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
