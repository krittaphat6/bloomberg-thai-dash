export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      active_video_calls: {
        Row: {
          id: string
          is_active: boolean | null
          joined_at: string | null
          peer_id: string
          room_id: string
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          peer_id: string
          room_id: string
          updated_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          peer_id?: string
          room_id?: string
          updated_at?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          severity: string
          symbol: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          severity: string
          symbol?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          severity?: string
          symbol?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      api_forward_logs: {
        Row: {
          action: string
          broker_type: string
          connection_id: string | null
          created_at: string | null
          error_message: string | null
          executed_at: string | null
          id: string
          latency_ms: number | null
          message_id: string | null
          order_id: string | null
          price: number | null
          quantity: number
          response_data: Json | null
          room_id: string
          status: string
          symbol: string
        }
        Insert: {
          action: string
          broker_type: string
          connection_id?: string | null
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          latency_ms?: number | null
          message_id?: string | null
          order_id?: string | null
          price?: number | null
          quantity: number
          response_data?: Json | null
          room_id: string
          status?: string
          symbol: string
        }
        Update: {
          action?: string
          broker_type?: string
          connection_id?: string | null
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          latency_ms?: number | null
          message_id?: string | null
          order_id?: string | null
          price?: number | null
          quantity?: number
          response_data?: Json | null
          room_id?: string
          status?: string
          symbol?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_forward_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "broker_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          api_name: string
          endpoint: string | null
          error_message: string | null
          id: string
          response_time_ms: number | null
          status_code: number | null
          timestamp: string | null
        }
        Insert: {
          api_name: string
          endpoint?: string | null
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          status_code?: number | null
          timestamp?: string | null
        }
        Update: {
          api_name?: string
          endpoint?: string | null
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          status_code?: number | null
          timestamp?: string | null
        }
        Relationships: []
      }
      bridge_logs: {
        Row: {
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          mt5_response: Json | null
          room_id: string | null
          status: string
          user_id: string
          webhook_data: Json
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          mt5_response?: Json | null
          room_id?: string | null
          status?: string
          user_id: string
          webhook_data: Json
        }
        Update: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          mt5_response?: Json | null
          room_id?: string | null
          status?: string
          user_id?: string
          webhook_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "bridge_logs_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      bridge_settings: {
        Row: {
          auto_forward_signals: boolean | null
          created_at: string
          enabled: boolean
          id: string
          max_lot_size: number | null
          mt5_connection_id: string | null
          room_id: string | null
          signal_types: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_forward_signals?: boolean | null
          created_at?: string
          enabled?: boolean
          id?: string
          max_lot_size?: number | null
          mt5_connection_id?: string | null
          room_id?: string | null
          signal_types?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_forward_signals?: boolean | null
          created_at?: string
          enabled?: boolean
          id?: string
          max_lot_size?: number | null
          mt5_connection_id?: string | null
          room_id?: string | null
          signal_types?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bridge_settings_mt5_connection_id_fkey"
            columns: ["mt5_connection_id"]
            isOneToOne: false
            referencedRelation: "broker_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bridge_settings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_connections: {
        Row: {
          avg_latency_ms: number | null
          broker_type: string
          created_at: string | null
          credentials: Json
          failed_orders: number | null
          id: string
          is_active: boolean | null
          is_connected: boolean | null
          last_connected_at: string | null
          last_error: string | null
          max_position_size: number | null
          room_id: string | null
          session_data: Json | null
          successful_orders: number | null
          total_orders_sent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_latency_ms?: number | null
          broker_type: string
          created_at?: string | null
          credentials?: Json
          failed_orders?: number | null
          id?: string
          is_active?: boolean | null
          is_connected?: boolean | null
          last_connected_at?: string | null
          last_error?: string | null
          max_position_size?: number | null
          room_id?: string | null
          session_data?: Json | null
          successful_orders?: number | null
          total_orders_sent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_latency_ms?: number | null
          broker_type?: string
          created_at?: string | null
          credentials?: Json
          failed_orders?: number | null
          id?: string
          is_active?: boolean | null
          is_connected?: boolean | null
          last_connected_at?: string | null
          last_error?: string | null
          max_position_size?: number | null
          room_id?: string | null
          session_data?: Json | null
          successful_orders?: number | null
          total_orders_sent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_connections_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      face_registrations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          face_encoding: string | null
          face_image_url: string | null
          id: string
          registered_at: string | null
          rejection_reason: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          face_encoding?: string | null
          face_image_url?: string | null
          id?: string
          registered_at?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          face_encoding?: string | null
          face_image_url?: string | null
          id?: string
          registered_at?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      friend_nicknames: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          nickname: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          nickname: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          nickname?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string | null
          friend_id: string | null
          id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          friend_id?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          friend_id?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      market_data: {
        Row: {
          ask: number | null
          bid: number | null
          change: number | null
          change_percent: number | null
          created_at: string | null
          high: number | null
          id: string
          low: number | null
          open: number | null
          price: number | null
          source: string
          symbol: string
          timestamp: string | null
          volume: number | null
        }
        Insert: {
          ask?: number | null
          bid?: number | null
          change?: number | null
          change_percent?: number | null
          created_at?: string | null
          high?: number | null
          id?: string
          low?: number | null
          open?: number | null
          price?: number | null
          source: string
          symbol: string
          timestamp?: string | null
          volume?: number | null
        }
        Update: {
          ask?: number | null
          bid?: number | null
          change?: number | null
          change_percent?: number | null
          created_at?: string | null
          high?: number | null
          id?: string
          low?: number | null
          open?: number | null
          price?: number | null
          source?: string
          symbol?: string
          timestamp?: string | null
          volume?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          color: string
          content: string | null
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          message_type: string | null
          room_id: string | null
          user_id: string | null
          username: string
          webhook_data: Json | null
        }
        Insert: {
          color: string
          content?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message_type?: string | null
          room_id?: string | null
          user_id?: string | null
          username: string
          webhook_data?: Json | null
        }
        Update: {
          color?: string
          content?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message_type?: string | null
          room_id?: string | null
          user_id?: string | null
          username?: string
          webhook_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_commands: {
        Row: {
          command_type: string
          comment: string | null
          connection_id: string
          created_at: string | null
          deviation: number | null
          error_code: number | null
          error_message: string | null
          executed_at: string | null
          executed_price: number | null
          executed_volume: number | null
          id: string
          price: number | null
          sl: number | null
          status: string | null
          symbol: string | null
          ticket_id: number | null
          tp: number | null
          volume: number | null
        }
        Insert: {
          command_type: string
          comment?: string | null
          connection_id: string
          created_at?: string | null
          deviation?: number | null
          error_code?: number | null
          error_message?: string | null
          executed_at?: string | null
          executed_price?: number | null
          executed_volume?: number | null
          id?: string
          price?: number | null
          sl?: number | null
          status?: string | null
          symbol?: string | null
          ticket_id?: number | null
          tp?: number | null
          volume?: number | null
        }
        Update: {
          command_type?: string
          comment?: string | null
          connection_id?: string
          created_at?: string | null
          deviation?: number | null
          error_code?: number | null
          error_message?: string | null
          executed_at?: string | null
          executed_price?: number | null
          executed_volume?: number | null
          id?: string
          price?: number | null
          sl?: number | null
          status?: string | null
          symbol?: string | null
          ticket_id?: number | null
          tp?: number | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mt5_commands_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "broker_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      news_history: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          importance: string | null
          published_at: string | null
          raw_data: Json | null
          related_assets: string[] | null
          sentiment: string | null
          source: string
          timestamp: number
          title: string
          url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          importance?: string | null
          published_at?: string | null
          raw_data?: Json | null
          related_assets?: string[] | null
          sentiment?: string | null
          source: string
          timestamp: number
          title: string
          url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          importance?: string | null
          published_at?: string | null
          raw_data?: Json | null
          related_assets?: string[] | null
          sentiment?: string | null
          source?: string
          timestamp?: number
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      room_members: {
        Row: {
          id: string
          joined_at: string | null
          room_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          room_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          room_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sentiment_data: {
        Row: {
          created_at: string | null
          id: string
          keyword: string
          mentions: number | null
          metadata: Json | null
          sentiment_score: number | null
          source: string
          timestamp: string | null
          volume: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          keyword: string
          mentions?: number | null
          metadata?: Json | null
          sentiment_score?: number | null
          source: string
          timestamp?: string | null
          volume?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          keyword?: string
          mentions?: number | null
          metadata?: Json | null
          sentiment_score?: number | null
          source?: string
          timestamp?: string | null
          volume?: number | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          color: string
          created_at: string | null
          email: string | null
          id: string
          last_seen: string | null
          status: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          color: string
          created_at?: string | null
          email?: string | null
          id: string
          last_seen?: string | null
          status?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          color?: string
          created_at?: string | null
          email?: string | null
          id?: string
          last_seen?: string | null
          status?: string | null
          username?: string
        }
        Relationships: []
      }
      webhook_delivery_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          error_stack: string | null
          execution_time_ms: number | null
          id: string
          message_id: string | null
          payload: Json
          request_id: string
          retry_count: number | null
          room_id: string | null
          status: string
          webhook_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          execution_time_ms?: number | null
          id?: string
          message_id?: string | null
          payload?: Json
          request_id: string
          retry_count?: number | null
          room_id?: string | null
          status: string
          webhook_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          execution_time_ms?: number | null
          id?: string
          message_id?: string | null
          payload?: Json
          request_id?: string
          retry_count?: number | null
          room_id?: string | null
          status?: string
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_delivery_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_delivery_logs_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_delivery_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          room_id: string | null
          webhook_secret: string
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          room_id?: string | null
          webhook_secret: string
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          room_id?: string | null
          webhook_secret?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      failed_webhooks: {
        Row: {
          action: string | null
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string | null
          lots: string | null
          price: string | null
          request_id: string | null
          retry_count: number | null
          room_id: string | null
          room_name: string | null
          symbol: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_delivery_logs_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_webhook_logs: { Args: never; Returns: undefined }
      is_face_admin: { Args: { check_user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
