export interface ITask {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  createdAt: string; // ISO Date
  dueDate?: string; // Optional ISO Date
  priority?: TaskPriority;
  subtasks?: ISubtask[];
}

export type TaskPriority = 'high' | 'medium' | 'low';

export interface ISubtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: number;
  suggestions?: string[];
  relatedTask?: ITask;
  relatedTasks?: ITask[];
}

export type AIChatAction = 
  | { type: 'CREATE'; task: Omit<ITask, 'id' | 'createdAt'> }
  | { type: 'UPDATE'; id: string; updates: Partial<Omit<ITask, 'id' | 'createdAt'>> }
  | { type: 'DELETE'; id: string }
  | { type: 'COMPLETE'; id: string }
  | { type: 'NONE' };
