import React, { createContext, useContext, ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import {
  addTask as addTaskAction,
  deleteTask as deleteTaskAction,
  toggleComplete as toggleCompleteAction,
  updateTask as updateTaskAction,
} from '../store/slices/taskSlice';
import { ITask } from '../types/task';

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
}

// @ts-ignore
const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useDispatch();
  const tasks = useSelector((state: RootState) => state.tasks.items);
  // Redux persist handles loading indirectly (state rehydration)
  // We can treat it as loaded for now or check persist sync state if critical
  const loading = false;

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
    dispatch(addTaskAction(newTask));
  };

  const deleteTask = async (id: string) => {
    dispatch(deleteTaskAction(id));
  };

  const toggleComplete = async (id: string) => {
    dispatch(toggleCompleteAction(id));
  };

  const updateTask = async (
    id: string,
    updates: Partial<Omit<ITask, 'id' | 'createdAt'>>,
  ) => {
    dispatch(updateTaskAction({ id, updates }));
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
