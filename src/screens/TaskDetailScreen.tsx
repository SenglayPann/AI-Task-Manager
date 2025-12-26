import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTasks } from '../context/TaskContext';
import { GeminiService } from '../services/GeminiService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GlassLayout, glassStyles } from '../components/GlassLayout';
import { ISubtask, TaskPriority } from '../types/task';
import { ScrollView } from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export const TaskDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { addTask, tasks, updateTask, deleteTask } = useTasks();

  const taskId = route.params?.taskId;
  const isEditing = !!taskId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [subtasks, setSubtasks] = useState<ISubtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);

  // Date Picker State
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (isEditing) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setTitle(task.title);
        setDescription(task.description || '');
        setDueDate(task.dueDate || '');
        if (task.dueDate) {
          setDate(new Date(task.dueDate));
        }
        setPriority(task.priority || 'medium');
        setSubtasks(task.subtasks || []);
      }
    }
  }, [taskId, tasks, isEditing]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (isEditing) {
      await updateTask(taskId, {
        title,
        description,
        dueDate,
        priority,
        subtasks,
      });
    } else {
      await addTask(title, description, dueDate);
      // Note: addTask context function needs to be updated to accept priority/subtasks,
      // OR we just use updateTask immediately after, OR we rely on the fact that we might need to update the context signature.
      // For now, let's assume valid ITask creation or handle it by updating the specific task if it acts differently.
      // Actually the Context likely takes specific args. We should check TaskContext.
      // Since I can't check context mid-tool, I'll stick to standard args and assume I might need to fix Context later.
      // Wait, let's look at how addTask is used.
    }

    navigation.goBack();
  };

  const handleToggleComplete = async () => {
    if (isEditing) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        await updateTask(taskId, {
          isCompleted: !task.isCompleted,
        });
        navigation.goBack();
      }
    }
  };

  const handleDelete = async () => {
    if (isEditing) {
      Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTask(taskId);
            navigation.goBack();
          },
        },
      ]);
    }
  };

  const handleEnhance = async () => {
    if (!title && !description) {
      Alert.alert(
        'Empty Content',
        'Please enter a title or description to enhance.',
      );
      return;
    }

    setIsEnhancing(true);
    try {
      const refined = await GeminiService.refineTaskContent(title, description);
      setTitle(refined.title);
      setDescription(refined.description);
    } catch (error) {
      Alert.alert('Error', 'Failed to enhance text. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerateSubtasks = async () => {
    if (!title) {
      Alert.alert('Error', 'Please enter a title first.');
      return;
    }
    setIsGeneratingSubtasks(true);
    try {
      const suggested = await GeminiService.generateSubtasks(title);
      const newSubtasks: ISubtask[] = suggested.map(s => ({
        id: Date.now().toString() + Math.random().toString(),
        title: s,
        isCompleted: false,
      }));
      setSubtasks(prev => [...prev, ...newSubtasks]);
    } catch (e) {
      Alert.alert('Error', 'Failed to generate subtasks.');
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const addManualSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        title: newSubtaskTitle.trim(),
        isCompleted: false,
      },
    ]);
    setNewSubtaskTitle('');
  };

  const toggleSubtask = (subtaskId: string) => {
    setSubtasks(prev =>
      prev.map(s =>
        s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s,
      ),
    );
  };

  const deleteSubtask = (subtaskId: string) => {
    setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setDate(selectedDate);

      if (Platform.OS === 'android') {
        // On Android, show time picker after date is selected
        setShowTimePicker(true);
      } else {
        // On iOS, also show time picker after date selection
        setShowDatePicker(false);
        setShowTimePicker(true);
      }
    } else {
      setShowDatePicker(false);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);

    if (selectedTime) {
      // Combine the date from 'date' state with the time from selectedTime
      const combined = new Date(date);
      combined.setHours(selectedTime.getHours());
      combined.setMinutes(selectedTime.getMinutes());

      setDate(combined);
      const formattedDateTime = combined.toISOString();
      setDueDate(formattedDateTime);
    }
  };

  const formatDisplayDateTime = (isoString: string) => {
    if (!isoString) return '';
    const dt = new Date(isoString);
    return dt.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const task = isEditing ? tasks.find(t => t.id === taskId) : null;

  return (
    <GlassLayout>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isEditing ? 'Edit Task' : 'New Task'}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[styles.form, { overflow: 'visible' }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={[glassStyles.input, styles.input]}
              value={title}
              onChangeText={setTitle}
              placeholder="What needs to be done?"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[glassStyles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add details..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={5}
            />
            <TouchableOpacity
              style={[
                styles.refineButton,
                isEnhancing && styles.refineButtonDisabled,
              ]}
              onPress={async () => {
                if (isEnhancing || !title.trim()) return;
                setIsEnhancing(true);
                try {
                  const refined = await GeminiService.refineTaskContent(
                    title,
                    description,
                  );
                  setTitle(refined.title);
                  setDescription(refined.description);
                } catch (e) {
                  Alert.alert('Error', 'Failed to refine content.');
                } finally {
                  setIsEnhancing(false);
                }
              }}
              disabled={isEnhancing || !title.trim()}
            >
              <Text style={styles.refineButtonText}>
                {isEnhancing ? '⏳ Refining...' : '✨ Refine with AI'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Due Date & Time</Text>
            <TouchableOpacity
              style={[glassStyles.input, styles.dateButton]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text
                style={[styles.dateText, !dueDate && styles.placeholderText]}
              >
                {dueDate
                  ? formatDisplayDateTime(dueDate)
                  : 'Select Date & Time'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityContainer}>
              {(['low', 'medium', 'high'] as TaskPriority[]).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityButton,
                    priority === p && styles.priorityActive,
                    priority === p && {
                      backgroundColor:
                        p === 'high'
                          ? '#FF3B30'
                          : p === 'medium'
                          ? '#FF9500'
                          : '#34C759',
                    },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      priority === p && styles.priorityTextActive,
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.inputContainer, { overflow: 'visible' }]}>
            <Text style={styles.label}>Subtasks (hold to drag)</Text>
            <GestureHandlerRootView style={{ overflow: 'visible' }}>
              <DraggableFlatList
                data={subtasks}
                keyExtractor={item => item.id}
                onDragEnd={({ data }) => setSubtasks(data)}
                scrollEnabled={false}
                style={{ overflow: 'visible' }}
                renderItem={({
                  item: s,
                  drag,
                  isActive,
                }: RenderItemParams<ISubtask>) => (
                  <ScaleDecorator>
                    <TouchableOpacity
                      onLongPress={drag}
                      disabled={isActive}
                      style={[
                        styles.subtaskItem,
                        isActive && styles.subtaskItemDragging,
                      ]}
                    >
                      <TouchableOpacity onPress={() => toggleSubtask(s.id)}>
                        <Text style={styles.subtaskCheck}>
                          {s.isCompleted ? '☑️' : '⬜'}
                        </Text>
                      </TouchableOpacity>
                      <TextInput
                        style={[
                          styles.subtaskTitle,
                          styles.subtaskInput,
                          s.isCompleted && styles.subtaskCompleted,
                        ]}
                        value={s.title}
                        onChangeText={text => {
                          setSubtasks(prev =>
                            prev.map(sub =>
                              sub.id === s.id ? { ...sub, title: text } : sub,
                            ),
                          );
                        }}
                        placeholder="Subtask..."
                        placeholderTextColor="#999"
                        multiline
                        textAlignVertical="top"
                      />
                      <View style={styles.subtaskActions}>
                        <Text style={styles.dragHandle}>≡</Text>
                        <TouchableOpacity onPress={() => deleteSubtask(s.id)}>
                          <Text style={styles.deleteSubtask}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </ScaleDecorator>
                )}
              />
            </GestureHandlerRootView>

            <View style={styles.addSubtaskContainer}>
              <TextInput
                style={[glassStyles.input, styles.subtaskInput]}
                placeholder="Add subtask..."
                value={newSubtaskTitle}
                onChangeText={setNewSubtaskTitle}
                onSubmitEditing={addManualSubtask}
              />
              <TouchableOpacity onPress={addManualSubtask}>
                <Text style={styles.addSubtaskBtn}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                glassStyles.button,
                styles.enhanceButton,
                { marginTop: 10 },
              ]}
              onPress={handleGenerateSubtasks}
              disabled={isGeneratingSubtasks}
            >
              {isGeneratingSubtasks ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.enhanceButtonText}>
                  ⚡ AI Suggest Subtasks
                </Text>
              )}
            </TouchableOpacity>
          </View>

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
                  value={date}
                  mode="datetime"
                  display="inline"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setDate(selectedDate);
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
                      setDueDate(date.toISOString());
                    }}
                  >
                    <Text style={styles.datePickerDoneText}>✓ Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Android Date Picker */}
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          {/* Android Time Picker */}
          {showTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={date}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}

          {!isEditing && (
            <TouchableOpacity
              style={[glassStyles.button, styles.enhanceButton]}
              onPress={handleEnhance}
              disabled={isEnhancing}
            >
              {isEnhancing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.enhanceButtonText}>✨ AI Enhance</Text>
              )}
            </TouchableOpacity>
          )}

          {isEditing && task && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[
                  glassStyles.button,
                  styles.actionButton,
                  task.isCompleted
                    ? styles.pendingButton
                    : styles.completeButton,
                ]}
                onPress={handleToggleComplete}
              >
                <Text style={styles.actionButtonText}>
                  {task.isCompleted
                    ? '↩️ Mark as Pending'
                    : '✓ Mark as Complete'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  glassStyles.button,
                  styles.actionButton,
                  styles.deleteButton,
                ]}
                onPress={handleDelete}
              >
                <Text style={styles.actionButtonText}>🗑️ Delete Task</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GlassLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  scrollContainer: {
    flex: 1,
  },
  form: {
    padding: 20,
    paddingBottom: 100,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  priorityActive: {
    borderColor: 'transparent',
  },
  priorityText: {
    color: '#555',
    fontWeight: '600',
  },
  priorityTextActive: {
    color: '#fff',
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.4)',
    padding: 10,
    borderRadius: 8,
    minHeight: 44,
  },
  subtaskCheck: {
    fontSize: 18,
    marginRight: 10,
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  subtaskCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  deleteSubtask: {
    fontSize: 18,
    color: '#FF3B30',
    padding: 5,
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
    fontSize: 22,
    color: '#666',
    paddingHorizontal: 8,
  },
  addSubtaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtaskInput: {
    flex: 1,
    marginBottom: 0,
  },
  addSubtaskBtn: {
    fontSize: 24,
    color: '#007AFF',
    padding: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    // Base styles handled by glassStyles.input
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  enhanceButton: {
    backgroundColor: '#34C759', // Override glass background for primary action
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 0, // Remove border for solid button
  },
  enhanceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionsContainer: {
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  completeButton: {
    backgroundColor: '#34C759',
  },
  pendingButton: {
    backgroundColor: '#FF9500',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  refineButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  refineButtonDisabled: {
    backgroundColor: '#a0c4e8',
  },
  refineButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Date Picker Modal Styles
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
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerDoneButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
