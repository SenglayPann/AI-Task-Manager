const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function listModels() {
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await genAI.models.list();
    console.log('Response:', JSON.stringify(response, null, 2));
    if (response.models) {
      response.models.forEach(model => {
        console.log(`- ${model.name} (${model.displayName})`);
      });
    }
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels();
