import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIChatMessage, ITask } from '../types/task';
import { GeminiService } from '../services/GeminiService';

const CHAT_STORAGE_KEY = '@chat_history';

export const useChat = (tasks: ITask[], addTask: any, deleteTask: any, toggleComplete: any) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
      if (jsonValue != null) {
        setMessages(JSON.parse(jsonValue));
      } else {
        // Initial greeting if no history
        setMessages([
          {
            id: '1',
            role: 'model',
            text: 'Hello! I am your Task Assistant. How can I help you today?',
            createdAt: Date.now(),
          },
        ]);
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  };

  const saveChatHistory = async (newMessages: AIChatMessage[]) => {
    try {
      await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(newMessages));
    } catch (e) {
      console.error('Failed to save chat history', e);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      createdAt: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);
    setIsLoading(true);

    // Create a placeholder message for streaming
    const streamingMsgId = (Date.now() + 1).toString();
    const streamingMsg: AIChatMessage = {
      id: streamingMsgId,
      role: 'model',
      text: '',
      createdAt: Date.now(),
    };

    const messagesWithPlaceholder = [...updatedMessages, streamingMsg];
    setMessages(messagesWithPlaceholder);

    try {
      let accumulatedText = '';
      
      // Use streaming API with chunk callback
      const response = await GeminiService.sendMessageStream(
        text,
        tasks,
        messages,
        (chunk: string) => {
          // Update the streaming message with accumulated text
          accumulatedText += chunk;
          setMessages((prev) => {
            const updated = [...prev];
            const streamingIndex = updated.findIndex(m => m.id === streamingMsgId);
            if (streamingIndex !== -1) {
              updated[streamingIndex] = {
                ...updated[streamingIndex],
                text: accumulatedText,
              };
            }
            return updated;
          });
        }
      );

      // Update with final parsed response
      const aiMsg: AIChatMessage = {
        id: streamingMsgId,
        role: 'model',
        text: response.text,
        createdAt: Date.now(),
        suggestions: response.suggestions,
      };

      // Replace the placeholder with the final message and save history
      setMessages((prev) => {
        const finalMessages = prev.map((msg) =>
          msg.id === streamingMsgId ? aiMsg : msg
        );
        saveChatHistory(finalMessages);
        return finalMessages;
      });

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
      const errorMessages = [...updatedMessages, errorMsg];
      setMessages(errorMessages);
      saveChatHistory(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    const initialMsg: AIChatMessage = {
      id: Date.now().toString(),
      role: 'model',
      text: 'Chat cleared. How can I help you?',
      createdAt: Date.now(),
    };
    setMessages([initialMsg]);
    await saveChatHistory([initialMsg]);
  };

  const toggleChat = () => setIsOpen(!isOpen);

  return {
    messages,
    isLoading,
    isOpen,
    sendMessage,
    clearChat,
    toggleChat,
  };
};
