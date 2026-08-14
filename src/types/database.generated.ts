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
    PostgrestVersion: "14.15"
  }
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
      activity_logs: {
        Row: {
          action: Database["public"]["Enums"]["activity_action"]
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          organization_id: string
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["activity_action"]
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          organization_id: string
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["activity_action"]
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bed_assignments: {
        Row: {
          assigned_by: string | null
          bed_id: string
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          organization_id: string
          property_id: string
          resident_id: string
          room_id: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          bed_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id: string
          property_id: string
          resident_id: string
          room_id: string
          start_date?: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          bed_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id?: string
          property_id?: string
          resident_id?: string
          room_id?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bed_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bed_assignments_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bed_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bed_assignments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bed_assignments_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bed_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      beds: {
        Row: {
          bed_label: string
          created_at: string | null
          id: string
          monthly_rent: number | null
          organization_id: string
          property_id: string
          room_id: string
          status: Database["public"]["Enums"]["bed_status"] | null
          updated_at: string | null
        }
        Insert: {
          bed_label: string
          created_at?: string | null
          id?: string
          monthly_rent?: number | null
          organization_id: string
          property_id: string
          room_id: string
          status?: Database["public"]["Enums"]["bed_status"] | null
          updated_at?: string | null
        }
        Update: {
          bed_label?: string
          created_at?: string | null
          id?: string
          monthly_rent?: number | null
          organization_id?: string
          property_id?: string
          room_id?: string
          status?: Database["public"]["Enums"]["bed_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      floors: {
        Row: {
          created_at: string | null
          floor_number: number
          id: string
          label: string
          organization_id: string
          property_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          floor_number: number
          id?: string
          label: string
          organization_id: string
          property_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          floor_number?: number
          id?: string
          label?: string
          organization_id?: string
          property_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floors_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"] | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string
          organization_id: string
          property_id: string | null
          severity: Database["public"]["Enums"]["notification_severity"] | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string | null
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"] | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          organization_id: string
          property_id?: string | null
          severity?: Database["public"]["Enums"]["notification_severity"] | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"] | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          organization_id?: string
          property_id?: string | null
          severity?: Database["public"]["Enums"]["notification_severity"] | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
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
      organizations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_demo: boolean
          logo_url: string | null
          name: string
          onboarding_completed_at: string | null
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          logo_url?: string | null
          name: string
          onboarding_completed_at?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean
          logo_url?: string | null
          name?: string
          onboarding_completed_at?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_type: Database["public"]["Enums"]["payment_type"]
          property_id: string
          recorded_by: string | null
          rent_month: string | null
          resident_id: string
          status: Database["public"]["Enums"]["payment_status"]
          transaction_reference: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_type?: Database["public"]["Enums"]["payment_type"]
          property_id: string
          recorded_by?: string | null
          rent_month?: string | null
          resident_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_type?: Database["public"]["Enums"]["payment_type"]
          property_id?: string
          recorded_by?: string | null
          rent_month?: string | null
          resident_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          organization_id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          organization_id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address_line: string
          city: string
          contact_phone: string | null
          created_at: string | null
          floor_count: number | null
          id: string
          internal_code: string | null
          manager_id: string | null
          name: string
          notes: string | null
          organization_id: string
          pincode: string
          state: string
          status: Database["public"]["Enums"]["property_status"] | null
          updated_at: string | null
        }
        Insert: {
          address_line: string
          city: string
          contact_phone?: string | null
          created_at?: string | null
          floor_count?: number | null
          id?: string
          internal_code?: string | null
          manager_id?: string | null
          name: string
          notes?: string | null
          organization_id: string
          pincode: string
          state: string
          status?: Database["public"]["Enums"]["property_status"] | null
          updated_at?: string | null
        }
        Update: {
          address_line?: string
          city?: string
          contact_phone?: string | null
          created_at?: string | null
          floor_count?: number | null
          id?: string
          internal_code?: string | null
          manager_id?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          pincode?: string
          state?: string
          status?: Database["public"]["Enums"]["property_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_user_assignments: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_user_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_user_assignments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_user_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resident_contacts: {
        Row: {
          address: string | null
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at: string | null
          id: string
          name: string
          organization_id: string
          phone: string
          relation: string | null
          resident_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
          phone: string
          relation?: string | null
          resident_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string
          relation?: string | null
          resident_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resident_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resident_contacts_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      resident_documents: {
        Row: {
          created_at: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_size: number | null
          id: string
          is_verified: boolean | null
          mime_type: string | null
          organization_id: string
          resident_id: string
          storage_path: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_size?: number | null
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          organization_id: string
          resident_id: string
          storage_path: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_size?: number | null
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          organization_id?: string
          resident_id?: string
          storage_path?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resident_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resident_documents_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resident_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          agreement_status:
            | Database["public"]["Enums"]["agreement_status"]
            | null
          company_college: string | null
          created_at: string | null
          current_bed_assignment_id: string | null
          date_of_birth: string | null
          email: string | null
          employee_student_id: string | null
          full_name: string
          gender: string | null
          id: string
          id_last_four: string | null
          id_number_masked: string | null
          id_type: Database["public"]["Enums"]["id_type"] | null
          joining_date: string
          mobile: string
          monthly_rent: number
          organization_id: string
          permanent_address: Json | null
          photo_url: string | null
          planned_checkout_date: string | null
          property_id: string | null
          remarks: string | null
          security_deposit_amount: number | null
          status: Database["public"]["Enums"]["resident_status"] | null
          updated_at: string | null
          work_address: string | null
        }
        Insert: {
          agreement_status?:
            | Database["public"]["Enums"]["agreement_status"]
            | null
          company_college?: string | null
          created_at?: string | null
          current_bed_assignment_id?: string | null
          date_of_birth?: string | null
          email?: string | null
          employee_student_id?: string | null
          full_name: string
          gender?: string | null
          id?: string
          id_last_four?: string | null
          id_number_masked?: string | null
          id_type?: Database["public"]["Enums"]["id_type"] | null
          joining_date: string
          mobile: string
          monthly_rent?: number
          organization_id: string
          permanent_address?: Json | null
          photo_url?: string | null
          planned_checkout_date?: string | null
          property_id?: string | null
          remarks?: string | null
          security_deposit_amount?: number | null
          status?: Database["public"]["Enums"]["resident_status"] | null
          updated_at?: string | null
          work_address?: string | null
        }
        Update: {
          agreement_status?:
            | Database["public"]["Enums"]["agreement_status"]
            | null
          company_college?: string | null
          created_at?: string | null
          current_bed_assignment_id?: string | null
          date_of_birth?: string | null
          email?: string | null
          employee_student_id?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          id_last_four?: string | null
          id_number_masked?: string | null
          id_type?: Database["public"]["Enums"]["id_type"] | null
          joining_date?: string
          mobile?: string
          monthly_rent?: number
          organization_id?: string
          permanent_address?: Json | null
          photo_url?: string | null
          planned_checkout_date?: string | null
          property_id?: string | null
          remarks?: string | null
          security_deposit_amount?: number | null
          status?: Database["public"]["Enums"]["resident_status"] | null
          updated_at?: string | null
          work_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_current_bed_assignment"
            columns: ["current_bed_assignment_id"]
            isOneToOne: false
            referencedRelation: "bed_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      room_transfers: {
        Row: {
          created_at: string | null
          from_bed_assignment_id: string
          id: string
          notes: string | null
          organization_id: string
          reason: string | null
          resident_id: string
          to_bed_assignment_id: string
          transfer_date: string
          transferred_by: string | null
        }
        Insert: {
          created_at?: string | null
          from_bed_assignment_id: string
          id?: string
          notes?: string | null
          organization_id: string
          reason?: string | null
          resident_id: string
          to_bed_assignment_id: string
          transfer_date?: string
          transferred_by?: string | null
        }
        Update: {
          created_at?: string | null
          from_bed_assignment_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          reason?: string | null
          resident_id?: string
          to_bed_assignment_id?: string
          transfer_date?: string
          transferred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_transfers_from_bed_assignment_id_fkey"
            columns: ["from_bed_assignment_id"]
            isOneToOne: false
            referencedRelation: "bed_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_transfers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_transfers_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_transfers_to_bed_assignment_id_fkey"
            columns: ["to_bed_assignment_id"]
            isOneToOne: false
            referencedRelation: "bed_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_transfers_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          bed_capacity: number
          created_at: string | null
          floor_id: string | null
          gender_restriction:
            | Database["public"]["Enums"]["gender_restriction"]
            | null
          id: string
          is_active: boolean | null
          monthly_rent: number
          notes: string | null
          organization_id: string
          property_id: string
          room_number: string
          room_type: Database["public"]["Enums"]["room_type"] | null
          updated_at: string | null
        }
        Insert: {
          bed_capacity?: number
          created_at?: string | null
          floor_id?: string | null
          gender_restriction?:
            | Database["public"]["Enums"]["gender_restriction"]
            | null
          id?: string
          is_active?: boolean | null
          monthly_rent?: number
          notes?: string | null
          organization_id: string
          property_id: string
          room_number: string
          room_type?: Database["public"]["Enums"]["room_type"] | null
          updated_at?: string | null
        }
        Update: {
          bed_capacity?: number
          created_at?: string | null
          floor_id?: string | null
          gender_restriction?:
            | Database["public"]["Enums"]["gender_restriction"]
            | null
          id?: string
          is_active?: boolean | null
          monthly_rent?: number
          notes?: string | null
          organization_id?: string
          property_id?: string
          room_number?: string
          room_type?: Database["public"]["Enums"]["room_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      security_deposits: {
        Row: {
          amount_held: number
          amount_refunded: number | null
          created_at: string | null
          deductions: number | null
          id: string
          notes: string | null
          organization_id: string
          refund_date: string | null
          resident_id: string
          status: Database["public"]["Enums"]["deposit_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount_held?: number
          amount_refunded?: number | null
          created_at?: string | null
          deductions?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          refund_date?: string | null
          resident_id: string
          status?: Database["public"]["Enums"]["deposit_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount_held?: number
          amount_refunded?: number | null
          created_at?: string | null
          deductions?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          refund_date?: string | null
          resident_id?: string
          status?: Database["public"]["Enums"]["deposit_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_deposits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_deposits_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_organization: {
        Args: {
          p_full_name: string
          p_organization_name: string
          p_phone?: string
        }
        Returns: string
      }
      can_access_resident: { Args: { p_resident_id: string }; Returns: boolean }
      can_user_write: { Args: never; Returns: boolean }
      get_user_organization_id: { Args: never; Returns: string }
      get_user_property_ids: { Args: never; Returns: string[] }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      slugify_organization_name: { Args: { p_name: string }; Returns: string }
    }
    Enums: {
      activity_action:
        | "created"
        | "updated"
        | "deleted"
        | "assigned"
        | "transferred"
        | "checked_out"
        | "payment_recorded"
        | "document_uploaded"
      agreement_status: "active" | "expired" | "pending"
      bed_status: "available" | "occupied" | "reserved" | "maintenance"
      contact_type: "guardian" | "emergency" | "other"
      deposit_status: "held" | "partial_refund" | "refunded" | "forfeited"
      document_type:
        | "profile_photo"
        | "aadhaar"
        | "pan"
        | "driving_license"
        | "passport"
        | "college_id"
        | "employee_id"
        | "agreement"
        | "police_verification"
        | "other"
      gender_restriction: "male" | "female" | "mixed" | "none"
      id_type: "aadhaar" | "pan" | "passport" | "driving_license" | "other"
      notification_channel: "in_app"
      notification_severity: "info" | "warning" | "critical"
      notification_type:
        | "rent_overdue"
        | "missing_document"
        | "checkout_reminder"
        | "agreement_expiry"
        | "general"
      payment_method: "cash" | "upi" | "bank_transfer" | "card" | "other"
      payment_status: "paid" | "partial" | "pending" | "overdue"
      payment_type: "rent" | "deposit" | "refund" | "other"
      property_status: "active" | "inactive" | "maintenance"
      resident_status:
        | "active"
        | "notice_period"
        | "checked_out"
        | "blacklisted"
      room_type: "single" | "double" | "triple" | "dorm" | "other"
      user_role: "owner" | "property_admin" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
      activity_action: [
        "created",
        "updated",
        "deleted",
        "assigned",
        "transferred",
        "checked_out",
        "payment_recorded",
        "document_uploaded",
      ],
      agreement_status: ["active", "expired", "pending"],
      bed_status: ["available", "occupied", "reserved", "maintenance"],
      contact_type: ["guardian", "emergency", "other"],
      deposit_status: ["held", "partial_refund", "refunded", "forfeited"],
      document_type: [
        "profile_photo",
        "aadhaar",
        "pan",
        "driving_license",
        "passport",
        "college_id",
        "employee_id",
        "agreement",
        "police_verification",
        "other",
      ],
      gender_restriction: ["male", "female", "mixed", "none"],
      id_type: ["aadhaar", "pan", "passport", "driving_license", "other"],
      notification_channel: ["in_app"],
      notification_severity: ["info", "warning", "critical"],
      notification_type: [
        "rent_overdue",
        "missing_document",
        "checkout_reminder",
        "agreement_expiry",
        "general",
      ],
      payment_method: ["cash", "upi", "bank_transfer", "card", "other"],
      payment_status: ["paid", "partial", "pending", "overdue"],
      payment_type: ["rent", "deposit", "refund", "other"],
      property_status: ["active", "inactive", "maintenance"],
      resident_status: [
        "active",
        "notice_period",
        "checked_out",
        "blacklisted",
      ],
      room_type: ["single", "double", "triple", "dorm", "other"],
      user_role: ["owner", "property_admin", "viewer"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
