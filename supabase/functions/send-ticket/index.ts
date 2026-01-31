import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(supabaseUrl!, supabaseKey!)

serve(async (req) => {
  try {
    const { record } = await req.json() // This is the new booking row
    
    // 1. Fetch Event Details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title, start_date, image_url, location_details')
      .eq('id', record.event_id)
      .single()

    if (eventError) throw new Error("Event not found")

    // 2. Fetch User Email
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(record.user_id)
    if (userError) throw new Error("User not found")
    
    const userEmail = user?.email
    if (!userEmail) throw new Error("User has no email")

    // 3. Format Date
    const dateString = new Date(event.start_date).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })

    // 4. Send Email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'HostEasy <onboarding@resend.dev>', // You can change this later
      to: [userEmail],
      subject: `Your Ticket for ${event.title} 🎟️`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #007BFF;">You're going to ${event.title}!</h1>
          <img src="${event.image_url}" alt="Event Image" style="width: 100%; border-radius: 10px; margin-bottom: 20px;" />
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 10px;">
            <p><strong>📅 Date:</strong> ${dateString}</p>
            <p><strong>📍 Ticket Type:</strong> ${record.ticket_name}</p>
            <p><strong>🔢 Quantity:</strong> ${record.quantity}</p>
            <p><strong>🆔 Reference:</strong> ${record.payment_reference}</p>
            <p><strong>💰 Paid:</strong> ₦${record.amount_paid}</p>
          </div>

          <p style="margin-top: 20px;">
            Open the <strong>HostEasy App</strong> to view your QR code for entry.
          </p>
        </div>
      `,
    })

    if (emailError) throw emailError

    return new Response(JSON.stringify(emailData), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})