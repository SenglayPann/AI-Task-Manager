import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTasks } from '../context/TaskContext';
import { GlassLayout, glassStyles } from '../components/GlassLayout';
import { ITask } from '../types/task';

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { tasks, toggleComplete } = useTasks();

  const statistics = useMemo(() => {
    const now = new Date().getTime();
    const today = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate(),
    ).getTime();

    const total = tasks.length;
    const completed = tasks.filter(t => t.isCompleted).length;
    const pending = total - completed;
    const overdue = tasks.filter(
      t => !t.isCompleted && t.dueDate && new Date(t.dueDate).getTime() < today,
    ).length;

    return { total, completed, pending, overdue };
  }, [tasks]);

  const upcomingTasks = useMemo(() => {
    const now = new Date().getTime();
    return tasks
      .filter(
        t =>
          !t.isCompleted && t.dueDate && new Date(t.dueDate).getTime() >= now,
      )
      .sort(
        (a, b) =>
          new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
      )
      .slice(0, 5); // Show top 5 upcoming tasks
  }, [tasks]);

  const formatDateTime = (isoString: string) => {
    const dt = new Date(isoString);
    return dt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <GlassLayout>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome back!</Text>
          </View>

          {/* Statistics Cards */}
          <View style={styles.statsContainer}>
            <View style={[glassStyles.card, styles.statCard]}>
              <Text style={styles.statValue}>{statistics.total}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>

            <View style={[glassStyles.card, styles.statCard]}>
              <Text style={[styles.statValue, { color: '#34C759' }]}>
                {statistics.completed}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>

            <View style={[glassStyles.card, styles.statCard]}>
              <Text style={[styles.statValue, { color: '#007AFF' }]}>
                {statistics.pending}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>

            <View style={[glassStyles.card, styles.statCard]}>
              <Text style={[styles.statValue, { color: '#FF3B30' }]}>
                {statistics.overdue}
              </Text>
              <Text style={styles.statLabel}>Overdue</Text>
            </View>
          </View>

          {/* Upcoming Tasks */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
              <TouchableOpacity onPress={() => navigation.navigate('TaskList')}>
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            </View>

            {upcomingTasks.length === 0 ? (
              <View style={[glassStyles.card, styles.emptyCard]}>
                <Text style={styles.emptyText}>No upcoming tasks</Text>
                <Text style={styles.emptySubtext}>
                  You're all caught up! 🎉
                </Text>
              </View>
            ) : (
              upcomingTasks.map(task => (
                <TouchableOpacity
                  key={task.id}
                  style={[glassStyles.card, styles.taskCard]}
                  onPress={() =>
                    navigation.navigate('TaskDetail', { taskId: task.id })
                  }
                >
                  <View style={styles.taskContent}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={e => {
                        e.stopPropagation();
                        toggleComplete(task.id);
                      }}
                    />
                    <View style={styles.taskInfo}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      {task.dueDate && (
                        <Text style={styles.taskDate}>
                          📅 {formatDateTime(task.dueDate)}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[
                  glassStyles.button,
                  styles.actionButton,
                  styles.primaryAction,
                ]}
                onPress={() => navigation.navigate('TaskDetail')}
              >
                <Text style={styles.actionButtonText}>➕ New Task</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  glassStyles.button,
                  styles.actionButton,
                  styles.secondaryAction,
                ]}
                onPress={() => navigation.navigate('TaskList')}
              >
                <Text style={styles.actionButtonText}>📋 All Tasks</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GlassLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  taskCard: {
    padding: 15,
    marginBottom: 10,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    marginRight: 15,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  taskDate: {
    fontSize: 13,
    color: '#666',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderWidth: 0,
  },
  primaryAction: {
    backgroundColor: '#34C759',
  },
  secondaryAction: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
