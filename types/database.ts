export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string | null;
          email: string;
          role: 'ADMIN' | 'OPS';
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          email: string;
          role?: 'ADMIN' | 'OPS';
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string;
          role?: 'ADMIN' | 'OPS';
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          birth_date: string | null;
          gender: string | null;
          whatsapp: string | null;
          email: string | null;
          dietary_notes: string | null;
          nutritionist_name: string | null;
          nutritionist_phone: string | null;
          main_goal: string | null;
          allergies: string[];
          food_restrictions: string | null;
          clinical_conditions: string | null;
          medication_use: string | null;
          height_cm: number | null;
          current_weight_kg: number | null;
          goal_weight_kg: number | null;
          body_fat_percentage: number | null;
          skeletal_muscle_mass: number | null;
          work_routine: string | null;
          aerobic_frequency: string | null;
          aerobic_intensity: string | null;
          strength_frequency: string | null;
          strength_intensity: string | null;
          meals_per_day: number | null;
          lunch_carbs: number | null;
          lunch_protein: number | null;
          lunch_fat: number | null;
          dinner_carbs: number | null;
          dinner_protein: number | null;
          dinner_fat: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          birth_date?: string | null;
          gender?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          dietary_notes?: string | null;
          nutritionist_name?: string | null;
          nutritionist_phone?: string | null;
          main_goal?: string | null;
          allergies?: string[];
          food_restrictions?: string | null;
          clinical_conditions?: string | null;
          medication_use?: string | null;
          height_cm?: number | null;
          current_weight_kg?: number | null;
          goal_weight_kg?: number | null;
          body_fat_percentage?: number | null;
          skeletal_muscle_mass?: number | null;
          work_routine?: string | null;
          aerobic_frequency?: string | null;
          aerobic_intensity?: string | null;
          strength_frequency?: string | null;
          strength_intensity?: string | null;
          meals_per_day?: number | null;
          lunch_carbs?: number | null;
          lunch_protein?: number | null;
          lunch_fat?: number | null;
          dinner_carbs?: number | null;
          dinner_protein?: number | null;
          dinner_fat?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          birth_date?: string | null;
          gender?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          dietary_notes?: string | null;
          nutritionist_name?: string | null;
          nutritionist_phone?: string | null;
          main_goal?: string | null;
          allergies?: string[];
          food_restrictions?: string | null;
          clinical_conditions?: string | null;
          medication_use?: string | null;
          height_cm?: number | null;
          current_weight_kg?: number | null;
          goal_weight_kg?: number | null;
          body_fat_percentage?: number | null;
          skeletal_muscle_mass?: number | null;
          work_routine?: string | null;
          aerobic_frequency?: string | null;
          aerobic_intensity?: string | null;
          strength_frequency?: string | null;
          strength_intensity?: string | null;
          meals_per_day?: number | null;
          lunch_carbs?: number | null;
          lunch_protein?: number | null;
          lunch_fat?: number | null;
          dinner_carbs?: number | null;
          dinner_protein?: number | null;
          dinner_fat?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      addresses: {
        Row: {
          id: string;
          customer_id: string;
          label: string;
          street: string;
          number: string | null;
          complement: string | null;
          neighborhood: string | null;
          city: string;
          state: string;
          zip: string | null;
          lat: number | null;
          lng: number | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          label: string;
          street: string;
          number?: string | null;
          complement?: string | null;
          neighborhood?: string | null;
          city: string;
          state: string;
          zip?: string | null;
          lat?: number | null;
          lng?: number | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          label?: string;
          street?: string;
          number?: string | null;
          complement?: string | null;
          neighborhood?: string | null;
          city?: string;
          state?: string;
          zip?: string | null;
          lat?: number | null;
          lng?: number | null;
          is_default?: boolean;
          created_at?: string;
        };
      };
      recipes: {
        Row: {
          id: string;
          name: string;
          category: 'Proteína' | 'Carboidrato' | 'Legumes' | 'Salada' | 'Marinada' | 'Molho';
          allergens: string[];
          notes: string | null;
          kcal_per_100g: number;
          protein_per_100g: number;
          carb_per_100g: number;
          fat_per_100g: number;
          cost_per_100g: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: 'Proteína' | 'Carboidrato' | 'Legumes' | 'Salada' | 'Marinada' | 'Molho';
          allergens?: string[];
          notes?: string | null;
          kcal_per_100g: number;
          protein_per_100g: number;
          carb_per_100g: number;
          fat_per_100g: number;
          cost_per_100g: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: 'Proteína' | 'Carboidrato' | 'Legumes' | 'Salada' | 'Marinada' | 'Molho';
          allergens?: string[];
          notes?: string | null;
          kcal_per_100g?: number;
          protein_per_100g?: number;
          carb_per_100g?: number;
          fat_per_100g?: number;
          cost_per_100g?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      prep_sessions: {
        Row: {
          id: string;
          title: string;
          date: string;
          notes: string | null;
          created_by_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          date: string;
          notes?: string | null;
          created_by_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          date?: string;
          notes?: string | null;
          created_by_id?: string | null;
          created_at?: string;
        };
      };
      prep_items: {
        Row: {
          id: string;
          prep_session_id: string;
          recipe_id: string;
          total_weight_gr: number;
          servings: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          prep_session_id: string;
          recipe_id: string;
          total_weight_gr: number;
          servings?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          prep_session_id?: string;
          recipe_id?: string;
          total_weight_gr?: number;
          servings?: number | null;
          created_at?: string;
        };
      };
      delivery_schedules: {
        Row: {
          id: string;
          customer_id: string;
          day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
          meal_type: 'lunch' | 'dinner';
          delivery_time: string | null;
          delivery_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
          meal_type: 'lunch' | 'dinner';
          delivery_time?: string | null;
          delivery_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          day_of_week?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
          meal_type?: 'lunch' | 'dinner';
          delivery_time?: string | null;
          delivery_address?: string | null;
          created_at?: string;
        };
      };
      nutrition_plans: {
        Row: {
          id: string;
          customer_id: string;
          target_calories: number;
          target_protein_g: number;
          target_carbs_g: number;
          target_fat_g: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          target_calories?: number;
          target_protein_g?: number;
          target_carbs_g?: number;
          target_fat_g?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          target_calories?: number;
          target_protein_g?: number;
          target_carbs_g?: number;
          target_fat_g?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          customer_id: string;
          order_date: string;
          meal_type: 'lunch' | 'dinner';
          protein_recipe_id: string;
          protein_amount_gr: number;
          carb_recipe_id: string;
          carb_amount_gr: number;
          vegetable_recipe_id: string | null;
          vegetable_amount_gr: number | null;
          salad_recipe_id: string | null;
          salad_amount_gr: number | null;
          sauce_recipe_id: string | null;
          total_calories: number;
          total_protein: number;
          total_carbs: number;
          total_fat: number;
          delivery_address: string;
          delivery_time: string | null;
          status: 'pending' | 'preparing' | 'ready' | 'delivered';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          order_date: string;
          meal_type: 'lunch' | 'dinner';
          protein_recipe_id: string;
          protein_amount_gr: number;
          carb_recipe_id: string;
          carb_amount_gr: number;
          vegetable_recipe_id?: string | null;
          vegetable_amount_gr?: number | null;
          salad_recipe_id?: string | null;
          salad_amount_gr?: number | null;
          sauce_recipe_id?: string | null;
          total_calories?: number;
          total_protein?: number;
          total_carbs?: number;
          total_fat?: number;
          delivery_address: string;
          delivery_time?: string | null;
          status?: 'pending' | 'preparing' | 'ready' | 'delivered';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          order_date?: string;
          meal_type?: 'lunch' | 'dinner';
          protein_recipe_id?: string;
          protein_amount_gr?: number;
          carb_recipe_id?: string;
          carb_amount_gr?: number;
          vegetable_recipe_id?: string | null;
          vegetable_amount_gr?: number | null;
          salad_recipe_id?: string | null;
          salad_amount_gr?: number | null;
          sauce_recipe_id?: string | null;
          total_calories?: number;
          total_protein?: number;
          total_carbs?: number;
          total_fat?: number;
          delivery_address?: string;
          delivery_time?: string | null;
          status?: 'pending' | 'preparing' | 'ready' | 'delivered';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          recipe_id: string;
          recipe_category: 'Proteína' | 'Carboidrato' | 'Legumes' | 'Salada' | 'Marinada' | 'Molho';
          quantity_grams: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          recipe_id: string;
          recipe_category: 'Proteína' | 'Carboidrato' | 'Legumes' | 'Salada' | 'Marinada' | 'Molho';
          quantity_grams: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          recipe_id?: string;
          recipe_category?: 'Proteína' | 'Carboidrato' | 'Legumes' | 'Salada' | 'Marinada' | 'Molho';
          quantity_grams?: number;
          created_at?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string;
          updated_at?: string;
        };
      };
    };
  };
}
