import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const KITCHEN_ADDRESS = "Rua Clodomiro Amazonas, 134";
const DRIVER_PREP_TIME = 10;

interface TravelTimeRequest {
  destination: string;
  apiKey: string;
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
    const { destination, apiKey }: TravelTimeRequest = await req.json();

    if (!destination || !apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing destination or API key" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const googleMapsUrl = new URL(
      "https://maps.googleapis.com/maps/api/distancematrix/json"
    );
    googleMapsUrl.searchParams.append("origins", KITCHEN_ADDRESS);
    googleMapsUrl.searchParams.append("destinations", destination);
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
    const pickupTimeMinutes = travelTimeMinutes + DRIVER_PREP_TIME;

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
