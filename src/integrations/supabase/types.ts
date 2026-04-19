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
      agent_decisions: {
        Row: {
          action: string
          created_at: string
          decision: string
          evidence: Json
          id: string
          needs_human: boolean
          persona_id: string
          rationale: string
          review_id: string | null
          severity: Database["public"]["Enums"]["severity"]
        }
        Insert: {
          action: string
          created_at?: string
          decision: string
          evidence?: Json
          id?: string
          needs_human?: boolean
          persona_id: string
          rationale: string
          review_id?: string | null
          severity?: Database["public"]["Enums"]["severity"]
        }
        Update: {
          action?: string
          created_at?: string
          decision?: string
          evidence?: Json
          id?: string
          needs_human?: boolean
          persona_id?: string
          rationale?: string
          review_id?: string | null
          severity?: Database["public"]["Enums"]["severity"]
        }
        Relationships: [
          {
            foreignKeyName: "agent_decisions_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "agent_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_decisions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_findings: {
        Row: {
          agent_name: string
          aos_control_id: string | null
          aos_version: string | null
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
          aos_control_id?: string | null
          aos_version?: string | null
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
          aos_control_id?: string | null
          aos_version?: string | null
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
      agent_messages: {
        Row: {
          content: string
          created_at: string
          handoff_to: string | null
          id: string
          persona_id: string | null
          role: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          handoff_to?: string | null
          id?: string
          persona_id?: string | null
          role: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          handoff_to?: string | null
          id?: string
          persona_id?: string | null
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_handoff_to_fkey"
            columns: ["handoff_to"]
            isOneToOne: false
            referencedRelation: "agent_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "agent_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "agent_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_personas: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          guardrails: string[]
          historical_era: string | null
          id: string
          is_chief: boolean
          portrait_path: string | null
          rank: number
          role_kind: string
          role_title: string
          short_bio: string
          skills: string[]
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          guardrails?: string[]
          historical_era?: string | null
          id?: string
          is_chief?: boolean
          portrait_path?: string | null
          rank?: number
          role_kind: string
          role_title: string
          short_bio: string
          skills?: string[]
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          guardrails?: string[]
          historical_era?: string | null
          id?: string
          is_chief?: boolean
          portrait_path?: string | null
          rank?: number
          role_kind?: string
          role_title?: string
          short_bio?: string
          skills?: string[]
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_threads: {
        Row: {
          created_at: string
          id: string
          intake_qualified_at: string | null
          kind: string
          owner_id: string
          persona_ids: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intake_qualified_at?: string | null
          kind?: string
          owner_id: string
          persona_ids?: string[]
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intake_qualified_at?: string | null
          kind?: string
          owner_id?: string
          persona_ids?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      aos_controls: {
        Row: {
          control_id: string
          created_at: string
          domain: string
          evidence_expected: string
          framework_refs: string[]
          id: string
          level: number
          objective: string
          testing_procedure: string
          version_id: string
        }
        Insert: {
          control_id: string
          created_at?: string
          domain: string
          evidence_expected: string
          framework_refs?: string[]
          id?: string
          level?: number
          objective: string
          testing_procedure: string
          version_id: string
        }
        Update: {
          control_id?: string
          created_at?: string
          domain?: string
          evidence_expected?: string
          framework_refs?: string[]
          id?: string
          level?: number
          objective?: string
          testing_procedure?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aos_controls_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "aos_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      aos_versions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          status: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          version?: string
        }
        Relationships: []
      }
      assessor_engagements: {
        Row: {
          assessor_id: string
          client_org: string
          conflict_reason: string | null
          created_at: string
          firm_id: string
          id: string
          independence_attestation: string | null
          independence_declared_at: string | null
          independence_signed_by: string | null
          review_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assessor_id: string
          client_org: string
          conflict_reason?: string | null
          created_at?: string
          firm_id: string
          id?: string
          independence_attestation?: string | null
          independence_declared_at?: string | null
          independence_signed_by?: string | null
          review_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assessor_id?: string
          client_org?: string
          conflict_reason?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          independence_attestation?: string | null
          independence_declared_at?: string | null
          independence_signed_by?: string | null
          review_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessor_engagements_assessor_id_fkey"
            columns: ["assessor_id"]
            isOneToOne: false
            referencedRelation: "qaga_assessors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessor_engagements_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "qagac_firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessor_engagements_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "qagac_firms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessor_engagements_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      attestations: {
        Row: {
          aos_version: string
          determination: string
          id: string
          issued_at: string
          issued_by: string
          organization: string
          pdf_path: string | null
          pdf_sha256: string | null
          prev_audit_hash: string | null
          qaga_assessor_id: string | null
          qaga_firm_id: string | null
          review_id: string
          scenarios: Database["public"]["Enums"]["scenario_tag"][]
          scope_statement: string
          signature: string | null
        }
        Insert: {
          aos_version: string
          determination: string
          id?: string
          issued_at?: string
          issued_by: string
          organization: string
          pdf_path?: string | null
          pdf_sha256?: string | null
          prev_audit_hash?: string | null
          qaga_assessor_id?: string | null
          qaga_firm_id?: string | null
          review_id: string
          scenarios?: Database["public"]["Enums"]["scenario_tag"][]
          scope_statement: string
          signature?: string | null
        }
        Update: {
          aos_version?: string
          determination?: string
          id?: string
          issued_at?: string
          issued_by?: string
          organization?: string
          pdf_path?: string | null
          pdf_sha256?: string | null
          prev_audit_hash?: string | null
          qaga_assessor_id?: string | null
          qaga_firm_id?: string | null
          review_id?: string
          scenarios?: Database["public"]["Enums"]["scenario_tag"][]
          scope_statement?: string
          signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attestations_qaga_assessor_id_fkey"
            columns: ["qaga_assessor_id"]
            isOneToOne: false
            referencedRelation: "qaga_assessors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attestations_qaga_firm_id_fkey"
            columns: ["qaga_firm_id"]
            isOneToOne: false
            referencedRelation: "qagac_firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attestations_qaga_firm_id_fkey"
            columns: ["qaga_firm_id"]
            isOneToOne: false
            referencedRelation: "qagac_firms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attestations_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
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
          entry_hash: string | null
          event: string
          id: string
          payload: Json
          prev_hash: string | null
          review_id: string | null
          signature: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_kind: string
          created_at?: string
          entry_hash?: string | null
          event: string
          id?: string
          payload?: Json
          prev_hash?: string | null
          review_id?: string | null
          signature?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_kind?: string
          created_at?: string
          entry_hash?: string | null
          event?: string
          id?: string
          payload?: Json
          prev_hash?: string | null
          review_id?: string | null
          signature?: string | null
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
      certifications: {
        Row: {
          aos_version: string
          audit_entry_hash: string | null
          audit_prev_hash: string | null
          bob_signature: string | null
          chain_manifest: Json
          determination: string
          id: string
          issued_at: string
          issued_by: string | null
          ken_signature: string | null
          organization: string
          pdf_path: string | null
          pdf_sha256: string | null
          review_id: string
          scenarios: Database["public"]["Enums"]["scenario_tag"][]
          scope_statement: string
          signature_kind: string
          trigger_kind: string
        }
        Insert: {
          aos_version: string
          audit_entry_hash?: string | null
          audit_prev_hash?: string | null
          bob_signature?: string | null
          chain_manifest?: Json
          determination: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          ken_signature?: string | null
          organization: string
          pdf_path?: string | null
          pdf_sha256?: string | null
          review_id: string
          scenarios?: Database["public"]["Enums"]["scenario_tag"][]
          scope_statement: string
          signature_kind?: string
          trigger_kind?: string
        }
        Update: {
          aos_version?: string
          audit_entry_hash?: string | null
          audit_prev_hash?: string | null
          bob_signature?: string | null
          chain_manifest?: Json
          determination?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          ken_signature?: string | null
          organization?: string
          pdf_path?: string | null
          pdf_sha256?: string | null
          review_id?: string
          scenarios?: Database["public"]["Enums"]["scenario_tag"][]
          scope_statement?: string
          signature_kind?: string
          trigger_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      compensating_controls: {
        Row: {
          aos_control_id: string | null
          evidence_url: string | null
          finding_id: string | null
          id: string
          rationale: string
          recorded_at: string
          recorded_by: string
          review_id: string
          status: string
        }
        Insert: {
          aos_control_id?: string | null
          evidence_url?: string | null
          finding_id?: string | null
          id?: string
          rationale: string
          recorded_at?: string
          recorded_by: string
          review_id: string
          status?: string
        }
        Update: {
          aos_control_id?: string | null
          evidence_url?: string | null
          finding_id?: string | null
          id?: string
          rationale?: string
          recorded_at?: string
          recorded_by?: string
          review_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "compensating_controls_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "agent_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensating_controls_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_dev_engagements: {
        Row: {
          active_through: string | null
          client_org: string
          created_at: string
          engagement_kind: string
          firm_id: string
          id: string
          notes: string | null
        }
        Insert: {
          active_through?: string | null
          client_org: string
          created_at?: string
          engagement_kind: string
          firm_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          active_through?: string | null
          client_org?: string
          created_at?: string
          engagement_kind?: string
          firm_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firm_dev_engagements_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "qagac_firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_dev_engagements_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "qagac_firms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      hitl_reviews: {
        Row: {
          created_at: string
          decision_id: string | null
          id: string
          persona_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          review_id: string | null
          severity: Database["public"]["Enums"]["severity"]
          status: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision_id?: string | null
          id?: string
          persona_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_id?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          status?: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision_id?: string | null
          id?: string
          persona_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_id?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          status?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hitl_reviews_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "agent_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hitl_reviews_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "agent_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hitl_reviews_review_id_fkey"
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
      qaga_assessors: {
        Row: {
          badges: string[]
          created_at: string
          display_name: string
          exam_passed_at: string | null
          firm_id: string | null
          id: string
          jurisdiction: string | null
          public_listed: boolean
          qaga_credential_id: string | null
          qaga_expires_at: string | null
          qaga_issued_at: string | null
          status: string
          training_completed_at: string | null
          training_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          badges?: string[]
          created_at?: string
          display_name: string
          exam_passed_at?: string | null
          firm_id?: string | null
          id?: string
          jurisdiction?: string | null
          public_listed?: boolean
          qaga_credential_id?: string | null
          qaga_expires_at?: string | null
          qaga_issued_at?: string | null
          status?: string
          training_completed_at?: string | null
          training_level?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          badges?: string[]
          created_at?: string
          display_name?: string
          exam_passed_at?: string | null
          firm_id?: string | null
          id?: string
          jurisdiction?: string | null
          public_listed?: boolean
          qaga_credential_id?: string | null
          qaga_expires_at?: string | null
          qaga_issued_at?: string | null
          status?: string
          training_completed_at?: string | null
          training_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qaga_assessors_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "qagac_firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qaga_assessors_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "qagac_firms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      qagac_firms: {
        Row: {
          active_assessor_count: number
          charter_at: string | null
          contact_email: string | null
          created_at: string
          id: string
          indemnity_amount_usd: number | null
          indemnity_carrier: string | null
          jurisdiction: string | null
          name: string
          public_listed: boolean
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          active_assessor_count?: number
          charter_at?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          indemnity_amount_usd?: number | null
          indemnity_carrier?: string | null
          jurisdiction?: string | null
          name: string
          public_listed?: boolean
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          active_assessor_count?: number
          charter_at?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          indemnity_amount_usd?: number | null
          indemnity_carrier?: string | null
          jurisdiction?: string | null
          name?: string
          public_listed?: boolean
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      quick_audit_runs: {
        Row: {
          created_at: string
          id: string
          review_id: string | null
          scenario: Database["public"]["Enums"]["scenario_tag"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id?: string | null
          scenario?: Database["public"]["Enums"]["scenario_tag"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string | null
          scenario?: Database["public"]["Enums"]["scenario_tag"]
          user_id?: string
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
          from_thread_id: string | null
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
          from_thread_id?: string | null
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
          from_thread_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "reviews_from_thread_id_fkey"
            columns: ["from_thread_id"]
            isOneToOne: false
            referencedRelation: "agent_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_pack_controls: {
        Row: {
          aos_control_hint: string | null
          control_ref: string
          created_at: string
          framework: string
          id: string
          objective: string
          pack_id: string
          severity_if_missing: Database["public"]["Enums"]["severity"]
        }
        Insert: {
          aos_control_hint?: string | null
          control_ref: string
          created_at?: string
          framework: string
          id?: string
          objective: string
          pack_id: string
          severity_if_missing?: Database["public"]["Enums"]["severity"]
        }
        Update: {
          aos_control_hint?: string | null
          control_ref?: string
          created_at?: string
          framework?: string
          id?: string
          objective?: string
          pack_id?: string
          severity_if_missing?: Database["public"]["Enums"]["severity"]
        }
        Relationships: [
          {
            foreignKeyName: "scenario_pack_controls_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "scenario_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_packs: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          scenario: Database["public"]["Enums"]["scenario_tag"]
          status: string
          version: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          name: string
          scenario: Database["public"]["Enums"]["scenario_tag"]
          status?: string
          version?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          scenario?: Database["public"]["Enums"]["scenario_tag"]
          status?: string
          version?: string
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
      qagac_firms_public: {
        Row: {
          active_assessor_count: number | null
          charter_at: string | null
          created_at: string | null
          id: string | null
          jurisdiction: string | null
          name: string | null
          public_listed: boolean | null
          status: string | null
          website: string | null
        }
        Insert: {
          active_assessor_count?: number | null
          charter_at?: string | null
          created_at?: string | null
          id?: string | null
          jurisdiction?: string | null
          name?: string | null
          public_listed?: boolean | null
          status?: string | null
          website?: string | null
        }
        Update: {
          active_assessor_count?: number | null
          charter_at?: string | null
          created_at?: string | null
          id?: string | null
          jurisdiction?: string | null
          name?: string | null
          public_listed?: boolean | null
          status?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      aos_active_version: { Args: never; Returns: string }
      assign_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user: string
        }
        Returns: undefined
      }
      claim_first_admin: { Args: never; Returns: boolean }
      compute_conformance: { Args: { _review_id: string }; Returns: Json }
      count_open_intake_threads: { Args: { _user: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      issue_attestation: {
        Args: {
          _organization: string
          _review_id: string
          _scope_statement: string
        }
        Returns: string
      }
      record_compensating_control: {
        Args: {
          _aos_control_id: string
          _evidence_url: string
          _finding_id: string
          _rationale: string
          _review_id: string
        }
        Returns: string
      }
      request_engagement: {
        Args: { _assessor_id: string; _review_id: string }
        Returns: string
      }
      resolve_hitl: {
        Args: { _hitl_id: string; _note: string; _status: string }
        Returns: undefined
      }
      revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user: string
        }
        Returns: undefined
      }
      sign_independence_declaration: {
        Args: { _attestation: string; _engagement_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "reviewer" | "submitter" | "curator"
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
      app_role: ["admin", "reviewer", "submitter", "curator"],
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
