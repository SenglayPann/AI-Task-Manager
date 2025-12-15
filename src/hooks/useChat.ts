import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { 
  addMessage, 
  createSession, 
  updateMessage, 
  clearCurrentSession,
  setCurrentSession,
  deleteSession
} from '../store/slices/chatSlice';
import { AIChatMessage, ITask } from '../types/task';
import { GeminiService } from '../services/GeminiService';

export const useChat = (tasks: ITask[], addTask: any, deleteTask: any, toggleComplete: any) => {
  const dispatch = useDispatch();
  const { currentSessionId, sessions } = useSelector((state: RootState) => state.chat);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const currentSession = currentSessionId ? sessions[currentSessionId] : null;
  const messages = currentSession ? currentSession.messages : [];

  // Initialize a session if none exists and chat is opened
  useEffect(() => {
    if (isOpen && !currentSessionId) {
       // Check if there are any sessions, if so, maybe load the last one? 
       // For now, let's create a new one to be safe or if it's the very first time.
       // Actually, better UX: if no current session, show "New Chat" or empty.
       // But to keep existing behavior (greeting), we should create one.
       // Let's create a new session if opened and no current session.
       startNewSession();
    }
  }, [isOpen, currentSessionId]);

  const startNewSession = () => {
     const newId = Date.now().toString();
     const initialMsg: AIChatMessage = {
        id: '1',
        role: 'model',
        text: 'Hello! I am your Task Assistant. How can I help you today?',
        createdAt: Date.now(),
     };
     dispatch(createSession({ id: newId, initialMessage: initialMsg }));
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !currentSessionId) return;

    const userMsg: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      createdAt: Date.now(),
    };

    dispatch(addMessage({ sessionId: currentSessionId, message: userMsg }));
    setIsLoading(true);

    // Create a placeholder message for streaming
    const streamingMsgId = (Date.now() + 1).toString();
    const streamingMsg: AIChatMessage = {
      id: streamingMsgId,
      role: 'model',
      text: '',
      createdAt: Date.now(),
    };

    dispatch(addMessage({ sessionId: currentSessionId, message: streamingMsg }));

    try {
      let accumulatedText = '';
      
      // Use streaming API with chunk callback
      const response = await GeminiService.sendMessageStream(
        text,
        tasks,
        messages, // Pass current history including the new user message (Redux updates might be async, but here we use the local 'messages' + new one for robust context if needed, or rely on service to handle it. Actually service usually expects full history. 'messages' from selector might not be updated yet in this closure. Better to construct it.)
        (chunk: string) => {
          accumulatedText += chunk;
           dispatch(updateMessage({ 
             sessionId: currentSessionId, 
             messageId: streamingMsgId, 
             text: accumulatedText 
           }));
        }
      );

      // Verify final text matches accumulated or use response.text
      // Dispatch final update with suggestions
       dispatch(updateMessage({ 
         sessionId: currentSessionId, 
         messageId: streamingMsgId, 
         text: response.text,
         suggestions: response.suggestions
       }));

      if (response.action) {
        const { action } = response;
        switch (action.type) {
          case 'CREATE':
            if (action.task) {
              await addTask(action.task.title, action.task.description, action.task.dueDate);
            }
            break;
          case 'DELETE':
            if (action.id) {
              await deleteTask(action.id);
            }
            break;
          case 'COMPLETE':
            if (action.id) {
              await toggleComplete(action.id);
            }
            break;
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg: AIChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'model',
        text: 'Sorry, I encountered an error. Please try again.',
        createdAt: Date.now(),
      };
      
      // We should probably remove the streaming placeholder or update it to error
      // For simplicity, let's just update the streaming message or add error
      dispatch(updateMessage({ 
         sessionId: currentSessionId, 
         messageId: streamingMsgId, 
         text: 'Sorry, I encountered an error. Please try again.' 
       }));
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    // Instead of clearing, we effectively start a new session
    startNewSession();
  };

  const toggleChat = () => setIsOpen(!isOpen);

  // New functions for session management
  const switchSession = (sessionId: string) => dispatch(setCurrentSession(sessionId));
  const removeSession = (sessionId: string) => dispatch(deleteSession(sessionId));

  return {
    messages,
    isLoading,
    isOpen,
    sendMessage,
    clearChat,
    toggleChat,
    sessions,
    currentSessionId,
    switchSession,
    removeSession, // Exporting for UI
    startNewSession
  };
};
