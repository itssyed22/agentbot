require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(cors());
app.use(express.json());

const FAQ = `
  We are a dental clinic open Mon-Sat 9am-6pm.
  Services: checkups $20, cleaning $30, fillings $50.
  Phone: +92-300-1234567
`;

async function saveAppointment(name, email, preferred_time) {
  const { error } = await supabase
    .from('appointments')
    .insert([{ name, email, preferred_time }]);
  if (error) console.error('Supabase error:', error);
}

app.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant for this dental clinic.
          Business info: ${FAQ}
          
          When a user wants to book an appointment:
          1. Ask for their name if you don't have it
          2. Ask for their preferred time if you don't have it
          3. Ask for their email if you don't have it
          4. Once you have name, time and email, reply with EXACTLY this format:
          BOOKING:name=John,time=Monday 3pm,email=john@gmail.com
          
          Be friendly and brief in all responses.`
        },
        ...history,
        { role: 'user', content: message }
      ]
    });

    const reply = response.choices[0].message.content;

    if (reply.includes('BOOKING:')) {
      const bookingData = reply.split('BOOKING:')[1];
      const parts = {};
      bookingData.split(',').forEach(part => {
        const [key, value] = part.split('=');
        parts[key.trim()] = value.trim();
      });

      await saveAppointment(parts.name, parts.email, parts.time);

      res.json({
        reply: `Perfect! Your appointment has been booked for ${parts.time}. We will see you then! If you need to make changes call +92-300-1234567.`,
        booked: true
      });
    } else {
      res.json({ reply, booked: false });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: 'Sorry, something went wrong.' });
  }
});

module.exports = app;