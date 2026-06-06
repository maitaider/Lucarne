export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          buy_in_amount_cents: number
          buy_in_deadline: string | null
          chat_slow_mode_seconds: number
          contact_info: string | null
          contact_label: string | null
          currency: string
          id: number
          prize_distribution: Json
          scoring_rules: Json
          token_price_cents: number
          tournament_end_at: string
          tournament_start_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          buy_in_amount_cents?: number
          buy_in_deadline?: string | null
          chat_slow_mode_seconds?: number
          contact_info?: string | null
          contact_label?: string | null
          currency?: string
          id?: number
          prize_distribution?: Json
          scoring_rules?: Json
          token_price_cents?: number
          tournament_end_at?: string
          tournament_start_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          buy_in_amount_cents?: number
          buy_in_deadline?: string | null
          chat_slow_mode_seconds?: number
          contact_info?: string | null
          contact_label?: string | null
          currency?: string
          id?: number
          prize_distribution?: Json
          scoring_rules?: Json
          token_price_cents?: number
          tournament_end_at?: string
          tournament_start_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bets: {
        Row: {
          bet_type: Database["public"]["Enums"]["bet_type_enum"]
          client_request_id: string | null
          created_at: string
          id: string
          league_id: string | null
          locked_at: string | null
          match_id: string | null
          odds: number
          payload: Json
          payout_cents: number
          points: number
          result: Database["public"]["Enums"]["bet_result"] | null
          stake_cents: number
          status: Database["public"]["Enums"]["bet_status"]
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bet_type: Database["public"]["Enums"]["bet_type_enum"]
          client_request_id?: string | null
          created_at?: string
          id?: string
          league_id?: string | null
          locked_at?: string | null
          match_id?: string | null
          odds?: number
          payload: Json
          payout_cents?: number
          points?: number
          result?: Database["public"]["Enums"]["bet_result"] | null
          stake_cents?: number
          status?: Database["public"]["Enums"]["bet_status"]
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bet_type?: Database["public"]["Enums"]["bet_type_enum"]
          client_request_id?: string | null
          created_at?: string
          id?: string
          league_id?: string | null
          locked_at?: string | null
          match_id?: string | null
          odds?: number
          payload?: Json
          payout_cents?: number
          points?: number
          result?: Database["public"]["Enums"]["bet_result"] | null
          stake_cents?: number
          status?: Database["public"]["Enums"]["bet_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bets_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_mutes: {
        Row: {
          created_at: string
          muted_by: string | null
          reason: string | null
          until: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          muted_by?: string | null
          reason?: string | null
          until?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          muted_by?: string | null
          reason?: string | null
          until?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_mutes_muted_by_fkey"
            columns: ["muted_by"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_mutes_muted_by_fkey"
            columns: ["muted_by"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_mutes_muted_by_fkey"
            columns: ["muted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_mutes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_mutes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_mutes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_poll_votes: {
        Row: {
          created_at: string
          option_idx: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          option_idx: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          option_idx?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "chat_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_polls: {
        Row: {
          closes_at: string | null
          comment_id: string
          created_at: string
          created_by: string
          id: string
          options: string[]
          question: string
        }
        Insert: {
          closes_at?: string | null
          comment_id: string
          created_at?: string
          created_by: string
          id?: string
          options: string[]
          question: string
        }
        Update: {
          closes_at?: string | null
          comment_id?: string
          created_at?: string
          created_by?: string
          id?: string
          options?: string[]
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_polls_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: true
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reports: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reason: string | null
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          parent_id: string
          parent_type: string
          pinned_at: string | null
          pinned_by: string | null
          reply_to_id: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          parent_id: string
          parent_type: string
          pinned_at?: string | null
          pinned_by?: string | null
          reply_to_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          parent_id?: string
          parent_type?: string
          pinned_at?: string | null
          pinned_by?: string | null
          reply_to_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comments_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comments_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          league_id: string | null
          max_uses: number | null
          revoked_at: string | null
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          league_id?: string | null
          max_uses?: number | null
          revoked_at?: string | null
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          league_id?: string | null
          max_uses?: number | null
          revoked_at?: string | null
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_members: {
        Row: {
          joined_at: string
          league_id: string
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Insert: {
          joined_at?: string
          league_id: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Update: {
          joined_at?: string
          league_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "league_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "league_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      league_posts: {
        Row: {
          attachment_url: string | null
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          kind: string
          league_id: string
          parent_post_id: string | null
          pinned_at: string | null
        }
        Insert: {
          attachment_url?: string | null
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          kind?: string
          league_id: string
          parent_post_id?: string | null
          pinned_at?: string | null
        }
        Update: {
          attachment_url?: string | null
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          kind?: string
          league_id?: string
          parent_post_id?: string | null
          pinned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "league_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "league_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_posts_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_posts_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "league_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          allows_real_money: boolean
          cover_url: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          entry_fee_cents: number
          id: string
          is_default: boolean
          member_limit: number | null
          name: string
          owner_id: string
          prize_pool_cents: number
          requires_dual_validation: boolean
          scoring_profile_id: string | null
          slug: string
          updated_at: string
          visibility: Database["public"]["Enums"]["league_visibility"]
        }
        Insert: {
          allows_real_money?: boolean
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          entry_fee_cents?: number
          id?: string
          is_default?: boolean
          member_limit?: number | null
          name: string
          owner_id: string
          prize_pool_cents?: number
          requires_dual_validation?: boolean
          scoring_profile_id?: string | null
          slug: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["league_visibility"]
        }
        Update: {
          allows_real_money?: boolean
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          entry_fee_cents?: number
          id?: string
          is_default?: boolean
          member_limit?: number | null
          name?: string
          owner_id?: string
          prize_pool_cents?: number
          requires_dual_validation?: boolean
          scoring_profile_id?: string | null
          slug?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["league_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "leagues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leagues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leagues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leagues_scoring_profile_id_fkey"
            columns: ["scoring_profile_id"]
            isOneToOne: false
            referencedRelation: "scoring_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          author_id: string | null
          body: string
          cover_url: string | null
          created_at: string
          expires_at: string | null
          id: string
          kind: string
          published_at: string
          source: string
          title: string
        }
        Insert: {
          author_id?: string | null
          body: string
          cover_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: string
          published_at?: string
          source?: string
          title: string
        }
        Update: {
          author_id?: string | null
          body?: string
          cover_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: string
          published_at?: string
          source?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "news_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "news_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          muted_types: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          muted_types?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          muted_types?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          type: Database["public"]["Enums"]["notif_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type: Database["public"]["Enums"]["notif_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type?: Database["public"]["Enums"]["notif_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          created_at: string
          id: string
          league_id: string | null
          locked_at: string | null
          payload: Json
          points: number
          prediction_type: Database["public"]["Enums"]["prediction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          league_id?: string | null
          locked_at?: string | null
          payload: Json
          points?: number
          prediction_type: Database["public"]["Enums"]["prediction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string | null
          locked_at?: string | null
          payload?: Json
          points?: number
          prediction_type?: Database["public"]["Enums"]["prediction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance_cents: number
          created_at: string
          deleted_at: string | null
          display_name: string | null
          id: string
          locale: string
          role: Database["public"]["Enums"]["app_role"]
          timezone: string
          total_paid_cents: number
          total_winnings_cents: number
          transparency_opt_in: boolean
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          balance_cents?: number
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          id: string
          locale?: string
          role?: Database["public"]["Enums"]["app_role"]
          timezone?: string
          total_paid_cents?: number
          total_winnings_cents?: number
          transparency_opt_in?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          balance_cents?: number
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          id?: string
          locale?: string
          role?: Database["public"]["Enums"]["app_role"]
          timezone?: string
          total_paid_cents?: number
          total_winnings_cents?: number
          transparency_opt_in?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          id: string
          reaction: Database["public"]["Enums"]["reaction_enum"]
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction: Database["public"]["Enums"]["reaction_enum"]
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction?: Database["public"]["Enums"]["reaction_enum"]
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      real_payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          received_at: string
          recorded_by: string
          reference: string | null
          refund_reason: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tokens_credited: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          received_at?: string
          recorded_by: string
          reference?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tokens_credited?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          received_at?: string
          recorded_by?: string
          reference?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tokens_credited?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "real_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "real_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "real_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "real_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "real_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "real_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_profiles: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          rules: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          rules: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          rules?: Json
        }
        Relationships: []
      }
      standings_snapshot: {
        Row: {
          rank: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          rank: number
          total_points: number
          updated_at?: string
          user_id: string
        }
        Update: {
          rank?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "standings_snapshot_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "standings_snapshot_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "standings_snapshot_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_checkouts: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          payment_intent_id: string | null
          real_payment_id: string | null
          session_id: string
          status: string
          tokens_to_credit: number
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          payment_intent_id?: string | null
          real_payment_id?: string | null
          session_id: string
          status?: string
          tokens_to_credit: number
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          payment_intent_id?: string | null
          real_payment_id?: string | null
          session_id?: string
          status?: string
          tokens_to_credit?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_checkouts_real_payment_id_fkey"
            columns: ["real_payment_id"]
            isOneToOne: false
            referencedRelation: "real_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_checkouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stripe_checkouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stripe_checkouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_predictions: {
        Row: {
          champion_team_id: string | null
          created_at: string
          group_standings: Json
          knockout_winners: Json
          locked_at: string | null
          top_scorer_player_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          champion_team_id?: string | null
          created_at?: string
          group_standings?: Json
          knockout_winners?: Json
          locked_at?: string | null
          top_scorer_player_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          champion_team_id?: string | null
          created_at?: string
          group_standings?: Json
          knockout_winners?: Json
          locked_at?: string | null
          top_scorer_player_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tournament_predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tournament_predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_cents: number
          balance_after_cents: number
          bet_id: string | null
          created_at: string
          created_by: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          id: string
          league_id: string | null
          metadata: Json
          reason: Database["public"]["Enums"]["transaction_reason"]
          user_id: string
        }
        Insert: {
          amount_cents: number
          balance_after_cents: number
          bet_id?: string | null
          created_at?: string
          created_by?: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          id?: string
          league_id?: string | null
          metadata?: Json
          reason: Database["public"]["Enums"]["transaction_reason"]
          user_id: string
        }
        Update: {
          amount_cents?: number
          balance_after_cents?: number
          bet_id?: string | null
          created_at?: string
          created_by?: string | null
          direction?: Database["public"]["Enums"]["transaction_direction"]
          id?: string
          league_id?: string | null
          metadata?: Json
          reason?: Database["public"]["Enums"]["transaction_reason"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "bets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_global_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_league_standings"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_overview_stats: {
        Row: {
          paying_users_count: number | null
          payment_count: number | null
          total_collected_cents: number | null
          total_refunded_cents: number | null
        }
        Relationships: []
      }
      mv_global_standings: {
        Row: {
          avatar_url: string | null
          bets_count: number | null
          display_name: string | null
          losses: number | null
          rank: number | null
          role: Database["public"]["Enums"]["app_role"] | null
          settled_count: number | null
          total_points: number | null
          user_id: string | null
          username: string | null
          wins: number | null
        }
        Relationships: []
      }
      mv_league_standings: {
        Row: {
          avatar_url: string | null
          bets_count: number | null
          display_name: string | null
          league_id: string | null
          losses: number | null
          rank: number | null
          role: Database["public"]["Enums"]["app_role"] | null
          settled_count: number | null
          total_payout_cents: number | null
          total_points: number | null
          total_staked_cents: number | null
          user_id: string | null
          username: string | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adjust_balance: {
        Args: { p_delta_tokens: number; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_archive_user: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      admin_delete_payment: {
        Args: { p_payment_id: string }
        Returns: undefined
      }
      admin_delete_player: { Args: { p_id: string }; Returns: undefined }
      admin_finalize_new_user: {
        Args: {
          p_role?: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_list_audit_log: {
        Args: { p_limit?: number }
        Returns: {
          action: string
          actor_id: string
          actor_username: string
          created_at: string
          id: string
          payload: Json
          target_id: string
          target_table: string
        }[]
      }
      admin_list_chat_reports: {
        Args: never
        Returns: {
          author_avatar_url: string
          author_id: string
          author_muted: boolean
          author_username: string
          body: string
          comment_id: string
          created_at: string
          first_reported_at: string
          image_url: string
          message_deleted: boolean
          reasons: string[]
          report_count: number
        }[]
      }
      admin_purge_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_recompute_match: { Args: { p_match_id: string }; Returns: number }
      admin_reply_ticket: {
        Args: { p_note: string; p_resolve?: boolean; p_ticket_id: string }
        Returns: undefined
      }
      admin_resolve_chat_report: {
        Args: { p_comment_id: string }
        Returns: undefined
      }
      admin_restore_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_set_chat_mute: {
        Args: {
          p_muted: boolean
          p_reason?: string
          p_until?: string
          p_user_id: string
        }
        Returns: undefined
      }
      admin_set_chat_slowmode: {
        Args: { p_seconds: number }
        Returns: undefined
      }
      admin_set_comment_pin: {
        Args: { p_comment_id: string; p_pinned: boolean }
        Returns: undefined
      }
      admin_set_match_result: {
        Args: {
          p_away_pen?: number
          p_away_score?: number
          p_home_pen?: number
          p_home_score?: number
          p_match_id: string
          p_scorers?: Json
          p_status?: string
        }
        Returns: undefined
      }
      admin_upsert_player: {
        Args: {
          p_active?: boolean
          p_club?: string
          p_display_name: string
          p_full_name: string
          p_id: string
          p_position?: string
          p_shirt_number?: number
          p_team_id: string
        }
        Returns: string
      }
      compute_bet_points: { Args: { p_bet_id: string }; Returns: undefined }
      create_chat_poll: {
        Args: { p_closes_at?: string; p_options: string[]; p_question: string }
        Returns: string
      }
      create_league: {
        Args: {
          p_allows_real_money?: boolean
          p_description?: string
          p_member_limit?: number
          p_name: string
          p_slug: string
          p_visibility?: Database["public"]["Enums"]["league_visibility"]
        }
        Returns: string
      }
      cron_send_kickoff_reminders: {
        Args: { p_within_minutes?: number }
        Returns: number
      }
      cron_sync_match: {
        Args: {
          p_away?: number
          p_fixture_id: number
          p_home?: number
          p_status: string
        }
        Returns: boolean
      }
      delete_comment: { Args: { p_comment_id: string }; Returns: undefined }
      fulfill_stripe_checkout: {
        Args: { p_session_id: string }
        Returns: string
      }
      generate_invitation: {
        Args: {
          p_expires_days?: number
          p_league_id: string
          p_max_uses?: number
        }
        Returns: {
          code: string
          expires_at: string
        }[]
      }
      generate_user_invitation: {
        Args: { p_expires_days?: number; p_max_uses?: number }
        Returns: {
          code: string
          expires_at: string
        }[]
      }
      has_paid_buy_in: { Args: { p_user_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_league_member: { Args: { p_league_id: string }; Returns: boolean }
      league_feed: {
        Args: { p_league_id: string; p_limit?: number }
        Returns: {
          bet_type: string
          display_name: string
          id: string
          match_id: string
          payload: Json
          points: number
          result: string
          status: string
          submitted_at: string
          user_id: string
          username: string
        }[]
      }
      lock_all_tournament_predictions: { Args: never; Returns: number }
      recompute_bracket_points: { Args: never; Returns: undefined }
      match_consensus: {
        Args: { p_match_id: string }
        Returns: {
          away: number
          draw: number
          home: number
          total: number
        }[]
      }
      match_predictions: {
        Args: { p_match_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          points: number
          pred_away: number
          pred_home: number
          result: string
          role: string
          status: string
          user_id: string
          username: string
        }[]
      }
      notify_standings_overtakes: { Args: never; Returns: undefined }
      place_bet: {
        Args: {
          p_bet_type: Database["public"]["Enums"]["bet_type_enum"]
          p_client_request_id?: string
          p_league_id: string
          p_match_id: string
          p_payload: Json
          p_stake_cents?: number
        }
        Returns: string
      }
      player_achievements: {
        Args: { p_username: string }
        Returns: {
          best_streak: number
          current_streak: number
          exact_count: number
          scorer_count: number
          settled_count: number
          total_points: number
          won_count: number
        }[]
      }
      profile_recent_bets: {
        Args: { p_limit?: number; p_username: string }
        Returns: {
          away_fifa: string
          away_iso: string
          away_name_en: string
          away_name_fr: string
          away_score: number
          bet_id: string
          bet_type: string
          home_fifa: string
          home_iso: string
          home_name_en: string
          home_name_fr: string
          home_score: number
          kickoff_at: string
          match_id: string
          match_status: string
          payload: Json
          points: number
          result: string
        }[]
      }
      public_profile: {
        Args: { p_username: string }
        Returns: {
          avatar_url: string
          bets_count: number
          display_name: string
          losses: number
          rank: number
          role: string
          settled_count: number
          total_points: number
          user_id: string
          username: string
          wins: number
        }[]
      }
      publish_league_post: {
        Args: {
          p_body: string
          p_kind?: string
          p_league_id: string
          p_parent_post_id?: string
        }
        Returns: string
      }
      publish_news: {
        Args: {
          p_body: string
          p_cover_url?: string
          p_expires_at?: string
          p_kind?: string
          p_source?: string
          p_title: string
        }
        Returns: string
      }
      record_payment: {
        Args: {
          p_allow_duplicate?: boolean
          p_amount_cents: number
          p_currency?: string
          p_method: Database["public"]["Enums"]["payment_method"]
          p_note?: string
          p_reference?: string
          p_user_id: string
        }
        Returns: string
      }
      redeem_invitation: { Args: { p_code: string }; Returns: Json }
      refund_payment: {
        Args: { p_payment_id: string; p_reason?: string }
        Returns: undefined
      }
      report_chat_message: {
        Args: { p_comment_id: string; p_reason?: string }
        Returns: undefined
      }
      resolve_viewable_profile: {
        Args: { p_username: string }
        Returns: string
      }
      set_user_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      shared_prediction: {
        Args: { p_bet_id: string }
        Returns: {
          avatar_url: string
          away_iso: string
          away_name_en: string
          away_name_fr: string
          away_score: number
          bet_id: string
          bet_type: string
          display_name: string
          home_iso: string
          home_name_en: string
          home_name_fr: string
          home_score: number
          kickoff_at: string
          match_status: string
          payload: Json
          points: number
          result: string
          status: string
          username: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      standings_filtered: {
        Args: { p_matchday?: number; p_stage?: string }
        Returns: {
          avatar_url: string
          bets_count: number
          display_name: string
          losses: number
          rank: number
          role: string
          settled_count: number
          total_points: number
          user_id: string
          username: string
          wins: number
        }[]
      }
      update_app_settings: {
        Args: {
          p_buy_in_amount_cents?: number
          p_buy_in_deadline?: string
          p_contact_info?: string
          p_contact_label?: string
          p_currency?: string
          p_prize_distribution?: Json
          p_scoring_rules?: Json
          p_token_price_cents?: number
          p_tournament_end_at?: string
          p_tournament_start_at?: string
        }
        Returns: undefined
      }
      upsert_tournament_prediction: {
        Args: {
          p_champion_team_id: string
          p_group_standings: Json
          p_knockout_winners: Json
          p_top_scorer_player_id?: string
        }
        Returns: undefined
      }
      vote_chat_poll: {
        Args: { p_option_idx: number; p_poll_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "player" | "admin" | "super_admin"
      bet_result: "won" | "lost" | "push" | "void"
      bet_status:
        | "draft"
        | "pending_payment"
        | "paid"
        | "validated"
        | "settled"
        | "rejected"
        | "refunded"
      bet_type_enum:
        | "match_winner"
        | "exact_score"
        | "first_scorer"
        | "anytime_scorer"
        | "both_teams_score"
        | "over_under"
        | "tournament_winner"
        | "top_scorer"
        | "bracket"
        | "golden_boot"
        | "golden_glove"
        | "total_goals"
      confederation_enum:
        | "UEFA"
        | "CONMEBOL"
        | "CONCACAF"
        | "CAF"
        | "AFC"
        | "OFC"
      league_visibility: "private" | "public"
      match_stage:
        | "group"
        | "r32"
        | "r16"
        | "qf"
        | "sf"
        | "third_place"
        | "final"
      match_status:
        | "scheduled"
        | "live"
        | "finished"
        | "postponed"
        | "cancelled"
      member_role: "owner" | "admin" | "member"
      member_status: "active" | "banned" | "left"
      notif_type:
        | "bet_validated"
        | "bet_rejected"
        | "bet_settled"
        | "match_kickoff"
        | "match_goal"
        | "friend_request"
        | "league_invite"
        | "league_position"
        | "comment_reply"
        | "daily_challenge"
        | "support_ticket"
        | "reaction_received"
        | "comment_received"
        | "chat_mention"
        | "poll_vote"
      payment_method:
        | "cash"
        | "transfer"
        | "paypal"
        | "revolut"
        | "lydia"
        | "wise"
        | "other"
      payment_status: "pending" | "confirmed" | "refunded" | "cancelled"
      prediction_type:
        | "bracket"
        | "tournament_winner"
        | "top_scorer"
        | "dark_horse"
        | "golden_boot"
      reaction_enum: "fire" | "clap" | "laugh" | "think" | "shock" | "skull"
      transaction_direction: "credit" | "debit"
      transaction_reason:
        | "bet_stake"
        | "bet_payout"
        | "bet_refund"
        | "manual_adjustment"
        | "league_entry"
        | "prize"
        | "signup_bonus"
        | "onboarding_quest"
      validation_status:
        | "awaiting_payment"
        | "payment_received"
        | "validated"
        | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  ref: {
    Tables: {
      match_events: {
        Row: {
          created_at: string
          event_type: string
          external_event_id: string | null
          id: string
          match_id: string
          minute: number
          player_id: string | null
          player_name: string | null
          team_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          external_event_id?: string | null
          id?: string
          match_id: string
          minute: number
          player_id?: string | null
          player_name?: string | null
          team_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          external_event_id?: string | null
          id?: string
          match_id?: string
          minute?: number
          player_id?: string | null
          player_name?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          api_football_fixture_id: number | null
          away_pen: number | null
          away_placeholder: string | null
          away_score: number | null
          away_score_et: number | null
          away_score_ht: number | null
          away_team_id: string | null
          created_at: string
          external_id: string | null
          group_label: string | null
          home_pen: number | null
          home_placeholder: string | null
          home_score: number | null
          home_score_et: number | null
          home_score_ht: number | null
          home_team_id: string | null
          id: string
          kickoff_at: string
          last_synced_at: string | null
          match_number: number | null
          stage: Database["public"]["Enums"]["match_stage"]
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
          venue_id: string | null
          winner_team_id: string | null
        }
        Insert: {
          api_football_fixture_id?: number | null
          away_pen?: number | null
          away_placeholder?: string | null
          away_score?: number | null
          away_score_et?: number | null
          away_score_ht?: number | null
          away_team_id?: string | null
          created_at?: string
          external_id?: string | null
          group_label?: string | null
          home_pen?: number | null
          home_placeholder?: string | null
          home_score?: number | null
          home_score_et?: number | null
          home_score_ht?: number | null
          home_team_id?: string | null
          id?: string
          kickoff_at: string
          last_synced_at?: string | null
          match_number?: number | null
          stage: Database["public"]["Enums"]["match_stage"]
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          venue_id?: string | null
          winner_team_id?: string | null
        }
        Update: {
          api_football_fixture_id?: number | null
          away_pen?: number | null
          away_placeholder?: string | null
          away_score?: number | null
          away_score_et?: number | null
          away_score_ht?: number | null
          away_team_id?: string | null
          created_at?: string
          external_id?: string | null
          group_label?: string | null
          home_pen?: number | null
          home_placeholder?: string | null
          home_score?: number | null
          home_score_et?: number | null
          home_score_ht?: number | null
          home_team_id?: string | null
          id?: string
          kickoff_at?: string
          last_synced_at?: string | null
          match_number?: number | null
          stage?: Database["public"]["Enums"]["match_stage"]
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          venue_id?: string | null
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          active: boolean
          api_football_player_id: number | null
          birth_date: string | null
          club: string | null
          created_at: string
          display_name: string
          external_id: string | null
          id: string
          name: string
          position: string | null
          shirt_number: number | null
          team_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          api_football_player_id?: number | null
          birth_date?: string | null
          club?: string | null
          created_at?: string
          display_name: string
          external_id?: string | null
          id?: string
          name: string
          position?: string | null
          shirt_number?: number | null
          team_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          api_football_player_id?: number | null
          birth_date?: string | null
          club?: string | null
          created_at?: string
          display_name?: string
          external_id?: string | null
          id?: string
          name?: string
          position?: string | null
          shirt_number?: number | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          api_football_team_id: number | null
          confederation: Database["public"]["Enums"]["confederation_enum"]
          created_at: string
          fifa_code: string
          flag_emoji: string | null
          id: string
          iso_code: string | null
          logo_url: string | null
          name_en: string
          name_fr: string
          qualified_at: string | null
          updated_at: string
        }
        Insert: {
          api_football_team_id?: number | null
          confederation: Database["public"]["Enums"]["confederation_enum"]
          created_at?: string
          fifa_code: string
          flag_emoji?: string | null
          id?: string
          iso_code?: string | null
          logo_url?: string | null
          name_en: string
          name_fr: string
          qualified_at?: string | null
          updated_at?: string
        }
        Update: {
          api_football_team_id?: number | null
          confederation?: Database["public"]["Enums"]["confederation_enum"]
          created_at?: string
          fifa_code?: string
          flag_emoji?: string | null
          id?: string
          iso_code?: string | null
          logo_url?: string | null
          name_en?: string
          name_fr?: string
          qualified_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          capacity: number | null
          city_en: string
          city_fr: string
          country: string
          created_at: string
          external_id: string | null
          id: string
          name: string
        }
        Insert: {
          capacity?: number | null
          city_en: string
          city_fr: string
          country: string
          created_at?: string
          external_id?: string | null
          id?: string
          name: string
        }
        Update: {
          capacity?: number | null
          city_en?: string
          city_fr?: string
          country?: string
          created_at?: string
          external_id?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["player", "admin", "super_admin"],
      bet_result: ["won", "lost", "push", "void"],
      bet_status: [
        "draft",
        "pending_payment",
        "paid",
        "validated",
        "settled",
        "rejected",
        "refunded",
      ],
      bet_type_enum: [
        "match_winner",
        "exact_score",
        "first_scorer",
        "anytime_scorer",
        "both_teams_score",
        "over_under",
        "tournament_winner",
        "top_scorer",
        "bracket",
        "golden_boot",
        "golden_glove",
        "total_goals",
      ],
      confederation_enum: ["UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"],
      league_visibility: ["private", "public"],
      match_stage: ["group", "r32", "r16", "qf", "sf", "third_place", "final"],
      match_status: ["scheduled", "live", "finished", "postponed", "cancelled"],
      member_role: ["owner", "admin", "member"],
      member_status: ["active", "banned", "left"],
      notif_type: [
        "bet_validated",
        "bet_rejected",
        "bet_settled",
        "match_kickoff",
        "match_goal",
        "friend_request",
        "league_invite",
        "league_position",
        "comment_reply",
        "daily_challenge",
        "support_ticket",
        "reaction_received",
        "comment_received",
        "chat_mention",
        "poll_vote",
      ],
      payment_method: [
        "cash",
        "transfer",
        "paypal",
        "revolut",
        "lydia",
        "wise",
        "other",
      ],
      payment_status: ["pending", "confirmed", "refunded", "cancelled"],
      prediction_type: [
        "bracket",
        "tournament_winner",
        "top_scorer",
        "dark_horse",
        "golden_boot",
      ],
      reaction_enum: ["fire", "clap", "laugh", "think", "shock", "skull"],
      transaction_direction: ["credit", "debit"],
      transaction_reason: [
        "bet_stake",
        "bet_payout",
        "bet_refund",
        "manual_adjustment",
        "league_entry",
        "prize",
        "signup_bonus",
        "onboarding_quest",
      ],
      validation_status: [
        "awaiting_payment",
        "payment_received",
        "validated",
        "rejected",
      ],
    },
  },
  ref: {
    Enums: {},
  },
} as const

