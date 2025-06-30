import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserPKP, CreateUserPKPInput } from './types';

export class UserPKPORM {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getUserPKPByWalletAddress(walletAddress: string): Promise<UserPKP | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_pkps')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();
      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('Ошибка получения user_pkps по wallet_address:', error);
        }
        return null;
      }
      return data as UserPKP;
    } catch (error) {
      console.error('Неожиданная ошибка при получении user_pkps по wallet_address:', error);
      return null;
    }
  }

  async getAllUserPKPsByWalletAddress(walletAddress: string): Promise<UserPKP[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_pkps')
        .select('*')
        .eq('wallet_address', walletAddress);
      if (error) {
        console.error('Ошибка получения всех user_pkps по wallet_address:', error);
        return [];
      }
      return data as UserPKP[];
    } catch (error) {
      console.error('Неожиданная ошибка при получении всех user_pkps по wallet_address:', error);
      return [];
    }
  }

  async createUserPKP(data: CreateUserPKPInput): Promise<UserPKP | null> {
    try {
      const { data: inserted, error } = await this.supabase
        .from('user_pkps')
        .insert([data])
        .select()
        .single();
      if (error) {
        console.error('Ошибка создания user_pkps:', error);
        return null;
      }
      return inserted as UserPKP;
    } catch (error) {
      console.error('Неожиданная ошибка при создании user_pkps:', error);
      return null;
    }
  }
} 