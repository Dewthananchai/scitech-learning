#!/bin/bash
# ==========================================
# SciTech Learning — Server Manager (macOS)
# ==========================================
# วิธีใช้: bash scitech.sh [start|stop|restart|build|status|log]

PORT=5173
LOG=".freebuff/preview.log"
PID_FILE=".freebuff/server.pid"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# สี
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ===== ฟังก์ชัน =====

get_pid() {
  lsof -ti:$PORT 2>/dev/null | head -1
}

is_running() {
  local pid=$(get_pid)
  if [ -n "$pid" ]; then
    kill -0 "$pid" 2>/dev/null
    return $?
  fi
  return 1
}

start_server() {
  echo -e "${CYAN}🚀 กำลังสตาร์ท SciTech Learning...${NC}"
  
  if is_running; then
    local pid=$(get_pid)
    echo -e "${YELLOW}⚠️  เซิร์ฟเวอร์กำลังทำงานอยู่แล้ว (PID: $pid, Port: $PORT)${NC}"
    echo -e "${BLUE}🌐 http://127.0.0.1:$PORT${NC}"
    return 0
  fi

  # ลบ port ที่ใช้อยู่
  kill $(lsof -ti:$PORT) 2>/dev/null
  sleep 1

  cd "$PROJECT_DIR"
  export PATH="$HOME/nodejs/bin:$PATH"
  
  mkdir -p .freebuff
  
  # Get local network IP for LAN access
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
  if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "")
  fi
  
  nohup npx vite --host > "$LOG" 2>&1 < /dev/null &
  echo $! > "$PID_FILE"
  disown

  echo -e "${BLUE}⏳ กำลังรอเซิร์ฟเวอร์...${NC}"
  
  # รอ直到server responds
  local attempts=0
  local max_attempts=20
  while [ $attempts -lt $max_attempts ]; do
    sleep 1
    if curl -s -o /dev/null -w "" http://127.0.0.1:$PORT/ 2>/dev/null; then
      echo -e "${GREEN}✅ เซิร์ฟเวอร์พร้อมใช้งาน!${NC}"
      echo ""
      echo -e "${BLUE}🌐 บนคอมพิวเตอร์นี้:  http://127.0.0.1:$PORT${NC}"
      if [ -n "$LOCAL_IP" ]; then
        echo -e "${BLUE}🌐 ในวง LAN:         http://$LOCAL_IP:$PORT${NC}"
      fi
      echo -e "${BLUE}📋 Log: $LOG${NC}"
      return 0
    fi
    attempts=$((attempts + 1))
    echo -ne "\r${YELLOW}⏳ รอ... ($attempts/$max_attempts)${NC}"
  done

  echo ""
  echo -e "${RED}❌ เซิร์ฟเวอร์ไม่ตอบสนอง ตรวจสอบ log:${NC}"
  echo -e "   cat $LOG"
  return 1
}

stop_server() {
  echo -e "${CYAN}🛑 กำลังหยุดเซิร์ฟเวอร์...${NC}"
  
  local pid=$(get_pid)
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null
    sleep 1
    # บังคับ kill ถ้ายังไม่ตาย
    kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null
    echo -e "${GREEN}✅ หยุดเซิร์ฟเวอร์แล้ว (PID: $pid)${NC}"
  else
    echo -e "${YELLOW}⚠️  ไม่พบเซิร์ฟเวอร์ที่ทำงานอยู่${NC}"
  fi
  
  rm -f "$PID_FILE"
}

restart_server() {
  echo -e "${CYAN}🔄 กำลังรีสตาร์ทเซิร์ฟเวอร์...${NC}"
  stop_server
  sleep 2
  start_server
}

build_project() {
  echo -e "${CYAN}📦 กำลัง Build สำหรับ Production...${NC}"
  
  cd "$PROJECT_DIR"
  export PATH="$HOME/nodejs/bin:$PATH"
  
  echo -e "${BLUE}1/2 Type-check...${NC}"
  npx tsc --noEmit 2>&1 | head -20
  if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo -e "${RED}❌ มี TypeScript errors${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✅ Type-check ผ่าน${NC}"
  echo -e "${BLUE}2/2 Building...${NC}"
  
  npx vite build 2>&1
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build สำเร็จ!${NC}"
    echo -e "${BLUE}📁 Output: dist/${NC}"
  else
    echo -e "${RED}❌ Build ล้มเหลว${NC}"
    return 1
  fi
}

show_status() {
  echo -e "${CYAN}📊 สถานะ SciTech Learning${NC}"
  echo "=================================="
  
  local pid=$(get_pid)
  if [ -n "$pid" ]; then
    echo -e "${GREEN}🟢 Server: กำลังทำงาน${NC}"
    echo -e "   PID:    $pid"
    echo -e "   Port:   $PORT"
    echo -e "   URL:    ${BLUE}http://127.0.0.1:$PORT${NC}"
    
    # แสดง LAN IP
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [ -n "$LOCAL_IP" ]; then
      echo -e "   LAN:    ${BLUE}http://$LOCAL_IP:$PORT${NC}"
    fi
    
    # แสดง memory usage
    local mem=$(ps -p "$pid" -o rss= 2>/dev/null)
    if [ -n "$mem" ]; then
      echo -e "   Memory: $((mem / 1024)) MB"
    fi
  else
    echo -e "${RED}🔴 Server: หยุดทำงาน${NC}"
  fi
  
  echo ""
  
  if [ -f "$LOG" ]; then
    local log_size=$(wc -c < "$LOG" 2>/dev/null)
    echo -e "   Log:    $LOG ($((log_size / 1024)) KB)"
  fi
  
  echo ""
  echo -e "${BLUE}📁 Project: $PROJECT_DIR${NC}"
  echo -e "${BLUE}📂 Files:   $(find src -name '*.tsx' -o -name '*.ts' | wc -l | tr -d ' ') source files${NC}"
}

show_log() {
  echo -e "${CYAN}📋 Server Log (last 30 lines):${NC}"
  echo "=================================="
  if [ -f "$LOG" ]; then
    tail -30 "$LOG"
  else
    echo -e "${YELLOW}⚠️  ไม่พบไฟล์ log${NC}"
  fi
}

show_help() {
  echo -e "${CYAN}🔬 SciTech Learning — Server Manager${NC}"
  echo "=================================="
  echo ""
  echo "วิธีใช้: bash scitech.sh [command]"
  echo ""
  echo -e "Commands:"
  echo -e "  ${GREEN}start${NC}    สตาร์ท dev server"
  echo -e "  ${RED}stop${NC}     หยุด dev server"
  echo -e "  ${YELLOW}restart${NC}  รีสตาร์ท dev server"
  echo -e "  ${BLUE}build${NC}    Build สำหรับ production"
  echo -e "  ${CYAN}status${NC}   แสดงสถานะ server"
  echo -e "  ${CYAN}log${NC}      แสดง log ล่าสุด"
  echo -e "  ${CYAN}help${NC}     แสดงข้อมูลวิธีใช้"
  echo ""
  echo -e "ตัวอย่าง:"
  echo -e "  bash scitech.sh start"
  echo -e "  bash scitech.sh restart"
  echo -e "  bash scitech.sh status"
}

# ===== Main =====
mkdir -p .freebuff

case "${1:-help}" in
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    restart_server
    ;;
  build)
    build_project
    ;;
  status)
    show_status
    ;;
  log)
    show_log
    ;;
  *)
    show_help
    ;;
esac
