export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      access_requests: {
        Row: {
          applicant_reply: string | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          decision_reason: string | null;
          email: string;
          first_name: string;
          grad_year: number;
          id: string;
          info_request: string | null;
          institution_id: string;
          last_name: string;
          maiden_name: string | null;
          note: string | null;
          profile_id: string | null;
          source: Database["public"]["Enums"]["request_source"];
          status: Database["public"]["Enums"]["request_status"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          applicant_reply?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_reason?: string | null;
          email: string;
          first_name: string;
          grad_year: number;
          id?: string;
          info_request?: string | null;
          institution_id: string;
          last_name: string;
          maiden_name?: string | null;
          note?: string | null;
          profile_id?: string | null;
          source?: Database["public"]["Enums"]["request_source"];
          status?: Database["public"]["Enums"]["request_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          applicant_reply?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_reason?: string | null;
          email?: string;
          first_name?: string;
          grad_year?: number;
          id?: string;
          info_request?: string | null;
          institution_id?: string;
          last_name?: string;
          maiden_name?: string | null;
          note?: string | null;
          profile_id?: string | null;
          source?: Database["public"]["Enums"]["request_source"];
          status?: Database["public"]["Enums"]["request_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "access_requests_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_requests_profile_fk";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "alumni_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      alumni_education: {
        Row: {
          created_at: string;
          degree: string | null;
          field_of_study: string | null;
          graduation_year: number | null;
          id: string;
          institution_id: string;
          profile_id: string;
          school: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          degree?: string | null;
          field_of_study?: string | null;
          graduation_year?: number | null;
          id?: string;
          institution_id: string;
          profile_id: string;
          school: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          degree?: string | null;
          field_of_study?: string | null;
          graduation_year?: number | null;
          id?: string;
          institution_id?: string;
          profile_id?: string;
          school?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "alumni_education_profile_id_institution_id_fkey";
            columns: ["profile_id", "institution_id"];
            isOneToOne: false;
            referencedRelation: "alumni_profiles";
            referencedColumns: ["id", "institution_id"];
          },
        ];
      };
      alumni_experience: {
        Row: {
          career_field_id: string | null;
          created_at: string;
          employer: string | null;
          end_year: number | null;
          id: string;
          institution_id: string;
          is_current: boolean;
          job_title: string;
          location: string | null;
          profile_id: string;
          sort_order: number;
          start_year: number | null;
        };
        ComputedFields: never;
        Insert: {
          career_field_id?: string | null;
          created_at?: string;
          employer?: string | null;
          end_year?: number | null;
          id?: string;
          institution_id: string;
          is_current?: boolean;
          job_title: string;
          location?: string | null;
          profile_id: string;
          sort_order?: number;
          start_year?: number | null;
        };
        Update: {
          career_field_id?: string | null;
          created_at?: string;
          employer?: string | null;
          end_year?: number | null;
          id?: string;
          institution_id?: string;
          is_current?: boolean;
          job_title?: string;
          location?: string | null;
          profile_id?: string;
          sort_order?: number;
          start_year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "alumni_experience_career_field_id_fkey";
            columns: ["career_field_id"];
            isOneToOne: false;
            referencedRelation: "career_fields";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alumni_experience_profile_id_institution_id_fkey";
            columns: ["profile_id", "institution_id"];
            isOneToOne: false;
            referencedRelation: "alumni_profiles";
            referencedColumns: ["id", "institution_id"];
          },
        ];
      };
      alumni_private: {
        Row: {
          admin_notes: string | null;
          created_at: string;
          institution_id: string;
          maiden_name: string | null;
          profile_id: string;
          school_student_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          admin_notes?: string | null;
          created_at?: string;
          institution_id: string;
          maiden_name?: string | null;
          profile_id: string;
          school_student_id?: string | null;
          updated_at?: string;
        };
        Update: {
          admin_notes?: string | null;
          created_at?: string;
          institution_id?: string;
          maiden_name?: string | null;
          profile_id?: string;
          school_student_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alumni_private_profile_id_institution_id_fkey";
            columns: ["profile_id", "institution_id"];
            isOneToOne: false;
            referencedRelation: "alumni_profiles";
            referencedColumns: ["id", "institution_id"];
          },
        ];
      };
      alumni_profiles: {
        Row: {
          bio: string | null;
          career_field_id: string | null;
          career_field_other: string | null;
          city: string | null;
          confirmation_due_at: string | null;
          country: string | null;
          created_at: string;
          deleted_at: string | null;
          employer: string | null;
          first_name: string;
          grad_year: number;
          id: string;
          institution_id: string;
          job_title: string | null;
          languages: string[];
          last_confirmed_at: string | null;
          last_name: string;
          onboarding_completed_at: string | null;
          onboarding_step: number;
          preferred_name: string | null;
          published_at: string | null;
          status: Database["public"]["Enums"]["profile_status"];
          updated_at: string;
          user_id: string | null;
          visibility: Database["public"]["Enums"]["profile_visibility"];
        };
        ComputedFields: never;
        Insert: {
          bio?: string | null;
          career_field_id?: string | null;
          career_field_other?: string | null;
          city?: string | null;
          confirmation_due_at?: string | null;
          country?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          employer?: string | null;
          first_name: string;
          grad_year: number;
          id?: string;
          institution_id: string;
          job_title?: string | null;
          languages?: string[];
          last_confirmed_at?: string | null;
          last_name: string;
          onboarding_completed_at?: string | null;
          onboarding_step?: number;
          preferred_name?: string | null;
          published_at?: string | null;
          status?: Database["public"]["Enums"]["profile_status"];
          updated_at?: string;
          user_id?: string | null;
          visibility?: Database["public"]["Enums"]["profile_visibility"];
        };
        Update: {
          bio?: string | null;
          career_field_id?: string | null;
          career_field_other?: string | null;
          city?: string | null;
          confirmation_due_at?: string | null;
          country?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          employer?: string | null;
          first_name?: string;
          grad_year?: number;
          id?: string;
          institution_id?: string;
          job_title?: string | null;
          languages?: string[];
          last_confirmed_at?: string | null;
          last_name?: string;
          onboarding_completed_at?: string | null;
          onboarding_step?: number;
          preferred_name?: string | null;
          published_at?: string | null;
          status?: Database["public"]["Enums"]["profile_status"];
          updated_at?: string;
          user_id?: string | null;
          visibility?: Database["public"]["Enums"]["profile_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "alumni_profiles_career_field_id_fkey";
            columns: ["career_field_id"];
            isOneToOne: false;
            referencedRelation: "career_fields";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alumni_profiles_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_kind: string;
          actor_user_id: string | null;
          created_at: string;
          id: number;
          institution_id: string | null;
          metadata: NonNullable<Json>;
          target_id: string | null;
          target_type: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_kind: string;
          actor_user_id?: string | null;
          created_at?: string;
          id?: never;
          institution_id?: string | null;
          metadata?: NonNullable<Json>;
          target_id?: string | null;
          target_type?: string | null;
        };
        Update: {
          action?: string;
          actor_kind?: string;
          actor_user_id?: string | null;
          created_at?: string;
          id?: never;
          institution_id?: string | null;
          metadata?: NonNullable<Json>;
          target_id?: string | null;
          target_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      career_fields: {
        Row: {
          id: string;
          institution_id: string | null;
          is_active: boolean;
          key: string;
          label_en: string;
          label_fr: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          institution_id?: string | null;
          is_active?: boolean;
          key: string;
          label_en: string;
          label_fr: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          institution_id?: string | null;
          is_active?: boolean;
          key?: string;
          label_en?: string;
          label_fr?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "career_fields_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      confirmation_requests: {
        Row: {
          confirmed_at: string | null;
          created_at: string;
          due_at: string;
          id: string;
          institution_id: string;
          last_sent_at: string | null;
          profile_id: string;
          reminders_sent: number;
          status: string;
          token_hash: string | null;
        };
        ComputedFields: never;
        Insert: {
          confirmed_at?: string | null;
          created_at?: string;
          due_at: string;
          id?: string;
          institution_id: string;
          last_sent_at?: string | null;
          profile_id: string;
          reminders_sent?: number;
          status?: string;
          token_hash?: string | null;
        };
        Update: {
          confirmed_at?: string | null;
          created_at?: string;
          due_at?: string;
          id?: string;
          institution_id?: string;
          last_sent_at?: string | null;
          profile_id?: string;
          reminders_sent?: number;
          status?: string;
          token_hash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "confirmation_requests_profile_id_institution_id_fkey";
            columns: ["profile_id", "institution_id"];
            isOneToOne: false;
            referencedRelation: "alumni_profiles";
            referencedColumns: ["id", "institution_id"];
          },
        ];
      };
      consents: {
        Row: {
          accepted_at: string;
          document: Database["public"]["Enums"]["consent_document"];
          id: string;
          institution_id: string;
          user_id: string;
          version: string;
          withdrawn_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string;
          document: Database["public"]["Enums"]["consent_document"];
          id?: string;
          institution_id: string;
          user_id: string;
          version: string;
          withdrawn_at?: string | null;
        };
        Update: {
          accepted_at?: string;
          document?: Database["public"]["Enums"]["consent_document"];
          id?: string;
          institution_id?: string;
          user_id?: string;
          version?: string;
          withdrawn_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "consents_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_events: {
        Row: {
          channel: Database["public"]["Enums"]["channel_type"];
          created_at: string;
          id: string;
          initiator_user_id: string | null;
          institution_id: string;
          recipient_profile_id: string;
        };
        ComputedFields: never;
        Insert: {
          channel: Database["public"]["Enums"]["channel_type"];
          created_at?: string;
          id?: string;
          initiator_user_id?: string | null;
          institution_id: string;
          recipient_profile_id: string;
        };
        Update: {
          channel?: Database["public"]["Enums"]["channel_type"];
          created_at?: string;
          id?: string;
          initiator_user_id?: string | null;
          institution_id?: string;
          recipient_profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_events_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_events_recipient_profile_id_fkey";
            columns: ["recipient_profile_id"];
            isOneToOne: false;
            referencedRelation: "alumni_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      email_events: {
        Row: {
          created_at: string;
          id: string;
          occurred_at: string;
          outbox_id: string | null;
          payload: NonNullable<Json>;
          provider_message_id: string | null;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          occurred_at: string;
          outbox_id?: string | null;
          payload?: NonNullable<Json>;
          provider_message_id?: string | null;
          type: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          occurred_at?: string;
          outbox_id?: string | null;
          payload?: NonNullable<Json>;
          provider_message_id?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_events_outbox_id_fkey";
            columns: ["outbox_id"];
            isOneToOne: false;
            referencedRelation: "email_outbox";
            referencedColumns: ["id"];
          },
        ];
      };
      email_outbox: {
        Row: {
          attempts: number;
          created_at: string;
          id: string;
          institution_id: string | null;
          last_error: string | null;
          locale: Database["public"]["Enums"]["locale"];
          next_attempt_at: string;
          provider_message_id: string | null;
          sent_at: string | null;
          status: Database["public"]["Enums"]["email_status"];
          subject_id: string | null;
          template_key: string;
          to_email: string;
          to_user_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          created_at?: string;
          id?: string;
          institution_id?: string | null;
          last_error?: string | null;
          locale: Database["public"]["Enums"]["locale"];
          next_attempt_at?: string;
          provider_message_id?: string | null;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["email_status"];
          subject_id?: string | null;
          template_key: string;
          to_email: string;
          to_user_id?: string | null;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          id?: string;
          institution_id?: string | null;
          last_error?: string | null;
          locale?: Database["public"]["Enums"]["locale"];
          next_attempt_at?: string;
          provider_message_id?: string | null;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["email_status"];
          subject_id?: string | null;
          template_key?: string;
          to_email?: string;
          to_user_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_outbox_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      email_suppressions: {
        Row: {
          created_at: string;
          email: string;
          reason: string;
          source_event_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email: string;
          reason: string;
          source_event_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          reason?: string;
          source_event_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_suppressions_source_event_id_fkey";
            columns: ["source_event_id"];
            isOneToOne: false;
            referencedRelation: "email_events";
            referencedColumns: ["id"];
          },
        ];
      };
      email_templates: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          body: string;
          created_at: string;
          edited_by: string | null;
          id: string;
          institution_id: string | null;
          key: Database["public"]["Enums"]["email_template_key"];
          locale: Database["public"]["Enums"]["locale"];
          status: Database["public"]["Enums"]["template_status"];
          subject: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          body: string;
          created_at?: string;
          edited_by?: string | null;
          id?: string;
          institution_id?: string | null;
          key: Database["public"]["Enums"]["email_template_key"];
          locale: Database["public"]["Enums"]["locale"];
          status: Database["public"]["Enums"]["template_status"];
          subject: string;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          body?: string;
          created_at?: string;
          edited_by?: string | null;
          id?: string;
          institution_id?: string | null;
          key?: Database["public"]["Enums"]["email_template_key"];
          locale?: Database["public"]["Enums"]["locale"];
          status?: Database["public"]["Enums"]["template_status"];
          subject?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_templates_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      exports: {
        Row: {
          created_at: string;
          downloaded_at: string | null;
          expires_at: string;
          filters: NonNullable<Json>;
          format: string;
          id: string;
          institution_id: string;
          requested_by: string | null;
          row_count: number | null;
          storage_path: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          downloaded_at?: string | null;
          expires_at?: string;
          filters?: NonNullable<Json>;
          format: string;
          id?: string;
          institution_id: string;
          requested_by?: string | null;
          row_count?: number | null;
          storage_path?: string | null;
        };
        Update: {
          created_at?: string;
          downloaded_at?: string | null;
          expires_at?: string;
          filters?: NonNullable<Json>;
          format?: string;
          id?: string;
          institution_id?: string;
          requested_by?: string | null;
          row_count?: number | null;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "exports_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      institution_memberships: {
        Row: {
          created_at: string;
          id: string;
          institution_id: string;
          role: Database["public"]["Enums"]["member_role"];
          status: Database["public"]["Enums"]["member_status"];
          status_changed_at: string | null;
          status_changed_by: string | null;
          status_reason: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          institution_id: string;
          role: Database["public"]["Enums"]["member_role"];
          status?: Database["public"]["Enums"]["member_status"];
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          status_reason?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          institution_id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          status?: Database["public"]["Enums"]["member_status"];
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          status_reason?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "institution_memberships_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      institutions: {
        Row: {
          branding: NonNullable<Json>;
          confirmation_interval_months: number;
          created_at: string;
          custom_domain: string | null;
          default_locale: Database["public"]["Enums"]["locale"];
          email_display_name: string | null;
          id: string;
          name: string;
          reply_to_email: string | null;
          slug: string;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          branding?: NonNullable<Json>;
          confirmation_interval_months?: number;
          created_at?: string;
          custom_domain?: string | null;
          default_locale?: Database["public"]["Enums"]["locale"];
          email_display_name?: string | null;
          id?: string;
          name: string;
          reply_to_email?: string | null;
          slug: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          branding?: NonNullable<Json>;
          confirmation_interval_months?: number;
          created_at?: string;
          custom_domain?: string | null;
          default_locale?: Database["public"]["Enums"]["locale"];
          email_display_name?: string | null;
          id?: string;
          name?: string;
          reply_to_email?: string | null;
          slug?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      job_runs: {
        Row: {
          error: string | null;
          finished_at: string | null;
          id: string;
          job: string;
          started_at: string;
          stats: NonNullable<Json>;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          job: string;
          started_at?: string;
          stats?: NonNullable<Json>;
          status?: string;
        };
        Update: {
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          job?: string;
          started_at?: string;
          stats?: NonNullable<Json>;
          status?: string;
        };
        Relationships: [];
      };
      offer_types: {
        Row: {
          audience: string;
          id: string;
          institution_id: string | null;
          is_active: boolean;
          key: string;
          label_en: string;
          label_fr: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          audience?: string;
          id?: string;
          institution_id?: string | null;
          is_active?: boolean;
          key: string;
          label_en: string;
          label_fr: string;
          sort_order?: number;
        };
        Update: {
          audience?: string;
          id?: string;
          institution_id?: string | null;
          is_active?: boolean;
          key?: string;
          label_en?: string;
          label_fr?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "offer_types_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_access_grants: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          institution_id: string;
          reason: string;
          revoked_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          institution_id: string;
          reason: string;
          revoked_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          institution_id?: string;
          reason?: string;
          revoked_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "platform_access_grants_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "platform_access_grants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "platform_admins";
            referencedColumns: ["user_id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          created_at: string;
          created_by: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      profile_confirmations: {
        Row: {
          actor_user_id: string | null;
          created_at: string;
          id: string;
          institution_id: string;
          profile_id: string;
          source: Database["public"]["Enums"]["confirmation_source"];
        };
        ComputedFields: never;
        Insert: {
          actor_user_id?: string | null;
          created_at?: string;
          id?: string;
          institution_id: string;
          profile_id: string;
          source: Database["public"]["Enums"]["confirmation_source"];
        };
        Update: {
          actor_user_id?: string | null;
          created_at?: string;
          id?: string;
          institution_id?: string;
          profile_id?: string;
          source?: Database["public"]["Enums"]["confirmation_source"];
        };
        Relationships: [
          {
            foreignKeyName: "profile_confirmations_profile_id_institution_id_fkey";
            columns: ["profile_id", "institution_id"];
            isOneToOne: false;
            referencedRelation: "alumni_profiles";
            referencedColumns: ["id", "institution_id"];
          },
        ];
      };
      profile_contact_channels: {
        Row: {
          created_at: string;
          id: string;
          institution_id: string;
          is_public: boolean;
          profile_id: string;
          sort_order: number;
          type: Database["public"]["Enums"]["channel_type"];
          value: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          institution_id: string;
          is_public?: boolean;
          profile_id: string;
          sort_order?: number;
          type: Database["public"]["Enums"]["channel_type"];
          value: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          institution_id?: string;
          is_public?: boolean;
          profile_id?: string;
          sort_order?: number;
          type?: Database["public"]["Enums"]["channel_type"];
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_contact_channels_profile_id_institution_id_fkey";
            columns: ["profile_id", "institution_id"];
            isOneToOne: false;
            referencedRelation: "alumni_profiles";
            referencedColumns: ["id", "institution_id"];
          },
        ];
      };
      profile_offers: {
        Row: {
          institution_id: string;
          offer_type_id: string;
          profile_id: string;
        };
        ComputedFields: never;
        Insert: {
          institution_id: string;
          offer_type_id: string;
          profile_id: string;
        };
        Update: {
          institution_id?: string;
          offer_type_id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_offers_offer_type_id_fkey";
            columns: ["offer_type_id"];
            isOneToOne: false;
            referencedRelation: "offer_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_offers_profile_id_institution_id_fkey";
            columns: ["profile_id", "institution_id"];
            isOneToOne: false;
            referencedRelation: "alumni_profiles";
            referencedColumns: ["id", "institution_id"];
          },
        ];
      };
      rate_limit_counters: {
        Row: {
          count: number;
          key: string;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          count?: number;
          key: string;
          window_start: string;
        };
        Update: {
          count?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          permission: string;
          role: Database["public"]["Enums"]["member_role"];
        };
        ComputedFields: never;
        Insert: {
          permission: string;
          role: Database["public"]["Enums"]["member_role"];
        };
        Update: {
          permission?: string;
          role?: Database["public"]["Enums"]["member_role"];
        };
        Relationships: [];
      };
      staff_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          institution_id: string;
          invited_by: string | null;
          revoked_at: string | null;
          role: Database["public"]["Enums"]["member_role"];
          token_hash: string | null;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          institution_id: string;
          invited_by?: string | null;
          revoked_at?: string | null;
          role: Database["public"]["Enums"]["member_role"];
          token_hash?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          institution_id?: string;
          invited_by?: string | null;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["member_role"];
          token_hash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "staff_invitations_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          locale: Database["public"]["Enums"]["locale"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          locale?: Database["public"]["Enums"]["locale"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          locale?: Database["public"]["Enums"]["locale"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_staff_invitation: { Args: { p_token: string }; Returns: string };
      access_request_matches: {
        Args: { p_requests: string[] };
        Returns: {
          claimed: boolean;
          first_name: string;
          grad_year: number;
          last_name: string;
          profile_id: string;
          request_id: string;
          score: number;
        }[];
      };
      admin_dashboard: { Args: { p_inst: string; p_since?: string }; Returns: Json };
      admin_profile_email: { Args: { p_profile: string }; Returns: string };
      admin_roster: {
        Args: {
          p_class_max?: number;
          p_class_min?: number;
          p_inst: string;
          p_limit?: number;
          p_offset?: number;
          p_query?: string;
          p_state?: string;
        };
        Returns: {
          city: string;
          country: string;
          employer: string;
          first_name: string;
          grad_year: number;
          id: string;
          job_title: string;
          last_confirmed_at: string;
          last_name: string;
          preferred_name: string;
          state: string;
          total_count: number;
        }[];
      };
      admin_update_profile: { Args: { p_patch: Json; p_profile: string }; Returns: undefined };
      approve_email_template: {
        Args: {
          p_inst: string;
          p_key: Database["public"]["Enums"]["email_template_key"];
          p_locale: Database["public"]["Enums"]["locale"];
        };
        Returns: undefined;
      };
      assert_last_school_admin_kept: {
        Args: { p_inst: string; p_user: string };
        Returns: undefined;
      };
      assert_permission: { Args: { p_inst: string; p_perm: string }; Returns: undefined };
      audit_people: {
        Args: { p_inst: string };
        Returns: {
          kind: string;
          label: string;
          user_id: string;
        }[];
      };
      career_field_allowed: { Args: { p_field: string; p_inst: string }; Returns: boolean };
      change_staff_role: {
        Args: {
          p_inst: string;
          p_role: Database["public"]["Enums"]["member_role"];
          p_user: string;
        };
        Returns: undefined;
      };
      clean_branding: { Args: { p_branding: Json }; Returns: Json };
      confirm_still_accurate: { Args: { p_token: string }; Returns: boolean };
      confirm_still_accurate_in_app: { Args: { p_inst: string }; Returns: undefined };
      create_staff_invitation: {
        Args: {
          p_email: string;
          p_inst: string;
          p_role: Database["public"]["Enums"]["member_role"];
        };
        Returns: string;
      };
      decide_access_request: {
        Args: { p_decision: string; p_link_profile?: string; p_reason?: string; p_request: string };
        Returns: string;
      };
      delete_my_profile: { Args: { p_inst: string }; Returns: undefined };
      directory_profile_ids: { Args: Record<PropertyKey, never>; Returns: string[] };
      enqueue_email: {
        Args: {
          p_inst: string;
          p_key: Database["public"]["Enums"]["email_template_key"];
          p_subject_id: string;
          p_to_email: string;
          p_to_user: string;
        };
        Returns: string;
      };
      export_my_data: { Args: { p_inst: string }; Returns: Json };
      has_active_grant: { Args: { p_inst: string }; Returns: boolean };
      has_permission: { Args: { p_inst: string; p_perm: string }; Returns: boolean };
      hash_token: { Args: { p_token: string }; Returns: string };
      hit_rate_limit: {
        Args: { p_key: string; p_max: number; p_window: string };
        Returns: boolean;
      };
      initiate_contact: {
        Args: { p_channel: Database["public"]["Enums"]["channel_type"]; p_profile: string };
        Returns: string;
      };
      invite_staff: {
        Args: {
          p_email: string;
          p_inst: string;
          p_role: Database["public"]["Enums"]["member_role"];
        };
        Returns: string;
      };
      is_member: { Args: { p_inst: string }; Returns: boolean };
      is_system_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      issue_staff_invitation_link: { Args: { p_invitation: string }; Returns: string };
      log_audit: {
        Args: {
          p_action: string;
          p_inst: string;
          p_metadata?: Json;
          p_target_id: string;
          p_target_type: string;
        };
        Returns: undefined;
      };
      mint_token: { Args: { p_id: string; p_kind: string }; Returns: string };
      my_profile_ids: { Args: Record<PropertyKey, never>; Returns: string[] };
      owns_profile: { Args: { p_profile: string }; Returns: boolean };
      permitted_institutions: { Args: { p_perm: string }; Returns: string[] };
      platform_add_admin: { Args: { p_email: string }; Returns: string };
      platform_admin_emails: {
        Args: Record<PropertyKey, never>;
        Returns: {
          email: string;
          user_id: string;
        }[];
      };
      platform_appoint_school_admin: { Args: { p_email: string; p_inst: string }; Returns: string };
      platform_create_school: {
        Args: {
          p_branding?: Json;
          p_default_locale?: Database["public"]["Enums"]["locale"];
          p_email_display_name?: string;
          p_name: string;
          p_reply_to?: string;
          p_slug: string;
        };
        Returns: string;
      };
      platform_open_grant: {
        Args: { p_hours?: number; p_inst: string; p_reason: string };
        Returns: string;
      };
      platform_revoke_grant: { Args: { p_grant: string }; Returns: undefined };
      platform_school_summaries: {
        Args: Record<PropertyKey, never>;
        Returns: {
          active_grants: number;
          created_at: string;
          id: string;
          members: number;
          name: string;
          open_invitations: number;
          pending_requests: number;
          slug: string;
          staff: number;
          status: string;
        }[];
      };
      platform_set_school_status: {
        Args: { p_inst: string; p_reason?: string; p_status: string };
        Returns: undefined;
      };
      public_school: { Args: { p_slug: string }; Returns: Json };
      record_confirmation: {
        Args: { p_profile: string; p_source: Database["public"]["Enums"]["confirmation_source"] };
        Returns: undefined;
      };
      record_consent: {
        Args: {
          p_document: Database["public"]["Enums"]["consent_document"];
          p_inst: string;
          p_version: string;
        };
        Returns: undefined;
      };
      remove_staff: { Args: { p_inst: string; p_user: string }; Returns: undefined };
      reply_to_info_request: { Args: { p_reply: string; p_request: string }; Returns: undefined };
      request_access: {
        Args: {
          p_first_name: string;
          p_grad_year: number;
          p_inst: string;
          p_last_name: string;
          p_maiden_name: string;
          p_note: string;
        };
        Returns: undefined;
      };
      resolve_email_template: {
        Args: {
          p_inst: string;
          p_key: Database["public"]["Enums"]["email_template_key"];
          p_locale: Database["public"]["Enums"]["locale"];
        };
        Returns: Database["public"]["Enums"]["locale"];
      };
      revoke_staff_invitation: { Args: { p_invitation: string }; Returns: undefined };
      save_email_template: {
        Args: {
          p_body: string;
          p_inst: string;
          p_key: Database["public"]["Enums"]["email_template_key"];
          p_locale: Database["public"]["Enums"]["locale"];
          p_subject: string;
        };
        Returns: undefined;
      };
      save_my_profile: { Args: { p_inst: string; p_payload: Json }; Returns: string };
      school_staff: {
        Args: { p_inst: string };
        Returns: {
          email: string;
          joined_at: string;
          name: string;
          role: Database["public"]["Enums"]["member_role"];
          status: Database["public"]["Enums"]["member_status"];
          user_id: string;
        }[];
      };
      search_directory: {
        Args: { p_filters?: Json; p_inst: string; p_limit?: number; p_offset?: number };
        Returns: {
          career_field_en: string;
          career_field_fr: string;
          career_field_key: string;
          city: string;
          country: string;
          employer: string;
          first_name: string;
          grad_year: number;
          id: string;
          job_title: string;
          last_name: string;
          offers: string[];
          preferred_name: string;
          schools: string[];
          total_count: number;
        }[];
      };
      set_my_locale: {
        Args: { p_locale: Database["public"]["Enums"]["locale"] };
        Returns: undefined;
      };
      set_my_visibility: {
        Args: { p_inst: string; p_visibility: Database["public"]["Enums"]["profile_visibility"] };
        Returns: undefined;
      };
      set_profile_status: {
        Args: {
          p_profile: string;
          p_reason?: string;
          p_status: Database["public"]["Enums"]["profile_status"];
        };
        Returns: undefined;
      };
      update_school_settings: { Args: { p_inst: string; p_patch: Json }; Returns: undefined };
      validate_template_text: { Args: { p_body: string; p_subject: string }; Returns: undefined };
      withdraw_access_request: { Args: { p_request: string }; Returns: undefined };
      withdraw_consent: {
        Args: { p_document: Database["public"]["Enums"]["consent_document"]; p_inst: string };
        Returns: undefined;
      };
    };
    Enums: {
      channel_type: "email" | "phone" | "linkedin" | "facebook" | "instagram" | "website";
      confirmation_source: "onboarding" | "alumnus_save" | "alumnus_still_accurate";
      consent_document: "terms" | "privacy_policy" | "directory_publication";
      email_status:
        | "queued"
        | "sending"
        | "sent"
        | "delivered"
        | "bounced"
        | "complained"
        | "failed"
        | "suppressed"
        | "skipped_no_template";
      email_template_key:
        | "access_approved"
        | "access_needs_info"
        | "access_rejected"
        | "welcome"
        | "staff_invitation"
        | "annual_confirmation"
        | "confirmation_reminder_1"
        | "confirmation_reminder_2";
      locale: "en" | "fr";
      member_role: "school_admin" | "reviewer" | "alumni" | "student";
      member_status: "active" | "suspended" | "revoked";
      profile_status: "active" | "suspended" | "archived" | "deceased" | "deleted";
      profile_visibility: "hidden" | "members";
      request_source: "signup" | "import";
      request_status: "pending" | "needs_info" | "approved" | "rejected" | "withdrawn";
      template_status: "draft" | "approved";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      channel_type: ["email", "phone", "linkedin", "facebook", "instagram", "website"],
      confirmation_source: ["onboarding", "alumnus_save", "alumnus_still_accurate"],
      consent_document: ["terms", "privacy_policy", "directory_publication"],
      email_status: [
        "queued",
        "sending",
        "sent",
        "delivered",
        "bounced",
        "complained",
        "failed",
        "suppressed",
        "skipped_no_template",
      ],
      email_template_key: [
        "access_approved",
        "access_needs_info",
        "access_rejected",
        "welcome",
        "staff_invitation",
        "annual_confirmation",
        "confirmation_reminder_1",
        "confirmation_reminder_2",
      ],
      locale: ["en", "fr"],
      member_role: ["school_admin", "reviewer", "alumni", "student"],
      member_status: ["active", "suspended", "revoked"],
      profile_status: ["active", "suspended", "archived", "deceased", "deleted"],
      profile_visibility: ["hidden", "members"],
      request_source: ["signup", "import"],
      request_status: ["pending", "needs_info", "approved", "rejected", "withdrawn"],
      template_status: ["draft", "approved"],
    },
  },
} as const;
