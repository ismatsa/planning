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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_audit_log: {
        Row: {
          created_at: string
          denial_reason: string | null
          id: string
          integration_id: string | null
          integration_name: string | null
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          operation: string
          record_id: string | null
          request_id: string
          resource: string
          result: string
        }
        Insert: {
          created_at?: string
          denial_reason?: string | null
          id?: string
          integration_id?: string | null
          integration_name?: string | null
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          operation: string
          record_id?: string | null
          request_id: string
          resource: string
          result: string
        }
        Update: {
          created_at?: string
          denial_reason?: string | null
          id?: string
          integration_id?: string | null
          integration_name?: string | null
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          operation?: string
          record_id?: string | null
          request_id?: string
          resource?: string
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_audit_log_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "api_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_idempotency_keys: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          idempotency_key: string
          integration_id: string
          request_hash: string
          response: Json
          status_code: number
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          idempotency_key: string
          integration_id: string
          request_hash: string
          response: Json
          status_code: number
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          idempotency_key?: string
          integration_id?: string
          request_hash?: string
          response?: Json
          status_code?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_idempotency_keys_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "api_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_integrations: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          bucket: string
          request_count: number
          window_start: string
        }
        Insert: {
          bucket: string
          request_count?: number
          window_start?: string
        }
        Update: {
          bucket?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          heure_max: string
          heure_min: string
          id: number
          jours_ouvres: Json
        }
        Insert: {
          heure_max?: string
          heure_min?: string
          id?: number
          jours_ouvres?: Json
        }
        Update: {
          heure_max?: string
          heure_min?: string
          id?: number
          jours_ouvres?: Json
        }
        Relationships: []
      }
      appointment_intervenants: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          intervenant_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          intervenant_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          intervenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_intervenants_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "rendez_vous"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_intervenants_intervenant_id_fkey"
            columns: ["intervenant_id"]
            isOneToOne: false
            referencedRelation: "intervenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_responsibles: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_responsibles_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "rendez_vous"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_audit_logs: {
        Row: {
          action: string
          created_at: string
          error: string | null
          id: string
          job_id: string | null
          new_value: Json | null
          old_value: Json | null
          record_id: string | null
          resource: string | null
          result: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          error?: string | null
          id?: string
          job_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          resource?: string | null
          result?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          error?: string | null
          id?: string
          job_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          resource?: string | null
          result?: string
          user_id?: string | null
        }
        Relationships: []
      }
      assistant_conversations: {
        Row: {
          assistant: string
          created_at: string
          hermes_session_id: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assistant?: string
          created_at?: string
          hermes_session_id?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assistant?: string
          created_at?: string
          hermes_session_id?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          attachments: Json
          content: string
          conversation_id: string
          created_at: string
          id: string
          job_id: string | null
          result: Json | null
          role: string
          status: string | null
          user_id: string
        }
        Insert: {
          attachments?: Json
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          job_id?: string | null
          result?: Json | null
          role: string
          status?: string | null
          user_id: string
        }
        Update: {
          attachments?: Json
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          job_id?: string | null
          result?: Json | null
          role?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          adresse: string | null
          created_at: string
          created_by: string | null
          email: string | null
          ice: string | null
          id: string
          nom: string | null
          notes_internes: string | null
          prenom: string | null
          raison_sociale: string | null
          statut: Database["public"]["Enums"]["client_statut"]
          telephone: string
          telephone_secondaire: string | null
          type_client: Database["public"]["Enums"]["client_type"]
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          ice?: string | null
          id?: string
          nom?: string | null
          notes_internes?: string | null
          prenom?: string | null
          raison_sociale?: string | null
          statut?: Database["public"]["Enums"]["client_statut"]
          telephone: string
          telephone_secondaire?: string | null
          type_client?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          ice?: string | null
          id?: string
          nom?: string | null
          notes_internes?: string | null
          prenom?: string | null
          raison_sociale?: string | null
          statut?: Database["public"]["Enums"]["client_statut"]
          telephone?: string
          telephone_secondaire?: string | null
          type_client?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      devis: {
        Row: {
          annee: string | null
          assigned_user_id: string | null
          billing_responsible_user_id: string | null
          client_id: string | null
          client_nom: string | null
          client_tel: string | null
          created_at: string
          created_by: string | null
          follow_up_count: number
          id: string
          last_follow_up_at: string | null
          marque: string | null
          modele: string | null
          notes: string | null
          sent_at: string | null
          status_changed_at: string | null
          statut: string
          updated_at: string
          vehicule_id: string | null
          vin: string | null
        }
        Insert: {
          annee?: string | null
          assigned_user_id?: string | null
          billing_responsible_user_id?: string | null
          client_id?: string | null
          client_nom?: string | null
          client_tel?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_count?: number
          id?: string
          last_follow_up_at?: string | null
          marque?: string | null
          modele?: string | null
          notes?: string | null
          sent_at?: string | null
          status_changed_at?: string | null
          statut?: string
          updated_at?: string
          vehicule_id?: string | null
          vin?: string | null
        }
        Update: {
          annee?: string | null
          assigned_user_id?: string | null
          billing_responsible_user_id?: string | null
          client_id?: string | null
          client_nom?: string | null
          client_tel?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_count?: number
          id?: string
          last_follow_up_at?: string | null
          marque?: string | null
          modele?: string | null
          notes?: string | null
          sent_at?: string | null
          status_changed_at?: string | null
          statut?: string
          updated_at?: string
          vehicule_id?: string | null
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          data_url: string | null
          devis_id: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          data_url?: string | null
          devis_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          data_url?: string | null
          devis_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devis_attachments_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_comments: {
        Row: {
          attachment_id: string | null
          content: string | null
          created_at: string
          devis_id: string
          id: string
          user_id: string
        }
        Insert: {
          attachment_id?: string | null
          content?: string | null
          created_at?: string
          devis_id: string
          id?: string
          user_id: string
        }
        Update: {
          attachment_id?: string | null
          content?: string | null
          created_at?: string
          devis_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devis_comments_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "devis_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_comments_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_intervenants: {
        Row: {
          created_at: string
          devis_id: string
          id: string
          intervenant_id: string
        }
        Insert: {
          created_at?: string
          devis_id: string
          id?: string
          intervenant_id: string
        }
        Update: {
          created_at?: string
          devis_id?: string
          id?: string
          intervenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devis_intervenants_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_intervenants_intervenant_id_fkey"
            columns: ["intervenant_id"]
            isOneToOne: false
            referencedRelation: "intervenants"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_lines: {
        Row: {
          commande_user_id: string | null
          created_at: string
          description: string | null
          devis_id: string
          discount_amount: number
          discount_percent: number
          id: string
          internal_reference: string | null
          name: string
          oem_reference: string | null
          quantity: number
          realisation_user_id: string | null
          sort_order: number
          type: string
          unit_price: number
        }
        Insert: {
          commande_user_id?: string | null
          created_at?: string
          description?: string | null
          devis_id: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          internal_reference?: string | null
          name?: string
          oem_reference?: string | null
          quantity?: number
          realisation_user_id?: string | null
          sort_order?: number
          type?: string
          unit_price?: number
        }
        Update: {
          commande_user_id?: string | null
          created_at?: string
          description?: string | null
          devis_id?: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          internal_reference?: string | null
          name?: string
          oem_reference?: string | null
          quantity?: number
          realisation_user_id?: string | null
          sort_order?: number
          type?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "devis_lines_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_metiers: {
        Row: {
          created_at: string
          devis_id: string
          id: string
          metier_id: string
        }
        Insert: {
          created_at?: string
          devis_id: string
          id?: string
          metier_id: string
        }
        Update: {
          created_at?: string
          devis_id?: string
          id?: string
          metier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devis_metiers_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_responsibles: {
        Row: {
          created_at: string
          devis_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          devis_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          devis_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devis_responsibles_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      disponibilite_postes: {
        Row: {
          duree_defaut: number
          durees_autorisees: Json
          id: string
          jour_semaine: number
          plages: Json
          poste_id: string
          tampon: number
        }
        Insert: {
          duree_defaut?: number
          durees_autorisees?: Json
          id?: string
          jour_semaine: number
          plages?: Json
          poste_id: string
          tampon?: number
        }
        Update: {
          duree_defaut?: number
          durees_autorisees?: Json
          id?: string
          jour_semaine?: number
          plages?: Json
          poste_id?: string
          tampon?: number
        }
        Relationships: [
          {
            foreignKeyName: "disponibilite_postes_poste_id_fkey"
            columns: ["poste_id"]
            isOneToOne: false
            referencedRelation: "postes"
            referencedColumns: ["id"]
          },
        ]
      }
      entretiens: {
        Row: {
          cout: number | null
          created_at: string
          created_by: string | null
          date_entretien: string
          description: string | null
          devis_id: string | null
          id: string
          kilometrage: number | null
          pieces_utilisees: string | null
          rdv_id: string | null
          realise_par: string | null
          type_entretien: Database["public"]["Enums"]["entretien_type"]
          updated_at: string
          vehicule_id: string
        }
        Insert: {
          cout?: number | null
          created_at?: string
          created_by?: string | null
          date_entretien?: string
          description?: string | null
          devis_id?: string | null
          id?: string
          kilometrage?: number | null
          pieces_utilisees?: string | null
          rdv_id?: string | null
          realise_par?: string | null
          type_entretien?: Database["public"]["Enums"]["entretien_type"]
          updated_at?: string
          vehicule_id: string
        }
        Update: {
          cout?: number | null
          created_at?: string
          created_by?: string | null
          date_entretien?: string
          description?: string | null
          devis_id?: string | null
          id?: string
          kilometrage?: number | null
          pieces_utilisees?: string | null
          rdv_id?: string | null
          realise_par?: string | null
          type_entretien?: Database["public"]["Enums"]["entretien_type"]
          updated_at?: string
          vehicule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entretiens_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entretiens_rdv_id_fkey"
            columns: ["rdv_id"]
            isOneToOne: false
            referencedRelation: "rendez_vous"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entretiens_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      exception_disponibilites: {
        Row: {
          date: string
          ferme: boolean
          id: string
          plages_override: Json | null
          poste_id: string
        }
        Insert: {
          date: string
          ferme?: boolean
          id?: string
          plages_override?: Json | null
          poste_id: string
        }
        Update: {
          date?: string
          ferme?: boolean
          id?: string
          plages_override?: Json | null
          poste_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exception_disponibilites_poste_id_fkey"
            columns: ["poste_id"]
            isOneToOne: false
            referencedRelation: "postes"
            referencedColumns: ["id"]
          },
        ]
      }
      hermes_jobs: {
        Row: {
          action_hint: string | null
          attachments: Json
          attempts: number
          claimed_at: string | null
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          message: string
          missing_fields: Json
          result: Json | null
          status: string
          user_id: string
          user_role: string
          warnings: Json
        }
        Insert: {
          action_hint?: string | null
          attachments?: Json
          attempts?: number
          claimed_at?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key: string
          message?: string
          missing_fields?: Json
          result?: Json | null
          status?: string
          user_id: string
          user_role: string
          warnings?: Json
        }
        Update: {
          action_hint?: string | null
          attachments?: Json
          attempts?: number
          claimed_at?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          message?: string
          missing_fields?: Json
          result?: Json | null
          status?: string
          user_id?: string
          user_role?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "hermes_jobs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      intervenants: {
        Row: {
          created_at: string
          id: string
          name: string
          responsable_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          responsable_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          responsable_user_id?: string | null
        }
        Relationships: []
      }
      metiers: {
        Row: {
          couleur: string
          created_at: string
          id: string
          nom: string
        }
        Insert: {
          couleur?: string
          created_at?: string
          id: string
          nom: string
        }
        Update: {
          couleur?: string
          created_at?: string
          id?: string
          nom?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          item_key: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_key: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_key?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      postes: {
        Row: {
          actif: boolean
          color_hex: string | null
          created_at: string
          id: string
          metier_id: string
          nom: string
        }
        Insert: {
          actif?: boolean
          color_hex?: string | null
          created_at?: string
          id: string
          metier_id: string
          nom: string
        }
        Update: {
          actif?: boolean
          color_hex?: string | null
          created_at?: string
          id?: string
          metier_id?: string
          nom?: string
        }
        Relationships: [
          {
            foreignKeyName: "postes_metier_id_fkey"
            columns: ["metier_id"]
            isOneToOne: false
            referencedRelation: "metiers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          company: string | null
          created_at: string
          email: string
          id: string
        }
        Insert: {
          active?: boolean
          company?: string | null
          created_at?: string
          email: string
          id: string
        }
        Update: {
          active?: boolean
          company?: string | null
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      rdv_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          rdv_id: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          rdv_id: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          rdv_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rdv_attachments_rdv_id_fkey"
            columns: ["rdv_id"]
            isOneToOne: false
            referencedRelation: "rendez_vous"
            referencedColumns: ["id"]
          },
        ]
      }
      rendez_vous: {
        Row: {
          annee: string | null
          billing_responsible_user_id: string | null
          client_id: string | null
          client_nom: string | null
          client_tel: string | null
          created_at: string
          created_by: string | null
          debut: string
          fin: string
          id: string
          marque: string | null
          modele: string | null
          notes: string | null
          poste_id: string | null
          source_devis_id: string | null
          statut: string
          updated_at: string
          vehicule_id: string | null
          vin: string | null
        }
        Insert: {
          annee?: string | null
          billing_responsible_user_id?: string | null
          client_id?: string | null
          client_nom?: string | null
          client_tel?: string | null
          created_at?: string
          created_by?: string | null
          debut: string
          fin: string
          id?: string
          marque?: string | null
          modele?: string | null
          notes?: string | null
          poste_id?: string | null
          source_devis_id?: string | null
          statut?: string
          updated_at?: string
          vehicule_id?: string | null
          vin?: string | null
        }
        Update: {
          annee?: string | null
          billing_responsible_user_id?: string | null
          client_id?: string | null
          client_nom?: string | null
          client_tel?: string | null
          created_at?: string
          created_by?: string | null
          debut?: string
          fin?: string
          id?: string
          marque?: string | null
          modele?: string | null
          notes?: string | null
          poste_id?: string | null
          source_devis_id?: string | null
          statut?: string
          updated_at?: string
          vehicule_id?: string | null
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rendez_vous_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rendez_vous_poste_id_fkey"
            columns: ["poste_id"]
            isOneToOne: false
            referencedRelation: "postes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rendez_vous_source_devis_id_fkey"
            columns: ["source_devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rendez_vous_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          id: string
          poste_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          poste_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          poste_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_poste_id_fkey"
            columns: ["poste_id"]
            isOneToOne: false
            referencedRelation: "postes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicule_proprietaires: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          date_debut: string
          date_fin: string | null
          id: string
          motif: Database["public"]["Enums"]["proprietaire_motif"]
          vehicule_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          date_debut?: string
          date_fin?: string | null
          id?: string
          motif?: Database["public"]["Enums"]["proprietaire_motif"]
          vehicule_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          date_debut?: string
          date_fin?: string | null
          id?: string
          motif?: Database["public"]["Enums"]["proprietaire_motif"]
          vehicule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicule_proprietaires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicule_proprietaires_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicules: {
        Row: {
          annee: number | null
          boite_vitesses:
            | Database["public"]["Enums"]["boite_vitesses_type"]
            | null
          carburant: Database["public"]["Enums"]["carburant_type"] | null
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          immatriculation: string | null
          kilometrage_actuel: number | null
          marque: string
          modele: string
          motorisation: string | null
          notes: string | null
          statut: Database["public"]["Enums"]["vehicule_statut"]
          updated_at: string
          vin: string
        }
        Insert: {
          annee?: number | null
          boite_vitesses?:
            | Database["public"]["Enums"]["boite_vitesses_type"]
            | null
          carburant?: Database["public"]["Enums"]["carburant_type"] | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          immatriculation?: string | null
          kilometrage_actuel?: number | null
          marque: string
          modele: string
          motorisation?: string | null
          notes?: string | null
          statut?: Database["public"]["Enums"]["vehicule_statut"]
          updated_at?: string
          vin: string
        }
        Update: {
          annee?: number | null
          boite_vitesses?:
            | Database["public"]["Enums"]["boite_vitesses_type"]
            | null
          carburant?: Database["public"]["Enums"]["carburant_type"] | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          immatriculation?: string | null
          kilometrage_actuel?: number | null
          marque?: string
          modele?: string
          motorisation?: string | null
          notes?: string | null
          statut?: Database["public"]["Enums"]["vehicule_statut"]
          updated_at?: string
          vin?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      hermes_claim_next_job: {
        Args: never
        Returns: {
          action_hint: string | null
          attachments: Json
          attempts: number
          claimed_at: string | null
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          message: string
          missing_fields: Json
          result: Json | null
          status: string
          user_id: string
          user_role: string
          warnings: Json
        }[]
        SetofOptions: {
          from: "*"
          to: "hermes_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      hermes_purge_expired: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "administrateur" | "contributeur"
      boite_vitesses_type: "manuelle" | "automatique" | "autre"
      carburant_type:
        | "essence"
        | "diesel"
        | "hybride"
        | "electrique"
        | "gpl"
        | "autre"
      client_statut: "actif" | "archive"
      client_type: "particulier" | "societe"
      entretien_type:
        | "revision"
        | "vidange"
        | "reprogrammation"
        | "lavage"
        | "reparation"
        | "autre"
      proprietaire_motif: "achat" | "vente" | "transfert" | "autre"
      vehicule_statut: "actif" | "vendu" | "archive"
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
      app_role: ["administrateur", "contributeur"],
      boite_vitesses_type: ["manuelle", "automatique", "autre"],
      carburant_type: [
        "essence",
        "diesel",
        "hybride",
        "electrique",
        "gpl",
        "autre",
      ],
      client_statut: ["actif", "archive"],
      client_type: ["particulier", "societe"],
      entretien_type: [
        "revision",
        "vidange",
        "reprogrammation",
        "lavage",
        "reparation",
        "autre",
      ],
      proprietaire_motif: ["achat", "vente", "transfert", "autre"],
      vehicule_statut: ["actif", "vendu", "archive"],
    },
  },
} as const
