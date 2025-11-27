import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TravelTimeRequest {
  destinationAddress: string;
}

interface TravelTimeResponse {
  travelTimeMinutes: number;
  pickupTimeMinutes: number;
  distance: string;
  duration: string;
}

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

    const { destinationAddress }: TravelTimeRequest = await req.json();

    if (!destinationAddress) {
      return new Response(
        JSON.stringify({ error: "Missing destination address" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

    const googleMapsUrl = new URL(
      "https://maps.googleapis.com/maps/api/distancematrix/json"
    );
    googleMapsUrl.searchParams.append("origins", kitchenAddress);
    googleMapsUrl.searchParams.append("destinations", destinationAddress);
    googleMapsUrl.searchParams.append("mode", "driving");
    googleMapsUrl.searchParams.append("departure_time", "now");
    googleMapsUrl.searchParams.append("traffic_model", "best_guess");
    googleMapsUrl.searchParams.append("key", apiKey);

    const response = await fetch(googleMapsUrl.toString());
    const data = await response.json();

    if (data.status !== "OK") {
      return new Response(
        JSON.stringify({ error: `Google Maps API error: ${data.status}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const element = data.rows[0]?.elements[0];
    if (!element || element.status !== "OK") {
      return new Response(
        JSON.stringify({ error: "Could not calculate route" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const durationInSeconds = element.duration_in_traffic?.value || element.duration.value;
    const travelTimeMinutes = Math.ceil(durationInSeconds / 60);
    const pickupTimeMinutes = travelTimeMinutes + driverPrepTime;

    const result: TravelTimeResponse = {
      travelTimeMinutes,
      pickupTimeMinutes,
      distance: element.distance.text,
      duration: element.duration.text,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
