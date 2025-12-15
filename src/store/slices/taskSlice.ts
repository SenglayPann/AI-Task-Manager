import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ITask } from '../../types/task';

interface TaskState {
  items: ITask[];
  loading: boolean;
}

const initialState: TaskState = {
  items: [],
  loading: false, // Redux persist rehydration handles "loading" implicitly usually, or we ignore it
};

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<ITask[]>) => {
      state.items = action.payload;
    },
    addTask: (state, action: PayloadAction<ITask>) => {
      state.items.unshift(action.payload);
    },
    deleteTask: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(task => task.id !== action.payload);
    },
    toggleComplete: (state, action: PayloadAction<string>) => {
      const task = state.items.find(t => t.id === action.payload);
      if (task) {
        task.isCompleted = !task.isCompleted;
      }
    },
    updateTask: (state, action: PayloadAction<{ id: string; updates: Partial<ITask> }>) => {
      const { id, updates } = action.payload;
      const index = state.items.findIndex(t => t.id === id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...updates };
      }
    },
  },
});

export const { setTasks, addTask, deleteTask, toggleComplete, updateTask } = taskSlice.actions;
export default taskSlice.reducer;
