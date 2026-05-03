import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testPostInsert() {
  try {
    console.log('[diagnostic] Testing posts table insert...')
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('[diagnostic] No auth session found')
      return
    }
    
    console.log('[diagnostic] Session user.id:', session.user.id)
    
    // Try a test insert
    const { data, error } = await supabase
      .from('posts')
      .insert({
        body: 'Test post from diagnostic script',
        rig_model: 'Test Vehicle',
        user_id: session.user.id,
        user_name: 'Test User',
        role: 'user',
        image_url: null,
      })
      .select()
    
    if (error) {
      console.error('[diagnostic] Insert error:', error)
      console.error('[diagnostic] Error code:', error.code)
      console.error('[diagnostic] Error message:', error.message)
      console.error('[diagnostic] Error details:', error.details)
      console.error('[diagnostic] Error hint:', error.hint)
    } else {
      console.log('[diagnostic] Insert successful:', data)
    }
  } catch (err) {
    console.error('[diagnostic] Exception:', err)
  }
}

testPostInsert()
