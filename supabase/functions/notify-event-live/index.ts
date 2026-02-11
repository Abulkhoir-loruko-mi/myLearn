import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Expo } from "npm:expo-server-sdk";

const expo = new Expo();

serve(async (req) => {
  try {
    const payload = await req.json();
    const { type, record, old_record, table } = payload;

    console.log(`🔔 Webhook received: ${type} on ${table}`);

    // 1. Validation
    if (table !== 'events' || record.status !== 'published' || (old_record && old_record.status === 'published')) 
      {
      console.log("Skipping: Not a fresh 'Go Live' event.");
      return new Response(JSON.stringify({ message: 'Skipped' }), { status: 200 });
    }

    // 2. Initialize Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Get Organizer ID
    const organizerId = record.organizer_id; 

    // 4. Fetch Profiles (FIXED: Now selecting 'id' AND 'push_token')
    let query = supabaseAdmin
      .from('profiles')
      .select('id, push_token'); 
      // We removed the .not('push_token', 'is', null) filter here 
      // because we want to save In-App notifications even for users without tokens.

    //  i Filter out the organizer he'll also see the notification
    if (organizerId) {
       // query = query.neq('id', organizerId); 
    }

    const { data: profiles, error } = await query;

    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: 'No targets' }), { status: 200 });
    }

    // 5. Prepare Messages
    let pushMessages = [];
    let dbNotifications = [];

    const title = 'New Event Live! 🎉';
    const body = `${record.title} is now live. Check it out!`;
    const data = { eventId: record.id };

    for (const profile of profiles) {
      // A. Add to Database List (Now profile.id exists!)
      dbNotifications.push({
        user_id: profile.id,
        title: title,
        body: body,
        data: data,
        is_read: false
      });

      // B. Add to Push List (Only if valid token exists)
      if (profile.push_token && Expo.isExpoPushToken(profile.push_token)) {
        pushMessages.push({
          to: profile.push_token,
          sound: 'default',
          title: title,
          body: body,
          data: data,
        });
      }
    }

    // 6. Save to Database
    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(dbNotifications);

    if (insertError) {
      console.error("Failed to save notifications to DB:", insertError);
    } else {
      console.log(`Saved ${dbNotifications.length} notifications to DB.`);
    }

    // 7. Send Push Notifications
    let chunks = expo.chunkPushNotifications(pushMessages);
    for (let chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        console.error("Error sending chunk:", error);
      }
    }

    // FIXED: Using 'pushMessages.length' instead of 'messages.length'
    return new Response(
      JSON.stringify({ success: true, count: pushMessages.length }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Function Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});