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

  async createUserPKP(data: CreateUserPKPInput): Promise<UserPKP | null> {
    try {
      // Временно убираем eth_address из-за проблем с кешем схемы Supabase
      const { eth_address, ...dataWithoutEthAddress } = data;
      
      const { data: inserted, error } = await this.supabase
        .from('user_pkps')
        .insert([dataWithoutEthAddress])
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

  async getPKPByTokenId(tokenId: string): Promise<UserPKP | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_pkps')
        .select('*')
        .eq('token_id', tokenId)
        .single();
      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('Ошибка получения PKP по token_id:', error);
        }
        return null;
      }
      return data as UserPKP;
    } catch (error) {
      console.error('Неожиданная ошибка при получении PKP по token_id:', error);
      return null;
    }
  }

  async updateUserPKP(tokenId: string, updates: Partial<UserPKP>): Promise<UserPKP | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_pkps')
        .update(updates)
        .eq('token_id', tokenId)
        .select()
        .single();
      if (error) {
        console.error('Ошибка обновления PKP:', error);
        return null;
      }
      return data as UserPKP;
    } catch (error) {
      console.error('Неожиданная ошибка при обновлении PKP:', error);
      return null;
    }
  }
} 