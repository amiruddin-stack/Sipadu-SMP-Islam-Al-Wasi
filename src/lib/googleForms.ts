type GoogleTokenResponse = { access_token?: string; error?: string; error_description?: string };
type GoogleTokenClient = { requestAccessToken: (options?: { prompt?: string }) => void };
declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;
let activeAccessToken = '';

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!googleScriptPromise) {
    googleScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
      const script = existing || document.createElement('script');
      const fail = () => reject(new Error('Layanan login Google gagal dimuat. Periksa koneksi internet.'));
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', fail, { once: true });
      if (!existing) {
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = 'true';
        document.head.appendChild(script);
      }
    }).catch(error => {
      googleScriptPromise = null;
      throw error;
    });
  }
  return googleScriptPromise!;
}

export async function authorizeGoogleForms(clientId: string): Promise<void> {
  if (!clientId || clientId === 'ISI_CLIENT_ID_DI_SINI' || !clientId.endsWith('.apps.googleusercontent.com')) throw new Error('OAuth Client ID belum diisi dengan benar. Masukkan Client ID Web dari Google Cloud (akhiran .apps.googleusercontent.com).');
  await loadGoogleIdentity();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error('Layanan otorisasi Google belum siap.');
  await new Promise<void>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/forms.body.readonly',
      callback: response => {
        if (response.error || !response.access_token) {
          const code = response.error || '';
          const detail = response.error_description || '';
          if (code === 'access_denied') reject(new Error('Akses ditolak. Login menggunakan akun Google sekolah @smpialwasi-maros.sch.id dan berikan izin baca formulir.'));
          else if (code === 'origin_mismatch' || /origin_mismatch|origin.*not allowed/i.test(detail)) reject(new Error('Alamat aplikasi belum diizinkan di Google Cloud. Tambahkan https://amiruddin-stack.github.io pada Authorized JavaScript origins.'));
          else reject(new Error(detail || 'Izin Google tidak diberikan. Periksa akun sekolah dan coba lagi.'));
          return;
        }
        activeAccessToken = response.access_token;
        resolve();
      },
      error_callback: error => {
        if (error.type === 'popup_failed_to_open') reject(new Error('Jendela login Google diblokir browser. Izinkan pop-up untuk SIMPATIK, lalu coba lagi.'));
        else if (error.type === 'popup_closed') reject(new Error('Jendela login ditutup sebelum izin diberikan. Silakan coba lagi.'));
        else reject(new Error(error.message || 'Login Google gagal dibuka. Coba izinkan pop-up dan gunakan akun sekolah.'));
      }
    });
    client.requestAccessToken({ prompt: '' });
  });
}

export function hasGoogleFormsAccess(): boolean {
  return Boolean(activeAccessToken);
}

export function getGoogleFormId(value: string): string {
  const match = value.trim().match(/docs\.google\.com\/forms\/d\/(?:e\/)?([A-Za-z0-9_-]+)/i);
  if (!match?.[1]) throw new Error('Tautan tidak dikenali. Gunakan tautan Google Form yang memiliki akses edit.');
  return match[1];
}

export type ImportedGoogleQuestion = {
  prompt: string;
  options: string[];
  answer?: number;
  points: number;
};

export async function readGoogleForm(value: string): Promise<{ title: string; isQuiz: boolean; questions: ImportedGoogleQuestion[] }> {
  if (!activeAccessToken) throw new Error('Hubungkan akun Google terlebih dahulu.');
  const formId = getGoogleFormId(value);
  const response = await fetch(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}`, {
    headers: { Authorization: `Bearer ${activeAccessToken}` }
  });
  if (response.status === 401) {
    activeAccessToken = '';
    throw new Error('Izin Google telah kedaluwarsa. Hubungkan ulang akun Google.');
  }
  if (response.status === 403) throw new Error('Akun Google ini tidak memiliki izin membaca formulir, atau Google Forms API belum diaktifkan.');
  if (response.status === 404) throw new Error('Formulir tidak ditemukan. Pastikan tautan benar dan akun memiliki akses.');
  if (!response.ok) throw new Error('Google Forms API gagal membaca formulir (' + response.status + ').');
  const form = await response.json();
  const questions: ImportedGoogleQuestion[] = [];
  for (const item of form.items || []) {
    const question = item.questionItem?.question;
    const choice = question?.choiceQuestion;
    if (!question || !choice?.options?.length || !['RADIO', 'DROP_DOWN'].includes(choice.type) || !String(item.title || '').trim()) continue;
    const options = choice.options.map((option: { value?: string }) => String(option.value || '').trim()).filter(Boolean);
    if (options.length < 2) continue;
    const correctValues = question.grading?.correctAnswers?.answers || [];
    const correctValue = correctValues.length === 1 ? correctValues[0]?.value : undefined;
    const answerIndex = correctValue === undefined ? -1 : options.findIndex((option: string) => option === String(correctValue));
    questions.push({
      prompt: String(item.title || '').trim(),
      options,
      ...(answerIndex >= 0 ? { answer: answerIndex } : {}),
      points: Math.max(1, Number(question.grading?.pointValue || 1))
    });
  }
  if (!questions.length) throw new Error('Tidak ditemukan soal pilihan ganda yang dapat diimpor. Soal paragraf, unggah file, dan kisi-kisi belum didukung.');
  return { title: String(form.info?.title || 'Google Form'), isQuiz: Boolean(form.settings?.quizSettings?.isQuiz), questions };
}
