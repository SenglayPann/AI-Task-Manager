import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AIChatMessage, ITask } from '../types/task';
import * as NavigationService from '../services/NavigationService';

interface ChatMessageItemProps {
  item: AIChatMessage;
  onSuggestionPress?: (suggestion: string) => void;
  onCloseChat?: () => void;
}

const ITEMS_PER_PAGE = 3;

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  item,
  onSuggestionPress,
  onCloseChat,
}) => {
  const [currentPage, setCurrentPage] = useState(0);

  const renderTaskCard = (task: ITask) => (
    <View style={styles.taskCard}>
      <View style={styles.taskCardHeader}>
        <Text style={styles.taskCardTitle}>{task.title}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: task.isCompleted ? '#E5F9E7' : '#FFF4E5' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: task.isCompleted ? '#269236' : '#FF9500' },
            ]}
          >
            {task.isCompleted ? 'Completed' : 'Pending'}
          </Text>
        </View>
      </View>

      {task.description && (
        <Text style={styles.taskCardDescription} numberOfLines={2}>
          {task.description}
        </Text>
      )}

      <View style={styles.taskCardFooter}>
        {task.dueDate && (
          <Text style={styles.taskCardDate}>
            📅 {new Date(task.dueDate).toLocaleDateString()}
          </Text>
        )}

        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => {
            NavigationService.navigate('TaskDetail', { task });
            if (onCloseChat) onCloseChat();
          }}
        >
          <Text style={styles.viewDetailsText}>View Details →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTaskTable = () => {
    if (!item.relatedTasks || item.relatedTasks.length === 0) return null;

    const totalPages = Math.ceil(item.relatedTasks.length / ITEMS_PER_PAGE);
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const currentTasks = item.relatedTasks.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE,
    );

    return (
      <View style={styles.tableContainer}>
        <Text style={styles.tableHeader}>
          Found {item.relatedTasks.length} Tasks
        </Text>

        {currentTasks.map(task => (
          <TouchableOpacity
            key={task.id}
            style={styles.tableRow}
            onPress={() => {
              NavigationService.navigate('TaskDetail', { task });
              if (onCloseChat) onCloseChat();
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.tableRowTitle} numberOfLines={1}>
                {task.title}
              </Text>
              <Text style={styles.tableRowDate}>
                {task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString()
                  : 'No date'}
              </Text>
            </View>
            <Text
              style={[
                styles.tableRowStatus,
                { color: task.isCompleted ? '#269236' : '#FF9500' },
              ]}
            >
              {task.isCompleted ? 'Done' : 'ToDo'}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={styles.paginationContainer}>
          <TouchableOpacity
            disabled={currentPage === 0}
            onPress={() => setCurrentPage(p => p - 1)}
            style={[
              styles.pageButton,
              currentPage === 0 && styles.disabledPageButton,
            ]}
          >
            <Text style={styles.pageButtonText}>Prev</Text>
          </TouchableOpacity>

          <Text style={styles.pageInfoText}>
            {currentPage + 1} / {totalPages}
          </Text>

          <TouchableOpacity
            disabled={currentPage === totalPages - 1}
            onPress={() => setCurrentPage(p => p + 1)}
            style={[
              styles.pageButton,
              currentPage === totalPages - 1 && styles.disabledPageButton,
            ]}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => {
            NavigationService.navigate('TaskList');
            if (onCloseChat) onCloseChat();
          }}
        >
          <Text style={styles.viewAllButtonText}>View All Tasks</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ marginBottom: 10 }}>
      <View
        style={[
          styles.messageBubble,
          item.role === 'user' ? styles.userBubble : styles.modelBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.role === 'user' ? styles.userText : styles.modelText,
          ]}
        >
          {item.text}
        </Text>

        {/* Single Task Card */}
        {item.relatedTask && renderTaskCard(item.relatedTask)}

        {/* Task Table */}
        {item.relatedTasks && item.relatedTasks.length > 0 && renderTaskTable()}
      </View>

      {item.suggestions && item.suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {item.suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionButton}
              onPress={() => onSuggestionPress && onSuggestionPress(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 5,
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  messageText: {
    fontSize: 16,
    marginBottom: 5,
  },
  userText: {
    color: '#fff',
  },
  modelText: {
    color: '#333',
  },
  // Task Card Styles
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  taskCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskCardDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  taskCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  taskCardDate: {
    fontSize: 12,
    color: '#888',
  },
  viewDetailsButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  // Table Styles
  tableContainer: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
    overflow: 'hidden',
  },
  tableHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    padding: 8,
    backgroundColor: '#f8f9fa',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableRowTitle: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  tableRowDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  tableRowStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
  },
  pageButton: {
    padding: 6,
  },
  disabledPageButton: {
    opacity: 0.3,
  },
  pageButtonText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
  },
  pageInfoText: {
    fontSize: 12,
    color: '#666',
  },
  viewAllButton: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
  viewAllButtonText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Suggestions
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
});
