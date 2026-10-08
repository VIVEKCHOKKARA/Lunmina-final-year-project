import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are an AI business analyst for a small business analytics dashboard called Profit Navigator.
You help business owners understand their sales data, expenses, product performance, and provide actionable business advice.
Keep answers concise, practical, and data-driven. Use bullet points and clear formatting.
When discussing numbers, use currency formatting (e.g. $1,200 or ₹1,200).
You are powered by Llama 3.1 via Groq.

IMPORTANT MULTILINGUAL RULE:
- Detect the language of the user's message automatically.
- If the user writes in Telugu (తెలుగు), you MUST reply entirely in Telugu.
- If the user writes in Hindi (हिंदी), reply in Hindi.
- If the user writes in Tamil (தமிழ்), reply in Tamil.
- If the user writes in Gujarati (ગુજરાતી), reply in Gujarati.
- If the user writes in Spanish (Español), reply in Spanish.
- If the user writes in English, reply in English.
- Always match the language the user is speaking. Never switch languages unless the user does.
- When replying in Telugu or other Indian languages, still use proper business terminology.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Groq API error:", response.status, t);
      return new Response(JSON.stringify({ error: "Groq API error: " + response.status }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the SSE response directly back to the client
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
