const CONFIG = {
  projectId: 'gen-lang-client-0150709110',
  databaseId: 'ai-studio-sipadusmpislamal-6c38b5b8-a9ba-49da-8bdd-3764317c8ef1',
  apiKey: 'AIzaSyC7Xq-asMHPPi_a-Rwn4ID0mPWi0oTzJWw'
};

function doGet() {
  return output_({ success: true, service: 'SIMPATIK_AUTO_GRADING', version: 1 });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error('Permintaan kosong.');
    const body = JSON.parse(e.postData.contents);
    const idToken = String(body.idToken || '');
    const attemptId = String(body.attemptId || '');
    if (!idToken || !attemptId || attemptId.length > 160) throw new Error('Token atau ID pengerjaan tidak lengkap.');

    const identity = verifyFirebaseToken_(idToken);
    if (!identity.uid) throw new Error('Identitas Firebase tidak valid.');

    if (!lock.tryLock(15000)) throw new Error('Penilaian sedang diproses. Silakan tunggu sebentar.');
    const attempt = getDocument_('examAttempts', attemptId);
    if (!attempt) throw new Error('Data pengerjaan tidak ditemukan.');
    if (attempt.ownerUid !== identity.uid) throw new Error('Akses pengerjaan ditolak.');
    if (attempt.status !== 'Selesai') throw new Error('Siswa belum menyelesaikan ujian.');

    if (typeof attempt.score === 'number' && typeof attempt.total === 'number' && !attempt.gradingIssue) {
      return output_({ success: true, alreadyGraded: true, score: attempt.score, total: attempt.total, percent: attempt.percent });
    }

    const examId = String(attempt.examId || '');
    if (!examId) throw new Error('Data ujian tidak lengkap.');
    const exam = getDocument_('exams', examId);
    if (!exam || !Array.isArray(exam.questionIds) || !exam.questionIds.length) throw new Error('Paket soal tidak ditemukan.');

    let score = 0;
    let total = 0;
    const missing = [];
    exam.questionIds.forEach(function(questionId) {
      const key = getDocument_('examAnswerKeys', String(questionId));
      if (!key || key.answer === undefined || key.answer === null) {
        missing.push(String(questionId));
        return;
      }
      const points = Math.max(1, Number(key.points) || 1);
      total += points;
      const given = attempt.answers && attempt.answers[questionId];
      if (Number(given) === Number(key.answer)) score += points;
    });

    const issue = missing.length
      ? missing.length + ' dari ' + exam.questionIds.length + ' soal belum memiliki kunci jawaban. Nilai sementara hanya menghitung soal yang sudah memiliki kunci.'
      : '';

    const result = {
      score: score,
      total: total,
      percent: total > 0 ? Math.round((score / total) * 100) : 0,
      gradingIssue: issue,
      gradedAt: new Date().toISOString()
    };
    patchDocument_('examAttempts', attemptId, result);
    return output_({ success: true, ...result });
  } catch (error) {
    return output_({ success: false, message: error && error.message ? error.message : String(error) });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function authorizeAccess() {
  const token = ScriptApp.getOAuthToken();
  if (!token) throw new Error('Izin Google belum diberikan.');
  return 'Izin Apps Script berhasil disiapkan.';
}

function verifyFirebaseToken_(idToken) {
  const url = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(CONFIG.apiKey);
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ idToken: idToken }),
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  const data = JSON.parse(response.getContentText() || '{}');
  if (status !== 200 || !data.users || !data.users.length || data.users[0].disabled) {
    throw new Error('Token login siswa tidak sah atau sudah kedaluwarsa.');
  }
  return { uid: data.users[0].localId };
}

function getDocument_(collectionName, documentId) {
  const url = firestoreDocumentUrl_(collectionName, documentId);
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() === 404) return null;
  if (response.getResponseCode() !== 200) {
    throw new Error('Gagal membaca ' + collectionName + ': ' + response.getContentText());
  }
  const document = JSON.parse(response.getContentText());
  return decodeFields_(document.fields || {});
}

function patchDocument_(collectionName, documentId, values) {
  const fields = {};
  Object.keys(values).forEach(function(key) {
    fields[key] = encodeValue_(values[key]);
  });
  const masks = Object.keys(values).map(function(key) {
    return 'updateMask.fieldPaths=' + encodeURIComponent(key);
  }).join('&');
  const url = firestoreDocumentUrl_(collectionName, documentId) + '?' + masks;
  const response = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ fields: fields }),
    muteHttpExceptions: true
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error('Gagal menyimpan nilai: ' + response.getContentText());
  }
}

function firestoreDocumentUrl_(collectionName, documentId) {
  return 'https://firestore.googleapis.com/v1/projects/' +
    encodeURIComponent(CONFIG.projectId) + '/databases/' +
    encodeURIComponent(CONFIG.databaseId) + '/documents/' +
    encodeURIComponent(collectionName) + '/' + encodeURIComponent(documentId);
}

function decodeFields_(fields) {
  const result = {};
  Object.keys(fields).forEach(function(key) {
    const value = fields[key];
    if (value.stringValue !== undefined) result[key] = value.stringValue;
    else if (value.integerValue !== undefined) result[key] = Number(value.integerValue);
    else if (value.doubleValue !== undefined) result[key] = Number(value.doubleValue);
    else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
    else if (value.nullValue !== undefined) result[key] = null;
    else if (value.arrayValue !== undefined) result[key] = (value.arrayValue.values || []).map(decodeValue_);
    else if (value.mapValue !== undefined) result[key] = decodeFields_(value.mapValue.fields || {});
  });
  return result;
}

function decodeValue_(value) {
  return decodeFields_({ value: value }).value;
}

function encodeValue_(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue_) } };
  if (typeof value === 'object') {
    const fields = {};
    Object.keys(value).forEach(function(key) { fields[key] = encodeValue_(value[key]); });
    return { mapValue: { fields: fields } };
  }
  return { stringValue: String(value) };
}

function output_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
