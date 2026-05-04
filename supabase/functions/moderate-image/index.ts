import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@1"

const SIGHTENGINE_API_USER = Deno.env.get("SIGHTENGINE_API_USER")!
const SIGHTENGINE_API_SECRET = Deno.env.get("SIGHTENGINE_API_SECRET")!

interface PostRecord {
  id: string
  image_url: string
  is_flagged: boolean | null
}

serve(async (req) => {
  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Parse the webhook payload
    const payload: Record<string, unknown> = await req.json()
    
    // Get the record from the payload
    const record = payload.record as PostRecord | undefined
    const oldRecord = payload.old_record as PostRecord | undefined

    // Only process new inserts (not updates)
    if (!record || oldRecord) {
      return new Response(JSON.stringify({ message: "Ignoring update events" }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    // Skip if no image URL
    if (!record.image_url) {
      return new Response(JSON.stringify({ message: "No image URL to moderate" }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log(`Moderating image: ${record.image_url} for post: ${record.id}`)

    // Call Sightengine API
    const sightengineResponse = await fetch(
      "https://api.sightengine.com/1.0/check.json",
      {
        method: "POST",
        body: new URLSearchParams({
          url: record.image_url,
          models: "nudity-2,gore-2,weapon-2,alcohol-2,drugs-2",
          api_user: SIGHTENGINE_API_USER,
          api_secret: SIGHTENGINE_API_SECRET,
        }),
      }
    )

    if (!sightengineResponse.ok) {
      console.error("Sightengine API error:", await sightengineResponse.text())
      return new Response(JSON.stringify({ error: "Moderation API error" }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      })
    }

    const result = await sightengineResponse.json()
    console.log("Sightengine result:", JSON.stringify(result))

    // Same gate as scan-upload / sightengine.ts — weapon false-flags trucks; don't auto-flag on it.
    const THRESH_NUDITY_RAW = 0.58
    const THRESH_GORE_PROB = 0.55

    const nudity = result.nudity?.raw ?? 0
    const gore = result.gore?.prob ?? 0
    const weapons = result.weapon?.prob ?? 0
    const alcohol = result.alcohol?.prob ?? 0
    const drugs = result.drugs?.prob ?? 0

    const isNSFW = nudity > THRESH_NUDITY_RAW || gore > THRESH_GORE_PROB

    if (isNSFW) {
      console.log(`Post ${record.id} flagged as NSFW`)

      // Update the post to set is_flagged = true
      const { error: updateError } = await supabase
        .from("posts")
        .update({ is_flagged: true })
        .eq("id", record.id)

      if (updateError) {
        console.error("Failed to update post:", updateError)
        return new Response(JSON.stringify({ error: updateError.message }), {
          headers: { "Content-Type": "application/json" },
          status: 500,
        })
      }

      return new Response(
        JSON.stringify({ 
          message: "Post flagged as NSFW", 
          post_id: record.id,
          scores: { nudity, gore, weapons, alcohol, drugs }
        }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    // Not flagged
    return new Response(
      JSON.stringify({ 
        message: "Post approved", 
        post_id: record.id,
        scores: { nudity, gore, weapons, alcohol, drugs }
      }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Function error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})