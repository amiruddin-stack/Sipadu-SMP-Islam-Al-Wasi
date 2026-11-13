export type UserRole =
  | 'super_admin'
  | 'kepala_sekolah'
  | 'operator'
  | 'guru'
  | 'wali_kelas'
  | 'guru_bk';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  nip?: string;
  assignedClass?: string;
  subject?: string;
  phone?: string;
}

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  className: string;
  status: 'menunggu' | 'Aktif' | 'Lulus' | 'Mutasi';
  parentPhone?: string;
  parentName?: string;
}

export interface Teacher {
  id: string;
  nip: string;
  name: string;
  email: string;
  role: UserRole;
  subject: string;
  assignedClass?: string;
  status: 'Aktif' | 'Cuti';
}

export type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  className: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  records: {
    [studentId: string]: AttendanceStatus;
  };
  notes?: {
    [studentId: string]: string;
  };
  recordedBy: string;
  recordedByName: string;
  updatedAt: string;
}

export interface Journal {
  id: string;
  date: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  className: string;
  lessonHours: string; // e.g. "Jam 1-2 (07:30 - 09:00)"
  topic: string;
  activity: string;
  notes?: string;
  status: 'Selesai' | 'Berlangsung';
  createdAt: string;
}

export type BehaviorCategory =
  | 'Perilaku Positif'
  | 'Pelanggaran Tata Tertib'
  | 'Kedisiplinan'
  | 'Tanggung Jawab'
  | 'Interaksi Sosial'
  | 'Catatan Pembinaan';

export interface BehaviorRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string;
  category: BehaviorCategory;
  description: string;
  coachingAction: string;
  recordedBy: string;
  status: 'Selesai' | 'Dalam Pembinaan' | 'Perlu Perhatian';
  points?: number;
}

export type CounselingServiceType = 'Pribadi' | 'Sosial' | 'Belajar' | 'Karir';

export interface CounselingRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string;
  serviceType: CounselingServiceType;
  issueSummary: string;
  actionPlan: string;
  followUpStatus: 'Proses' | 'Selesai' | 'Rujukan';
  counselorId: string;
  counselorName: string;
  notes?: string;
}

export type AssessmentType =
  | 'Tugas 1'
  | 'Tugas 2'
  | 'Ulangan Harian 1'
  | 'Ulangan Harian 2'
  | 'Penilaian Tengah Semester (PTS)'
  | 'Penilaian Akhir Semester (PAS)'
  | 'Praktik/Proyek'
  | 'Tahfidz / Keagamaan';

export interface StudentScore {
  score: number;
  note?: string;
}

export interface Assessment {
  id: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  className: string;
  subject: string;
  assessmentType: AssessmentType;
  teacherId: string;
  teacherName: string;
  date: string;
  kkm: number;
  scores: {
    [studentId: string]: StudentScore;
  };
}

export interface SchoolSetting {
  id: string;
  schoolName: string;
  npsn: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  principal: string;
  principalNip: string;
  activeAcademicYear: string;
  activeSemester: 'Ganjil' | 'Genap';
  effectiveDays: number;
}
