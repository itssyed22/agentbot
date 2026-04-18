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
CLINIC NAME: Smile Dental Clinic, Karachi Pakistan

SERVICES & PRICES:
- Dental Checkup: Rs 500
- Teeth Cleaning: Rs 1,500
- Tooth Filling: Rs 2,000
- Tooth Extraction: Rs 1,000
- Root Canal Treatment: Rs 8,000 - Rs 15,000
- Teeth Whitening: Rs 5,000
- Braces Consultation: Free first visit
- Dental X-Ray: Rs 800

DOCTORS:
- Dr. Ahmed Khan (Senior Dentist, 15 years experience)
- Dr. Sara Ali (Orthodontist, Braces Specialist)

LOCATION: Block 5, Clifton, Karachi (near Clifton Bridge)

HOURS:
- Monday to Saturday: 10am - 8pm
- Sunday: 11am - 4pm
- Emergency appointments available

CONTACT: +92-300-1234567 (also on WhatsApp)

PAYMENT: Cash, Easypaisa, JazzCash, Bank Transfer accepted

LANGUAGES: Urdu and English

PARKING: Available outside clinic
`;

async function saveAppointment(name, phone, preferred_time) {
  const { error } = await supabase
    .from('appointments')
    .insert([{ name, email: phone, preferred_time, business: 'smile_dental_clinic' }]);
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
          content: `You are a helpful assistant for Smile Dental Clinic in Karachi, Pakistan.
          
          Clinic information: ${FAQ}
          
          IMPORTANT RULES:
          - Reply in the same language the patient uses (Urdu or English)
          - If they write in Urdu, reply in Urdu
          - If they write in English, reply in English
          - Be warm, friendly and professional
          - Keep replies short and clear
          - If asked about prices, always give the price in Pakistani Rupees
          
          BOOKING APPOINTMENTS:
          When a patient wants to book:
          1. Ask for their name
          2. Ask for their phone number (for WhatsApp confirmation)
          3. Ask for preferred day and time
          4. Once you have all 3, reply with EXACTLY:
          BOOKING:name=Ahmed,phone=03001234567,time=Saturday 3pm
          
          Always end booking with reassurance like "We will confirm your appointment on WhatsApp shortly!"`
        },
        ...history,
        { role: 'user', content: message }
      ]
    });

    const reply = response.choices[0].message.content;

    if (reply.includes('BOOKING:')) {
      const bookingData = reply.split('BOOKING:')[1].split('\n')[0];
      const parts = {};
      bookingData.split(',').forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) parts[key.trim()] = value.trim();
      });

      await saveAppointment(parts.name, parts.phone, parts.time);

      res.json({
        reply: `Shukriya! Aapki appointment book ho gayi hai ${parts.time} ke liye. Hum aapko WhatsApp par confirm kar denge. Koi aur sawaal ho toh zaroor poochein! 😊\n\n(Thank you! Your appointment has been booked for ${parts.time}. We will confirm on WhatsApp shortly!)`,
        booked: true
      });
    } else {
      res.json({ reply, booked: false });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: 'Sorry, something went wrong. Please call us at +92-300-1234567' });
  }
});

module.exports = app;