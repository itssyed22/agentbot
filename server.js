require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json());

const FAQ = `
  We are a dental clinic open Mon-Sat 9am-6pm.
  Services: checkups $20, cleaning $30, fillings $50.
  To book reply with your name and preferred time.
  Phone: +92-300-1234567
`;

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: `You are a helpful assistant. Answer only based on: ${FAQ}. Be friendly and brief.` },
        { role: 'user', content: message }
      ]
    });
    res.json({ reply: response.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ reply: 'Sorry, something went wrong.' });
  }
});

module.exports = app;