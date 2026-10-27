import type { Stakeholder, Division } from '@/types';
import type { TaskDecompositionResult, TaskDecompositionItem } from './types';

/**
 * Intelligent Local Decomposer
 * Provides high-accuracy rule-based intent parsing, stakeholder mapping,
 * and natural Indonesian relay briefings even when remote AI is offline or loading.
 */
export function decomposeLocally(
  rawText: string,
  senderName: string,
  stakeholders: Stakeholder[] = []
): TaskDecompositionResult {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const cleanSender = senderName.replace(/\s*\([^)]*\)/g, '').trim() || 'Rekan Tim';

  // 1. Casual Greetings & Check-ins
  const casualGreetings = [
    'halo', 'hai', 'pagi', 'selamat pagi', 'siang', 'selamat siang',
    'sore', 'selamat sore', 'malam', 'selamat malam', 'tes', 'test',
    'ping', 'assalamualaikum', 'halo tim', 'halo semuanya'
  ];

  if (casualGreetings.includes(lower) || (lower.startsWith('halo') && lower.split(' ').length <= 3)) {
    const senderFirstName = cleanSender.split(' ')[0] || cleanSender;
    return {
      ringkasan: 'Sapaan tim',
      tanggal_deadline: null,
      daftar_tugas: [],
      ai_relay_briefing: `Halo Mas ${senderFirstName}! Ada tugas atau koordinasi yang mau disampaikan ke tim hari ini?`,
      intent_type: 'general_info',
      target_stakeholders: ['Semua Tim'],
      urgency: 'santai',
    };
  }

  // 2. Identify Target Stakeholder from Directory
  let targetStakeholder: Stakeholder | undefined;
  let explicitTargetMentioned = false;

  for (const s of stakeholders) {
    // Ignore sender targeting themselves
    if (s.name.toLowerCase() === cleanSender.toLowerCase()) continue;

    const sNameLower = s.name.toLowerCase();
    const parts = sNameLower.split(' ').filter(Boolean);
    const joined = parts.join(''); // e.g. "dimaswicaksono"

    // Check full name, joined name, @name, or first name
    if (
      lower.includes(sNameLower) ||
      lower.includes(joined) ||
      (parts.length > 0 && (
        lower.split(/[\s@,.:;!?]+/).includes(parts[0]) ||
        lower.includes('@' + parts[0])
      ))
    ) {
      targetStakeholder = s;
      explicitTargetMentioned = true;
      break;
    }
  }

  // 3. Check Division Keywords & Dynamic Stakeholder Domains
  const divisionKeywords: Record<string, string[]> = {
    desain: ['desain', 'design', 'ui', 'ux', 'figma', 'mockup', 'wireframe', 'aset', 'icon', 'logo', 'layout', 'visual'],
    backend: ['backend', 'api', 'database', 'db', 'query', 'sql', 'postgres', 'server', 'auth', 'endpoint', 'tabel', 'skema', 'service', 'grpc'],
    frontend: ['frontend', 'ui component', 'vue', 'react', 'css', 'halaman', 'tampilan', 'form', 'responsive', 'komponen', 'web'],
    devops: ['devops', 'deploy', 'docker', 'ci/cd', 'pipeline', 'staging', 'production', 'cloud', 'k8s', 'cluster', 'server down', 'nginx'],
    qa: ['qa', 'testing', 'test', 'audit', 'bug', 'issue', 'error', 'e2e', 'validasi', 'automation', 'playwright', 'uji'],
    general: ['rapat', 'standup', 'sprint', 'koordinasi', 'dokumen', 'laporan', 'notulen'],
  };

  let matchedDivision: Division | undefined;
  for (const [div, keywords] of Object.entries(divisionKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      matchedDivision = div as Division;
      break;
    }
  }

  // Also check dynamically against custom stakeholder divisions, roles, and skills
  if (!matchedDivision) {
    for (const s of stakeholders) {
      const divLower = s.division.toLowerCase();
      if (divLower && lower.includes(divLower)) {
        matchedDivision = s.division;
        if (!targetStakeholder) targetStakeholder = s;
        break;
      }
      // Check role keywords
      const roleWords = s.role.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      if (roleWords.some((rw) => lower.includes(rw))) {
        matchedDivision = s.division;
        if (!targetStakeholder) targetStakeholder = s;
        break;
      }
      // Check skills
      if (s.skills && s.skills.some((sk) => lower.includes(sk.toLowerCase()))) {
        matchedDivision = s.division;
        if (!targetStakeholder) targetStakeholder = s;
        break;
      }
    }
  }

  // If division not explicitly matched from keywords, infer from target stakeholder's division
  if (!matchedDivision && targetStakeholder) {
    matchedDivision = targetStakeholder.division;
  } else if (!matchedDivision) {
    matchedDivision = 'general';
  }

  // If target stakeholder not explicitly found, find a candidate from other team members by matched division
  if (!targetStakeholder && matchedDivision !== 'general') {
    targetStakeholder = stakeholders.find(
      (s) => s.division === matchedDivision && s.name.toLowerCase() !== cleanSender.toLowerCase()
    );
  }

  // 4. Action Request Detection
  const actionVerbs = [
    'tolong', 'minta', 'siapkan', 'buat', 'buatkan', 'kerjakan', 'selesaikan',
    'update', 'perbarui', 'bantu', 'perbaiki', 'fix', 'deploy', 'test', 'uji',
    'cek', 'kirim', 'ekspor', 'dump', 'jadwalkan', 'reviu', 'review', 'butuh', 'perlu'
  ];

  const hasActionVerb = actionVerbs.some((v) => lower.includes(v));

  // If message is just someone's name without action verbs (e.g. "dimas Wicaksono")
  if (!hasActionVerb && targetStakeholder && lower.split(/\s+/).length <= 4) {
    return {
      ringkasan: `Panggilan personil @${targetStakeholder.name}`,
      tanggal_deadline: null,
      daftar_tugas: [],
      ai_relay_briefing: `@${targetStakeholder.name}, ${cleanSender} mencari atau memanggilmu nih.`,
      intent_type: 'general_info',
      target_stakeholders: [targetStakeholder.name],
      urgency: 'normal',
    };
  }

  // 5. Clean Action Extraction
  let cleanAction = text;
  cleanAction = cleanAction.replace(/\bsiapakn\b/gi, 'siapkan');
  cleanAction = cleanAction.replace(/\bsiapin\b/gi, 'siapkan');

  // Strip introductory prefixes like "tolong @dimas", "@dimas tolong", "minta tolong"
  for (let i = 0; i < 3; i++) {
    cleanAction = cleanAction.replace(/^(tolong|minta tolong|mohon|bantu|tolong dong|minta)\s+/i, '');
    if (targetStakeholder) {
      const targetParts = targetStakeholder.name.toLowerCase().split(' ');
      const joined = targetParts.join('');
      cleanAction = cleanAction.replace(new RegExp(`^@?${joined}\\s+`, 'i'), '');
      cleanAction = cleanAction.replace(new RegExp(`^@?${targetStakeholder.name}\\s+`, 'i'), '');
      if (targetParts.length > 0) {
        cleanAction = cleanAction.replace(new RegExp(`^@?${targetParts[0]}\\s+`, 'i'), '');
        cleanAction = cleanAction.replace(new RegExp(`\\s+@${targetParts[0]}\\b`, 'gi'), '');
      }
    }
  }

  // Clean trailing punctuation or casual fillers
  cleanAction = cleanAction.replace(/\s+(ya|dong|nih|lah|deh|please|pls)\.?$/i, '').trim();
  cleanAction = cleanAction.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
  cleanAction = cleanAction.replace(/\buinya\b/gi, 'UI-nya');
  cleanAction = cleanAction.replace(/\bui\b/gi, 'UI');
  cleanAction = cleanAction.replace(/\bux\b/gi, 'UX');
  cleanAction = cleanAction.replace(/\bdb\b/gi, 'DB');
  cleanAction = cleanAction.replace(/\bapi\b/gi, 'API');

  // Capitalize first letter of action
  if (cleanAction.length > 0) {
    cleanAction = cleanAction.charAt(0).toUpperCase() + cleanAction.slice(1);
  }

  // Priority detection
  const isHighPriority = ['urgent', 'segera', 'cepat', 'asap', 'darurat', 'penting'].some((kw) => lower.includes(kw));
  const priority = isHighPriority ? 'tinggi' : 'sedang';

  // Deadline extraction
  let deadline = 'Besok';
  if (lower.includes('lusa')) deadline = 'Lusa';
  else if (lower.includes('hari ini')) deadline = 'Hari ini';
  else if (lower.includes('minggu ini')) deadline = 'Akhir minggu ini';
  else if (lower.includes('besok sore')) deadline = 'Besok, 17:00';
  else if (lower.includes('besok siang')) deadline = 'Besok, 12:00';

  // 6. Build Natural AI Personal Assistant Relay Voice
  const senderFirstName = cleanSender.split(' ')[0] || cleanSender;
  const deadlineSuffix = isHighPriority 
    ? 'nih segera!' 
    : deadline === 'Besok' 
      ? 'nih sebelum besok.' 
      : deadline === 'Lusa' 
        ? 'nih sebelum lusa.' 
        : deadline === 'Hari ini' 
          ? 'nih hari ini juga.' 
          : 'nih.';

  let aiRelayBriefing = '';
  if (targetStakeholder && explicitTargetMentioned) {
    const actionPhrase = cleanAction.charAt(0).toLowerCase() + cleanAction.slice(1);
    if (lower.includes('butuh') || lower.includes('perlu') || lower.includes('minta data') || lower.includes('dump') || lower.includes('ekspor')) {
      aiRelayBriefing = `@${targetStakeholder.name}, si ${senderFirstName} butuh ${actionPhrase} dari kamu ${deadlineSuffix}`;
    } else if (hasActionVerb) {
      aiRelayBriefing = `@${targetStakeholder.name}, si ${senderFirstName} minta kamu ${actionPhrase} ${deadlineSuffix}`;
    } else {
      aiRelayBriefing = `@${targetStakeholder.name}, si ${senderFirstName} bilang gini: ${cleanAction}.`;
    }
  } else {
    if (lower.includes('butuh') || lower.includes('perlu')) {
      aiRelayBriefing = `Halo tim! Si ${senderFirstName} butuh bantuan nih: ${cleanAction}.`;
    } else if (hasActionVerb) {
      aiRelayBriefing = `Halo tim! Si ${senderFirstName} minta tolong disiapkan: ${cleanAction} ${deadlineSuffix}`;
    } else {
      aiRelayBriefing = `Halo tim! Si ${senderFirstName} bilang gini: ${cleanAction}.`;
    }
  }

  // Clean double spaces or grammar artifacts
  aiRelayBriefing = aiRelayBriefing.replace(/\s+/g, ' ').trim();

  // 7. Structure Tasks
  const tasks: TaskDecompositionItem[] = [
    {
      divisi: matchedDivision,
      deskripsi: cleanAction || text,
      prioritas: priority,
      estimasi_jam: 3,
      assignee_name: targetStakeholder?.name || 'Tim',
      assignee_role: targetStakeholder?.role || '',
    },
  ];

  return {
    ringkasan: cleanAction.slice(0, 100),
    tanggal_deadline: deadline,
    daftar_tugas: tasks,
    ai_relay_briefing: aiRelayBriefing,
    intent_type: lower.includes('butuh') ? 'request_data' : 'task_instruction',
    target_stakeholders: targetStakeholder ? [targetStakeholder.name] : ['Semua Tim'],
    urgency: isHighPriority ? 'segera' : 'normal',
  };
}
