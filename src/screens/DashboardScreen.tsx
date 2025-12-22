import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTasks } from '../context/TaskContext';
import { GlassLayout, glassStyles } from '../components/GlassLayout';
import { ITask } from '../types/task';
import { GeminiService } from '../services/GeminiService';

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { tasks, toggleComplete } = useTasks();

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Flip card state and animation
  const [isFlipped, setIsFlipped] = useState(false);
  const [advice, setAdvice] = useState('');
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [lastTasksHash, setLastTasksHash] = useState('');
  const [backCardHeight, setBackCardHeight] = useState(180); // Dynamic back card height
  const flipAnim = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(180)).current; // Initial height

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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

  // Task Health Calculation
  const taskHealth = useMemo(() => {
    const { total, completed, overdue, pending } = statistics;

    if (total === 0) {
      return { score: 100, label: 'No Tasks', color: '#8E8E93', emoji: '📋' };
    }

    // Health factors:
    // 1. Completion rate (40% weight)
    const completionRate = (completed / total) * 100;

    // 2. Overdue penalty (40% weight) - more overdue = worse health
    const overdueRate = pending > 0 ? (overdue / pending) * 100 : 0;
    const overduePenalty = overdueRate;

    // 3. Overall productivity (20% weight) - having tasks and completing them
    const productivityBonus = total > 0 && completed > 0 ? 20 : 0;

    // Calculate score
    let score = Math.round(
      completionRate * 0.4 + (100 - overduePenalty) * 0.4 + productivityBonus,
    );

    // Clamp between 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine label and color
    if (score >= 80) {
      return { score, label: 'Excellent', color: '#34C759', emoji: '🌟' };
    } else if (score >= 60) {
      return { score, label: 'Good', color: '#007AFF', emoji: '👍' };
    } else if (score >= 40) {
      return { score, label: 'Fair', color: '#FF9500', emoji: '⚠️' };
    } else {
      return { score, label: 'Needs Work', color: '#FF3B30', emoji: '🔴' };
    }
  }, [statistics]);

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

  // Generate a hash of tasks to detect changes
  const currentTasksHash = useMemo(() => {
    return JSON.stringify(
      tasks.map(t => ({
        id: t.id,
        isCompleted: t.isCompleted,
        dueDate: t.dueDate,
      })),
    );
  }, [tasks]);

  // Reset advice when tasks change (will regenerate on next button press)
  useEffect(() => {
    if (currentTasksHash !== lastTasksHash && lastTasksHash !== '') {
      setAdvice('');
    }
  }, [currentTasksHash]);

  const flipCard = () => {
    const toValue = isFlipped ? 0 : 1;
    const targetHeight = isFlipped ? 180 : Math.max(180, backCardHeight); // Front: 180, Back: dynamic

    Animated.parallel([
      Animated.spring(flipAnim, {
        toValue,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }),
      Animated.timing(heightAnim, {
        toValue: targetHeight,
        duration: 300,
        useNativeDriver: false, // Height can't use native driver
      }),
    ]).start();
    setIsFlipped(!isFlipped);
  };

  // Animate height when backCardHeight changes (after advice loads)
  useEffect(() => {
    if (isFlipped && backCardHeight > 180) {
      Animated.timing(heightAnim, {
        toValue: backCardHeight,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [backCardHeight, isFlipped]);

  const generateAdvice = async () => {
    setIsLoadingAdvice(true);
    setLastTasksHash(currentTasksHash);

    try {
      // Build detailed task information for AI
      const overdueTasks = tasks.filter(
        t =>
          !t.isCompleted &&
          t.dueDate &&
          new Date(t.dueDate).getTime() < Date.now(),
      );
      const pendingTasks = tasks.filter(t => !t.isCompleted);

      const taskDetails = pendingTasks
        .map(t => {
          const isOverdue =
            t.dueDate && new Date(t.dueDate).getTime() < Date.now();
          const subtaskProgress = t.subtasks?.length
            ? `${t.subtasks.filter(s => s.isCompleted).length}/${
                t.subtasks.length
              } subtasks done`
            : 'no subtasks';
          return `- "${t.title}" (${t.priority || 'no'} priority, ${
            isOverdue
              ? 'OVERDUE'
              : t.dueDate
              ? `due ${new Date(t.dueDate).toLocaleDateString()}`
              : 'no deadline'
          }, ${subtaskProgress})`;
        })
        .join('\n');

      const prompt = `You are a productivity coach and task advisor. Analyze the user's task situation and provide step-by-step actionable advice.

=== TASK HEALTH OVERVIEW ===
Health Score: ${taskHealth.score}% (${taskHealth.label})
Total Tasks: ${statistics.total}
Completed: ${statistics.completed}
Pending: ${statistics.pending}
Overdue: ${statistics.overdue}

=== PENDING TASKS ===
${taskDetails || 'No pending tasks'}

=== YOUR ADVICE ===
Based on the task health ${
        taskHealth.score < 60 ? '(which needs improvement)' : ''
      }, provide:
${
  taskHealth.score < 40
    ? '1. Step-by-step recovery plan to get back on track\n2. Which overdue tasks to prioritize first\n3. Quick wins they can achieve today'
    : taskHealth.score < 60
    ? '1. Specific improvements to boost productivity\n2. Tasks to focus on next\n3. Tips to prevent overdue tasks'
    : '1. How to maintain this good momentum\n2. Any optimization suggestions\n3. Encouragement to keep going'
}

Keep advice concise (max 4-5 sentences). Be encouraging and specific about WHICH tasks to tackle. Do not use markdown formatting or bullet points.`;

      const response = await GeminiService.sendMessage(prompt, tasks, []);
      setAdvice(response.text);
    } catch (error) {
      setAdvice('Unable to get advice right now. Try again later!');
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  const handleGetAdvice = async () => {
    if (!isFlipped) {
      // Flip card first, then generate advice
      flipCard();
      if (!advice || currentTasksHash !== lastTasksHash) {
        await generateAdvice();
      }
    } else {
      flipCard();
    }
  };

  // Flip animation interpolation
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };
  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  return (
    <GlassLayout>
      <SafeAreaView style={styles.container}>
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome back!</Text>
          </View>

          {/* Task Health Card - Flip Card */}
          <Animated.View
            style={[styles.flipCardContainer, { height: heightAnim }]}
          >
            {/* Front Side - Health Display */}
            <Animated.View
              style={[
                glassStyles.card,
                styles.healthCard,
                styles.flipCardFace,
                frontAnimatedStyle,
              ]}
            >
              <View style={styles.healthContent}>
                <View style={styles.healthLeft}>
                  <Text style={styles.healthEmoji}>{taskHealth.emoji}</Text>
                  <View>
                    <Text style={styles.healthLabel}>Task Health</Text>
                    <Text
                      style={[styles.healthStatus, { color: taskHealth.color }]}
                    >
                      {taskHealth.label}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.healthScore,
                    { borderColor: taskHealth.color },
                  ]}
                >
                  <Text
                    style={[
                      styles.healthScoreText,
                      { color: taskHealth.color },
                    ]}
                  >
                    {taskHealth.score}%
                  </Text>
                </View>
              </View>
              <View style={styles.healthBar}>
                <View
                  style={[
                    styles.healthBarFill,
                    {
                      width: `${taskHealth.score}%`,
                      backgroundColor: taskHealth.color,
                    },
                  ]}
                />
              </View>
              <TouchableOpacity
                style={styles.getAdviceButton}
                onPress={handleGetAdvice}
              >
                <Text style={styles.getAdviceText}>💡 Get Advice</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Back Side - AI Advice */}
            <Animated.View
              style={[
                glassStyles.card,
                styles.healthCard,
                styles.flipCardFace,
                styles.flipCardBack,
                backAnimatedStyle,
              ]}
              onLayout={event => {
                const { height } = event.nativeEvent.layout;
                if (height > 0 && height !== backCardHeight) {
                  setBackCardHeight(height);
                }
              }}
            >
              <View style={styles.adviceHeader}>
                <Text style={styles.adviceTitle}>💡 AI Coach Advice</Text>
              </View>
              <View style={styles.adviceContent}>
                {isLoadingAdvice ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.loadingText}>Generating advice...</Text>
                  </View>
                ) : (
                  <Text style={styles.adviceText}>{advice}</Text>
                )}
              </View>
              <View style={styles.adviceButtonRow}>
                <TouchableOpacity
                  style={[styles.getAdviceButton, styles.flipBackButton]}
                  onPress={handleGetAdvice}
                >
                  <Text style={styles.getAdviceText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.getAdviceButton, styles.refreshButton]}
                  onPress={generateAdvice}
                  disabled={isLoadingAdvice}
                >
                  <Text style={styles.getAdviceText}>🔄 Refresh</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Animated.View>

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
              upcomingTasks.map(task => {
                const priorityColor =
                  task.priority === 'high'
                    ? '#FF3B30'
                    : task.priority === 'medium'
                    ? '#FF9500'
                    : task.priority === 'low'
                    ? '#34C759'
                    : 'transparent';

                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[glassStyles.card, styles.taskCard]}
                    onPress={() =>
                      navigation.navigate('TaskDetail', { taskId: task.id })
                    }
                  >
                    {task.priority && (
                      <View
                        style={[
                          styles.priorityBar,
                          { backgroundColor: priorityColor },
                        ]}
                      />
                    )}
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
                );
              })
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
        </Animated.ScrollView>
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
    marginBottom: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBar: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 10,
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

  // Task Health Styles
  healthCard: {
    padding: 16,
    marginBottom: 20,
  },
  healthContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  healthEmoji: {
    fontSize: 36,
  },
  healthLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  healthStatus: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  healthScore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  healthScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  healthBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Flip Card Styles
  flipCardContainer: {
    height: 200,
    marginBottom: 15,
  },
  flipCardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
  },
  flipCardBack: {
    position: 'absolute',
  },
  getAdviceButton: {
    marginTop: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  flipBackButton: {
    backgroundColor: 'rgba(100, 100, 100, 0.1)',
    flex: 1,
  },
  refreshButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    flex: 1,
  },
  adviceButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  getAdviceText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  adviceHeader: {
    marginBottom: 12,
  },
  adviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  adviceContent: {
    flex: 1,
    justifyContent: 'center',
  },
  adviceText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
});
