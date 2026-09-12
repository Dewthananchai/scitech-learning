/* ============================================================
   SciTech Learning — Kid-Friendly Student Theme
   - Soft animated pastel galaxy background
   - Tactile 3D buttons for children
   - Playful card containers and star badges
   - Optimized for Mobile (<768px), iPad/Tablet (768px-1024px), & Desktop
   ============================================================ */

export const STUDENT_THEME_CSS = `
.st-page {
  min-height: 100vh;
  color: #1e293b;
  background: linear-gradient(135deg, #c7d2fe 0%, #bae6fd 30%, #fbcfe8 70%, #fed7aa 100%);
  background-size: 300% 300%;
  animation: stKidSkyShift 25s ease infinite alternate;
  font-family: 'Noto Sans Thai Looped', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-tap-highlight-color: transparent;
  /* กันเนื้อหา/การ์ดตกขอบจนเกิดการเลื่อนแนวนอน (ปัญหาจอ iPad ล้น) */
  overflow-x: hidden;
  max-width: 100vw;
}

@keyframes stKidSkyShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Headings on gradient background */
.st-title {
  color: #0f172a !important;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}
.st-sub {
  color: #334155 !important;
}

/* Child-friendly 3D tactile button */
.btn-kid-3d {
  position: relative;
  transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.15);
  transform: translateY(0);
}
.btn-kid-3d:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 rgba(0, 0, 0, 0.15);
}
.btn-kid-3d:active {
  transform: translateY(3px) !important;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.15) !important;
}

/* Kid card styles */
.card-kid {
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 1.5rem;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 10px 25px -5px rgba(100, 116, 139, 0.12), 0 8px 10px -6px rgba(100, 116, 139, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card-kid:hover {
  box-shadow: 0 16px 32px -6px rgba(59, 130, 246, 0.18);
}

/* Star glowing badge */
.badge-star-glow {
  animation: starPulse 2.5s ease-in-out infinite;
}

@keyframes starPulse {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 6px rgba(250, 204, 21, 0.6));
  }
  50% {
    transform: scale(1.08);
    filter: drop-shadow(0 0 14px rgba(250, 204, 21, 0.9));
  }
}

/* Mobile & Tablet Safe Spacing */
@media (max-width: 767px) {
  .st-page main {
    padding-bottom: 96px !important;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  /* Tablet / iPad Portrait mode adjustments */
  .st-page main {
    padding-bottom: 40px !important;
    /* ช่องว่างด้านบนเผื่อ MobileHeader แบบ fixed ที่ยังแสดงในโหมด iPad */
    padding-top: 4rem !important;
  }
  /* การ์ดในกริดไม่ให้ยืดเกินคอลัมน์ */
  .st-page main > section,
  .st-page main .card-kid {
    min-width: 0;
    max-width: 100%;
  }
}

.safe-area-bottom {
  padding-bottom: max(12px, env(safe-area-inset-bottom, 12px));
}

/* Smooth custom scrollbars for horizontal lists */
.kid-scrollbar::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}
.kid-scrollbar::-webkit-scrollbar-track {
  background: rgba(241, 245, 249, 0.6);
  border-radius: 999px;
}
.kid-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.5);
  border-radius: 999px;
}
.kid-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.6);
}
`;

/* ============================================================
   SciTech Learning — Unified Teacher Portal Theme
   ============================================================ */
export const TEACHER_THEME_CSS = `
.teacher-page {
  min-height: 100vh;
  color: #1e293b;
  background: linear-gradient(135deg, #f8fafc 0%, #ecfdf5 35%, #f0fdf4 65%, #f0f9ff 100%);
  background-attachment: fixed;
  font-family: 'Noto Sans Thai', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-tap-highlight-color: transparent;
  overflow-x: hidden;
  max-width: 100vw;
}

.teacher-card {
  background: #ffffff;
  border-radius: 1.5rem;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.04), 0 8px 10px -6px rgba(15, 23, 42, 0.02);
  overflow: hidden;
  transition: all 0.2s ease;
}

.teacher-glow-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.3;
  background: radial-gradient(circle at 90% -10%, rgba(255,255,255,0.55), transparent 45%),
              radial-gradient(circle at 10% 120%, rgba(255,255,255,0.35), transparent 40%);
}

.teacher-input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  background-color: rgba(248, 250, 252, 0.7);
  transition: all 0.15s ease;
}
.teacher-input:focus {
  outline: none;
  background-color: #ffffff;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

/* Safe-area padding for the teacher mobile bottom nav (reuse student rule) */
.safe-area-bottom {
  padding-bottom: max(12px, env(safe-area-inset-bottom, 12px));
}
`;
