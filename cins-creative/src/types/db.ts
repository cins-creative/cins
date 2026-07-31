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
      article_alias: {
        Row: {
          id: string
          id_bai_viet: string
          nguon: Database["public"]["Enums"]["nguon_alias_enum"]
          ten_alias: string
        }
        Insert: {
          id?: string
          id_bai_viet: string
          nguon?: Database["public"]["Enums"]["nguon_alias_enum"]
          ten_alias: string
        }
        Update: {
          id?: string
          id_bai_viet?: string
          nguon?: Database["public"]["Enums"]["nguon_alias_enum"]
          ten_alias?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_alias_id_bai_viet_fkey"
            columns: ["id_bai_viet"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
        ]
      }
      article_bai_viet: {
        Row: {
          cap_nhat_luc: string
          cover_id: string | null
          da_verify: boolean
          id: string
          id_linh_vuc: string | null
          id_tac_gia_chinh: string | null
          loai_bai_viet: Database["public"]["Enums"]["loai_bai_viet_enum"]
          luot_xem: number
          main_video: string | null
          merged_vao_id: string | null
          meta: Json | null
          meta_description: string | null
          meta_title: string | null
          noi_dung: string | null
          slug: string
          so_nguoi_dong_gop: number
          tao_luc: string
          thumbnail: string | null
          tieu_de: string
          tieu_de_eng: string | null
          tieu_de_viet: string | null
          tom_tat: string | null
          trang_thai_noi_dung: Database["public"]["Enums"]["trang_thai_noi_dung_enum"]
        }
        Insert: {
          cap_nhat_luc?: string
          cover_id?: string | null
          da_verify?: boolean
          id?: string
          id_linh_vuc?: string | null
          id_tac_gia_chinh?: string | null
          loai_bai_viet: Database["public"]["Enums"]["loai_bai_viet_enum"]
          luot_xem?: number
          main_video?: string | null
          merged_vao_id?: string | null
          meta?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          noi_dung?: string | null
          slug: string
          so_nguoi_dong_gop?: number
          tao_luc?: string
          thumbnail?: string | null
          tieu_de: string
          tieu_de_eng?: string | null
          tieu_de_viet?: string | null
          tom_tat?: string | null
          trang_thai_noi_dung?: Database["public"]["Enums"]["trang_thai_noi_dung_enum"]
        }
        Update: {
          cap_nhat_luc?: string
          cover_id?: string | null
          da_verify?: boolean
          id?: string
          id_linh_vuc?: string | null
          id_tac_gia_chinh?: string | null
          loai_bai_viet?: Database["public"]["Enums"]["loai_bai_viet_enum"]
          luot_xem?: number
          main_video?: string | null
          merged_vao_id?: string | null
          meta?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          noi_dung?: string | null
          slug?: string
          so_nguoi_dong_gop?: number
          tao_luc?: string
          thumbnail?: string | null
          tieu_de?: string
          tieu_de_eng?: string | null
          tieu_de_viet?: string | null
          tom_tat?: string | null
          trang_thai_noi_dung?: Database["public"]["Enums"]["trang_thai_noi_dung_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "article_bai_viet_id_linh_vuc_fkey"
            columns: ["id_linh_vuc"]
            isOneToOne: false
            referencedRelation: "linh_vuc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_bai_viet_id_tac_gia_chinh_fkey"
            columns: ["id_tac_gia_chinh"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_bai_viet_merged_vao_id_fkey"
            columns: ["merged_vao_id"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
        ]
      }
      article_de_xuat: {
        Row: {
          admin_review: string | null
          context_de_xuat: string | null
          ghi_chu_admin: string | null
          id: string
          id_bai_viet_da_tao: string | null
          ket_qua_phan_loai_ai: Json | null
          nguoi_de_xuat: string
          tao_luc: string
          ten_de_xuat: string
          trang_thai: Database["public"]["Enums"]["trang_thai_de_xuat_enum"]
        }
        Insert: {
          admin_review?: string | null
          context_de_xuat?: string | null
          ghi_chu_admin?: string | null
          id?: string
          id_bai_viet_da_tao?: string | null
          ket_qua_phan_loai_ai?: Json | null
          nguoi_de_xuat: string
          tao_luc?: string
          ten_de_xuat: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_de_xuat_enum"]
        }
        Update: {
          admin_review?: string | null
          context_de_xuat?: string | null
          ghi_chu_admin?: string | null
          id?: string
          id_bai_viet_da_tao?: string | null
          ket_qua_phan_loai_ai?: Json | null
          nguoi_de_xuat?: string
          tao_luc?: string
          ten_de_xuat?: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_de_xuat_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "article_de_xuat_admin_review_fkey"
            columns: ["admin_review"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_de_xuat_id_bai_viet_da_tao_fkey"
            columns: ["id_bai_viet_da_tao"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_de_xuat_nguoi_de_xuat_fkey"
            columns: ["nguoi_de_xuat"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      article_dong_gop: {
        Row: {
          cap_nhat_luc: string
          da_xoa: boolean
          duyet_luc: string | null
          ghi_chu_duyet: string | null
          hien_thi: boolean
          id: string
          id_bai_viet: string
          id_nguoi_dong_gop: string
          id_nguoi_duyet: string | null
          noi_dung: string | null
          tao_luc: string
          trang_thai: string
        }
        Insert: {
          cap_nhat_luc?: string
          da_xoa?: boolean
          duyet_luc?: string | null
          ghi_chu_duyet?: string | null
          hien_thi?: boolean
          id?: string
          id_bai_viet: string
          id_nguoi_dong_gop: string
          id_nguoi_duyet?: string | null
          noi_dung?: string | null
          tao_luc?: string
          trang_thai?: string
        }
        Update: {
          cap_nhat_luc?: string
          da_xoa?: boolean
          duyet_luc?: string | null
          ghi_chu_duyet?: string | null
          hien_thi?: boolean
          id?: string
          id_bai_viet?: string
          id_nguoi_dong_gop?: string
          id_nguoi_duyet?: string | null
          noi_dung?: string | null
          tao_luc?: string
          trang_thai?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_dong_gop_id_bai_viet_fkey"
            columns: ["id_bai_viet"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_dong_gop_id_nguoi_dong_gop_fkey"
            columns: ["id_nguoi_dong_gop"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_dong_gop_id_nguoi_duyet_fkey"
            columns: ["id_nguoi_duyet"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      article_dong_gop_binh_luan: {
        Row: {
          cap_nhat_luc: string
          da_xoa: boolean
          id: string
          id_cha: string | null
          id_dong_gop: string
          id_nguoi_binh_luan: string
          noi_dung: string
          tao_luc: string
        }
        Insert: {
          cap_nhat_luc?: string
          da_xoa?: boolean
          id?: string
          id_cha?: string | null
          id_dong_gop: string
          id_nguoi_binh_luan: string
          noi_dung: string
          tao_luc?: string
        }
        Update: {
          cap_nhat_luc?: string
          da_xoa?: boolean
          id?: string
          id_cha?: string | null
          id_dong_gop?: string
          id_nguoi_binh_luan?: string
          noi_dung?: string
          tao_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_dong_gop_binh_luan_id_cha_fkey"
            columns: ["id_cha"]
            isOneToOne: false
            referencedRelation: "article_dong_gop_binh_luan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_dong_gop_binh_luan_id_dong_gop_fkey"
            columns: ["id_dong_gop"]
            isOneToOne: false
            referencedRelation: "article_dong_gop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_dong_gop_binh_luan_id_nguoi_binh_luan_fkey"
            columns: ["id_nguoi_binh_luan"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      article_gan_cot_moc: {
        Row: {
          id_bai_viet: string
          id_cot_moc: string
          tao_luc: string
        }
        Insert: {
          id_bai_viet: string
          id_cot_moc: string
          tao_luc?: string
        }
        Update: {
          id_bai_viet?: string
          id_cot_moc?: string
          tao_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_gan_cot_moc_id_bai_viet_fkey"
            columns: ["id_bai_viet"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_gan_cot_moc_id_cot_moc_fkey"
            columns: ["id_cot_moc"]
            isOneToOne: false
            referencedRelation: "content_cot_moc"
            referencedColumns: ["id"]
          },
        ]
      }
      article_gan_du_an: {
        Row: {
          id_bai_viet: string
          id_du_an: string
          tao_luc: string
        }
        Insert: {
          id_bai_viet: string
          id_du_an: string
          tao_luc?: string
        }
        Update: {
          id_bai_viet?: string
          id_du_an?: string
          tao_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_gan_du_an_id_bai_viet_fkey"
            columns: ["id_bai_viet"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_gan_du_an_id_du_an_fkey"
            columns: ["id_du_an"]
            isOneToOne: false
            referencedRelation: "project_du_an"
            referencedColumns: ["id"]
          },
        ]
      }
      article_gan_nhom: {
        Row: {
          id_bai_viet: string
          id_nhom: string
        }
        Insert: {
          id_bai_viet: string
          id_nhom: string
        }
        Update: {
          id_bai_viet?: string
          id_nhom?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_gan_nhom_id_bai_viet_fkey"
            columns: ["id_bai_viet"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_gan_nhom_id_nhom_fkey"
            columns: ["id_nhom"]
            isOneToOne: false
            referencedRelation: "article_nhom"
            referencedColumns: ["id"]
          },
        ]
      }
      article_gan_tac_pham: {
        Row: {
          id_bai_viet: string
          id_tac_pham: string
          tao_luc: string
        }
        Insert: {
          id_bai_viet: string
          id_tac_pham: string
          tao_luc?: string
        }
        Update: {
          id_bai_viet?: string
          id_tac_pham?: string
          tao_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_gan_tac_pham_id_bai_viet_fkey"
            columns: ["id_bai_viet"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_gan_tac_pham_id_tac_pham_fkey"
            columns: ["id_tac_pham"]
            isOneToOne: false
            referencedRelation: "content_tac_pham"
            referencedColumns: ["id"]
          },
        ]
      }
      article_lien_quan: {
        Row: {
          cap_do: string | null
          id: string
          id_bai_viet_a: string
          id_bai_viet_b: string
          loai_quan_he: Database["public"]["Enums"]["loai_quan_he_enum"]
        }
        Insert: {
          cap_do?: string | null
          id?: string
          id_bai_viet_a: string
          id_bai_viet_b: string
          loai_quan_he: Database["public"]["Enums"]["loai_quan_he_enum"]
        }
        Update: {
          cap_do?: string | null
          id?: string
          id_bai_viet_a?: string
          id_bai_viet_b?: string
          loai_quan_he?: Database["public"]["Enums"]["loai_quan_he_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "article_lien_quan_id_bai_viet_a_fkey"
            columns: ["id_bai_viet_a"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_lien_quan_id_bai_viet_b_fkey"
            columns: ["id_bai_viet_b"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
        ]
      }
      article_nhom: {
        Row: {
          id: string
          loai_nhom: Database["public"]["Enums"]["loai_nhom_enum"]
          mo_ta: string | null
          slug: string
          ten: string
          thu_tu: number
        }
        Insert: {
          id?: string
          loai_nhom: Database["public"]["Enums"]["loai_nhom_enum"]
          mo_ta?: string | null
          slug: string
          ten: string
          thu_tu?: number
        }
        Update: {
          id?: string
          loai_nhom?: Database["public"]["Enums"]["loai_nhom_enum"]
          mo_ta?: string | null
          slug?: string
          ten?: string
          thu_tu?: number
        }
        Relationships: []
      }
      article_quyen_tham_dinh: {
        Row: {
          cap_boi: string | null
          da_xoa: boolean
          id: string
          id_bai_viet: string | null
          id_linh_vuc: string | null
          id_nguoi_dung: string
          pham_vi: string
          tao_luc: string
        }
        Insert: {
          cap_boi?: string | null
          da_xoa?: boolean
          id?: string
          id_bai_viet?: string | null
          id_linh_vuc?: string | null
          id_nguoi_dung: string
          pham_vi: string
          tao_luc?: string
        }
        Update: {
          cap_boi?: string | null
          da_xoa?: boolean
          id?: string
          id_bai_viet?: string | null
          id_linh_vuc?: string | null
          id_nguoi_dung?: string
          pham_vi?: string
          tao_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_quyen_tham_dinh_cap_boi_fkey"
            columns: ["cap_boi"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_quyen_tham_dinh_id_bai_viet_fkey"
            columns: ["id_bai_viet"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_quyen_tham_dinh_id_linh_vuc_fkey"
            columns: ["id_linh_vuc"]
            isOneToOne: false
            referencedRelation: "linh_vuc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_quyen_tham_dinh_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      article_tac_gia: {
        Row: {
          id: string
          id_bai_viet: string
          id_dong_gop: string | null
          id_nguoi_dung: string
          la_hien_tai: boolean
          tao_luc: string
          vai_tro: string
        }
        Insert: {
          id?: string
          id_bai_viet: string
          id_dong_gop?: string | null
          id_nguoi_dung: string
          la_hien_tai?: boolean
          tao_luc?: string
          vai_tro?: string
        }
        Update: {
          id?: string
          id_bai_viet?: string
          id_dong_gop?: string | null
          id_nguoi_dung?: string
          la_hien_tai?: boolean
          tao_luc?: string
          vai_tro?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_tac_gia_id_bai_viet_fkey"
            columns: ["id_bai_viet"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_tac_gia_id_dong_gop_fkey"
            columns: ["id_dong_gop"]
            isOneToOne: false
            referencedRelation: "article_dong_gop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_tac_gia_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_chan: {
        Row: {
          id: string
          id_nguoi_bi_chan: string | null
          id_nguoi_chan: string
          loai_chan: Database["public"]["Enums"]["loai_chan_enum"]
          ly_do: string | null
          tao_luc: string
        }
        Insert: {
          id?: string
          id_nguoi_bi_chan?: string | null
          id_nguoi_chan: string
          loai_chan: Database["public"]["Enums"]["loai_chan_enum"]
          ly_do?: string | null
          tao_luc?: string
        }
        Update: {
          id?: string
          id_nguoi_bi_chan?: string | null
          id_nguoi_chan?: string
          loai_chan?: Database["public"]["Enums"]["loai_chan_enum"]
          ly_do?: string | null
          tao_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_chan_id_nguoi_bi_chan_fkey"
            columns: ["id_nguoi_bi_chan"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_chan_id_nguoi_chan_fkey"
            columns: ["id_nguoi_chan"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_da_doc: {
        Row: {
          cap_nhat_luc: string
          id_nguoi_dung: string
          id_phong: string
          id_tin_nhan_cuoi_doc: string
        }
        Insert: {
          cap_nhat_luc?: string
          id_nguoi_dung: string
          id_phong: string
          id_tin_nhan_cuoi_doc: string
        }
        Update: {
          cap_nhat_luc?: string
          id_nguoi_dung?: string
          id_phong?: string
          id_tin_nhan_cuoi_doc?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_da_doc_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_da_doc_id_phong_fkey"
            columns: ["id_phong"]
            isOneToOne: false
            referencedRelation: "chat_phong"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_da_doc_id_tin_nhan_cuoi_doc_fkey"
            columns: ["id_tin_nhan_cuoi_doc"]
            isOneToOne: false
            referencedRelation: "chat_tin_nhan"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_ghim: {
        Row: {
          ghim_luc: string
          id: string
          id_nguoi_ghim: string
          id_phong: string
          id_tin_nhan: string
        }
        Insert: {
          ghim_luc?: string
          id?: string
          id_nguoi_ghim: string
          id_phong: string
          id_tin_nhan: string
        }
        Update: {
          ghim_luc?: string
          id?: string
          id_nguoi_ghim?: string
          id_phong?: string
          id_tin_nhan?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_ghim_id_nguoi_ghim_fkey"
            columns: ["id_nguoi_ghim"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_ghim_id_phong_fkey"
            columns: ["id_phong"]
            isOneToOne: false
            referencedRelation: "chat_phong"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_ghim_id_tin_nhan_fkey"
            columns: ["id_tin_nhan"]
            isOneToOne: false
            referencedRelation: "chat_tin_nhan"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_phong: {
        Row: {
          avatar_id: string | null
          cap_nhat_luc: string
          id: string
          id_context: string | null
          id_org_dai_dien: string | null
          loai_context: string | null
          loai_phong: Database["public"]["Enums"]["loai_phong_chat_enum"]
          ma_moi: string | null
          tao_luc: string
          ten_phong: string | null
        }
        Insert: {
          avatar_id?: string | null
          cap_nhat_luc?: string
          id?: string
          id_context?: string | null
          id_org_dai_dien?: string | null
          loai_context?: string | null
          loai_phong: Database["public"]["Enums"]["loai_phong_chat_enum"]
          ma_moi?: string | null
          tao_luc?: string
          ten_phong?: string | null
        }
        Update: {
          avatar_id?: string | null
          cap_nhat_luc?: string
          id?: string
          id_context?: string | null
          id_org_dai_dien?: string | null
          loai_context?: string | null
          loai_phong?: Database["public"]["Enums"]["loai_phong_chat_enum"]
          ma_moi?: string | null
          tao_luc?: string
          ten_phong?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_phong_id_org_dai_dien_fkey"
            columns: ["id_org_dai_dien"]
            isOneToOne: false
            referencedRelation: "org_to_chuc"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_thanh_vien: {
        Row: {
          an_danh: boolean
          id: string
          id_nguoi_dung: string
          id_phong: string
          roi_luc: string | null
          tham_gia_luc: string
          vai_tro: Database["public"]["Enums"]["vai_tro_chat_enum"]
        }
        Insert: {
          an_danh?: boolean
          id?: string
          id_nguoi_dung: string
          id_phong: string
          roi_luc?: string | null
          tham_gia_luc?: string
          vai_tro?: Database["public"]["Enums"]["vai_tro_chat_enum"]
        }
        Update: {
          an_danh?: boolean
          id?: string
          id_nguoi_dung?: string
          id_phong?: string
          roi_luc?: string | null
          tham_gia_luc?: string
          vai_tro?: Database["public"]["Enums"]["vai_tro_chat_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_thanh_vien_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_thanh_vien_id_phong_fkey"
            columns: ["id_phong"]
            isOneToOne: false
            referencedRelation: "chat_phong"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_tin_nhan: {
        Row: {
          da_sua: boolean
          da_xoa: boolean
          id: string
          id_dinh_kem: string | null
          id_nguoi_gui: string
          id_phong: string
          id_tin_tra_loi: string | null
          loai_tin: Database["public"]["Enums"]["loai_tin_nhan_enum"]
          ngu_canh: Json | null
          noi_dung: string | null
          sua_luc: string | null
          tao_luc: string
        }
        Insert: {
          da_sua?: boolean
          da_xoa?: boolean
          id?: string
          id_dinh_kem?: string | null
          id_nguoi_gui: string
          id_phong: string
          id_tin_tra_loi?: string | null
          loai_tin?: Database["public"]["Enums"]["loai_tin_nhan_enum"]
          ngu_canh?: Json | null
          noi_dung?: string | null
          sua_luc?: string | null
          tao_luc?: string
        }
        Update: {
          da_sua?: boolean
          da_xoa?: boolean
          id?: string
          id_dinh_kem?: string | null
          id_nguoi_gui?: string
          id_phong?: string
          id_tin_tra_loi?: string | null
          loai_tin?: Database["public"]["Enums"]["loai_tin_nhan_enum"]
          ngu_canh?: Json | null
          noi_dung?: string | null
          sua_luc?: string | null
          tao_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_tin_nhan_id_dinh_kem_fkey"
            columns: ["id_dinh_kem"]
            isOneToOne: false
            referencedRelation: "content_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_tin_nhan_id_nguoi_gui_fkey"
            columns: ["id_nguoi_gui"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_tin_nhan_id_phong_fkey"
            columns: ["id_phong"]
            isOneToOne: false
            referencedRelation: "chat_phong"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_tin_nhan_id_tin_tra_loi_fkey"
            columns: ["id_tin_tra_loi"]
            isOneToOne: false
            referencedRelation: "chat_tin_nhan"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_yeu_cau_tham_gia: {
        Row: {
          id: string
          id_nguoi_dung: string
          id_phong: string
          tao_luc: string
          trang_thai: string
          xu_ly_luc: string | null
        }
        Insert: {
          id?: string
          id_nguoi_dung: string
          id_phong: string
          tao_luc?: string
          trang_thai?: string
          xu_ly_luc?: string | null
        }
        Update: {
          id?: string
          id_nguoi_dung?: string
          id_phong?: string
          tao_luc?: string
          trang_thai?: string
          xu_ly_luc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_yeu_cau_tham_gia_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_yeu_cau_tham_gia_id_phong_fkey"
            columns: ["id_phong"]
            isOneToOne: false
            referencedRelation: "chat_phong"
            referencedColumns: ["id"]
          },
        ]
      }
      cong_dong_filter: {
        Row: {
          icon: string | null
          id: string
          id_context: string
          loai_context: string
          mau: string | null
          slug: string
          tao_luc: string
          ten: string
          thu_tu: number
        }
        Insert: {
          icon?: string | null
          id?: string
          id_context: string
          loai_context?: string
          mau?: string | null
          slug: string
          tao_luc?: string
          ten: string
          thu_tu?: number
        }
        Update: {
          icon?: string | null
          id?: string
          id_context?: string
          loai_context?: string
          mau?: string | null
          slug?: string
          tao_luc?: string
          ten?: string
          thu_tu?: number
        }
        Relationships: []
      }
      cong_dong_filter_gan: {
        Row: {
          id_cot_moc: string
          id_filter: string
        }
        Insert: {
          id_cot_moc: string
          id_filter: string
        }
        Update: {
          id_cot_moc?: string
          id_filter?: string
        }
        Relationships: [
          {
            foreignKeyName: "cong_dong_filter_gan_id_cot_moc_fkey"
            columns: ["id_cot_moc"]
            isOneToOne: false
            referencedRelation: "content_cot_moc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cong_dong_filter_gan_id_filter_fkey"
            columns: ["id_filter"]
            isOneToOne: false
            referencedRelation: "cong_dong_filter"
            referencedColumns: ["id"]
          },
        ]
      }
      content_cot_moc: {
        Row: {
          cap_nhat_luc: string
          che_do_hien_thi: Database["public"]["Enums"]["che_do_hien_thi_moc_enum"]
          ghim: boolean
          id: string
          id_du_an: string | null
          id_khoa_hoc: string | null
          id_lop_hoc: string | null
          id_nguoi_dung: string
          id_nhom_boi_canh: string | null
          id_su_kien: string | null
          id_to_chuc: string | null
          id_truong_nganh: string | null
          loai_moc: Database["public"]["Enums"]["loai_moc_enum"]
          mo_ta: string | null
          nguon_goc: Database["public"]["Enums"]["nguon_goc_moc_enum"]
          tao_luc: string
          thoi_diem: string
          tieu_de: string
        }
        Insert: {
          cap_nhat_luc?: string
          che_do_hien_thi?: Database["public"]["Enums"]["che_do_hien_thi_moc_enum"]
          ghim?: boolean
          id?: string
          id_du_an?: string | null
          id_khoa_hoc?: string | null
          id_lop_hoc?: string | null
          id_nguoi_dung: string
          id_nhom_boi_canh?: string | null
          id_su_kien?: string | null
          id_to_chuc?: string | null
          id_truong_nganh?: string | null
          loai_moc: Database["public"]["Enums"]["loai_moc_enum"]
          mo_ta?: string | null
          nguon_goc?: Database["public"]["Enums"]["nguon_goc_moc_enum"]
          tao_luc?: string
          thoi_diem: string
          tieu_de: string
        }
        Update: {
          cap_nhat_luc?: string
          che_do_hien_thi?: Database["public"]["Enums"]["che_do_hien_thi_moc_enum"]
          ghim?: boolean
          id?: string
          id_du_an?: string | null
          id_khoa_hoc?: string | null
          id_lop_hoc?: string | null
          id_nguoi_dung?: string
          id_nhom_boi_canh?: string | null
          id_su_kien?: string | null
          id_to_chuc?: string | null
          id_truong_nganh?: string | null
          loai_moc?: Database["public"]["Enums"]["loai_moc_enum"]
          mo_ta?: string | null
          nguon_goc?: Database["public"]["Enums"]["nguon_goc_moc_enum"]
          tao_luc?: string
          thoi_diem?: string
          tieu_de?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_cot_moc_id_khoa_hoc_fkey"
            columns: ["id_khoa_hoc"]
            isOneToOne: false
            referencedRelation: "org_khoa_hoc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cot_moc_id_lop_hoc_fkey"
            columns: ["id_lop_hoc"]
            isOneToOne: false
            referencedRelation: "org_lop_hoc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cot_moc_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cot_moc_id_nhom_boi_canh_fkey"
            columns: ["id_nhom_boi_canh"]
            isOneToOne: false
            referencedRelation: "user_nhom_boi_canh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cot_moc_id_su_kien_fkey"
            columns: ["id_su_kien"]
            isOneToOne: false
            referencedRelation: "org_su_kien"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cot_moc_id_to_chuc_fkey"
            columns: ["id_to_chuc"]
            isOneToOne: false
            referencedRelation: "org_to_chuc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cot_moc_id_truong_nganh_fkey"
            columns: ["id_truong_nganh"]
            isOneToOne: false
            referencedRelation: "org_truong_nganh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cot_moc_du_an"
            columns: ["id_du_an"]
            isOneToOne: false
            referencedRelation: "project_du_an"
            referencedColumns: ["id"]
          },
        ]
      }
      content_media: {
        Row: {
          alt: string | null
          cloudflare_id: string
          duration_s: number | null
          height: number | null
          id: string
          id_tac_pham: string
          loai_media: Database["public"]["Enums"]["loai_media_enum"]
          thu_tu: number
          width: number | null
        }
        Insert: {
          alt?: string | null
          cloudflare_id: string
          duration_s?: number | null
          height?: number | null
          id?: string
          id_tac_pham: string
          loai_media: Database["public"]["Enums"]["loai_media_enum"]
          thu_tu?: number
          width?: number | null
        }
        Update: {
          alt?: string | null
          cloudflare_id?: string
          duration_s?: number | null
          height?: number | null
          id?: string
          id_tac_pham?: string
          loai_media?: Database["public"]["Enums"]["loai_media_enum"]
          thu_tu?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_media_id_tac_pham_fkey"
            columns: ["id_tac_pham"]
            isOneToOne: false
            referencedRelation: "content_tac_pham"
            referencedColumns: ["id"]
          },
        ]
      }
      content_tac_pham: {
        Row: {
          cap_nhat_luc: string
          che_do_hien_thi: Database["public"]["Enums"]["che_do_hien_thi_moc_enum"]
          cover_id: string | null
          id: string
          id_nguoi_dung: string
          loai_tac_pham: Database["public"]["Enums"]["loai_tac_pham_enum"]
          meta_description: string | null
          meta_title: string | null
          mo_ta: string | null
          noi_dung_blocks: Json
          noi_dung_html: string | null
          slug: string | null
          tao_luc: string
          tieu_de: string
        }
        Insert: {
          cap_nhat_luc?: string
          che_do_hien_thi?: Database["public"]["Enums"]["che_do_hien_thi_moc_enum"]
          cover_id?: string | null
          id?: string
          id_nguoi_dung: string
          loai_tac_pham: Database["public"]["Enums"]["loai_tac_pham_enum"]
          meta_description?: string | null
          meta_title?: string | null
          mo_ta?: string | null
          noi_dung_blocks?: Json
          noi_dung_html?: string | null
          slug?: string | null
          tao_luc?: string
          tieu_de: string
        }
        Update: {
          cap_nhat_luc?: string
          che_do_hien_thi?: Database["public"]["Enums"]["che_do_hien_thi_moc_enum"]
          cover_id?: string | null
          id?: string
          id_nguoi_dung?: string
          loai_tac_pham?: Database["public"]["Enums"]["loai_tac_pham_enum"]
          meta_description?: string | null
          meta_title?: string | null
          mo_ta?: string | null
          noi_dung_blocks?: Json
          noi_dung_html?: string | null
          slug?: string | null
          tao_luc?: string
          tieu_de?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_tac_pham_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      content_tac_pham_linh_vuc: {
        Row: {
          id_tac_pham: string
          id_linh_vuc: string
          la_chinh: boolean
          tao_luc: string
        }
        Insert: {
          id_tac_pham: string
          id_linh_vuc: string
          la_chinh?: boolean
          tao_luc?: string
        }
        Update: {
          id_tac_pham?: string
          id_linh_vuc?: string
          la_chinh?: boolean
          tao_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_tac_pham_linh_vuc_id_tac_pham_fkey"
            columns: ["id_tac_pham"]
            isOneToOne: false
            referencedRelation: "content_tac_pham"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_tac_pham_linh_vuc_id_linh_vuc_fkey"
            columns: ["id_linh_vuc"]
            isOneToOne: false
            referencedRelation: "linh_vuc"
            referencedColumns: ["id"]
          },
        ]
      }
      content_tac_pham_tac_gia: {
        Row: {
          che_do_hien_thi_journey: string
          ghi_chu: string | null
          id_nguoi_dung: string
          id_tac_pham: string
          la_chu_so_huu: boolean
          tao_luc: string
          thu_tu: number | null
          trang_thai: string
          vai_tro: string | null
          xu_ly_luc: string | null
        }
        Insert: {
          che_do_hien_thi_journey?: string
          ghi_chu?: string | null
          id_nguoi_dung: string
          id_tac_pham: string
          la_chu_so_huu?: boolean
          tao_luc?: string
          thu_tu?: number | null
          trang_thai?: string
          vai_tro?: string | null
          xu_ly_luc?: string | null
        }
        Update: {
          che_do_hien_thi_journey?: string
          ghi_chu?: string | null
          id_nguoi_dung?: string
          id_tac_pham?: string
          la_chu_so_huu?: boolean
          tao_luc?: string
          thu_tu?: number | null
          trang_thai?: string
          vai_tro?: string | null
          xu_ly_luc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_tac_pham_tac_gia_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_tac_pham_tac_gia_id_tac_pham_fkey"
            columns: ["id_tac_pham"]
            isOneToOne: false
            referencedRelation: "content_tac_pham"
            referencedColumns: ["id"]
          },
        ]
      }
      content_tac_pham_thuoc_moc: {
        Row: {
          id_cot_moc: string
          id_tac_pham: string
          thu_tu: number
        }
        Insert: {
          id_cot_moc: string
          id_tac_pham: string
          thu_tu?: number
        }
        Update: {
          id_cot_moc?: string
          id_tac_pham?: string
          thu_tu?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_tac_pham_thuoc_moc_id_cot_moc_fkey"
            columns: ["id_cot_moc"]
            isOneToOne: false
            referencedRelation: "content_cot_moc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_tac_pham_thuoc_moc_id_tac_pham_fkey"
            columns: ["id_tac_pham"]
            isOneToOne: false
            referencedRelation: "content_tac_pham"
            referencedColumns: ["id"]
          },
        ]
      }
      edu_module_mon: {
        Row: {
          he_so: number
          id: string
          id_module: string
          id_slot: string | null
          so_thu_tu: number
          ten_mon_mac_dinh: string | null
          thang_diem: number
          thoi_gian_phut: number | null
        }
        Insert: {
          he_so?: number
          id?: string
          id_module: string
          id_slot?: string | null
          so_thu_tu?: number
          ten_mon_mac_dinh?: string | null
          thang_diem?: number
          thoi_gian_phut?: number | null
        }
        Update: {
          he_so?: number
          id?: string
          id_module?: string
          id_slot?: string | null
          so_thu_tu?: number
          ten_mon_mac_dinh?: string | null
          thang_diem?: number
          thoi_gian_phut?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "edu_module_mon_id_module_fkey"
            columns: ["id_module"]
            isOneToOne: false
            referencedRelation: "edu_module_tinh_diem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edu_module_mon_id_slot_fkey"
            columns: ["id_slot"]
            isOneToOne: false
            referencedRelation: "edu_to_hop_mon_chi_tiet"
            referencedColumns: ["id"]
          },
        ]
      }
      edu_module_tinh_diem: {
        Row: {
          co_diem_thuong: boolean
          co_diem_uu_tien: boolean
          created_at: string
          id: string
          mo_ta: string | null
          quy_ve_thang: number | null
          ten: string
          trang_thai: string
        }
        Insert: {
          co_diem_thuong?: boolean
          co_diem_uu_tien?: boolean
          created_at?: string
          id?: string
          mo_ta?: string | null
          quy_ve_thang?: number | null
          ten: string
          trang_thai?: string
        }
        Update: {
          co_diem_thuong?: boolean
          co_diem_uu_tien?: boolean
          created_at?: string
          id?: string
          mo_ta?: string | null
          quy_ve_thang?: number | null
          ten?: string
          trang_thai?: string
        }
        Relationships: []
      }
      edu_mon_thi: {
        Row: {
          created_at: string
          id: string
          id_bai_viet: string | null
          loai: string
          ma: string
          mo_ta: string | null
          ten: string
          thumbnail_id: string | null
          trang_thai: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_bai_viet?: string | null
          loai: string
          ma: string
          mo_ta?: string | null
          ten: string
          thumbnail_id?: string | null
          trang_thai?: string
        }
        Update: {
          created_at?: string
          id?: string
          id_bai_viet?: string | null
          loai?: string
          ma?: string
          mo_ta?: string | null
          ten?: string
          thumbnail_id?: string | null
          trang_thai?: string
        }
        Relationships: [
          {
            foreignKeyName: "edu_mon_thi_id_bai_viet_fkey"
            columns: ["id_bai_viet"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
        ]
      }
      edu_to_hop_mon: {
        Row: {
          cac_mon: string[]
          id: string
          ma_to_hop: string
          mo_ta: string | null
          ten_to_hop: string
        }
        Insert: {
          cac_mon: string[]
          id?: string
          ma_to_hop: string
          mo_ta?: string | null
          ten_to_hop: string
        }
        Update: {
          cac_mon?: string[]
          id?: string
          ma_to_hop?: string
          mo_ta?: string | null
          ten_to_hop?: string
        }
        Relationships: []
      }
      edu_to_hop_mon_chi_tiet: {
        Row: {
          co_dinh: boolean
          id: string
          id_to_hop_mon: string
          loai: string
          so_thu_tu: number
          ten_slot: string
        }
        Insert: {
          co_dinh?: boolean
          id?: string
          id_to_hop_mon: string
          loai: string
          so_thu_tu: number
          ten_slot: string
        }
        Update: {
          co_dinh?: boolean
          id?: string
          id_to_hop_mon?: string
          loai?: string
          so_thu_tu?: number
          ten_slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "edu_to_hop_mon_chi_tiet_id_to_hop_mon_fkey"
            columns: ["id_to_hop_mon"]
            isOneToOne: false
            referencedRelation: "edu_to_hop_mon"
            referencedColumns: ["id"]
          },
        ]
      }
      filter_gan: {
        Row: {
          id_doi_tuong: string
          id_filter: string
          loai_doi_tuong: Database["public"]["Enums"]["filter_doi_tuong_enum"]
          tao_luc: string
        }
        Insert: {
          id_doi_tuong: string
          id_filter: string
          loai_doi_tuong: Database["public"]["Enums"]["filter_doi_tuong_enum"]
          tao_luc?: string
        }
        Update: {
          id_doi_tuong?: string
          id_filter?: string
          loai_doi_tuong?: Database["public"]["Enums"]["filter_doi_tuong_enum"]
          tao_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "filter_gan_id_filter_fkey"
            columns: ["id_filter"]
            isOneToOne: false
            referencedRelation: "filter_nhan"
            referencedColumns: ["id"]
          },
        ]
      }
      filter_nhan: {
        Row: {
          id: string
          id_nguoi_dung: string | null
          id_to_chuc: string | null
          mau: string | null
          slug: string
          tao_luc: string
          ten: string
          thu_tu: number
        }
        Insert: {
          id?: string
          id_nguoi_dung?: string | null
          id_to_chuc?: string | null
          mau?: string | null
          slug: string
          tao_luc?: string
          ten: string
          thu_tu?: number
        }
        Update: {
          id?: string
          id_nguoi_dung?: string | null
          id_to_chuc?: string | null
          mau?: string | null
          slug?: string
          tao_luc?: string
          ten?: string
          thu_tu?: number
        }
        Relationships: [
          {
            foreignKeyName: "filter_nhan_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filter_nhan_id_to_chuc_fkey"
            columns: ["id_to_chuc"]
            isOneToOne: false
            referencedRelation: "org_to_chuc"
            referencedColumns: ["id"]
          },
        ]
      }
      gop_y: {
        Row: {
          anh_url: string | null
          email: string | null
          ghi_chu: string | null
          ho_ten: string | null
          id: string
          id_nguoi_dung: string | null
          nguoi_xu_ly: string | null
          noi_dung: string
          tao_luc: string
          trang_thai: Database["public"]["Enums"]["gop_y_trang_thai_enum"]
          trang_url: string | null
          user_agent: string | null
          xu_ly_luc: string | null
        }
        Insert: {
          anh_url?: string | null
          email?: string | null
          ghi_chu?: string | null
          ho_ten?: string | null
          id?: string
          id_nguoi_dung?: string | null
          nguoi_xu_ly?: string | null
          noi_dung: string
          tao_luc?: string
          trang_thai?: Database["public"]["Enums"]["gop_y_trang_thai_enum"]
          trang_url?: string | null
          user_agent?: string | null
          xu_ly_luc?: string | null
        }
        Update: {
          anh_url?: string | null
          email?: string | null
          ghi_chu?: string | null
          ho_ten?: string | null
          id?: string
          id_nguoi_dung?: string | null
          nguoi_xu_ly?: string | null
          noi_dung?: string
          tao_luc?: string
          trang_thai?: Database["public"]["Enums"]["gop_y_trang_thai_enum"]
          trang_url?: string | null
          user_agent?: string | null
          xu_ly_luc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gop_y_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gop_y_nguoi_xu_ly_fkey"
            columns: ["nguoi_xu_ly"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      linh_vuc: {
        Row: {
          id: string
          mo_ta: string | null
          nhom: string | null
          slug: string
          ten: string
          ten_eng: string | null
          thu_tu: number
          thumbnail_id: string | null
          trang_thai: string
        }
        Insert: {
          id?: string
          mo_ta?: string | null
          nhom?: string | null
          slug: string
          ten: string
          ten_eng?: string | null
          thu_tu?: number
          thumbnail_id?: string | null
          trang_thai?: string
        }
        Update: {
          id?: string
          mo_ta?: string | null
          nhom?: string | null
          slug?: string
          ten?: string
          ten_eng?: string | null
          thu_tu?: number
          thumbnail_id?: string | null
          trang_thai?: string
        }
        Relationships: []
      }
      linh_vuc_gan_nhom: {
        Row: {
          id_linh_vuc: string
          id_nhom: string
          la_chinh: boolean
          thu_tu: number
        }
        Insert: {
          id_linh_vuc: string
          id_nhom: string
          la_chinh?: boolean
          thu_tu?: number
        }
        Update: {
          id_linh_vuc?: string
          id_nhom?: string
          la_chinh?: boolean
          thu_tu?: number
        }
        Relationships: [
          {
            foreignKeyName: "linh_vuc_gan_nhom_id_linh_vuc_fkey"
            columns: ["id_linh_vuc"]
            isOneToOne: false
            referencedRelation: "linh_vuc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linh_vuc_gan_nhom_id_nhom_fkey"
            columns: ["id_nhom"]
            isOneToOne: false
            referencedRelation: "linh_vuc_nhom"
            referencedColumns: ["id"]
          },
        ]
      }
      linh_vuc_nhom: {
        Row: {
          id: string
          mo_ta: string | null
          slug: string
          ten: string
          ten_eng: string | null
          thu_tu: number
          trang_thai: string
        }
        Insert: {
          id?: string
          mo_ta?: string | null
          slug: string
          ten: string
          ten_eng?: string | null
          thu_tu?: number
          trang_thai?: string
        }
        Update: {
          id?: string
          mo_ta?: string | null
          slug?: string
          ten?: string
          ten_eng?: string | null
          thu_tu?: number
          trang_thai?: string
        }
        Relationships: []
      }
      org_bai_dang: {
        Row: {
          cap_nhat_luc: string
          cover_id: string | null
          ghim: boolean
          id: string
          id_to_chuc: string
          loai_bai_dang: Database["public"]["Enums"]["loai_bai_dang_org_enum"]
          noi_dung: string | null
          noi_dung_blocks: Json
          tao_luc: string
          thoi_diem: string | null
          tieu_de: string
          tom_tat: string | null
          trang_thai: Database["public"]["Enums"]["trang_thai_bai_dang_enum"]
        }
        Insert: {
          cap_nhat_luc?: string
          cover_id?: string | null
          ghim?: boolean
          id?: string
          id_to_chuc: string
          loai_bai_dang: Database["public"]["Enums"]["loai_bai_dang_org_enum"]
          noi_dung?: string | null
          noi_dung_blocks?: Json
          tao_luc?: string
          thoi_diem?: string | null
          tieu_de: string
          tom_tat?: string | null
          trang_thai?: Database["public"]["Enums"]["trang_thai_bai_dang_enum"]
        }
        Update: {
          cap_nhat_luc?: string
          cover_id?: string | null
          ghim?: boolean
          id?: string
          id_to_chuc?: string
          loai_bai_dang?: Database["public"]["Enums"]["loai_bai_dang_org_enum"]
          noi_dung?: string | null
          noi_dung_blocks?: Json
          tao_luc?: string
          thoi_diem?: string | null
          tieu_de?: string
          tom_tat?: string | null
          trang_thai?: Database["public"]["Enums"]["trang_thai_bai_dang_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "org_bai_dang_id_to_chuc_fkey"
            columns: ["id_to_chuc"]
            isOneToOne: false
            referencedRelation: "org_to_chuc"
            referencedColumns: ["id"]
          },
        ]
      }
      org_bai_dang_tag: {
        Row: {
          id_bai_dang: string
          id_bai_viet: string
        }
        Insert: {
          id_bai_dang: string
          id_bai_viet: string
        }
        Update: {
          id_bai_dang?: string
          id_bai_viet?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_bai_dang_tag_id_bai_dang_fkey"
            columns: ["id_bai_dang"]
            isOneToOne: false
            referencedRelation: "org_bai_dang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_bai_dang_tag_id_bai_viet_fkey"
            columns: ["id_bai_viet"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
        ]
      }
      org_bai_tap: {
        Row: {
          cap_nhat_luc: string
          id: string
          id_giao_trinh: string | null
          id_khoa_hoc: string
          mo_ta: string | null
          tao_luc: string
          ten_bai_tap: string
          thu_tu: number
          thumbnail_url: string | null
          video_youtube_url: string | null
          visible: boolean
        }
        Insert: {
          cap_nhat_luc?: string
          id?: string
          id_giao_trinh?: string | null
          id_khoa_hoc: string
          mo_ta?: string | null
          tao_luc?: string
          ten_bai_tap: string
          thu_tu?: number
          thumbnail_url?: string | null
          video_youtube_url?: string | null
          visible?: boolean
        }
        Update: {
          cap_nhat_luc?: string
          id?: string
          id_giao_trinh?: string | null
          id_khoa_hoc?: string
          mo_ta?: string | null
          tao_luc?: string
          ten_bai_tap?: string
          thu_tu?: number
          thumbnail_url?: string | null
          video_youtube_url?: string | null
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "org_bai_tap_id_giao_trinh_fkey"
            columns: ["id_giao_trinh"]
            isOneToOne: false
            referencedRelation: "org_giao_trinh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_bai_tap_id_khoa_hoc_fkey"
            columns: ["id_khoa_hoc"]
            isOneToOne: false
            referencedRelation: "org_khoa_hoc"
            referencedColumns: ["id"]
          },
        ]
      }
      org_cau_hinh_khoi: {
        Row: {
          cac_mon: Json
          created_at: string
          diem_san_xet_tuyen: number | null
          id: string
          id_module: string | null
          id_to_chuc: string
          id_to_hop_mon: string
          id_truong_nganh: string | null
          mo_ta: string | null
          nam_ap_dung: number
          quy_ve_thang: number | null
          trang_thai: string
          updated_at: string
        }
        Insert: {
          cac_mon: Json
          created_at?: string
          diem_san_xet_tuyen?: number | null
          id?: string
          id_module?: string | null
          id_to_chuc: string
          id_to_hop_mon: string
          id_truong_nganh?: string | null
          mo_ta?: string | null
          nam_ap_dung: number
          quy_ve_thang?: number | null
          trang_thai?: string
          updated_at?: string
        }
        Update: {
          cac_mon?: Json
          created_at?: string
          diem_san_xet_tuyen?: number | null
          id?: string
          id_module?: string | null
          id_to_chuc?: string
          id_to_hop_mon?: string
          id_truong_nganh?: string | null
          mo_ta?: string | null
          nam_ap_dung?: number
          quy_ve_thang?: number | null
          trang_thai?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_cau_hinh_khoi_id_module_fkey"
            columns: ["id_module"]
            isOneToOne: false
            referencedRelation: "edu_module_tinh_diem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_cau_hinh_khoi_id_to_chuc_fkey"
            columns: ["id_to_chuc"]
            isOneToOne: false
            referencedRelation: "org_to_chuc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_cau_hinh_khoi_id_to_hop_mon_fkey"
            columns: ["id_to_hop_mon"]
            isOneToOne: false
            referencedRelation: "edu_to_hop_mon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_cau_hinh_khoi_id_truong_nganh_fkey"
            columns: ["id_truong_nganh"]
            isOneToOne: false
            referencedRelation: "org_truong_nganh"
            referencedColumns: ["id"]
          },
        ]
      }
      org_cau_hinh_mon: {
        Row: {
          ghi_chu: string | null
          he_so: number
          id: string
          id_cau_hinh_khoi: string
          id_mon_thi: string
          id_slot: string | null
          so_thu_tu: number
          thang_diem: number
          thoi_gian_phut: number | null
        }
        Insert: {
          ghi_chu?: string | null
          he_so?: number
          id?: string
          id_cau_hinh_khoi: string
          id_mon_thi: string
          id_slot?: string | null
          so_thu_tu?: number
          thang_diem?: number
          thoi_gian_phut?: number | null
        }
        Update: {
          ghi_chu?: string | null
          he_so?: number
          id?: string
          id_cau_hinh_khoi?: string
          id_mon_thi?: string
          id_slot?: string | null
          so_thu_tu?: number
          thang_diem?: number
          thoi_gian_phut?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "org_cau_hinh_mon_id_cau_hinh_khoi_fkey"
            columns: ["id_cau_hinh_khoi"]
            isOneToOne: false
            referencedRelation: "org_cau_hinh_khoi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_cau_hinh_mon_id_mon_thi_fkey"
            columns: ["id_mon_thi"]
            isOneToOne: false
            referencedRelation: "edu_mon_thi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_cau_hinh_mon_id_slot_fkey"
            columns: ["id_slot"]
            isOneToOne: false
            referencedRelation: "edu_to_hop_mon_chi_tiet"
            referencedColumns: ["id"]
          },
        ]
      }
      org_co_so_dao_tao: {
        Row: {
          da_verify: boolean
          giay_phep_dao_tao: string | null
          id_to_chuc: string
          loai_co_so: Database["public"]["Enums"]["loai_co_so_enum"]
          ma_co_so: string
          nam_thanh_lap: number | null
          ten_chinh_thuc: string
          website: string | null
        }
        Insert: {
          da_verify?: boolean
          giay_phep_dao_tao?: string | null
          id_to_chuc: string
          loai_co_so: Database["public"]["Enums"]["loai_co_so_enum"]
          ma_co_so: string
          nam_thanh_lap?: number | null
          ten_chinh_thuc: string
          website?: string | null
        }
        Update: {
          da_verify?: boolean
          giay_phep_dao_tao?: string | null
          id_to_chuc?: string
          loai_co_so?: Database["public"]["Enums"]["loai_co_so_enum"]
          ma_co_so?: string
          nam_thanh_lap?: number | null
          ten_chinh_thuc?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_co_so_dao_tao_id_to_chuc_fkey"
            columns: ["id_to_chuc"]
            isOneToOne: true
            referencedRelation: "org_to_chuc"
            referencedColumns: ["id"]
          },
        ]
      }
      org_dang_ky_su_kien: {
        Row: {
          id: string
          id_nguoi_dung: string
          id_su_kien: string
          loai_phan_hoi: Database["public"]["Enums"]["loai_phan_hoi_su_kien_enum"]
          tao_luc: string
          trang_thai: Database["public"]["Enums"]["trang_thai_dang_ky_su_kien_enum"]
        }
        Insert: {
          id?: string
          id_nguoi_dung: string
          id_su_kien: string
          loai_phan_hoi?: Database["public"]["Enums"]["loai_phan_hoi_su_kien_enum"]
          tao_luc?: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_dang_ky_su_kien_enum"]
        }
        Update: {
          id?: string
          id_nguoi_dung?: string
          id_su_kien?: string
          loai_phan_hoi?: Database["public"]["Enums"]["loai_phan_hoi_su_kien_enum"]
          tao_luc?: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_dang_ky_su_kien_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "org_dang_ky_su_kien_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_dang_ky_su_kien_id_su_kien_fkey"
            columns: ["id_su_kien"]
            isOneToOne: false
            referencedRelation: "org_su_kien"
            referencedColumns: ["id"]
          },
        ]
      }
      org_giao_trinh: {
        Row: {
          cap_nhat_luc: string
          id: string
          id_khoa_hoc: string
          mo_ta_chi_tiet: string | null
          mo_ta_ngan: string | null
          so_buoi: number | null
          thu_tu: number
          thumbnail_id: string | null
          tieu_de: string
          video_gioi_thieu_url: string | null
          visibility: Database["public"]["Enums"]["visibility_giao_trinh_enum"]
        }
        Insert: {
          cap_nhat_luc?: string
          id?: string
          id_khoa_hoc: string
          mo_ta_chi_tiet?: string | null
          mo_ta_ngan?: string | null
          so_buoi?: number | null
          thu_tu?: number
          thumbnail_id?: string | null
          tieu_de: string
          video_gioi_thieu_url?: string | null
          visibility?: Database["public"]["Enums"]["visibility_giao_trinh_enum"]
        }
        Update: {
          cap_nhat_luc?: string
          id?: string
          id_khoa_hoc?: string
          mo_ta_chi_tiet?: string | null
          mo_ta_ngan?: string | null
          so_buoi?: number | null
          thu_tu?: number
          thumbnail_id?: string | null
          tieu_de?: string
          video_gioi_thieu_url?: string | null
          visibility?: Database["public"]["Enums"]["visibility_giao_trinh_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "org_giao_trinh_id_khoa_hoc_fkey"
            columns: ["id_khoa_hoc"]
            isOneToOne: false
            referencedRelation: "org_khoa_hoc"
            referencedColumns: ["id"]
          },
        ]
      }
      org_hinh_anh: {
        Row: {
          caption: string | null
          cloudflare_id: string
          created_at: string
          id: string
          id_to_chuc: string
          loai: string
          nam: number | null
          thu_tu: number
        }
        Insert: {
          caption?: string | null
          cloudflare_id: string
          created_at?: string
          id?: string
          id_to_chuc: string
          loai?: string
          nam?: number | null
          thu_tu?: number
        }
        Update: {
          caption?: string | null
          cloudflare_id?: string
          created_at?: string
          id?: string
          id_to_chuc?: string
          loai?: string
          nam?: number | null
          thu_tu?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_hinh_anh_id_to_chuc_fkey"
            columns: ["id_to_chuc"]
            isOneToOne: false
            referencedRelation: "org_to_chuc"
            referencedColumns: ["id"]
          },
        ]
      }
      org_khoa_hoc: {
        Row: {
          avatar_id: string | null
          bai_tap_hien_thi: string
          cover_id: string | null
          hoc_phi: number | null
          id: string
          id_to_chuc: string
          loai_mo_hinh: Database["public"]["Enums"]["loai_mo_hinh_khoa_enum"]
          mo_ta: string | null
          noi_dung_blocks: Json
          slug: string
          ten_khoa_hoc: string
          thoi_luong_buoi: number | null
          thoi_luong_phut_moi_buoi: number | null
          trang_thai_khoa_hoc: Database["public"]["Enums"]["trang_thai_khoa_hoc_enum"]
          trinh_do_dau_vao: Database["public"]["Enums"]["trinh_do_dau_vao_enum"]
        }
        Insert: {
          avatar_id?: string | null
          bai_tap_hien_thi?: string
          cover_id?: string | null
          hoc_phi?: number | null
          id?: string
          id_to_chuc: string
          loai_mo_hinh: Database["public"]["Enums"]["loai_mo_hinh_khoa_enum"]
          mo_ta?: string | null
          noi_dung_blocks?: Json
          slug: string
          ten_khoa_hoc: string
          thoi_luong_buoi?: number | null
          thoi_luong_phut_moi_buoi?: number | null
          trang_thai_khoa_hoc?: Database["public"]["Enums"]["trang_thai_khoa_hoc_enum"]
          trinh_do_dau_vao?: Database["public"]["Enums"]["trinh_do_dau_vao_enum"]
        }
        Update: {
          avatar_id?: string | null
          bai_tap_hien_thi?: string
          cover_id?: string | null
          hoc_phi?: number | null
          id?: string
          id_to_chuc?: string
          loai_mo_hinh?: Database["public"]["Enums"]["loai_mo_hinh_khoa_enum"]
          mo_ta?: string | null
          noi_dung_blocks?: Json
          slug?: string
          ten_khoa_hoc?: string
          thoi_luong_buoi?: number | null
          thoi_luong_phut_moi_buoi?: number | null
          trang_thai_khoa_hoc?: Database["public"]["Enums"]["trang_thai_khoa_hoc_enum"]
          trinh_do_dau_vao?: Database["public"]["Enums"]["trinh_do_dau_vao_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "org_khoa_hoc_id_to_chuc_fkey"
            columns: ["id_to_chuc"]
            isOneToOne: false
            referencedRelation: "org_to_chuc"
            referencedColumns: ["id"]
          },
        ]
      }
      org_lop_hoc: {
        Row: {
          giao_vien_phu_trach: string | null
          giao_vien_text: string | null
          hinh_thuc: Database["public"]["Enums"]["hinh_thuc_lop_enum"]
          id: string
          id_khoa_hoc: string
          lich_hoc: string | null
          ma_lop: string
          ngay_du_kien_ket_thuc: string | null
          ngay_khai_giang: string
          slot_toi_da: number | null
          trang_thai: Database["public"]["Enums"]["trang_thai_lop_enum"]
        }
        Insert: {
          giao_vien_phu_trach?: string | null
          giao_vien_text?: string | null
          hinh_thuc?: Database["public"]["Enums"]["hinh_thuc_lop_enum"]
          id?: string
          id_khoa_hoc: string
          lich_hoc?: string | null
          ma_lop: string
          ngay_du_kien_ket_thuc?: string | null
          ngay_khai_giang: string
          slot_toi_da?: number | null
          trang_thai?: Database["public"]["Enums"]["trang_thai_lop_enum"]
        }
        Update: {
          giao_vien_phu_trach?: string | null
          giao_vien_text?: string | null
          hinh_thuc?: Database["public"]["Enums"]["hinh_thuc_lop_enum"]
          id?: string
          id_khoa_hoc?: string
          lich_hoc?: string | null
          ma_lop?: string
          ngay_du_kien_ket_thuc?: string | null
          ngay_khai_giang?: string
          slot_toi_da?: number | null
          trang_thai?: Database["public"]["Enums"]["trang_thai_lop_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "org_lop_hoc_giao_vien_phu_trach_fkey"
            columns: ["giao_vien_phu_trach"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_lop_hoc_id_khoa_hoc_fkey"
            columns: ["id_khoa_hoc"]
            isOneToOne: false
            referencedRelation: "org_khoa_hoc"
            referencedColumns: ["id"]
          },
        ]
      }
      org_phuong_thuc_xet_tuyen: {
        Row: {
          ap_dung_tat_ca_nganh: boolean | null
          chi_tieu_phuong_thuc: number | null
          diem_chuan_phuong_thuc: number | null
          dieu_kien_xet_tuyen: string | null
          id: string
          id_cau_hinh_khoi: string | null
          id_nganh_ap_dung: string[] | null
          id_to_hop_mon: string | null
          id_tuyen_sinh_nam: string
          ten_phuong_thuc: Database["public"]["Enums"]["ten_phuong_thuc_enum"]
          thu_tu_uu_tien: number
          tieu_chi: Json | null
        }
        Insert: {
          ap_dung_tat_ca_nganh?: boolean | null
          chi_tieu_phuong_thuc?: number | null
          diem_chuan_phuong_thuc?: number | null
          dieu_kien_xet_tuyen?: string | null
          id?: string
          id_cau_hinh_khoi?: string | null
          id_nganh_ap_dung?: string[] | null
          id_to_hop_mon?: string | null
          id_tuyen_sinh_nam: string
          ten_phuong_thuc: Database["public"]["Enums"]["ten_phuong_thuc_enum"]
          thu_tu_uu_tien?: number
          tieu_chi?: Json | null
        }
        Update: {
          ap_dung_tat_ca_nganh?: boolean | null
          chi_tieu_phuong_thuc?: number | null
          diem_chuan_phuong_thuc?: number | null
          dieu_kien_xet_tuyen?: string | null
          id?: string
          id_cau_hinh_khoi?: string | null
          id_nganh_ap_dung?: string[] | null
          id_to_hop_mon?: string | null
          id_tuyen_sinh_nam?: string
          ten_phuong_thuc?: Database["public"]["Enums"]["ten_phuong_thuc_enum"]
          thu_tu_uu_tien?: number
          tieu_chi?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "org_phuong_thuc_xet_tuyen_id_cau_hinh_khoi_fkey"
            columns: ["id_cau_hinh_khoi"]
            isOneToOne: false
            referencedRelation: "org_cau_hinh_khoi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_phuong_thuc_xet_tuyen_id_to_hop_mon_fkey"
            columns: ["id_to_hop_mon"]
            isOneToOne: false
            referencedRelation: "edu_to_hop_mon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_phuong_thuc_xet_tuyen_id_tuyen_sinh_nam_fkey"
            columns: ["id_tuyen_sinh_nam"]
            isOneToOne: false
            referencedRelation: "org_tuyen_sinh_nam"
            referencedColumns: ["id"]
          },
        ]
      }
      org_scout_luu: {
        Row: {
          ghi_chu: string | null
          id_nguoi_dung: string
          id_to_chuc: string
          tao_luc: string
        }
        Insert: {
          ghi_chu?: string | null
          id_nguoi_dung: string
          id_to_chuc: string
          tao_luc?: string
        }
        Update: {
          ghi_chu?: string | null
          id_nguoi_dung?: string
          id_to_chuc?: string
          tao_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_scout_luu_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_scout_luu_id_to_chuc_fkey"
            columns: ["id_to_chuc"]
            isOneToOne: false
            referencedRelation: "org_to_chuc"
            referencedColumns: ["id"]
          },
        ]
      }
      org_su_kien: {
        Row: {
          bat_dau: string
          cover_id: string | null
          dia_diem: string | null
          gia_ve: number | null
          id: string
          id_to_chuc: string
          ket_thuc: string | null
          loai_su_kien: Database["public"]["Enums"]["loai_su_kien_enum"]
          mien_phi: boolean
          mo_ta: string | null
          noi_dung: string | null
          slot_toi_da: number | null
          ten: string
          tinh_thanh: Database["public"]["Enums"]["tinh_thanh_vn_enum"] | null
        }
        Insert: {
          bat_dau: string
          cover_id?: string | null
          dia_diem?: string | null
          gia_ve?: number | null
          id?: string
          id_to_chuc: string
          ket_thuc?: string | null
          loai_su_kien: Database["public"]["Enums"]["loai_su_kien_enum"]
          mien_phi?: boolean
          mo_ta?: string | null
          noi_dung?: string | null
          slot_toi_da?: number | null
          ten: string
          tinh_thanh?: Database["public"]["Enums"]["tinh_thanh_vn_enum"] | null
        }
        Update: {
          bat_dau?: string
          cover_id?: string | null
          dia_diem?: string | null
          gia_ve?: number | null
          id?: string
          id_to_chuc?: string
          ket_thuc?: string | null
          loai_su_kien?: Database["public"]["Enums"]["loai_su_kien_enum"]
          mien_phi?: boolean
          mo_ta?: string | null
          noi_dung?: string | null
          slot_toi_da?: number | null
          ten?: string
          tinh_thanh?: Database["public"]["Enums"]["tinh_thanh_vn_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "org_su_kien_id_to_chuc_fkey"
            columns: ["id_to_chuc"]
            isOneToOne: false
            referencedRelation: "org_to_chuc"
            referencedColumns: ["id"]
          },
        ]
      }
      org_to_chuc: {
        Row: {
          avatar_id: string | null
          cap_nhat_luc: string
          cau_hinh: Json
          cover_id: string | null
          dia_chi: string | null
          dien_thoai: string | null
          email_lien_he: string | null
          gioi_thieu_truong: string | null
          id: string
          loai_to_chuc: Database["public"]["Enums"]["loai_to_chuc_enum"]
          logo_id: string | null
          mo_ta: string | null
          nguoi_tao: string | null
          slug: string
          tao_luc: string
          ten: string
          tinh_thanh: Database["public"]["Enums"]["tinh_thanh_vn_enum"] | null
          trang_thai_hoat_dong: Database["public"]["Enums"]["trang_thai_hoat_dong_enum"]
          trang_thai_tin_cay: Database["public"]["Enums"]["trang_thai_tin_cay_enum"]
        }
        Insert: {
          avatar_id?: string | null
          cap_nhat_luc?: string
          cau_hinh?: Json
          cover_id?: string | null
          dia_chi?: string | null
          dien_thoai?: string | null
          email_lien_he?: string | null
          gioi_thieu_truong?: string | null
          id?: string
          loai_to_chuc: Database["public"]["Enums"]["loai_to_chuc_enum"]
          logo_id?: string | null
          mo_ta?: string | null
          nguoi_tao?: string | null
          slug: string
          tao_luc?: string
          ten: string
          tinh_thanh?: Database["public"]["Enums"]["tinh_thanh_vn_enum"] | null
          trang_thai_hoat_dong?: Database["public"]["Enums"]["trang_thai_hoat_dong_enum"]
          trang_thai_tin_cay?: Database["public"]["Enums"]["trang_thai_tin_cay_enum"]
        }
        Update: {
          avatar_id?: string | null
          cap_nhat_luc?: string
          cau_hinh?: Json
          cover_id?: string | null
          dia_chi?: string | null
          dien_thoai?: string | null
          email_lien_he?: string | null
          gioi_thieu_truong?: string | null
          id?: string
          loai_to_chuc?: Database["public"]["Enums"]["loai_to_chuc_enum"]
          logo_id?: string | null
          mo_ta?: string | null
          nguoi_tao?: string | null
          slug?: string
          tao_luc?: string
          ten?: string
          tinh_thanh?: Database["public"]["Enums"]["tinh_thanh_vn_enum"] | null
          trang_thai_hoat_dong?: Database["public"]["Enums"]["trang_thai_hoat_dong_enum"]
          trang_thai_tin_cay?: Database["public"]["Enums"]["trang_thai_tin_cay_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "org_to_chuc_nguoi_tao_fkey"
            columns: ["nguoi_tao"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      org_truong_dai_hoc: {
        Row: {
          co_ktx: boolean | null
          da_verify: boolean
          hoc_phi_nam_den: number | null
          hoc_phi_nam_tu: number | null
          id_to_chuc: string
          ktx_dia_chi: string | null
          ktx_gia_thang: string | null
          loai_truong: Database["public"]["Enums"]["loai_truong_enum"]
          ma_truong: string
          nam_thanh_lap: number | null
          ten_chinh_thuc: string
          ten_tieng_anh: string | null
          website: string | null
        }
        Insert: {
          co_ktx?: boolean | null
          da_verify?: boolean
          hoc_phi_nam_den?: number | null
          hoc_phi_nam_tu?: number | null
          id_to_chuc: string
          ktx_dia_chi?: string | null
          ktx_gia_thang?: string | null
          loai_truong: Database["public"]["Enums"]["loai_truong_enum"]
          ma_truong: string
          nam_thanh_lap?: number | null
          ten_chinh_thuc: string
          ten_tieng_anh?: string | null
          website?: string | null
        }
        Update: {
          co_ktx?: boolean | null
          da_verify?: boolean
          hoc_phi_nam_den?: number | null
          hoc_phi_nam_tu?: number | null
          id_to_chuc?: string
          ktx_dia_chi?: string | null
          ktx_gia_thang?: string | null
          loai_truong?: Database["public"]["Enums"]["loai_truong_enum"]
          ma_truong?: string
          nam_thanh_lap?: number | null
          ten_chinh_thuc?: string
          ten_tieng_anh?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_truong_dai_hoc_id_to_chuc_fkey"
            columns: ["id_to_chuc"]
            isOneToOne: true
            referencedRelation: "org_to_chuc"
            referencedColumns: ["id"]
          },
        ]
      }
      org_truong_nganh: {
        Row: {
          avatar_id: string | null
          cover_id: string | null
          he_dao_tao: Database["public"]["Enums"]["he_dao_tao_enum"]
          id: string
          id_nganh: string
          id_to_chuc: string
          ma_nganh: string | null
          slug: string
          ten_chuong_trinh: string
          thoi_gian_thang: number
          trang_thai_chuong_trinh: Database["public"]["Enums"]["trang_thai_chuong_trinh_enum"]
        }
        Insert: {
          avatar_id?: string | null
          cover_id?: string | null
          he_dao_tao: Database["public"]["Enums"]["he_dao_tao_enum"]
          id?: string
          id_nganh: string
          id_to_chuc: string
          ma_nganh?: string | null
          slug: string
          ten_chuong_trinh: string
          thoi_gian_thang: number
          trang_thai_chuong_trinh?: Database["public"]["Enums"]["trang_thai_chuong_trinh_enum"]
        }
        Update: {
          avatar_id?: string | null
          cover_id?: string | null
          he_dao_tao?: Database["public"]["Enums"]["he_dao_tao_enum"]
          id?: string
          id_nganh?: string
          id_to_chuc?: string
          ma_nganh?: string | null
          slug?: string
          ten_chuong_trinh?: string
          thoi_gian_thang?: number
          trang_thai_chuong_trinh?: Database["public"]["Enums"]["trang_thai_chuong_trinh_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "org_truong_nganh_id_nganh_fkey"
            columns: ["id_nganh"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_truong_nganh_id_to_chuc_fkey"
            columns: ["id_to_chuc"]
            isOneToOne: false
            referencedRelation: "org_to_chuc"
            referencedColumns: ["id"]
          },
        ]
      }
      org_tuyen_dung: {
        Row: {
          cap_do: string[] | null
          cap_nhat_luc: string
          da_xoa: boolean
          dia_chi: string | null
          giai_doan_muc_tieu: string[]
          han_nop: string | null
          hien_thi_co_hoi: boolean
          hien_thi_luong: boolean
          id: string
          id_linh_vuc: string | null
          id_nghe: string | null
          id_to_chuc: string
          lam_tu_xa: boolean
          loai_hinh: Database["public"]["Enums"]["loai_hinh_lam_viec_enum"]
          mo_ta: string | null
          mo_ta_ngan: string | null
          muc_luong_den: number | null
          muc_luong_tu: number | null
          phuc_loi: Json
          quyen_loi: string | null
          so_luong: number | null
          tao_luc: string
          tieu_de: string
          tinh_thanh: Database["public"]["Enums"]["tinh_thanh_vn_enum"] | null
          trang_thai: Database["public"]["Enums"]["trang_thai_tuyen_dung_enum"]
          yeu_cau: string | null
        }
        Insert: {
          cap_do?: string[] | null
          cap_nhat_luc?: string
          da_xoa?: boolean
          dia_chi?: string | null
          giai_doan_muc_tieu?: string[]
          han_nop?: string | null
          hien_thi_co_hoi?: boolean
          hien_thi_luong?: boolean
          id?: string
          id_linh_vuc?: string | null
          id_nghe?: string | null
          id_to_chuc: string
          lam_tu_xa?: boolean
          loai_hinh?: Database["public"]["Enums"]["loai_hinh_lam_viec_enum"]
          mo_ta?: string | null
          mo_ta_ngan?: string | null
          muc_luong_den?: number | null
          muc_luong_tu?: number | null
          phuc_loi?: Json
          quyen_loi?: string | null
          so_luong?: number | null
          tao_luc?: string
          tieu_de: string
          tinh_thanh?: Database["public"]["Enums"]["tinh_thanh_vn_enum"] | null
          trang_thai?: Database["public"]["Enums"]["trang_thai_tuyen_dung_enum"]
          yeu_cau?: string | null
        }
        Update: {
          cap_do?: string[] | null
          cap_nhat_luc?: string
          da_xoa?: boolean
          dia_chi?: string | null
          giai_doan_muc_tieu?: string[]
          han_nop?: string | null
          hien_thi_co_hoi?: boolean
          hien_thi_luong?: boolean
          id?: string
          id_linh_vuc?: string | null
          id_nghe?: string | null
          id_to_chuc?: string
          lam_tu_xa?: boolean
          loai_hinh?: Database["public"]["Enums"]["loai_hinh_lam_viec_enum"]
          mo_ta?: string | null
          mo_ta_ngan?: string | null
          muc_luong_den?: number | null
          muc_luong_tu?: number | null
          phuc_loi?: Json
          quyen_loi?: string | null
          so_luong?: number | null
          tao_luc?: string
          tieu_de?: string
          tinh_thanh?: Database["public"]["Enums"]["tinh_thanh_vn_enum"] | null
          trang_thai?: Database["public"]["Enums"]["trang_thai_tuyen_dung_enum"]
          yeu_cau?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_tuyen_dung_id_linh_vuc_fkey"
            columns: ["id_linh_vuc"]
            isOneToOne: false
            referencedRelation: "linh_vuc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_tuyen_dung_id_nghe_fkey"
            columns: ["id_nghe"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_tuyen_dung_id_to_chuc_fkey"
            columns: ["id_to_chuc"]
            isOneToOne: false
            referencedRelation: "org_to_chuc"
            referencedColumns: ["id"]
          },
        ]
      }
      org_tuyen_dung_ung_tuyen: {
        Row: {
          id_nguoi_dung: string
          id_tuyen_dung: string
          tao_luc: string
          thu_ngo: string | null
          trang_thai: Database["public"]["Enums"]["trang_thai_ung_tuyen_enum"]
        }
        Insert: {
          id_nguoi_dung: string
          id_tuyen_dung: string
          tao_luc?: string
          thu_ngo?: string | null
          trang_thai?: Database["public"]["Enums"]["trang_thai_ung_tuyen_enum"]
        }
        Update: {
          id_nguoi_dung?: string
          id_tuyen_dung?: string
          tao_luc?: string
          thu_ngo?: string | null
          trang_thai?: Database["public"]["Enums"]["trang_thai_ung_tuyen_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "org_tuyen_dung_ung_tuyen_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_tuyen_dung_ung_tuyen_id_tuyen_dung_fkey"
            columns: ["id_tuyen_dung"]
            isOneToOne: false
            referencedRelation: "org_tuyen_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      org_tuyen_sinh_nam: {
        Row: {
          chi_tieu: number | null
          diem_chuan: number | null
          ghi_chu: string | null
          ghi_chu_timeline: string | null
          id: string
          id_truong_nganh: string
          link_thong_tin: string | null
          nam: number
          ngay_cong_bo_diem: string | null
          ngay_dong_ho_so: string | null
          ngay_mo_ho_so: string | null
          ngay_thi_den: string | null
          ngay_thi_tu: string | null
          ngay_xac_nhan_nhap_hoc_den: string | null
          ngay_xac_nhan_nhap_hoc_tu: string | null
          so_thi_sinh: number | null
          tinh_trang: Database["public"]["Enums"]["tinh_trang_tuyen_sinh_enum"]
        }
        Insert: {
          chi_tieu?: number | null
          diem_chuan?: number | null
          ghi_chu?: string | null
          ghi_chu_timeline?: string | null
          id?: string
          id_truong_nganh: string
          link_thong_tin?: string | null
          nam: number
          ngay_cong_bo_diem?: string | null
          ngay_dong_ho_so?: string | null
          ngay_mo_ho_so?: string | null
          ngay_thi_den?: string | null
          ngay_thi_tu?: string | null
          ngay_xac_nhan_nhap_hoc_den?: string | null
          ngay_xac_nhan_nhap_hoc_tu?: string | null
          so_thi_sinh?: number | null
          tinh_trang?: Database["public"]["Enums"]["tinh_trang_tuyen_sinh_enum"]
        }
        Update: {
          chi_tieu?: number | null
          diem_chuan?: number | null
          ghi_chu?: string | null
          ghi_chu_timeline?: string | null
          id?: string
          id_truong_nganh?: string
          link_thong_tin?: string | null
          nam?: number
          ngay_cong_bo_diem?: string | null
          ngay_dong_ho_so?: string | null
          ngay_mo_ho_so?: string | null
          ngay_thi_den?: string | null
          ngay_thi_tu?: string | null
          ngay_xac_nhan_nhap_hoc_den?: string | null
          ngay_xac_nhan_nhap_hoc_tu?: string | null
          so_thi_sinh?: number | null
          tinh_trang?: Database["public"]["Enums"]["tinh_trang_tuyen_sinh_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "org_tuyen_sinh_nam_id_truong_nganh_fkey"
            columns: ["id_truong_nganh"]
            isOneToOne: false
            referencedRelation: "org_truong_nganh"
            referencedColumns: ["id"]
          },
        ]
      }
      project_dong_gop: {
        Row: {
          id: string
          id_du_an: string
          id_nguoi_dung: string
          nguoi_duyet: string | null
          nguon: Database["public"]["Enums"]["nguon_dong_gop_enum"]
          tao_luc: string
          trang_thai: Database["public"]["Enums"]["trang_thai_dong_gop_enum"]
          vai_tro: string | null
          xu_ly_luc: string | null
        }
        Insert: {
          id?: string
          id_du_an: string
          id_nguoi_dung: string
          nguoi_duyet?: string | null
          nguon?: Database["public"]["Enums"]["nguon_dong_gop_enum"]
          tao_luc?: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_dong_gop_enum"]
          vai_tro?: string | null
          xu_ly_luc?: string | null
        }
        Update: {
          id?: string
          id_du_an?: string
          id_nguoi_dung?: string
          nguoi_duyet?: string | null
          nguon?: Database["public"]["Enums"]["nguon_dong_gop_enum"]
          tao_luc?: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_dong_gop_enum"]
          vai_tro?: string | null
          xu_ly_luc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_dong_gop_id_du_an_fkey"
            columns: ["id_du_an"]
            isOneToOne: false
            referencedRelation: "project_du_an"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_dong_gop_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_dong_gop_nguoi_duyet_fkey"
            columns: ["nguoi_duyet"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      project_du_an: {
        Row: {
          avatar_id: string | null
          bat_dau: string | null
          cap_nhat_luc: string
          che_do_hien_thi: Database["public"]["Enums"]["che_do_hien_thi_du_an_enum"]
          cho_phep_apply: boolean
          cover_id: string | null
          id: string
          id_to_chuc_owner: string | null
          id_user_owner: string | null
          ket_thuc: string | null
          loai_du_an: Database["public"]["Enums"]["loai_du_an_enum"] | null
          mo_ta: string | null
          slug: string
          tao_luc: string
          ten: string
          trang_thai: Database["public"]["Enums"]["trang_thai_du_an_enum"]
        }
        Insert: {
          avatar_id?: string | null
          bat_dau?: string | null
          cap_nhat_luc?: string
          che_do_hien_thi?: Database["public"]["Enums"]["che_do_hien_thi_du_an_enum"]
          cho_phep_apply?: boolean
          cover_id?: string | null
          id?: string
          id_to_chuc_owner?: string | null
          id_user_owner?: string | null
          ket_thuc?: string | null
          loai_du_an?: Database["public"]["Enums"]["loai_du_an_enum"] | null
          mo_ta?: string | null
          slug: string
          tao_luc?: string
          ten: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_du_an_enum"]
        }
        Update: {
          avatar_id?: string | null
          bat_dau?: string | null
          cap_nhat_luc?: string
          che_do_hien_thi?: Database["public"]["Enums"]["che_do_hien_thi_du_an_enum"]
          cho_phep_apply?: boolean
          cover_id?: string | null
          id?: string
          id_to_chuc_owner?: string | null
          id_user_owner?: string | null
          ket_thuc?: string | null
          loai_du_an?: Database["public"]["Enums"]["loai_du_an_enum"] | null
          mo_ta?: string | null
          slug?: string
          tao_luc?: string
          ten?: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_du_an_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "project_du_an_id_to_chuc_owner_fkey"
            columns: ["id_to_chuc_owner"]
            isOneToOne: false
            referencedRelation: "org_to_chuc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_du_an_id_user_owner_fkey"
            columns: ["id_user_owner"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      social_binh_luan: {
        Row: {
          anh_dinh_kem: string[] | null
          cap_nhat_luc: string
          da_xoa: boolean
          ghim_luc: string | null
          id: string
          id_cha: string | null
          id_doi_tuong: string
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          nguoi_binh_luan: string
          noi_dung: string
          tao_luc: string
        }
        Insert: {
          anh_dinh_kem?: string[] | null
          cap_nhat_luc?: string
          da_xoa?: boolean
          ghim_luc?: string | null
          id?: string
          id_cha?: string | null
          id_doi_tuong: string
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          nguoi_binh_luan: string
          noi_dung: string
          tao_luc?: string
        }
        Update: {
          anh_dinh_kem?: string[] | null
          cap_nhat_luc?: string
          da_xoa?: boolean
          ghim_luc?: string | null
          id?: string
          id_cha?: string | null
          id_doi_tuong?: string
          loai_doi_tuong?: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          nguoi_binh_luan?: string
          noi_dung?: string
          tao_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_binh_luan_id_cha_fkey"
            columns: ["id_cha"]
            isOneToOne: false
            referencedRelation: "social_binh_luan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_binh_luan_nguoi_binh_luan_fkey"
            columns: ["nguoi_binh_luan"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      social_luot_xem: {
        Row: {
          da_xu_ly_hint: boolean
          id: string
          id_boi_canh: string | null
          id_doi_tuong: string
          loai_boi_canh:
            | Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
            | null
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          loai_su_kien: Database["public"]["Enums"]["loai_su_kien_social_enum"]
          ngu_canh: Json | null
          nguoi_xem: string | null
          nguon: Database["public"]["Enums"]["nguon_su_kien_enum"] | null
          phien_id: string | null
          tao_luc: string
        }
        Insert: {
          da_xu_ly_hint?: boolean
          id?: string
          id_boi_canh?: string | null
          id_doi_tuong: string
          loai_boi_canh?:
            | Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
            | null
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          loai_su_kien?: Database["public"]["Enums"]["loai_su_kien_social_enum"]
          ngu_canh?: Json | null
          nguoi_xem?: string | null
          nguon?: Database["public"]["Enums"]["nguon_su_kien_enum"] | null
          phien_id?: string | null
          tao_luc?: string
        }
        Update: {
          da_xu_ly_hint?: boolean
          id?: string
          id_boi_canh?: string | null
          id_doi_tuong?: string
          loai_boi_canh?:
            | Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
            | null
          loai_doi_tuong?: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          loai_su_kien?: Database["public"]["Enums"]["loai_su_kien_social_enum"]
          ngu_canh?: Json | null
          nguoi_xem?: string | null
          nguon?: Database["public"]["Enums"]["nguon_su_kien_enum"] | null
          phien_id?: string | null
          tao_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_luot_xem_nguoi_xem_fkey"
            columns: ["nguoi_xem"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      social_luot_xem_2026_05: {
        Row: {
          da_xu_ly_hint: boolean
          id: string
          id_boi_canh: string | null
          id_doi_tuong: string
          loai_boi_canh:
            | Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
            | null
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          loai_su_kien: Database["public"]["Enums"]["loai_su_kien_social_enum"]
          ngu_canh: Json | null
          nguoi_xem: string | null
          nguon: Database["public"]["Enums"]["nguon_su_kien_enum"] | null
          phien_id: string | null
          tao_luc: string
        }
        Insert: {
          da_xu_ly_hint?: boolean
          id?: string
          id_boi_canh?: string | null
          id_doi_tuong: string
          loai_boi_canh?:
            | Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
            | null
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          loai_su_kien?: Database["public"]["Enums"]["loai_su_kien_social_enum"]
          ngu_canh?: Json | null
          nguoi_xem?: string | null
          nguon?: Database["public"]["Enums"]["nguon_su_kien_enum"] | null
          phien_id?: string | null
          tao_luc?: string
        }
        Update: {
          da_xu_ly_hint?: boolean
          id?: string
          id_boi_canh?: string | null
          id_doi_tuong?: string
          loai_boi_canh?:
            | Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
            | null
          loai_doi_tuong?: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          loai_su_kien?: Database["public"]["Enums"]["loai_su_kien_social_enum"]
          ngu_canh?: Json | null
          nguoi_xem?: string | null
          nguon?: Database["public"]["Enums"]["nguon_su_kien_enum"] | null
          phien_id?: string | null
          tao_luc?: string
        }
        Relationships: []
      }
      social_luot_xem_2026_06: {
        Row: {
          da_xu_ly_hint: boolean
          id: string
          id_boi_canh: string | null
          id_doi_tuong: string
          loai_boi_canh:
            | Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
            | null
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          loai_su_kien: Database["public"]["Enums"]["loai_su_kien_social_enum"]
          ngu_canh: Json | null
          nguoi_xem: string | null
          nguon: Database["public"]["Enums"]["nguon_su_kien_enum"] | null
          phien_id: string | null
          tao_luc: string
        }
        Insert: {
          da_xu_ly_hint?: boolean
          id?: string
          id_boi_canh?: string | null
          id_doi_tuong: string
          loai_boi_canh?:
            | Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
            | null
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          loai_su_kien?: Database["public"]["Enums"]["loai_su_kien_social_enum"]
          ngu_canh?: Json | null
          nguoi_xem?: string | null
          nguon?: Database["public"]["Enums"]["nguon_su_kien_enum"] | null
          phien_id?: string | null
          tao_luc?: string
        }
        Update: {
          da_xu_ly_hint?: boolean
          id?: string
          id_boi_canh?: string | null
          id_doi_tuong?: string
          loai_boi_canh?:
            | Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
            | null
          loai_doi_tuong?: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          loai_su_kien?: Database["public"]["Enums"]["loai_su_kien_social_enum"]
          ngu_canh?: Json | null
          nguoi_xem?: string | null
          nguon?: Database["public"]["Enums"]["nguon_su_kien_enum"] | null
          phien_id?: string | null
          tao_luc?: string
        }
        Relationships: []
      }
      social_luu: {
        Row: {
          che_do_hien_thi: Database["public"]["Enums"]["che_do_luu_enum"]
          che_do_hien_thi_journey: string
          ghi_chu_rieng: string | null
          id: string
          id_doi_tuong: string
          id_nguoi_dung: string
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          tao_luc: string
        }
        Insert: {
          che_do_hien_thi?: Database["public"]["Enums"]["che_do_luu_enum"]
          che_do_hien_thi_journey?: string
          ghi_chu_rieng?: string | null
          id?: string
          id_doi_tuong: string
          id_nguoi_dung: string
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          tao_luc?: string
        }
        Update: {
          che_do_hien_thi?: Database["public"]["Enums"]["che_do_luu_enum"]
          che_do_hien_thi_journey?: string
          ghi_chu_rieng?: string | null
          id?: string
          id_doi_tuong?: string
          id_nguoi_dung?: string
          loai_doi_tuong?: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          tao_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_luu_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      social_reaction: {
        Row: {
          emoji: string
          id: string
          id_doi_tuong: string
          id_nguoi_dung: string
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          tao_luc: string
        }
        Insert: {
          emoji: string
          id?: string
          id_doi_tuong: string
          id_nguoi_dung: string
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          tao_luc?: string
        }
        Update: {
          emoji?: string
          id?: string
          id_doi_tuong?: string
          id_nguoi_dung?: string
          loai_doi_tuong?: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          tao_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_reaction_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      social_thong_bao: {
        Row: {
          da_doc: boolean
          id: string
          id_doi_tuong: string | null
          loai: string
          loai_doi_tuong: string | null
          nguoi_nhan: string
          noi_dung: string
          noi_dung_ai: string | null
          tao_luc: string
          xu_ly_luc: string | null
        }
        Insert: {
          da_doc?: boolean
          id?: string
          id_doi_tuong?: string | null
          loai: string
          loai_doi_tuong?: string | null
          nguoi_nhan: string
          noi_dung: string
          noi_dung_ai?: string | null
          tao_luc?: string
          xu_ly_luc?: string | null
        }
        Update: {
          da_doc?: boolean
          id?: string
          id_doi_tuong?: string | null
          loai?: string
          loai_doi_tuong?: string | null
          nguoi_nhan?: string
          noi_dung?: string
          noi_dung_ai?: string | null
          tao_luc?: string
          xu_ly_luc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_thong_bao_nguoi_nhan_fkey"
            columns: ["nguoi_nhan"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      social_thong_ke_doi_tuong_ngay: {
        Row: {
          cap_nhat_luc: string
          id: string
          id_doi_tuong: string
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          luot_click_lien_ket: number
          luot_click_profile: number
          luot_mo_comment: number
          luot_tiep_can: number
          luot_xem_media: number
          luot_xem_noi_dung: number
          ngay: string
          tiep_can_unique: number
        }
        Insert: {
          cap_nhat_luc?: string
          id?: string
          id_doi_tuong: string
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          luot_click_lien_ket?: number
          luot_click_profile?: number
          luot_mo_comment?: number
          luot_tiep_can?: number
          luot_xem_media?: number
          luot_xem_noi_dung?: number
          ngay: string
          tiep_can_unique?: number
        }
        Update: {
          cap_nhat_luc?: string
          id?: string
          id_doi_tuong?: string
          loai_doi_tuong?: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
          luot_click_lien_ket?: number
          luot_click_profile?: number
          luot_mo_comment?: number
          luot_tiep_can?: number
          luot_xem_media?: number
          luot_xem_noi_dung?: number
          ngay?: string
          tiep_can_unique?: number
        }
        Relationships: []
      }
      user_emoji_bo: {
        Row: {
          cap_nhat_luc: string
          cloudflare_id_anh_bia: string | null
          id: string
          id_nguoi_dung: string
          tao_luc: string
          ten: string
          thu_tu: number
        }
        Insert: {
          cap_nhat_luc?: string
          cloudflare_id_anh_bia?: string | null
          id?: string
          id_nguoi_dung: string
          tao_luc?: string
          ten: string
          thu_tu?: number
        }
        Update: {
          cap_nhat_luc?: string
          cloudflare_id_anh_bia?: string | null
          id?: string
          id_nguoi_dung?: string
          tao_luc?: string
          ten?: string
          thu_tu?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_emoji_bo_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      user_emoji_muc: {
        Row: {
          cloudflare_id: string
          da_xoa: boolean
          id: string
          id_bo: string
          tao_luc: string
          ten_goi: string | null
          thu_tu: number
        }
        Insert: {
          cloudflare_id: string
          da_xoa?: boolean
          id?: string
          id_bo: string
          tao_luc?: string
          ten_goi?: string | null
          thu_tu?: number
        }
        Update: {
          cloudflare_id?: string
          da_xoa?: boolean
          id?: string
          id_bo?: string
          tao_luc?: string
          ten_goi?: string | null
          thu_tu?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_emoji_muc_id_bo_fkey"
            columns: ["id_bo"]
            isOneToOne: false
            referencedRelation: "user_emoji_bo"
            referencedColumns: ["id"]
          },
        ]
      }
      user_filter_journey: {
        Row: {
          ap_dung_cho: Database["public"]["Enums"]["ap_dung_cho_enum"]
          hien_thi: boolean
          id: string
          id_nguoi_dung: string
          id_nhom_boi_canh: string | null
        }
        Insert: {
          ap_dung_cho: Database["public"]["Enums"]["ap_dung_cho_enum"]
          hien_thi?: boolean
          id?: string
          id_nguoi_dung: string
          id_nhom_boi_canh?: string | null
        }
        Update: {
          ap_dung_cho?: Database["public"]["Enums"]["ap_dung_cho_enum"]
          hien_thi?: boolean
          id?: string
          id_nguoi_dung?: string
          id_nhom_boi_canh?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_filter_journey_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_filter_journey_id_nhom_boi_canh_fkey"
            columns: ["id_nhom_boi_canh"]
            isOneToOne: false
            referencedRelation: "user_nhom_boi_canh"
            referencedColumns: ["id"]
          },
        ]
      }
      user_hoc_vien_lop: {
        Row: {
          id: string
          id_khoa_hoc: string
          id_lop_hoc: string | null
          id_nguoi_dung: string
          ket_qua: string | null
          ngay_dang_ky: string
          ngay_hoan_thanh: string | null
          trang_thai: Database["public"]["Enums"]["trang_thai_hoc_vien_enum"]
        }
        Insert: {
          id?: string
          id_khoa_hoc: string
          id_lop_hoc?: string | null
          id_nguoi_dung: string
          ket_qua?: string | null
          ngay_dang_ky?: string
          ngay_hoan_thanh?: string | null
          trang_thai?: Database["public"]["Enums"]["trang_thai_hoc_vien_enum"]
        }
        Update: {
          id?: string
          id_khoa_hoc?: string
          id_lop_hoc?: string | null
          id_nguoi_dung?: string
          ket_qua?: string | null
          ngay_dang_ky?: string
          ngay_hoan_thanh?: string | null
          trang_thai?: Database["public"]["Enums"]["trang_thai_hoc_vien_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "user_hoc_vien_lop_id_khoa_hoc_fkey"
            columns: ["id_khoa_hoc"]
            isOneToOne: false
            referencedRelation: "org_khoa_hoc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_hoc_vien_lop_id_lop_hoc_fkey"
            columns: ["id_lop_hoc"]
            isOneToOne: false
            referencedRelation: "org_lop_hoc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_hoc_vien_lop_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ket_ban: {
        Row: {
          id: string
          id_nguoi_gui: string
          id_nguoi_nhan: string
          tao_luc: string
          trang_thai: string
          xu_ly_luc: string | null
        }
        Insert: {
          id?: string
          id_nguoi_gui: string
          id_nguoi_nhan: string
          tao_luc?: string
          trang_thai?: string
          xu_ly_luc?: string | null
        }
        Update: {
          id?: string
          id_nguoi_gui?: string
          id_nguoi_nhan?: string
          tao_luc?: string
          trang_thai?: string
          xu_ly_luc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_ket_ban_id_nguoi_gui_fkey"
            columns: ["id_nguoi_gui"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ket_ban_id_nguoi_nhan_fkey"
            columns: ["id_nguoi_nhan"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      user_linh_vuc: {
        Row: {
          id_bai_viet: string
          id_linh_vuc: string | null
          id_nguoi_dung: string
          tao_luc: string
        }
        Insert: {
          id_bai_viet: string
          id_linh_vuc?: string | null
          id_nguoi_dung: string
          tao_luc?: string
        }
        Update: {
          id_bai_viet?: string
          id_linh_vuc?: string | null
          id_nguoi_dung?: string
          tao_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_linh_vuc_id_bai_viet_fkey"
            columns: ["id_bai_viet"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_linh_vuc_id_linh_vuc_fkey"
            columns: ["id_linh_vuc"]
            isOneToOne: false
            referencedRelation: "linh_vuc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_linh_vuc_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      user_nguoi_dung: {
        Row: {
          ai_summary_cap_nhat_luc: string | null
          ai_summary_journey: string | null
          auth_user_id: string | null
          avatar_id: string | null
          bio: string | null
          cho_phep_chat_an_danh: boolean
          cover_id: string | null
          da_xac_minh: boolean
          dia_chi_chi_tiet: string | null
          email_lien_he: string | null
          giai_doan: Database["public"]["Enums"]["giai_doan_enum"] | null
          gioi_tinh: Database["public"]["Enums"]["gioi_tinh_enum"] | null
          id: string
          journey_loai_moc_visibility: Json
          journey_mac_dinh_ap_dung_toi: boolean
          journey_mac_dinh_view: string | null
          lan_cuoi_active: string | null
          muc_tieu: Database["public"]["Enums"]["muc_tieu_enum"][] | null
          mxh_links: Json
          ngay_sinh: string | null
          slug: string
          so_dien_thoai: string | null
          tao_luc: string
          ten_hien_thi: string
          theme: string | null
          tinh_thanh: Database["public"]["Enums"]["tinh_thanh_vn_enum"] | null
          trang_thai_tai_khoan: Database["public"]["Enums"]["trang_thai_tai_khoan_enum"]
          visibility_dia_chi: Database["public"]["Enums"]["visibility_field_enum"]
          visibility_email: Database["public"]["Enums"]["visibility_field_enum"]
          visibility_gioi_tinh: Database["public"]["Enums"]["visibility_field_enum"]
          visibility_ngay_sinh: Database["public"]["Enums"]["visibility_field_enum"]
          visibility_sdt: Database["public"]["Enums"]["visibility_field_enum"]
          xac_minh_boi: string | null
          xac_minh_luc: string | null
        }
        Insert: {
          ai_summary_cap_nhat_luc?: string | null
          ai_summary_journey?: string | null
          auth_user_id?: string | null
          avatar_id?: string | null
          bio?: string | null
          cho_phep_chat_an_danh?: boolean
          cover_id?: string | null
          da_xac_minh?: boolean
          dia_chi_chi_tiet?: string | null
          email_lien_he?: string | null
          giai_doan?: Database["public"]["Enums"]["giai_doan_enum"] | null
          gioi_tinh?: Database["public"]["Enums"]["gioi_tinh_enum"] | null
          id?: string
          journey_loai_moc_visibility?: Json
          journey_mac_dinh_ap_dung_toi?: boolean
          journey_mac_dinh_view?: string | null
          lan_cuoi_active?: string | null
          muc_tieu?: Database["public"]["Enums"]["muc_tieu_enum"][] | null
          mxh_links?: Json
          ngay_sinh?: string | null
          slug: string
          so_dien_thoai?: string | null
          tao_luc?: string
          ten_hien_thi: string
          theme?: string | null
          tinh_thanh?: Database["public"]["Enums"]["tinh_thanh_vn_enum"] | null
          trang_thai_tai_khoan?: Database["public"]["Enums"]["trang_thai_tai_khoan_enum"]
          visibility_dia_chi?: Database["public"]["Enums"]["visibility_field_enum"]
          visibility_email?: Database["public"]["Enums"]["visibility_field_enum"]
          visibility_gioi_tinh?: Database["public"]["Enums"]["visibility_field_enum"]
          visibility_ngay_sinh?: Database["public"]["Enums"]["visibility_field_enum"]
          visibility_sdt?: Database["public"]["Enums"]["visibility_field_enum"]
          xac_minh_boi?: string | null
          xac_minh_luc?: string | null
        }
        Update: {
          ai_summary_cap_nhat_luc?: string | null
          ai_summary_journey?: string | null
          auth_user_id?: string | null
          avatar_id?: string | null
          bio?: string | null
          cho_phep_chat_an_danh?: boolean
          cover_id?: string | null
          da_xac_minh?: boolean
          dia_chi_chi_tiet?: string | null
          email_lien_he?: string | null
          giai_doan?: Database["public"]["Enums"]["giai_doan_enum"] | null
          gioi_tinh?: Database["public"]["Enums"]["gioi_tinh_enum"] | null
          id?: string
          journey_loai_moc_visibility?: Json
          journey_mac_dinh_ap_dung_toi?: boolean
          journey_mac_dinh_view?: string | null
          lan_cuoi_active?: string | null
          muc_tieu?: Database["public"]["Enums"]["muc_tieu_enum"][] | null
          mxh_links?: Json
          ngay_sinh?: string | null
          slug?: string
          so_dien_thoai?: string | null
          tao_luc?: string
          ten_hien_thi?: string
          theme?: string | null
          tinh_thanh?: Database["public"]["Enums"]["tinh_thanh_vn_enum"] | null
          trang_thai_tai_khoan?: Database["public"]["Enums"]["trang_thai_tai_khoan_enum"]
          visibility_dia_chi?: Database["public"]["Enums"]["visibility_field_enum"]
          visibility_email?: Database["public"]["Enums"]["visibility_field_enum"]
          visibility_gioi_tinh?: Database["public"]["Enums"]["visibility_field_enum"]
          visibility_ngay_sinh?: Database["public"]["Enums"]["visibility_field_enum"]
          visibility_sdt?: Database["public"]["Enums"]["visibility_field_enum"]
          xac_minh_boi?: string | null
          xac_minh_luc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_nguoi_dung_xac_minh_boi_fkey"
            columns: ["xac_minh_boi"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      user_nhom_boi_canh: {
        Row: {
          icon: string | null
          id: string
          id_nguoi_dung: string | null
          slug: string
          ten_nhom: string
          thu_tu: number
        }
        Insert: {
          icon?: string | null
          id?: string
          id_nguoi_dung?: string | null
          slug: string
          ten_nhom: string
          thu_tu?: number
        }
        Update: {
          icon?: string | null
          id?: string
          id_nguoi_dung?: string | null
          slug?: string
          ten_nhom?: string
          thu_tu?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_nhom_boi_canh_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quyen_he_thong: {
        Row: {
          cap_boi: string | null
          cap_nhat_luc: string
          id: string
          id_nguoi_dung: string
          tao_luc: string
          vai_tro: Database["public"]["Enums"]["vai_tro_he_thong_enum"]
        }
        Insert: {
          cap_boi?: string | null
          cap_nhat_luc?: string
          id?: string
          id_nguoi_dung: string
          tao_luc?: string
          vai_tro: Database["public"]["Enums"]["vai_tro_he_thong_enum"]
        }
        Update: {
          cap_boi?: string | null
          cap_nhat_luc?: string
          id?: string
          id_nguoi_dung?: string
          tao_luc?: string
          vai_tro?: Database["public"]["Enums"]["vai_tro_he_thong_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "user_quyen_he_thong_cap_boi_fkey"
            columns: ["cap_boi"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quyen_he_thong_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: true
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      user_thanh_vien_to_chuc: {
        Row: {
          den_ngay: string | null
          id: string
          id_nganh: string | null
          id_nguoi_dung: string
          id_to_chuc: string
          nam_bat_dau: number | null
          trang_thai: Database["public"]["Enums"]["trang_thai_thanh_vien_enum"]
          tu_ngay: string
          vai_tro: Database["public"]["Enums"]["vai_tro_to_chuc_enum"]
        }
        Insert: {
          den_ngay?: string | null
          id?: string
          id_nganh?: string | null
          id_nguoi_dung: string
          id_to_chuc: string
          nam_bat_dau?: number | null
          trang_thai?: Database["public"]["Enums"]["trang_thai_thanh_vien_enum"]
          tu_ngay?: string
          vai_tro: Database["public"]["Enums"]["vai_tro_to_chuc_enum"]
        }
        Update: {
          den_ngay?: string | null
          id?: string
          id_nganh?: string | null
          id_nguoi_dung?: string
          id_to_chuc?: string
          nam_bat_dau?: number | null
          trang_thai?: Database["public"]["Enums"]["trang_thai_thanh_vien_enum"]
          tu_ngay?: string
          vai_tro?: Database["public"]["Enums"]["vai_tro_to_chuc_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "user_thanh_vien_to_chuc_id_nganh_fkey"
            columns: ["id_nganh"]
            isOneToOne: false
            referencedRelation: "article_bai_viet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_thanh_vien_to_chuc_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_thanh_vien_to_chuc_id_to_chuc_fkey"
            columns: ["id_to_chuc"]
            isOneToOne: false
            referencedRelation: "org_to_chuc"
            referencedColumns: ["id"]
          },
        ]
      }
      user_theo_doi: {
        Row: {
          id: string
          id_doi_tuong: string
          id_nguoi_theo_doi: string
          loai_doi_tuong: Database["public"]["Enums"]["loai_theo_doi_enum"]
          tao_luc: string
        }
        Insert: {
          id?: string
          id_doi_tuong: string
          id_nguoi_theo_doi: string
          loai_doi_tuong: Database["public"]["Enums"]["loai_theo_doi_enum"]
          tao_luc?: string
        }
        Update: {
          id?: string
          id_doi_tuong?: string
          id_nguoi_theo_doi?: string
          loai_doi_tuong?: Database["public"]["Enums"]["loai_theo_doi_enum"]
          tao_luc?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_theo_doi_id_nguoi_theo_doi_fkey"
            columns: ["id_nguoi_theo_doi"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_co_dinh: {
        Row: {
          id: string
          id_doi_tuong: string
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_vector_enum"]
          phien_ban_quy_uoc: string
          prompt_hash: string
          tinh_luc: string
          vector: string
        }
        Insert: {
          id?: string
          id_doi_tuong: string
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_vector_enum"]
          phien_ban_quy_uoc: string
          prompt_hash: string
          tinh_luc?: string
          vector: string
        }
        Update: {
          id?: string
          id_doi_tuong?: string
          loai_doi_tuong?: Database["public"]["Enums"]["loai_doi_tuong_vector_enum"]
          phien_ban_quy_uoc?: string
          prompt_hash?: string
          tinh_luc?: string
          vector?: string
        }
        Relationships: []
      }
      vector_dong: {
        Row: {
          cap_nhat_cuoi: string
          cap_nhat_tiep: string | null
          do_tin_cay: number
          id: string
          id_doi_tuong: string
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_vector_enum"]
          nguon_du_lieu: Database["public"]["Enums"]["nguon_du_lieu_vector_enum"]
          phien_ban_quy_uoc: string
          so_data_point: number
          vector: string
        }
        Insert: {
          cap_nhat_cuoi?: string
          cap_nhat_tiep?: string | null
          do_tin_cay?: number
          id?: string
          id_doi_tuong: string
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_vector_enum"]
          nguon_du_lieu?: Database["public"]["Enums"]["nguon_du_lieu_vector_enum"]
          phien_ban_quy_uoc: string
          so_data_point?: number
          vector: string
        }
        Update: {
          cap_nhat_cuoi?: string
          cap_nhat_tiep?: string | null
          do_tin_cay?: number
          id?: string
          id_doi_tuong?: string
          loai_doi_tuong?: Database["public"]["Enums"]["loai_doi_tuong_vector_enum"]
          nguon_du_lieu?: Database["public"]["Enums"]["nguon_du_lieu_vector_enum"]
          phien_ban_quy_uoc?: string
          so_data_point?: number
          vector?: string
        }
        Relationships: []
      }
      vector_hang_doi: {
        Row: {
          bat_dau_xu_ly_luc: string | null
          hoan_thanh_luc: string | null
          id: string
          id_doi_tuong: string
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_vector_enum"]
          loai_vector: Database["public"]["Enums"]["loai_vector_enum"]
          loi: string | null
          ly_do: Database["public"]["Enums"]["ly_do_vector_enum"] | null
          so_lan_thu: number
          tao_luc: string
          trang_thai: Database["public"]["Enums"]["trang_thai_hang_doi_enum"]
          uu_tien: number
        }
        Insert: {
          bat_dau_xu_ly_luc?: string | null
          hoan_thanh_luc?: string | null
          id?: string
          id_doi_tuong: string
          loai_doi_tuong: Database["public"]["Enums"]["loai_doi_tuong_vector_enum"]
          loai_vector: Database["public"]["Enums"]["loai_vector_enum"]
          loi?: string | null
          ly_do?: Database["public"]["Enums"]["ly_do_vector_enum"] | null
          so_lan_thu?: number
          tao_luc?: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_hang_doi_enum"]
          uu_tien?: number
        }
        Update: {
          bat_dau_xu_ly_luc?: string | null
          hoan_thanh_luc?: string | null
          id?: string
          id_doi_tuong?: string
          loai_doi_tuong?: Database["public"]["Enums"]["loai_doi_tuong_vector_enum"]
          loai_vector?: Database["public"]["Enums"]["loai_vector_enum"]
          loi?: string | null
          ly_do?: Database["public"]["Enums"]["ly_do_vector_enum"] | null
          so_lan_thu?: number
          tao_luc?: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_hang_doi_enum"]
          uu_tien?: number
        }
        Relationships: []
      }
      verify_email_token: {
        Row: {
          da_claim_luc: string | null
          email_nhan: string
          het_han_luc: string
          id: string
          id_xac_nhan: string
          ip_claim: string | null
          tao_luc: string
          token_hash: string
        }
        Insert: {
          da_claim_luc?: string | null
          email_nhan: string
          het_han_luc?: string
          id?: string
          id_xac_nhan: string
          ip_claim?: string | null
          tao_luc?: string
          token_hash: string
        }
        Update: {
          da_claim_luc?: string | null
          email_nhan?: string
          het_han_luc?: string
          id?: string
          id_xac_nhan?: string
          ip_claim?: string | null
          tao_luc?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "verify_email_token_id_xac_nhan_fkey"
            columns: ["id_xac_nhan"]
            isOneToOne: false
            referencedRelation: "verify_xac_nhan"
            referencedColumns: ["id"]
          },
        ]
      }
      verify_tham_du_su_kien: {
        Row: {
          bang_chung: string | null
          id: string
          id_nguoi_dung: string
          id_su_kien: string
          nguoi_xac_nhan: string | null
          nguon_xac_nhan: Database["public"]["Enums"]["nguon_tham_du_enum"]
          tao_luc: string
          thoi_diem_xac_nhan: string | null
          trang_thai: Database["public"]["Enums"]["trang_thai_tham_du_enum"]
        }
        Insert: {
          bang_chung?: string | null
          id?: string
          id_nguoi_dung: string
          id_su_kien: string
          nguoi_xac_nhan?: string | null
          nguon_xac_nhan?: Database["public"]["Enums"]["nguon_tham_du_enum"]
          tao_luc?: string
          thoi_diem_xac_nhan?: string | null
          trang_thai?: Database["public"]["Enums"]["trang_thai_tham_du_enum"]
        }
        Update: {
          bang_chung?: string | null
          id?: string
          id_nguoi_dung?: string
          id_su_kien?: string
          nguoi_xac_nhan?: string | null
          nguon_xac_nhan?: Database["public"]["Enums"]["nguon_tham_du_enum"]
          tao_luc?: string
          thoi_diem_xac_nhan?: string | null
          trang_thai?: Database["public"]["Enums"]["trang_thai_tham_du_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "verify_tham_du_su_kien_id_nguoi_dung_fkey"
            columns: ["id_nguoi_dung"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verify_tham_du_su_kien_id_su_kien_fkey"
            columns: ["id_su_kien"]
            isOneToOne: false
            referencedRelation: "org_su_kien"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verify_tham_du_su_kien_nguoi_xac_nhan_fkey"
            columns: ["nguoi_xac_nhan"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      verify_xac_nhan: {
        Row: {
          bang_chung: string | null
          email_external: string | null
          id: string
          id_cot_moc: string
          id_nguoi_xac_nhan: string | null
          loai_nguoi_xac_nhan: Database["public"]["Enums"]["loai_nguoi_xac_nhan_enum"]
          tao_luc: string
          trang_thai: Database["public"]["Enums"]["trang_thai_xac_nhan_enum"]
          url_proof: string | null
          xu_ly_luc: string | null
        }
        Insert: {
          bang_chung?: string | null
          email_external?: string | null
          id?: string
          id_cot_moc: string
          id_nguoi_xac_nhan?: string | null
          loai_nguoi_xac_nhan: Database["public"]["Enums"]["loai_nguoi_xac_nhan_enum"]
          tao_luc?: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_xac_nhan_enum"]
          url_proof?: string | null
          xu_ly_luc?: string | null
        }
        Update: {
          bang_chung?: string | null
          email_external?: string | null
          id?: string
          id_cot_moc?: string
          id_nguoi_xac_nhan?: string | null
          loai_nguoi_xac_nhan?: Database["public"]["Enums"]["loai_nguoi_xac_nhan_enum"]
          tao_luc?: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_xac_nhan_enum"]
          url_proof?: string | null
          xu_ly_luc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verify_xac_nhan_id_cot_moc_fkey"
            columns: ["id_cot_moc"]
            isOneToOne: false
            referencedRelation: "content_cot_moc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verify_xac_nhan_id_nguoi_xac_nhan_fkey"
            columns: ["id_nguoi_xac_nhan"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      verify_yeu_cau: {
        Row: {
          id: string
          id_cot_moc: string
          id_to_chuc: string
          nguoi_xu_ly: string | null
          nguoi_yeu_cau: string
          noi_dung: string | null
          tao_luc: string
          trang_thai: Database["public"]["Enums"]["trang_thai_yeu_cau_enum"]
          xu_ly_luc: string | null
        }
        Insert: {
          id?: string
          id_cot_moc: string
          id_to_chuc: string
          nguoi_xu_ly?: string | null
          nguoi_yeu_cau: string
          noi_dung?: string | null
          tao_luc?: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_yeu_cau_enum"]
          xu_ly_luc?: string | null
        }
        Update: {
          id?: string
          id_cot_moc?: string
          id_to_chuc?: string
          nguoi_xu_ly?: string | null
          nguoi_yeu_cau?: string
          noi_dung?: string | null
          tao_luc?: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_yeu_cau_enum"]
          xu_ly_luc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verify_yeu_cau_id_cot_moc_fkey"
            columns: ["id_cot_moc"]
            isOneToOne: false
            referencedRelation: "content_cot_moc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verify_yeu_cau_id_to_chuc_fkey"
            columns: ["id_to_chuc"]
            isOneToOne: false
            referencedRelation: "org_to_chuc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verify_yeu_cau_nguoi_xu_ly_fkey"
            columns: ["nguoi_xu_ly"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verify_yeu_cau_nguoi_yeu_cau_fkey"
            columns: ["nguoi_yeu_cau"]
            isOneToOne: false
            referencedRelation: "user_nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cong_dong_cong_khai: { Args: { p_org: string }; Returns: boolean }
      current_profile_id: { Args: never; Returns: string }
      is_admin_to_chuc: {
        Args: { p_org: string; p_user: string }
        Returns: boolean
      }
      is_article_curator_for_bai_viet: {
        Args: { p_bai_viet: string; p_user: string }
        Returns: boolean
      }
      is_chat_room_member: {
        Args: { p_room: string; p_user: string }
        Returns: boolean
      }
      is_thanh_vien_to_chuc: {
        Args: { p_org: string; p_user: string }
        Returns: boolean
      }
      social_insight_doi_tuong: {
        Args: {
          p_id: string
          p_loai: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
        }
        Returns: {
          luot_click_lien_ket: number
          luot_click_profile: number
          luot_mo_comment: number
          luot_tiep_can: number
          luot_xem_media: number
          luot_xem_noi_dung: number
          tiep_can_unique: number
        }[]
      }
      social_insight_giai_doan: {
        Args: {
          p_id: string
          p_loai: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
        }
        Returns: {
          giai_doan: string
          nguoi: number
        }[]
      }
      social_insight_nguon: {
        Args: {
          p_id: string
          p_loai: Database["public"]["Enums"]["loai_doi_tuong_social_enum"]
        }
        Returns: {
          luot: number
          nguoi: number
          nguon: string
        }[]
      }
      social_rollup_su_kien: { Args: { p_ngay?: string }; Returns: number }
    }
    Enums: {
      ap_dung_cho_enum: "ban_than" | "nguoi_xem_khac"
      che_do_hien_thi_du_an_enum: "public" | "private" | "chi_thanh_vien"
      che_do_hien_thi_moc_enum:
        | "feature"
        | "public"
        | "theo_nhom"
        | "chi_minh"
        | "cong_dong"
      che_do_luu_enum: "private" | "public"
      filter_doi_tuong_enum: "cot_moc" | "org_bai_dang" | "tac_pham"
      giai_doan_enum:
        | "moi_bat_dau"
        | "dang_hoc"
        | "dang_lam"
        | "tim_viec"
        | "freelance"
        | "dang_day"
      gioi_tinh_enum: "nam" | "nu" | "khac" | "khong_muon_noi"
      gop_y_trang_thai_enum: "moi" | "dang_xu_ly" | "da_xu_ly" | "bo_qua"
      he_dao_tao_enum: "dai_hoc" | "cao_dang" | "trung_cap" | "chung_chi"
      hinh_thuc_lop_enum: "truc_tiep" | "truc_tuyen" | "ket_hop"
      loai_bai_dang_org_enum:
        | "thong_bao"
        | "tuyen_sinh"
        | "su_kien"
        | "showcase"
        | "khac"
        | "hoc_bong"
      loai_bai_viet_enum:
        | "linh_vuc"
        | "nghe"
        | "keyword"
        | "phan_mem"
        | "mon_hoc"
        | "blog"
        | "event"
        | "nganh_dao_tao"
      loai_chan_enum: "cu_the" | "tat_ca_an_danh" | "tat_ca_la" | "org_cu_the"
      loai_co_so_enum:
        | "trung_tam"
        | "truong_nghe"
        | "co_so_tu_nhan"
        | "chi_nhanh"
      loai_doi_tuong_social_enum:
        | "cot_moc"
        | "tac_pham"
        | "du_an"
        | "thao_luan"
        | "binh_luan"
        | "org_bai_dang"
        | "chat_tin_nhan"
        | "nguoi_dung"
        | "to_chuc"
        | "su_kien"
        | "org_tuyen_dung"
        | "article_dong_gop"
      loai_doi_tuong_vector_enum:
        | "user"
        | "org"
        | "bai_viet"
        | "khoa_hoc"
        | "linh_vuc"
      loai_du_an_enum: "commercial" | "personal" | "open_source" | "school"
      loai_hinh_lam_viec_enum:
        | "toan_thoi_gian"
        | "ban_thoi_gian"
        | "remote"
        | "freelance"
        | "thuc_tap"
      loai_media_enum: "image" | "video" | "audio" | "pdf" | "embed"
      loai_mo_hinh_khoa_enum: "cohort_co_dinh" | "lien_tuc_theo_thang"
      loai_moc_enum:
        | "hoc"
        | "lam_viec"
        | "du_an"
        | "su_kien"
        | "thanh_tuu"
        | "ca_nhan"
      loai_nguoi_xac_nhan_enum:
        | "to_chuc"
        | "nguoi_dung"
        | "external_email"
        | "system_url"
      loai_nhom_enum: "bo_phan" | "ky_thuat" | "nhom_nganh" | "cap_do"
      loai_phan_hoi_su_kien_enum: "quan_tam" | "se_tham_gia"
      loai_phong_chat_enum:
        | "1_1"
        | "1_1_an_danh"
        | "1_org"
        | "du_an"
        | "lop_hoc"
        | "su_kien"
        | "nhom"
      loai_quan_he_enum:
        | "THUOC_LINH_VUC"
        | "LIEN_QUAN"
        | "DUNG_TRONG_NGHE"
        | "TIEN_QUYET"
        | "DUNG_TRONG_NGANH"
      loai_su_kien_enum:
        | "workshop"
        | "talkshow"
        | "trien_lam"
        | "contest"
        | "meetup"
        | "khoa_dao_tao_ngan"
        | "tour_cong_ty"
        | "tour_truong"
        | "open_day"
        | "screening"
        | "hackathon"
        | "career_fair"
      loai_su_kien_social_enum:
        | "hien_thi"
        | "mo_card"
        | "xem_binh_luan"
        | "mo_popover_nguoi"
        | "xem_profile_full"
        | "click_lien_ket"
        | "xem_media"
      loai_tac_pham_enum:
        | "image"
        | "video"
        | "comic"
        | "ui_prototype"
        | "blog_process"
        | "audio"
        | "3d_model"
        | "bai_viet"
      loai_theo_doi_enum: "nguoi_dung" | "the" | "to_chuc"
      loai_tin_nhan_enum: "text" | "media" | "system" | "sticker"
      loai_to_chuc_enum:
        | "truong_dai_hoc"
        | "co_so_dao_tao"
        | "studio"
        | "doanh_nghiep"
        | "cong_dong"
      loai_truong_enum: "cong_lap" | "tu_thuc" | "dan_lap" | "co_von_nuoc_ngoai"
      loai_vector_enum: "co_dinh" | "dong"
      ly_do_vector_enum:
        | "tao_moi"
        | "noi_dung_edit"
        | "quy_uoc_doi"
        | "dinh_ky"
        | "member_thay_doi"
        | "journey_inferred"
      muc_tieu_enum:
        | "tim_khoa_hoc"
        | "tim_viec"
        | "tim_collaborator"
        | "show_portfolio"
        | "hoc_hoi"
      nguon_alias_enum: "admin" | "ai_merge" | "user_de_xuat"
      nguon_dong_gop_enum: "tu_apply" | "duoc_moi"
      nguon_du_lieu_vector_enum: "khai_bao" | "hanh_vi" | "ket_hop"
      nguon_goc_moc_enum:
        | "tu_tao"
        | "sinh_tu_du_an"
        | "sinh_tu_su_kien"
        | "sinh_tu_org_assign"
        | "sinh_tu_hoc_vien_lop"
      nguon_su_kien_enum:
        | "journey_home"
        | "entity_lens"
        | "permalink"
        | "gallery"
        | "org_page"
        | "cong_dong"
        | "khac"
      nguon_tham_du_enum: "qr_code" | "admin_manual" | "system_checkin"
      ten_phuong_thuc_enum:
        | "xet_diem_thi_thpt"
        | "xet_hoc_ba"
        | "danh_gia_nang_luc"
        | "xet_tuyen_thang"
        | "nang_khieu"
        | "phong_van"
        | "danh_gia_tu_duy"
        | "thi_van_hoa_rieng"
        | "nang_khieu_ket_hop"
        | "chung_chi_sat"
        | "chung_chi_act"
        | "chung_chi_ib"
        | "bang_nuoc_ngoai"
        | "v_sat"
        | "ket_hop"
      tinh_thanh_vn_enum:
        | "ha_noi"
        | "hue"
        | "hai_phong"
        | "da_nang"
        | "hcm"
        | "can_tho"
        | "cao_bang"
        | "lang_son"
        | "quang_ninh"
        | "dien_bien"
        | "lai_chau"
        | "son_la"
        | "nghe_an"
        | "ha_tinh"
        | "thanh_hoa"
        | "tuyen_quang"
        | "lao_cai"
        | "thai_nguyen"
        | "phu_tho"
        | "bac_ninh"
        | "hung_yen"
        | "ninh_binh"
        | "quang_tri"
        | "quang_ngai"
        | "gia_lai"
        | "khanh_hoa"
        | "dak_lak"
        | "lam_dong"
        | "dong_nai"
        | "tay_ninh"
        | "vinh_long"
        | "dong_thap"
        | "an_giang"
        | "ca_mau"
      tinh_thanh_vn_enum_old:
        | "ha_noi"
        | "hcm"
        | "da_nang"
        | "hai_phong"
        | "can_tho"
        | "an_giang"
        | "ba_ria_vung_tau"
        | "bac_giang"
        | "bac_kan"
        | "bac_lieu"
        | "bac_ninh"
        | "ben_tre"
        | "binh_dinh"
        | "binh_duong"
        | "binh_phuoc"
        | "binh_thuan"
        | "ca_mau"
        | "cao_bang"
        | "dak_lak"
        | "dak_nong"
        | "dien_bien"
        | "dong_nai"
        | "dong_thap"
        | "gia_lai"
        | "ha_giang"
        | "ha_nam"
        | "ha_tinh"
        | "hai_duong"
        | "hau_giang"
        | "hoa_binh"
        | "hung_yen"
        | "khanh_hoa"
        | "kien_giang"
        | "kon_tum"
        | "lai_chau"
        | "lam_dong"
        | "lang_son"
        | "lao_cai"
        | "long_an"
        | "nam_dinh"
        | "nghe_an"
        | "ninh_binh"
        | "ninh_thuan"
        | "phu_tho"
        | "phu_yen"
        | "quang_binh"
        | "quang_nam"
        | "quang_ngai"
        | "quang_ninh"
        | "quang_tri"
        | "soc_trang"
        | "son_la"
        | "tay_ninh"
        | "thai_binh"
        | "thai_nguyen"
        | "thanh_hoa"
        | "thua_thien_hue"
        | "tien_giang"
        | "tra_vinh"
        | "tuyen_quang"
        | "vinh_long"
        | "vinh_phuc"
        | "yen_bai"
      tinh_trang_tuyen_sinh_enum:
        | "sap_mo"
        | "dang_mo"
        | "da_dong"
        | "co_ket_qua"
      trang_thai_bai_dang_enum: "nhap" | "da_dang" | "archived"
      trang_thai_chuong_trinh_enum: "dang_tuyen" | "tam_dung" | "ngung_dao_tao"
      trang_thai_dang_ky_su_kien_enum:
        | "cho_duyet"
        | "da_duyet"
        | "tu_choi"
        | "huy"
      trang_thai_de_xuat_enum: "cho_review" | "da_duyet" | "tu_choi"
      trang_thai_dong_gop_enum: "cho_duyet" | "da_duyet" | "tu_choi"
      trang_thai_du_an_enum: "dang_lam" | "hoan_thanh" | "tam_dung" | "huy"
      trang_thai_hang_doi_enum: "cho" | "dang_xu_ly" | "hoan_thanh" | "loi"
      trang_thai_hoat_dong_enum: "dang_hoat_dong" | "tam_ngung" | "da_dong_cua"
      trang_thai_hoc_vien_enum:
        | "da_dang_ky"
        | "dang_hoc"
        | "da_hoan_thanh"
        | "da_bo_hoc"
        | "tam_nghi"
      trang_thai_khoa_hoc_enum:
        | "sap_khai_giang"
        | "dang_mo_don"
        | "dang_hoc"
        | "da_ket_thuc"
        | "tam_dung"
      trang_thai_lop_enum: "sap_khai_giang" | "dang_hoc" | "da_ket_thuc" | "huy"
      trang_thai_noi_dung_enum:
        | "cho_review"
        | "dang_viet"
        | "published"
        | "archived"
        | "merged"
      trang_thai_tai_khoan_enum:
        | "dang_hoat_dong"
        | "tam_dung"
        | "da_xoa"
        | "bi_khoa"
      trang_thai_tham_du_enum: "cho_xac_nhan" | "da_xac_nhan" | "tu_choi"
      trang_thai_thanh_vien_enum: "active" | "left" | "pending" | "rejected"
      trang_thai_tin_cay_enum:
        | "binh_thuong"
        | "dang_review"
        | "bi_canh_bao"
        | "bi_cam"
        | "verified_official"
      trang_thai_tuyen_dung_enum: "nhap" | "dang_mo" | "da_dong"
      trang_thai_ung_tuyen_enum:
        | "moi"
        | "dang_xem"
        | "phu_hop"
        | "tu_choi"
        | "da_nhan"
      trang_thai_xac_nhan_enum: "cho_duyet" | "da_xac_nhan" | "tu_choi"
      trang_thai_yeu_cau_enum: "cho_xu_ly" | "da_duyet" | "tu_choi"
      trinh_do_dau_vao_enum:
        | "co_ban"
        | "trung_cap"
        | "nang_cao"
        | "khong_yeu_cau"
      vai_tro_chat_enum: "admin" | "thanh_vien" | "owner"
      vai_tro_he_thong_enum: "admin" | "curator" | "thanh_vien"
      vai_tro_to_chuc_enum:
        | "owner"
        | "admin"
        | "giao_vien"
        | "nhan_vien"
        | "hoc_vien"
        | "thanh_vien"
        | "quan_ly_tuyen_sinh"
        | "quan_ly_noi_dung"
      visibility_field_enum: "public" | "friends" | "private"
      visibility_giao_trinh_enum: "public" | "chi_hoc_vien" | "private"
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
      ap_dung_cho_enum: ["ban_than", "nguoi_xem_khac"],
      che_do_hien_thi_du_an_enum: ["public", "private", "chi_thanh_vien"],
      che_do_hien_thi_moc_enum: [
        "feature",
        "public",
        "theo_nhom",
        "chi_minh",
        "cong_dong",
      ],
      che_do_luu_enum: ["private", "public"],
      filter_doi_tuong_enum: ["cot_moc", "org_bai_dang", "tac_pham"],
      giai_doan_enum: [
        "moi_bat_dau",
        "dang_hoc",
        "dang_lam",
        "tim_viec",
        "freelance",
        "dang_day",
      ],
      gioi_tinh_enum: ["nam", "nu", "khac", "khong_muon_noi"],
      gop_y_trang_thai_enum: ["moi", "dang_xu_ly", "da_xu_ly", "bo_qua"],
      he_dao_tao_enum: ["dai_hoc", "cao_dang", "trung_cap", "chung_chi"],
      hinh_thuc_lop_enum: ["truc_tiep", "truc_tuyen", "ket_hop"],
      loai_bai_dang_org_enum: [
        "thong_bao",
        "tuyen_sinh",
        "su_kien",
        "showcase",
        "khac",
        "hoc_bong",
      ],
      loai_bai_viet_enum: [
        "linh_vuc",
        "nghe",
        "keyword",
        "phan_mem",
        "mon_hoc",
        "blog",
        "event",
        "nganh_dao_tao",
      ],
      loai_chan_enum: ["cu_the", "tat_ca_an_danh", "tat_ca_la", "org_cu_the"],
      loai_co_so_enum: [
        "trung_tam",
        "truong_nghe",
        "co_so_tu_nhan",
        "chi_nhanh",
      ],
      loai_doi_tuong_social_enum: [
        "cot_moc",
        "tac_pham",
        "du_an",
        "thao_luan",
        "binh_luan",
        "org_bai_dang",
        "chat_tin_nhan",
        "nguoi_dung",
        "to_chuc",
        "su_kien",
        "org_tuyen_dung",
        "article_dong_gop",
      ],
      loai_doi_tuong_vector_enum: [
        "user",
        "org",
        "bai_viet",
        "khoa_hoc",
        "linh_vuc",
      ],
      loai_du_an_enum: ["commercial", "personal", "open_source", "school"],
      loai_hinh_lam_viec_enum: [
        "toan_thoi_gian",
        "ban_thoi_gian",
        "remote",
        "freelance",
        "thuc_tap",
      ],
      loai_media_enum: ["image", "video", "audio", "pdf", "embed"],
      loai_mo_hinh_khoa_enum: ["cohort_co_dinh", "lien_tuc_theo_thang"],
      loai_moc_enum: [
        "hoc",
        "lam_viec",
        "du_an",
        "su_kien",
        "thanh_tuu",
        "ca_nhan",
      ],
      loai_nguoi_xac_nhan_enum: [
        "to_chuc",
        "nguoi_dung",
        "external_email",
        "system_url",
      ],
      loai_nhom_enum: ["bo_phan", "ky_thuat", "nhom_nganh", "cap_do"],
      loai_phan_hoi_su_kien_enum: ["quan_tam", "se_tham_gia"],
      loai_phong_chat_enum: [
        "1_1",
        "1_1_an_danh",
        "1_org",
        "du_an",
        "lop_hoc",
        "su_kien",
        "nhom",
      ],
      loai_quan_he_enum: [
        "THUOC_LINH_VUC",
        "LIEN_QUAN",
        "DUNG_TRONG_NGHE",
        "TIEN_QUYET",
        "DUNG_TRONG_NGANH",
      ],
      loai_su_kien_enum: [
        "workshop",
        "talkshow",
        "trien_lam",
        "contest",
        "meetup",
        "khoa_dao_tao_ngan",
        "tour_cong_ty",
        "tour_truong",
        "open_day",
        "screening",
        "hackathon",
        "career_fair",
      ],
      loai_su_kien_social_enum: [
        "hien_thi",
        "mo_card",
        "xem_binh_luan",
        "mo_popover_nguoi",
        "xem_profile_full",
        "click_lien_ket",
        "xem_media",
      ],
      loai_tac_pham_enum: [
        "image",
        "video",
        "comic",
        "ui_prototype",
        "blog_process",
        "audio",
        "3d_model",
        "bai_viet",
      ],
      loai_theo_doi_enum: ["nguoi_dung", "the", "to_chuc"],
      loai_tin_nhan_enum: ["text", "media", "system", "sticker"],
      loai_to_chuc_enum: [
        "truong_dai_hoc",
        "co_so_dao_tao",
        "studio",
        "doanh_nghiep",
        "cong_dong",
      ],
      loai_truong_enum: ["cong_lap", "tu_thuc", "dan_lap", "co_von_nuoc_ngoai"],
      loai_vector_enum: ["co_dinh", "dong"],
      ly_do_vector_enum: [
        "tao_moi",
        "noi_dung_edit",
        "quy_uoc_doi",
        "dinh_ky",
        "member_thay_doi",
        "journey_inferred",
      ],
      muc_tieu_enum: [
        "tim_khoa_hoc",
        "tim_viec",
        "tim_collaborator",
        "show_portfolio",
        "hoc_hoi",
      ],
      nguon_alias_enum: ["admin", "ai_merge", "user_de_xuat"],
      nguon_dong_gop_enum: ["tu_apply", "duoc_moi"],
      nguon_du_lieu_vector_enum: ["khai_bao", "hanh_vi", "ket_hop"],
      nguon_goc_moc_enum: [
        "tu_tao",
        "sinh_tu_du_an",
        "sinh_tu_su_kien",
        "sinh_tu_org_assign",
        "sinh_tu_hoc_vien_lop",
      ],
      nguon_su_kien_enum: [
        "journey_home",
        "entity_lens",
        "permalink",
        "gallery",
        "org_page",
        "cong_dong",
        "khac",
      ],
      nguon_tham_du_enum: ["qr_code", "admin_manual", "system_checkin"],
      ten_phuong_thuc_enum: [
        "xet_diem_thi_thpt",
        "xet_hoc_ba",
        "danh_gia_nang_luc",
        "xet_tuyen_thang",
        "nang_khieu",
        "phong_van",
        "danh_gia_tu_duy",
        "thi_van_hoa_rieng",
        "nang_khieu_ket_hop",
        "chung_chi_sat",
        "chung_chi_act",
        "chung_chi_ib",
        "bang_nuoc_ngoai",
        "v_sat",
        "ket_hop",
      ],
      tinh_thanh_vn_enum: [
        "ha_noi",
        "hue",
        "hai_phong",
        "da_nang",
        "hcm",
        "can_tho",
        "cao_bang",
        "lang_son",
        "quang_ninh",
        "dien_bien",
        "lai_chau",
        "son_la",
        "nghe_an",
        "ha_tinh",
        "thanh_hoa",
        "tuyen_quang",
        "lao_cai",
        "thai_nguyen",
        "phu_tho",
        "bac_ninh",
        "hung_yen",
        "ninh_binh",
        "quang_tri",
        "quang_ngai",
        "gia_lai",
        "khanh_hoa",
        "dak_lak",
        "lam_dong",
        "dong_nai",
        "tay_ninh",
        "vinh_long",
        "dong_thap",
        "an_giang",
        "ca_mau",
      ],
      tinh_thanh_vn_enum_old: [
        "ha_noi",
        "hcm",
        "da_nang",
        "hai_phong",
        "can_tho",
        "an_giang",
        "ba_ria_vung_tau",
        "bac_giang",
        "bac_kan",
        "bac_lieu",
        "bac_ninh",
        "ben_tre",
        "binh_dinh",
        "binh_duong",
        "binh_phuoc",
        "binh_thuan",
        "ca_mau",
        "cao_bang",
        "dak_lak",
        "dak_nong",
        "dien_bien",
        "dong_nai",
        "dong_thap",
        "gia_lai",
        "ha_giang",
        "ha_nam",
        "ha_tinh",
        "hai_duong",
        "hau_giang",
        "hoa_binh",
        "hung_yen",
        "khanh_hoa",
        "kien_giang",
        "kon_tum",
        "lai_chau",
        "lam_dong",
        "lang_son",
        "lao_cai",
        "long_an",
        "nam_dinh",
        "nghe_an",
        "ninh_binh",
        "ninh_thuan",
        "phu_tho",
        "phu_yen",
        "quang_binh",
        "quang_nam",
        "quang_ngai",
        "quang_ninh",
        "quang_tri",
        "soc_trang",
        "son_la",
        "tay_ninh",
        "thai_binh",
        "thai_nguyen",
        "thanh_hoa",
        "thua_thien_hue",
        "tien_giang",
        "tra_vinh",
        "tuyen_quang",
        "vinh_long",
        "vinh_phuc",
        "yen_bai",
      ],
      tinh_trang_tuyen_sinh_enum: [
        "sap_mo",
        "dang_mo",
        "da_dong",
        "co_ket_qua",
      ],
      trang_thai_bai_dang_enum: ["nhap", "da_dang", "archived"],
      trang_thai_chuong_trinh_enum: ["dang_tuyen", "tam_dung", "ngung_dao_tao"],
      trang_thai_dang_ky_su_kien_enum: [
        "cho_duyet",
        "da_duyet",
        "tu_choi",
        "huy",
      ],
      trang_thai_de_xuat_enum: ["cho_review", "da_duyet", "tu_choi"],
      trang_thai_dong_gop_enum: ["cho_duyet", "da_duyet", "tu_choi"],
      trang_thai_du_an_enum: ["dang_lam", "hoan_thanh", "tam_dung", "huy"],
      trang_thai_hang_doi_enum: ["cho", "dang_xu_ly", "hoan_thanh", "loi"],
      trang_thai_hoat_dong_enum: ["dang_hoat_dong", "tam_ngung", "da_dong_cua"],
      trang_thai_hoc_vien_enum: [
        "da_dang_ky",
        "dang_hoc",
        "da_hoan_thanh",
        "da_bo_hoc",
        "tam_nghi",
      ],
      trang_thai_khoa_hoc_enum: [
        "sap_khai_giang",
        "dang_mo_don",
        "dang_hoc",
        "da_ket_thuc",
        "tam_dung",
      ],
      trang_thai_lop_enum: ["sap_khai_giang", "dang_hoc", "da_ket_thuc", "huy"],
      trang_thai_noi_dung_enum: [
        "cho_review",
        "dang_viet",
        "published",
        "archived",
        "merged",
      ],
      trang_thai_tai_khoan_enum: [
        "dang_hoat_dong",
        "tam_dung",
        "da_xoa",
        "bi_khoa",
      ],
      trang_thai_tham_du_enum: ["cho_xac_nhan", "da_xac_nhan", "tu_choi"],
      trang_thai_thanh_vien_enum: ["active", "left", "pending", "rejected"],
      trang_thai_tin_cay_enum: [
        "binh_thuong",
        "dang_review",
        "bi_canh_bao",
        "bi_cam",
        "verified_official",
      ],
      trang_thai_tuyen_dung_enum: ["nhap", "dang_mo", "da_dong"],
      trang_thai_ung_tuyen_enum: [
        "moi",
        "dang_xem",
        "phu_hop",
        "tu_choi",
        "da_nhan",
      ],
      trang_thai_xac_nhan_enum: ["cho_duyet", "da_xac_nhan", "tu_choi"],
      trang_thai_yeu_cau_enum: ["cho_xu_ly", "da_duyet", "tu_choi"],
      trinh_do_dau_vao_enum: [
        "co_ban",
        "trung_cap",
        "nang_cao",
        "khong_yeu_cau",
      ],
      vai_tro_chat_enum: ["admin", "thanh_vien", "owner"],
      vai_tro_he_thong_enum: ["admin", "curator", "thanh_vien"],
      vai_tro_to_chuc_enum: [
        "owner",
        "admin",
        "giao_vien",
        "nhan_vien",
        "hoc_vien",
        "thanh_vien",
        "quan_ly_tuyen_sinh",
        "quan_ly_noi_dung",
      ],
      visibility_field_enum: ["public", "friends", "private"],
      visibility_giao_trinh_enum: ["public", "chi_hoc_vien", "private"],
    },
  },
} as const
