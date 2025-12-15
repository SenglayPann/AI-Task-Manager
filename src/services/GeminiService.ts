import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3 } from '@env';
import { ITask, AIChatAction, AIChatMessage } from '../types/task';

const API_KEYS = [GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3].filter(Boolean);
const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-flash']; // Alternate models per key
let currentKeyIndex = 0;

const getGenAIClient = () => {
  const apiKey = API_KEYS[currentKeyIndex];
  if (!apiKey) {
    throw new Error('No valid Gemini API key found');
  }
  return new GoogleGenAI({ apiKey });
};

const getCurrentModel = () => {
  return MODELS[currentKeyIndex % MODELS.length] || 'gemini-2.5-flash';
};

const rotateKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`Rotated to API key index: ${currentKeyIndex}, Model: ${getCurrentModel()}`);
};

const SYSTEM_INSTRUCTION = `
You are a Task Management Assistant.
You help the user manage their tasks.
You have access to the user's current tasks in JSON format and the recent Chat History.

Your capabilities:
1. Answer questions about the tasks (e.g., "How many tasks?", "What is due?").
2. Answer questions about the conversation history.
3. Perform actions on tasks (Create, Update, Delete, Complete).

Context Awareness:
- You MUST use the "Chat History" section to understand the context.

Task Creation Workflow:
- When the user wants to create a task, you need: 'title', 'description', and 'dueDate'.
- If information is missing, ASK the user.
- When asking, provide 2 reasonable suggestions for the user to choose from.
- Only generate a 'CREATE' action when you have sufficient information or the user asks to proceed with defaults.

Response Format:
You MUST ALWAYS respond with a valid JSON object. Do not include markdown formatting like \`\`\`json.
Structure:
{
  "text": "Your response message to the user",
  "suggestions": ["Option 1", "Option 2"], // Optional: suggestions for the user
  "action": { ... } // Optional: the action to perform
}

Action Objects:
- CREATE: { "type": "CREATE", "task": { "title": "...", "description": "...", "dueDate": "ISO 8601 DateTime (e.g., 2024-01-15T14:30:00.000Z)" } }
- UPDATE: { "type": "UPDATE", "id": "...", "updates": { ... } }
- DELETE: { "type": "DELETE", "id": "..." }
- COMPLETE: { "COMPLETE": "COMPLETE", "id": "..." }
- NONE: { "type": "NONE" }

Important: Always use full ISO 8601 datetime format for dueDate (with time), not just date.
`;

export const GeminiService = {
  sendMessage: async (
    userMessage: string, 
    currentTasks: ITask[], 
    chatHistory: AIChatMessage[] = []
  ): Promise<{ text: string; action?: AIChatAction; suggestions?: string[] }> => {
    let attempts = 0;
    // We try up to API_KEYS.length + 1 times to ensure we cycle back to the first key if needed
    const maxAttempts = API_KEYS.length + 1;

    while (attempts < maxAttempts) {
      try {
        const genAI = getGenAIClient();
        const historyContext = chatHistory
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
          .join('\n');

        const prompt = `
${SYSTEM_INSTRUCTION}

Current Tasks:
${JSON.stringify(currentTasks, null, 2)}

Chat History:
${historyContext}

User Message: ${userMessage}
`;

        const response = await genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        
        const responseText = response.text || '';
        console.log('Gemini Raw Response:', responseText);

        try {
          // Clean up markdown if present
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          
          return {
            text: parsed.text || 'I processed your request.',
            action: parsed.action,
            suggestions: parsed.suggestions
          };
        } catch (e) {
          console.error('Failed to parse Gemini JSON:', e);
          // Fallback if JSON parsing fails
          return { text: responseText };
        }
      } catch (error: any) {
        console.error('Gemini API Error:', error);
        
        // Check for rate limit error (usually 429)
        if (error.message?.includes('429') || error.status === 429 || error.toString().includes('Resource has been exhausted')) {
          console.log('Rate limit reached. Rotating key...');
          rotateKey();
          attempts++;
          
          // If we've tried all keys and rotated back to the start, allow one last try or fail
          if (attempts >= maxAttempts) {
            return { text: 'Sorry, I am currently experiencing high traffic. Please try again later.' };
          }
          continue; // Retry with new key
        }
        
        return { text: 'Sorry, I encountered an error processing your request.' };
      }
    }
    return { text: 'Sorry, I encountered an error processing your request.' };
  },

  refineTaskContent: async (title: string, description: string): Promise<{ title: string; description: string }> => {
    let attempts = 0;
    const maxAttempts = API_KEYS.length + 1;

    while (attempts < maxAttempts) {
      try {
        const genAI = getGenAIClient();
        const prompt = `
You are a helpful writing assistant.
Your task is to improve the user's task title and description.
1. Correct any grammar or spelling mistakes.
2. Make the description more descriptive and actionable if it is too brief.
3. Keep the tone professional and concise.

Input Title: "${title}"
Input Description: "${description}"

Response Format:
You MUST respond with a valid JSON object.
{
  "title": "Improved Title",
  "description": "Improved Description"
}
`;

        const response = await genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const responseText = response.text || '';
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        return {
          title: parsed.title || title,
          description: parsed.description || description,
        };
      } catch (error: any) {
        console.error('Gemini Refine Error:', error);
        
        if (error.message?.includes('429') || error.status === 429 || error.toString().includes('Resource has been exhausted')) {
          console.log('Rate limit reached (Refine). Rotating key...');
          rotateKey();
          attempts++;
          if (attempts >= maxAttempts) {
             return { title, description }; // Return original if all fail
          }
          continue;
        }
        
        return { title, description }; // Return original on other errors
      }
    }
    return { title, description };
  },

  sendMessageStream: async (
    userMessage: string,
    currentTasks: ITask[],
    chatHistory: AIChatMessage[] = [],
    onChunk: (chunk: string) => void
  ): Promise<{ text: string; action?: AIChatAction; suggestions?: string[] }> => {
    let attempts = 0;
    const maxAttempts = API_KEYS.length + 1;

    while (attempts < maxAttempts) {
      try {
        const genAI = getGenAIClient();
        const historyContext = chatHistory
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
          .join('\n');

        const prompt = `
${SYSTEM_INSTRUCTION}

Current Tasks:
${JSON.stringify(currentTasks, null, 2)}

Chat History:
${historyContext}

User Message: ${userMessage}
`;

        // Get the full response first, then simulate streaming
        const response = await genAI.models.generateContent({
          model: getCurrentModel(),
          contents: prompt,
        });

        const responseText = response.text || '';
        
        // Parse the JSON first to extract the text field
        let parsedText = '';
        let parsedAction;
        let parsedSuggestions;
        
        try {
          // Clean up markdown if present
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          
          parsedText = parsed.text || 'I processed your request.';
          parsedAction = parsed.action;
          parsedSuggestions = parsed.suggestions;
        } catch (e) {
          console.error('Failed to parse Gemini JSON:', e);
          // If parsing fails, stream the raw response
          parsedText = responseText;
        }
        
        // Stream word by word for smoother effect (like Gemini web)
        const words = parsedText.split(' ');
        for (let i = 0; i < words.length; i++) {
          const word = i === words.length - 1 ? words[i] : words[i] + ' ';
          onChunk(word);
          // Faster delay for smoother streaming (5ms per word)
          await new Promise(resolve => setTimeout(resolve, 5));
        }

        console.log('Simulated Stream Complete:', parsedText);

        return {
          text: parsedText,
          action: parsedAction,
          suggestions: parsedSuggestions
        };
      } catch (error: any) {
        console.error('Gemini Stream API Error:', error);
        
        // Check for rate limit error (usually 429)
        if (error.message?.includes('429') || error.status === 429 || error.toString().includes('Resource has been exhausted')) {
          console.log('Rate limit reached. Rotating key...');
          rotateKey();
          attempts++;
          
          if (attempts >= maxAttempts) {
            return { text: 'Sorry, I am currently experiencing high traffic. Please try again later.' };
          }
          continue; // Retry with new key
        }
        
        return { text: 'Sorry, I encountered an error processing your request.' };
      }
    }
    return { text: 'Sorry, I encountered an error processing your request.' };
  },
};
