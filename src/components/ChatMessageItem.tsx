import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  AIChatMessage,
  ITask,
  IPendingTask,
  TaskPriority,
  ISubtask,
} from '../types/task';
import * as NavigationService from '../services/NavigationService';
import { GeminiService } from '../services/GeminiService';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface ChatMessageItemProps {
  item: AIChatMessage;
  onSuggestionPress?: (suggestion: string) => void;
  onCloseChat?: () => void;
  onCreateTask?: (task: Partial<ITask>) => void;
}

const ITEMS_PER_PAGE = 3;
const PRIORITY_OPTIONS: TaskPriority[] = ['high', 'medium', 'low'];

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  item,
  onSuggestionPress,
  onCloseChat,
  onCreateTask,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);

  // Local editable state for pending task
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority | undefined>(
    undefined,
  );
  const [editDueDate, setEditDueDate] = useState('');
  const [dateObject, setDateObject] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editSubtasks, setEditSubtasks] = useState<ISubtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Sync local state with pending task from AI
  useEffect(() => {
    if (item.pendingTask) {
      setEditTitle(item.pendingTask.title || '');
      setEditDescription(item.pendingTask.description || '');
      setEditPriority(item.pendingTask.priority);
      setEditDueDate(item.pendingTask.dueDate || '');
    }
  }, [
    item.pendingTask?.title,
    item.pendingTask?.description,
    item.pendingTask?.priority,
    item.pendingTask?.dueDate,
  ]);

  const renderPendingTaskCard = (pending: IPendingTask) => {
    const isAlreadyCreated = pending.isCreated || isCreating;
    const hasTitle = editTitle.trim().length > 0;

    const handleCreate = async () => {
      if (isAlreadyCreated || !onCreateTask || !hasTitle) return;
      setIsCreating(true);
      await onCreateTask({
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        dueDate: editDueDate || undefined,
        priority: editPriority,
        subtasks: editSubtasks.length > 0 ? editSubtasks : undefined,
      });
    };

    const addSubtask = () => {
      if (!newSubtaskTitle.trim()) return;
      const newSubtask: ISubtask = {
        id: Date.now().toString(),
        title: newSubtaskTitle.trim(),
        isCompleted: false,
      };
      setEditSubtasks([...editSubtasks, newSubtask]);
      setNewSubtaskTitle('');
    };

    const removeSubtask = (id: string) => {
      setEditSubtasks(editSubtasks.filter(s => s.id !== id));
    };

    const handleEnhance = async () => {
      if (isEnhancing || isAlreadyCreated) return;
      if (!editTitle.trim()) return;

      setIsEnhancing(true);
      try {
        const enhanced = await GeminiService.enhanceTask(
          editTitle.trim(),
          editDescription.trim() || undefined,
        );
        if (enhanced.title) {
          setEditTitle(enhanced.title);
        }
        if (enhanced.description) {
          setEditDescription(enhanced.description);
        }
      } catch (error) {
        console.error('Failed to enhance task:', error);
      } finally {
        setIsEnhancing(false);
      }
    };

    const handleGenerateSubtasks = async () => {
      if (isGeneratingSubtasks || isAlreadyCreated) return;
      if (!editTitle.trim()) return;

      setIsGeneratingSubtasks(true);
      try {
        const subtaskTitles = await GeminiService.generateSubtasks(
          editTitle.trim(),
        );
        const newSubtasks: ISubtask[] = subtaskTitles.map((title, index) => ({
          id: `ai-subtask-${Date.now()}-${index}`,
          title,
          isCompleted: false,
        }));
        setEditSubtasks([...editSubtasks, ...newSubtasks]);
      } catch (error) {
        console.error('Failed to generate subtasks:', error);
      } finally {
        setIsGeneratingSubtasks(false);
      }
    };

    const getPriorityColor = (p: TaskPriority) => {
      switch (p) {
        case 'high':
          return '#FF3B30';
        case 'medium':
          return '#FF9500';
        case 'low':
          return '#34C759';
      }
    };

    return (
      <View style={[styles.pendingCard, { overflow: 'visible' }]}>
        <View style={styles.pendingCardHeader}>
          <Text style={styles.pendingCardTitle}>📝 New Task</Text>
          <View
            style={[
              styles.pendingStatusBadge,
              {
                backgroundColor: isAlreadyCreated
                  ? '#E5F9E7'
                  : hasTitle
                  ? '#E5F9E7'
                  : '#FFF4E5',
              },
            ]}
          >
            <Text
              style={[
                styles.pendingStatusText,
                {
                  color: isAlreadyCreated
                    ? '#269236'
                    : hasTitle
                    ? '#269236'
                    : '#FF9500',
                },
              ]}
            >
              {isAlreadyCreated
                ? 'Created'
                : hasTitle
                ? 'Ready'
                : 'In Progress'}
            </Text>
          </View>
        </View>

        {/* Editable Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Title *</Text>
          <TextInput
            style={[
              styles.cardInput,
              isAlreadyCreated && styles.cardInputDisabled,
            ]}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Enter task title..."
            placeholderTextColor="#999"
            editable={!isAlreadyCreated}
          />
        </View>

        {/* Editable Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[
              styles.cardInput,
              styles.cardInputMultiline,
              isAlreadyCreated && styles.cardInputDisabled,
            ]}
            value={editDescription}
            onChangeText={setEditDescription}
            placeholder="Add description..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={2}
            editable={!isAlreadyCreated}
          />
        </View>

        {/* Priority Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITY_OPTIONS.map(p => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityButton,
                  editPriority === p && {
                    backgroundColor: getPriorityColor(p),
                  },
                  isAlreadyCreated && styles.priorityButtonDisabled,
                ]}
                onPress={() => !isAlreadyCreated && setEditPriority(p)}
                disabled={isAlreadyCreated}
              >
                <Text
                  style={[
                    styles.priorityButtonText,
                    editPriority === p && { color: '#fff' },
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Due Date Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Due Date</Text>
          <TouchableOpacity
            style={[
              styles.cardInput,
              isAlreadyCreated && styles.cardInputDisabled,
            ]}
            onPress={() => !isAlreadyCreated && setShowDatePicker(true)}
            disabled={isAlreadyCreated}
          >
            <Text
              style={
                editDueDate ? styles.dueDateText : styles.dueDatePlaceholder
              }
            >
              {editDueDate
                ? `📅 ${new Date(editDueDate).toLocaleString()}`
                : 'Tap to set date...'}
            </Text>
          </TouchableOpacity>

          {/* iOS Date Picker Modal */}
          <Modal
            visible={showDatePicker && Platform.OS === 'ios'}
            transparent
            animationType="slide"
          >
            <View style={styles.datePickerModalOverlay}>
              <View style={styles.datePickerModalContent}>
                <Text style={styles.datePickerModalTitle}>
                  Select Date & Time
                </Text>
                <DateTimePicker
                  value={dateObject}
                  mode="datetime"
                  display="inline"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setDateObject(selectedDate);
                    }
                  }}
                  style={styles.iosDatePicker}
                />
                <View style={styles.datePickerButtonRow}>
                  <TouchableOpacity
                    style={styles.datePickerCancelButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.datePickerDoneButton}
                    onPress={() => {
                      setShowDatePicker(false);
                      setEditDueDate(dateObject.toISOString());
                    }}
                  >
                    <Text style={styles.datePickerDoneText}>✓ Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={dateObject}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (event.type === 'set' && selectedDate) {
                  setDateObject(selectedDate);
                  setShowTimePicker(true);
                }
              }}
            />
          )}

          {showTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={dateObject}
              mode="time"
              display="default"
              onChange={(event, selectedDate) => {
                setShowTimePicker(false);
                if (event.type === 'set' && selectedDate) {
                  setDateObject(selectedDate);
                  setEditDueDate(selectedDate.toISOString());
                }
              }}
            />
          )}
        </View>

        {/* Subtasks Section */}
        <View style={[styles.inputGroup, { overflow: 'visible' }]}>
          <Text style={styles.inputLabel}>
            Subtasks ({editSubtasks.length})
          </Text>

          {/* Draggable list of subtasks */}
          {!isAlreadyCreated && editSubtasks.length > 0 ? (
            <GestureHandlerRootView
              style={{ overflow: 'visible', flexGrow: 0 }}
            >
              <DraggableFlatList
                data={editSubtasks}
                keyExtractor={item => item.id}
                onDragEnd={({ data }) => setEditSubtasks(data)}
                scrollEnabled={false}
                style={{ overflow: 'visible', flexGrow: 0 }}
                contentContainerStyle={{ flexGrow: 0 }}
                renderItem={({
                  item: subtask,
                  drag,
                  isActive,
                }: RenderItemParams<ISubtask>) => (
                  <ScaleDecorator>
                    <View
                      style={[
                        styles.subtaskItem,
                        isActive && styles.subtaskItemDragging,
                      ]}
                    >
                      <TextInput
                        style={[styles.subtaskText, styles.subtaskTextInput]}
                        value={subtask.title}
                        onChangeText={text => {
                          setEditSubtasks(prev =>
                            prev.map(s =>
                              s.id === subtask.id ? { ...s, title: text } : s,
                            ),
                          );
                        }}
                        placeholder="Subtask..."
                        placeholderTextColor="#999"
                        multiline
                        textAlignVertical="top"
                      />
                      <View style={styles.subtaskActions}>
                        <TouchableOpacity
                          onLongPress={drag}
                          onPressIn={drag}
                          disabled={isActive}
                          delayLongPress={100}
                        >
                          <Text style={styles.dragHandle}>≡</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeSubtask(subtask.id)}
                        >
                          <Text style={styles.subtaskRemove}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScaleDecorator>
                )}
              />
            </GestureHandlerRootView>
          ) : (
            // Read-only view for already created tasks
            editSubtasks.map(subtask => (
              <View key={subtask.id} style={styles.subtaskItem}>
                <Text style={styles.subtaskText}>{subtask.title}</Text>
              </View>
            ))
          )}

          {/* Add subtask input */}
          {!isAlreadyCreated && (
            <View style={styles.addSubtaskRow}>
              <TextInput
                style={[styles.cardInput, styles.subtaskInput]}
                value={newSubtaskTitle}
                onChangeText={setNewSubtaskTitle}
                placeholder="Add subtask..."
                placeholderTextColor="#999"
                onSubmitEditing={addSubtask}
              />
              <TouchableOpacity
                style={styles.addSubtaskButton}
                onPress={addSubtask}
              >
                <Text style={styles.addSubtaskButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.pendingButtonRow}>
          <TouchableOpacity
            style={[
              styles.enhanceButton,
              (isEnhancing || isAlreadyCreated || !hasTitle) &&
                styles.enhanceButtonDisabled,
            ]}
            onPress={handleEnhance}
            disabled={isEnhancing || isAlreadyCreated || !hasTitle}
          >
            <Text style={styles.enhanceButtonText}>
              {isEnhancing ? '⏳ Enhancing...' : '✨ Enhance'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.suggestSubtasksButton,
              (isGeneratingSubtasks || isAlreadyCreated || !hasTitle) &&
                styles.enhanceButtonDisabled,
            ]}
            onPress={handleGenerateSubtasks}
            disabled={isGeneratingSubtasks || isAlreadyCreated || !hasTitle}
          >
            <Text style={styles.suggestSubtasksButtonText}>
              {isGeneratingSubtasks ? '⏳ Generating...' : '🤖 AI Subtasks'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.createButton,
              (!hasTitle || isAlreadyCreated) && styles.createButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={!hasTitle || isAlreadyCreated}
          >
            <Text style={styles.createButtonText}>
              {isAlreadyCreated ? '✓ Created!' : '✓ Create Task'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
            NavigationService.navigate('TaskDetail', { taskId: task.id });
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
              NavigationService.navigate('TaskDetail', { taskId: task.id });
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

        {/* Pending Task Card */}
        {item.pendingTask && renderPendingTaskCard(item.pendingTask)}

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

  // Pending Task Card Styles
  pendingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pendingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pendingCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  pendingStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pendingFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pendingFieldLabel: {
    fontSize: 13,
    color: '#666',
  },
  pendingFieldValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    maxWidth: '60%',
    textAlign: 'right',
  },
  pendingFieldEmpty: {
    fontSize: 13,
    color: '#ccc',
  },
  createButton: {
    backgroundColor: '#34C759',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#a8e6b5',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pendingButtonRow: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
  },
  enhanceButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  enhanceButtonDisabled: {
    backgroundColor: '#a0c4e8',
  },
  enhanceButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  suggestSubtasksButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  suggestSubtasksButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Interactive Card Input Styles
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  cardInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardInputMultiline: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  cardInputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  priorityButtonDisabled: {
    opacity: 0.6,
  },
  priorityButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  dueDateText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  dueDatePlaceholder: {
    fontSize: 14,
    color: '#999',
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  datePickerModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  iosDatePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  iosDatePicker: {
    height: 340,
  },
  datePickerButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  datePickerCancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerCancelText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerDoneButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerDoneText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Subtask Styles (matching TaskDetailScreen)
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.4)',
    padding: 10,
    borderRadius: 8,
    minHeight: 44,
  },
  subtaskText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  subtaskRemove: {
    fontSize: 18,
    color: '#FF3B30',
    padding: 5,
  },
  subtaskTextInput: {
    padding: 4,
    margin: 0,
  },
  subtaskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtaskItemDragging: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandle: {
    fontSize: 18,
    color: '#666',
    paddingHorizontal: 6,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  subtaskInput: {
    flex: 1,
  },
  addSubtaskButton: {
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSubtaskButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
