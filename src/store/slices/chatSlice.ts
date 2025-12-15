import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AIChatMessage } from '../../types/task';

export interface ChatSession {
  id: string;
  title: string;
  messages: AIChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatState {
  sessions: Record<string, ChatSession>;
  currentSessionId: string | null;
}

const initialState: ChatState = {
  sessions: {},
  currentSessionId: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    createSession: (state, action: PayloadAction<{ id: string; initialMessage?: AIChatMessage }>) => {
      const { id, initialMessage } = action.payload;
      const timestamp = Date.now();
      state.sessions[id] = {
        id,
        title: 'New Chat',
        messages: initialMessage ? [initialMessage] : [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      state.currentSessionId = id;
    },
    setCurrentSession: (state, action: PayloadAction<string>) => {
      if (state.sessions[action.payload]) {
        state.currentSessionId = action.payload;
      }
    },
    updateSessionTitle: (state, action: PayloadAction<{ id: string; title: string }>) => {
      if (state.sessions[action.payload.id]) {
        state.sessions[action.payload.id].title = action.payload.title;
        state.sessions[action.payload.id].updatedAt = Date.now();
      }
    },
    addMessage: (state, action: PayloadAction<{ sessionId: string; message: AIChatMessage }>) => {
      const { sessionId, message } = action.payload;
      if (state.sessions[sessionId]) {
        state.sessions[sessionId].messages.push(message);
        state.sessions[sessionId].updatedAt = Date.now();

        // Update title based on first user question if it's "New Chat"
        if (
          state.sessions[sessionId].title === 'New Chat' &&
          message.role === 'user'
        ) {
          state.sessions[sessionId].title = message.text.slice(0, 30) + (message.text.length > 30 ? '...' : '');
        }
      }
    },
    updateMessage: (state, action: PayloadAction<{ sessionId: string; messageId: string; text: string; suggestions?: string[] }>) => {
       const { sessionId, messageId, text, suggestions } = action.payload;
       if (state.sessions[sessionId]) {
         const msgIndex = state.sessions[sessionId].messages.findIndex(m => m.id === messageId);
         if (msgIndex !== -1) {
           state.sessions[sessionId].messages[msgIndex] = {
             ...state.sessions[sessionId].messages[msgIndex],
             text,
             suggestions: suggestions ?? state.sessions[sessionId].messages[msgIndex].suggestions,
           };
           state.sessions[sessionId].updatedAt = Date.now();
         }
       }
    },
    deleteSession: (state, action: PayloadAction<string>) => {
      delete state.sessions[action.payload];
      if (state.currentSessionId === action.payload) {
        state.currentSessionId = null;
      }
    },
    clearCurrentSession: (state) => {
      state.currentSessionId = null;
    }
  },
});

export const {
  createSession,
  setCurrentSession,
  updateSessionTitle,
  addMessage,
  updateMessage,
  deleteSession,
  clearCurrentSession
} = chatSlice.actions;

export default chatSlice.reducer;
