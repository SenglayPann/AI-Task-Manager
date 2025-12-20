import React from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTasks } from '../context/TaskContext';
import { ITask } from '../types/task';
import { useNavigation } from '@react-navigation/native';
import { GlassLayout, glassStyles } from '../components/GlassLayout';

export const TaskListScreen = () => {
  const { tasks, toggleComplete, deleteTask } = useTasks();
  const navigation = useNavigation<any>();

  const groupTasks = () => {
    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const tomorrow = today + 86400000;

    const overdue: ITask[] = [];
    const dueToday: ITask[] = [];
    const dueTomorrow: ITask[] = [];
    const upcoming: ITask[] = [];
    const noDate: ITask[] = [];

    tasks.forEach(task => {
      if (!task.dueDate) {
        noDate.push(task);
        return;
      }

      const due = new Date(task.dueDate).getTime();
      if (isNaN(due)) {
        noDate.push(task);
        return;
      }

      if (due < today && !task.isCompleted) {
        overdue.push(task);
      } else if (due >= today && due < tomorrow) {
        dueToday.push(task);
      } else if (due >= tomorrow && due < tomorrow + 86400000) {
        dueTomorrow.push(task);
      } else {
        upcoming.push(task);
      }
    });

    const sections = [
      {
        title: 'Overdue',
        data: overdue.sort(
          (a, b) =>
            new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
        ),
      },
      {
        title: 'Today',
        data: dueToday.sort(
          (a, b) =>
            new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
        ),
      },
      {
        title: 'Tomorrow',
        data: dueTomorrow.sort(
          (a, b) =>
            new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
        ),
      },
      {
        title: 'Upcoming',
        data: upcoming.sort(
          (a, b) =>
            new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
        ),
      },
      {
        title: 'No Date',
        data: noDate.sort((a, b) => a.title.localeCompare(b.title)),
      },
    ].filter(section => section.data.length > 0);

    return sections;
  };

  const renderItem = ({ item }: { item: ITask }) => {
    const priorityColor =
      item.priority === 'high'
        ? '#FF3B30'
        : item.priority === 'medium'
        ? '#FF9500'
        : item.priority === 'low'
        ? '#34C759'
        : 'transparent';

    const subtaskCount = item.subtasks?.length || 0;
    const completedSubtasks =
      item.subtasks?.filter(s => s.isCompleted).length || 0;

    return (
      <View style={[glassStyles.card, styles.taskItem]}>
        {item.priority && (
          <View
            style={[styles.priorityBar, { backgroundColor: priorityColor }]}
          />
        )}
        <TouchableOpacity
          style={[styles.checkbox, item.isCompleted && styles.checked]}
          onPress={() => toggleComplete(item.id)}
        />
        <TouchableOpacity
          style={styles.taskContent}
          onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
        >
          <Text
            style={[styles.taskText, item.isCompleted && styles.completedText]}
          >
            {item.title}
          </Text>
          <View style={styles.metaContainer}>
            {item.dueDate && (
              <Text style={styles.dueDateText}>
                📅{' '}
                {new Date(item.dueDate).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
            {subtaskCount > 0 && (
              <Text style={styles.subtaskText}>
                {completedSubtasks}/{subtaskCount} subtasks
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteTask(item.id)}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSectionHeader = ({ section: { title } }: any) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>You have no tasks yet.</Text>
      <Text style={styles.emptyStateText}>
        Tap the <Text style={styles.highlight}>+</Text> button to create a task
        manually.
      </Text>
      <Text style={styles.emptyStateText}>
        Or use the <Text style={styles.highlight}>💬</Text> button to ask AI.
      </Text>
    </View>
  );

  return (
    <GlassLayout>
      <SafeAreaView style={styles.container}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Dashboard</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Tasks</Text>
          <View style={styles.headerSpacer} />
        </View>

        <SectionList
          sections={groupTasks()}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No tasks yet!</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button below to create your first task,
              </Text>
              <Text style={styles.emptySubtitle}>
                or chat with the AI assistant 💬
              </Text>
            </View>
          }
        />

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('TaskDetail')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </GlassLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Important for glass effect
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Semi-transparent header
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButton: {
    paddingVertical: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSpacer: {
    width: 60, // Same width as back button to center title
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    marginRight: 15,
  },
  checked: {
    backgroundColor: '#007AFF',
  },
  taskContent: {
    flex: 1,
  },
  taskText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  dueDateText: {
    fontSize: 13,
    color: '#666',
  },
  deleteText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 5,
  },
  highlight: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  priorityBar: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 10,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 10,
  },
  subtaskText: {
    fontSize: 13,
    color: '#666',
  },
});
