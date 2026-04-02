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
      devis: {
        Row: {
          annee: string | null
          assigned_user_id: string | null
          billing_responsible_user_id: string | null
          client_nom: string | null
          client_tel: string | null
          created_at: string
          created_by: string | null
          id: string
          marque: string | null
          modele: string | null
          notes: string | null
          statut: string
          updated_at: string
          vin: string | null
        }
        Insert: {
          annee?: string | null
          assigned_user_id?: string | null
          billing_responsible_user_id?: string | null
          client_nom?: string | null
          client_tel?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          marque?: string | null
          modele?: string | null
          notes?: string | null
          statut?: string
          updated_at?: string
          vin?: string | null
        }
        Update: {
          annee?: string | null
          assigned_user_id?: string | null
          billing_responsible_user_id?: string | null
          client_nom?: string | null
          client_tel?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          marque?: string | null
          modele?: string | null
          notes?: string | null
          statut?: string
          updated_at?: string
          vin?: string | null
        }
        Relationships: []
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
          content: string
          created_at: string
          devis_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          devis_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          devis_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
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
      postes: {
        Row: {
          actif: boolean
          created_at: string
          id: string
          metier_id: string
          nom: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          id: string
          metier_id: string
          nom: string
        }
        Update: {
          actif?: boolean
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
          poste_id: string
          source_devis_id: string | null
          statut: string
          updated_at: string
          vin: string | null
        }
        Insert: {
          annee?: string | null
          billing_responsible_user_id?: string | null
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
          poste_id: string
          source_devis_id?: string | null
          statut?: string
          updated_at?: string
          vin?: string | null
        }
        Update: {
          annee?: string | null
          billing_responsible_user_id?: string | null
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
          poste_id?: string
          source_devis_id?: string | null
          statut?: string
          updated_at?: string
          vin?: string | null
        }
        Relationships: [
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
      app_role: "administrateur" | "contributeur"
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
    },
  },
} as const
