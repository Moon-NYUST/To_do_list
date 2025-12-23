
export interface User {
  username: string;
}

export interface Attendance {
  id: number;
  user_name: string;
  clock_in: string;
  clock_out: string | null;
  work_hours: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  created_at: string;
  due_time?: string;
  remaining_time?: string;
  tags: string[];
}

export interface PersonalTask extends Task {
  user_name: string;
}

export interface TeamTask extends Task {
  team: string;
  assigned_to: string[];
}

export interface Message {
  id?: number;
  team: string;
  sender: string;
  content: string;
  timestamp: string;
}
