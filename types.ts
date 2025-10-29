import React from 'react';

export enum DinnerTypeId {
  LIGHT = 'light',
  MUSCLE_RECOVERY = 'muscle-recovery',
  LOW_CALORIE = 'low-calorie',
  ENERGETIC = 'energetic',
  SOCIAL = 'social',
  CUSTOM = 'custom', // For user-created recipes
}

export interface DinnerType {
  id: DinnerTypeId;
  title: string;
  objective: string;
  guidelines: string;
  preferredIngredients?: string[];
}

export interface RecipeIngredient {
  quantity: string;
  name:string;
}

export interface Recipe {
  id: string;
  rating?: number;
  name: string;
  description: string;
  prepTime: number;
  costPerPerson: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
  type: DinnerTypeId;
  source?: 'ai' | 'user'; // Distinguish between AI and user recipes
}

export interface ShoppingListItem {
  name: string;
  quantity: string;
  category: string;
}

export interface WeeklyPlan {
  weeklyRecipes: Recipe[];
  shoppingList: ShoppingListItem[];
}

// New types for diner profiles
export type EaterProfileId = 'periquito' | 'humano' | 'bestia-parda';

export interface EaterProfile {
  id: EaterProfileId;
  name: string;
  multiplier: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface Diner {
  id: number;
  appetite: EaterProfileId;
}