export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          id: string
          user_id: string
          bank_name: string
          account_type: 'CHECKING' | 'SAVINGS'
          last_4_digits: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bank_name: string
          account_type: 'CHECKING' | 'SAVINGS'
          last_4_digits: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bank_name?: string
          account_type?: 'CHECKING' | 'SAVINGS'
          last_4_digits?: string
          created_at?: string
          updated_at?: string
        }
      }
      credit_cards: {
        Row: {
          id: string
          user_id: string
          card_type: 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER' | 'OTHER'
          last_4_digits: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          card_type: 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER' | 'OTHER'
          last_4_digits: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          card_type?: 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER' | 'OTHER'
          last_4_digits?: string
          created_at?: string
          updated_at?: string
        }
      }
      files: {
        Row: {
          id: string
          user_id: string
          filename: string
          file_url: string
          file_type: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          uploaded_at: string
          processed_at: string | null
          total_transactions: number | null
          total_income: number | null
          total_expenses: number | null
          person_inferred: string | null
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          file_url: string
          file_type: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          uploaded_at?: string
          processed_at?: string | null
          total_transactions?: number | null
          total_income?: number | null
          total_expenses?: number | null
          person_inferred?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          file_url?: string
          file_type?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          uploaded_at?: string
          processed_at?: string | null
          total_transactions?: number | null
          total_income?: number | null
          total_expenses?: number | null
          person_inferred?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          icon: string | null
          color: string | null
          is_system: boolean
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          icon?: string | null
          color?: string | null
          is_system?: boolean
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          icon?: string | null
          color?: string | null
          is_system?: boolean
          user_id?: string | null
          created_at?: string
        }
      }
      raw_transactions: {
        Row: {
          id: string
          file_id: string
          user_id: string
          date: string
          description: string
          reference_number: string | null
          raw_text: string
          amount: number
          type: 'DEBIT' | 'CREDIT'
          original_currency: string
          original_amount: number | null
          fingerprint: string
          parsing_confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          file_id: string
          user_id: string
          date: string
          description: string
          reference_number?: string | null
          raw_text: string
          amount: number
          type: 'DEBIT' | 'CREDIT'
          original_currency?: string
          original_amount?: number | null
          fingerprint: string
          parsing_confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          file_id?: string
          user_id?: string
          date?: string
          description?: string
          reference_number?: string | null
          raw_text?: string
          amount?: number
          type?: 'DEBIT' | 'CREDIT'
          original_currency?: string
          original_amount?: number | null
          fingerprint?: string
          parsing_confidence?: number | null
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          raw_transaction_id: string
          vendor_name: string
          vendor_name_original: string
          category_id: string | null
          amount: number
          type: 'DEBIT' | 'CREDIT'
          transaction_date: string
          notes: string | null
          is_duplicate: boolean
          duplicate_of_id: string | null
          is_internal_transfer: boolean
          related_transaction_id: string | null
          bank_account_id: string | null
          credit_card_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          raw_transaction_id: string
          vendor_name: string
          vendor_name_original: string
          category_id?: string | null
          amount: number
          type: 'DEBIT' | 'CREDIT'
          transaction_date: string
          notes?: string | null
          is_duplicate?: boolean
          duplicate_of_id?: string | null
          is_internal_transfer?: boolean
          related_transaction_id?: string | null
          bank_account_id?: string | null
          credit_card_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          raw_transaction_id?: string
          vendor_name?: string
          vendor_name_original?: string
          category_id?: string | null
          amount?: number
          type?: 'DEBIT' | 'CREDIT'
          transaction_date?: string
          notes?: string | null
          is_duplicate?: boolean
          duplicate_of_id?: string | null
          is_internal_transfer?: boolean
          related_transaction_id?: string | null
          bank_account_id?: string | null
          credit_card_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vendor_mappings: {
        Row: {
          id: string
          original_text: string
          mapped_name: string
          user_id: string | null
          confidence: number | null
          source: 'user' | 'llm' | 'google'
          created_at: string
        }
        Insert: {
          id?: string
          original_text: string
          mapped_name: string
          user_id?: string | null
          confidence?: number | null
          source: 'user' | 'llm' | 'google'
          created_at?: string
        }
        Update: {
          id?: string
          original_text?: string
          mapped_name?: string
          user_id?: string | null
          confidence?: number | null
          source?: 'user' | 'llm' | 'google'
          created_at?: string
        }
      }
      monthly_insights: {
        Row: {
          id: string
          user_id: string
          month_year: string
          insights_json: Json
          generated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month_year: string
          insights_json: Json
          generated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month_year?: string
          insights_json?: Json
          generated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type: 'CHECKING' | 'SAVINGS'
      card_type: 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER' | 'OTHER'
      file_status: 'pending' | 'processing' | 'completed' | 'failed'
      transaction_type: 'DEBIT' | 'CREDIT'
      vendor_source: 'user' | 'llm' | 'google'
    }
  }
}