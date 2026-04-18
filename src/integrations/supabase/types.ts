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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_findings: {
        Row: {
          agent_name: string
          category: string | null
          created_at: string
          evidence: string | null
          frameworks: string[] | null
          id: string
          message: string
          recommendation: string | null
          review_id: string
          scenario: Database["public"]["Enums"]["scenario_tag"] | null
          severity: Database["public"]["Enums"]["severity"]
          title: string
        }
        Insert: {
          agent_name: string
          category?: string | null
          created_at?: string
          evidence?: string | null
          frameworks?: string[] | null
          id?: string
          message: string
          recommendation?: string | null
          review_id: string
          scenario?: Database["public"]["Enums"]["scenario_tag"] | null
          severity?: Database["public"]["Enums"]["severity"]
          title: string
        }
        Update: {
          agent_name?: string
          category?: string | null
          created_at?: string
          evidence?: string | null
          frameworks?: string[] | null
          id?: string
          message?: string
          recommendation?: string | null
          review_id?: string
          scenario?: Database["public"]["Enums"]["scenario_tag"] | null
          severity?: Database["public"]["Enums"]["severity"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_findings_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          actor_id: string | null
          actor_kind: string
          created_at: string
          event: string
          id: string
          payload: Json
          review_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_kind: string
          created_at?: string
          event: string
          id?: string
          payload?: Json
          review_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_kind?: string
          created_at?: string
          event?: string
          id?: string
          payload?: Json
          review_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          organization: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          organization?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          organization?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      review_artifacts: {
        Row: {
          content: string
          created_at: string
          file_path: string
          id: string
          language: string | null
          review_id: string
        }
        Insert: {
          content: string
          created_at?: string
          file_path: string
          id?: string
          language?: string | null
          review_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_path?: string
          id?: string
          language?: string | null
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_artifacts_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          description: string | null
          id: string
          overall_score: number | null
          scenarios: Database["public"]["Enums"]["scenario_tag"][]
          source_type: Database["public"]["Enums"]["source_type"]
          source_url: string | null
          status: Database["public"]["Enums"]["review_status"]
          submitter_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          description?: string | null
          id?: string
          overall_score?: number | null
          scenarios?: Database["public"]["Enums"]["scenario_tag"][]
          source_type: Database["public"]["Enums"]["source_type"]
          source_url?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          submitter_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          description?: string | null
          id?: string
          overall_score?: number | null
          scenarios?: Database["public"]["Enums"]["scenario_tag"][]
          source_type?: Database["public"]["Enums"]["source_type"]
          source_url?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          submitter_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "reviewer" | "submitter"
      review_status:
        | "draft"
        | "ingesting"
        | "analyzing"
        | "pending_human"
        | "approved"
        | "rejected"
        | "failed"
      scenario_tag:
        | "enterprise_oss"
        | "healthcare_codegen"
        | "generative_ip"
        | "hr_behavior"
        | "general"
      severity: "info" | "low" | "medium" | "high" | "critical"
      source_type: "paste" | "upload" | "github"
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
    Enums: {
      app_role: ["admin", "reviewer", "submitter"],
      review_status: [
        "draft",
        "ingesting",
        "analyzing",
        "pending_human",
        "approved",
        "rejected",
        "failed",
      ],
      scenario_tag: [
        "enterprise_oss",
        "healthcare_codegen",
        "generative_ip",
        "hr_behavior",
        "general",
      ],
      severity: ["info", "low", "medium", "high", "critical"],
      source_type: ["paste", "upload", "github"],
    },
  },
} as const
