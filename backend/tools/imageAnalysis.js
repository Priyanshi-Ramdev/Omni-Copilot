const Groq = require('groq-sdk');

async function analyzeImage({ imageData, mimeType = 'image/png', prompt }) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const response = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageData}` } },
        ],
      },
    ],
    max_tokens: 2048,
    temperature: 0.4,
  });

  const analysis = response.choices[0]?.message?.content || 'No analysis returned.';
  return { success: true, analysis, prompt };
}

module.exports = { analyzeImage };
