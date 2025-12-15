import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ITask } from '../types/task';

const TASKS_STORAGE_KEY = '@tasks_data';

interface TaskContextType {
  tasks: ITask[];
  loading: boolean;
  addTask: (
    title: string,
    description?: string,
    dueDate?: string,
  ) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  updateTask: (
    id: string,
    updates: Partial<Omit<ITask, 'id' | 'createdAt'>>,
  ) => Promise<void>;
  loadTasks: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      if (jsonValue != null) {
        setTasks(JSON.parse(jsonValue));
      }
    } catch (e) {
      console.error('Failed to load tasks', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const saveTasks = async (newTasks: ITask[]) => {
    try {
      await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(newTasks));
    } catch (e) {
      console.error('Failed to save tasks', e);
    }
  };

  const addTask = async (
    title: string,
    description?: string,
    dueDate?: string,
  ) => {
    const newTask: ITask = {
      id: Date.now().toString(),
      title,
      description,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      dueDate,
    };
    const newTasks = [newTask, ...tasks];
    setTasks(newTasks);
    await saveTasks(newTasks);
  };

  const deleteTask = async (id: string) => {
    const newTasks = tasks.filter(task => task.id !== id);
    setTasks(newTasks);
    await saveTasks(newTasks);
  };

  const toggleComplete = async (id: string) => {
    const newTasks = tasks.map(task =>
      task.id === id ? { ...task, isCompleted: !task.isCompleted } : task,
    );
    setTasks(newTasks);
    await saveTasks(newTasks);
  };

  const updateTask = async (
    id: string,
    updates: Partial<Omit<ITask, 'id' | 'createdAt'>>,
  ) => {
    const updatedTasks = tasks.map(task =>
      task.id === id ? { ...task, ...updates } : task,
    );
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        addTask,
        deleteTask,
        toggleComplete,
        updateTask,
        loadTasks,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
