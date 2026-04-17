require('dotenv').config();
const Groq = require('groq-sdk');
const gemini = new Groq({ 
  apiKey: process.env.GEMINI_API_KEY || 'AIzaSyA...', 
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/' 
});
gemini.chat.completions.create({ model: 'gemini-1.5-flash', messages: [{role: 'user', content: 'hello'}]})
  .then(res => console.log(res.choices[0].message.content))
  .catch(console.error);
