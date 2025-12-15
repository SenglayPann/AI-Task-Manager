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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTasks } from '../context/TaskContext';
import { GeminiService } from '../services/GeminiService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GlassLayout, glassStyles } from '../components/GlassLayout';

export const TaskDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { addTask, tasks, updateTask } = useTasks();

  const taskId = route.params?.taskId;
  const isEditing = !!taskId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);

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
      });
    } else {
      await addTask(title, description, dueDate);
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
            const { deleteTask: deleteTaskFn } = useTasks();
            await deleteTaskFn(taskId);
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

        <View style={styles.form}>
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
              numberOfLines={4}
            />
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

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          {showTimePicker && (
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
        </View>
      </SafeAreaView>
    </GlassLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
  form: {
    padding: 20,
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
});
