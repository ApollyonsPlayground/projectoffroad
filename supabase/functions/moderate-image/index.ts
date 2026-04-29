import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SIGHTENGINE_API_USER = Deno.env.get("SIGHTENGINE_API_USER")!
const SIGHTENGINE_API_SECRET = Deno.env.get("SIGHTENGINE_API_SECRET")!

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface PostRecord {
  id: string
  image_url: string
  is_flagged: boolean | null
}

// Run the Sightengine nudity/content check on a given URL.
// Returns { isNSFW, scores } — never throws; returns isNSFW=false on API errors
// so we don't block uploads due to third-party outages.
async function checkImageUrl(imageUrl: string): Promise<{
  isNSFW: boolean
  scores: { nudity: number; gore: number; weapons: number; alcohol: number; drugs: number }
}> {
  const noopScores = { nudity: 0, gore: 0, weapons: 0, alcohol: 0, drugs: 0 }

  if (!SIGHTENGINE_API_USER || !SIGHTENGINE_API_SECRET) {
    console.warn("Sightengine credentials not set — skipping moderation check.")
    return { isNSFW: false, scores: noopScores }
  }

  try {
    const sightengineResponse = await fetch(
      "https://api.sightengine.com/1.0/check.json",
      {
        method: "POST",
        body: new URLSearchParams({
          url: imageUrl,
          models: "nudity-2,gore-2,weapon-2,alcohol-2,drugs-2",
          api_user: SIGHTENGINE_API_USER,
          api_secret: SIGHTENGINE_API_SECRET,
        }),
      }
    )

    if (!sightengineResponse.ok) {
      console.error("Sightengine API error:", await sightengineResponse.text())
      return { isNSFW: false, scores: noopScores }
    }

    const result = await sightengineResponse.json()
    console.log("Sightengine result:", JSON.stringify(result))

    const scores = {
      nudity:  result.nudity?.raw ?? 0,
      gore:    result.gore?.prob ?? 0,
      weapons: result.weapon?.prob ?? 0,
      alcohol: result.alcohol?.prob ?? 0,
      drugs:   result.drugs?.prob ?? 0,
    }

    // Threshold: flag if any category exceeds 0.5
    const isNSFW = Object.values(scores).some((v) => v > 0.5)
    return { isNSFW, scores }
  } catch (err) {
    console.error("Sightengine fetch error:", err)
    return { isNSFW: false, scores: noopScores }
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    const body: Record<string, unknown> = await req.json()

    // ── MODE 1: Direct pre-flight call from the client ─────────────────────────
    // Payload: { mode: "preflight", image_url: "https://..." }
    // Response: { allowed: boolean, scores: {...} }
    if (body.mode === "preflight") {
      const imageUrl = body.image_url as string | undefined
      if (!imageUrl) {
        return new Response(
          JSON.stringify({ error: "image_url is required for preflight mode" }),
          { headers: { ...CORS_HEADERS, "Content-Type": "application/json" }, status: 400 }
        )
      }

      console.log(`[preflight] Moderating image: ${imageUrl}`)
      const { isNSFW, scores } = await checkImageUrl(imageUrl)

      return new Response(
        JSON.stringify({ allowed: !isNSFW, scores }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      )
    }

    // ── MODE 2: Database webhook (called by Supabase on INSERT to posts) ───────
    // Payload: { type: "INSERT", record: { id, image_url, ... } }
    const record = body.record as PostRecord | undefined
    const oldRecord = body.old_record as PostRecord | undefined

    // Only process new inserts
    if (!record || oldRecord) {
      return new Response(
        JSON.stringify({ message: "Ignoring update events" }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    if (!record.image_url) {
      return new Response(
        JSON.stringify({ message: "No image URL to moderate" }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    console.log(`[webhook] Moderating image: ${record.image_url} for post: ${record.id}`)
    const { isNSFW, scores } = await checkImageUrl(record.image_url)

    if (isNSFW) {
      console.log(`Post ${record.id} flagged as NSFW`)

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      )

      const { error: updateError } = await supabase
        .from("posts")
        .update({ is_flagged: true })
        .eq("id", record.id)

      if (updateError) {
        console.error("Failed to update post:", updateError)
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { headers: { "Content-Type": "application/json" }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({ message: "Post flagged as NSFW", post_id: record.id, scores }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ message: "Post approved", post_id: record.id, scores }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Function error:", error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    )
  }
})
