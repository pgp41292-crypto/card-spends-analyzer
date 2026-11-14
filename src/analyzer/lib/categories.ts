import {
  CircleEllipsis, Clapperboard, Fuel, HeartPulse, Plane, Receipt, ShoppingBag, ShoppingBasket, UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryId } from '../types';

export const CATEGORIES: Record<CategoryId, { label: string; short: string; icon: LucideIcon; color: string }> = {
  food: { short: 'Food', label: 'Food & Dining', icon: UtensilsCrossed, color: '#F2994A' },
  groceries: { short: 'Groceries', label: 'Groceries', icon: ShoppingBasket, color: '#27AE60' },
  shopping: { short: 'Shopping', label: 'Shopping', icon: ShoppingBag, color: '#9B51E0' },
  travel: { short: 'Travel', label: 'Travel', icon: Plane, color: '#2F80ED' },
  fuel: { short: 'Fuel', label: 'Fuel', icon: Fuel, color: '#EB5757' },
  bills: { short: 'Bills', label: 'Bills & Utilities', icon: Receipt, color: '#00BAF2' },
  entertainment: { short: 'Entertainment', label: 'Entertainment', icon: Clapperboard, color: '#C9A227' },
  health: { short: 'Health', label: 'Health', icon: HeartPulse, color: '#E0559A' },
  others: { short: 'Others', label: 'Others', icon: CircleEllipsis, color: '#828282' },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];
