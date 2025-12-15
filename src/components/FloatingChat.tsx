import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useChat } from '../hooks/useChat';
import { AIChatMessage, ITask } from '../types/task';
import { useTasks } from '../context/TaskContext';
import { glassStyles } from './GlassLayout';
import * as NavigationService from '../services/NavigationService';
import { ChatMessageItem } from './ChatMessageItem';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CHAT_WIDTH = SCREEN_WIDTH * 0.9;
const CHAT_HEIGHT = SCREEN_HEIGHT * 0.7;

interface FloatingChatProps {}

export const FloatingChat: React.FC<FloatingChatProps> = () => {
  const { tasks, addTask, deleteTask, toggleComplete } = useTasks();
  const {
    messages,
    isLoading,
    isOpen,
    sendMessage,
    toggleChat,
    sessions,
    currentSessionId,
    switchSession,
    removeSession,
    startNewSession,
  } = useChat(tasks, addTask, deleteTask, toggleComplete);

  const [inputText, setInputText] = React.useState('');
  const [showHistory, setShowHistory] = React.useState(false);
  const flatListRef = useRef<FlatList>(null);
  // Single animated value: 0 = closed, 1 = open
  const animationProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animationProgress, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [isOpen]);

  // Interpolations
  const fabScale = animationProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const chatOpacity = animationProgress;

  const chatScale = animationProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const chatTranslateY = animationProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    await sendMessage(text);
  };

  const renderItem = ({ item }: { item: AIChatMessage }) => (
    <ChatMessageItem
      item={item}
      onSuggestionPress={sendMessage}
      onCloseChat={toggleChat}
    />
  );

  const renderHistoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.historyItem,
        currentSessionId === item.id && styles.activeHistoryItem,
      ]}
      onPress={() => {
        switchSession(item.id);
        setShowHistory(false);
      }}
    >
      <View style={styles.historyItemContent}>
        <Text style={styles.historyTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.historyDate}>
          {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteHistoryButton}
        onPress={e => {
          e.stopPropagation();
          removeSession(item.id);
        }}
      >
        <Text style={styles.deleteHistoryText}>×</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const sortedSessions = Object.values(sessions || {}).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );

  return (
    <>
      {/* FAB */}
      <Animated.View
        style={[
          styles.fabContainer,
          { transform: [{ scale: fabScale }], opacity: fabScale },
        ]}
        pointerEvents={isOpen ? 'none' : 'auto'}
      >
        <TouchableOpacity style={styles.fab} onPress={toggleChat}>
          <Text style={styles.fabText}>💬</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Chat Overlay */}
      <Animated.View
        style={[styles.overlay, { opacity: chatOpacity }]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <Animated.View
          style={[
            glassStyles.card,
            styles.chatContainer,
            {
              transform: [{ scale: chatScale }, { translateY: chatTranslateY }],
            },
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setShowHistory(!showHistory)}
              style={styles.headerTitleContainer}
            >
              <Text style={styles.headerTitle}>
                {showHistory
                  ? 'Chat History'
                  : sessions[currentSessionId!]?.title || 'AI Assistant'}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>

            <View style={styles.headerButtons}>
              {showHistory && (
                <TouchableOpacity
                  onPress={startNewSession}
                  style={styles.headerButton}
                >
                  <Text style={styles.headerButtonText}>New Chat</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={toggleChat}
                style={styles.headerButton}
              >
                <Text style={styles.headerButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showHistory ? (
            <FlatList
              data={sortedSessions}
              renderItem={renderHistoryItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
            />
          ) : (
            <>
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                onContentSizeChange={() =>
                  flatListRef.current?.scrollToEnd({ animated: true })
                }
              />

              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.loadingText}>Thinking...</Text>
                </View>
              )}

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
              >
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[glassStyles.input, styles.input]}
                    placeholder="Ask about tasks..."
                    placeholderTextColor="#999"
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleSend}
                  />
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleSend}
                  >
                    <Text style={styles.sendButtonText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </>
          )}
        </Animated.View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    zIndex: 1000,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 122, 255, 0.8)', // Semi-transparent blue
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  fabText: {
    fontSize: 30,
    color: '#fff',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  chatContainer: {
    width: CHAT_WIDTH,
    height: CHAT_HEIGHT,
    padding: 0, // Reset padding from glassStyles.card if needed
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // Slightly more opaque for chat
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 15,
    padding: 5,
  },
  headerButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  list: {
    padding: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    borderBottomRightRadius: 4,
  },
  modelBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  messageText: {
    fontSize: 16,
  },
  userText: {
    color: '#fff',
  },
  modelText: {
    color: '#333',
  },
  loadingContainer: {
    padding: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  input: {
    flex: 1,
    marginRight: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    // Base styles from glassStyles.input
  },
  sendButton: {
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  sendButtonText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    marginLeft: 5,
  },
  suggestionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  suggestionText: {
    color: '#007AFF',
    fontSize: 14,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownIcon: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  activeHistoryItem: {
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderColor: '#007AFF',
  },
  historyItemContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
  },
  deleteHistoryButton: {
    padding: 8,
  },
  deleteHistoryText: {
    fontSize: 20,
    color: '#ff3b30',
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginTop: 10,
    marginLeft: 5,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#eee',
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskCardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  taskCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  taskCardDate: {
    fontSize: 12,
    color: '#888',
  },
  viewDetailsButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
