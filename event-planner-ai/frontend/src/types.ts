export interface User {
  id: string;
  username: string;
  passwordHash: string; // Stored securely on server
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface ChecklistItem {
  id: string;
  task: string;
  category: string;
  completed: boolean;
}

export interface VendorRecommendation {
  category: string;
  name: string;
  estimatedCost: string;
  description: string;
  rating: string;
  tips: string[];
}

export interface EventPlan {
  schedule: ScheduleItem[];
  checklist: ChecklistItem[];
  vendors: VendorRecommendation[];
}

export interface EventConfig {
  id: string;
  userId: string;
  title: string;
  type: string;
  budget: number;
  guestCount: number;
  date: string;
  createdAt: string;
  plan: EventPlan | null;
  currency?: "USD" | "INR";
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    username: string;
  };
  token?: string;
}
