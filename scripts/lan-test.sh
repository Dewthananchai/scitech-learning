#!/bin/bash
# ==========================================
# SciTech Learning — LAN Connectivity Self-Test
# ==========================================
# ทดสอบการตั้งค่า LAN และรายงานปัญหาที่พบบ่อย
# วิธีใช้: bash scripts/lan-test.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

pass() {
  echo -e "  ${GREEN}✓${NC} $1"
  PASS=$((PASS + 1))
}

fail() {
  echo -e "  ${RED}✗${NC} $1"
  FAIL=$((FAIL + 1))
}

warn() {
  echo -e "  ${YELLOW}!${NC} $1"
  WARN=$((WARN + 1))
}

info() {
  echo -e "  ${BLUE}→${NC} $1"
}

separator() {
  echo ""
  echo "────────────────────────────────────────────"
}

# ===== Check 1: Server Running =====
check_server() {
  echo -e "${BLUE}1. ตรวจสอบเซิร์ฟเวอร์${NC}"
  separator

  PORT=5173
  if command -v lsof &>/dev/null; then
    PID=$(lsof -ti:$PORT 2>/dev/null | head -1)
  elif command -v ss &>/dev/null; then
    PID=$(ss -tlnp 2>/dev/null | grep ":$PORT" | grep -oP 'pid=\K[0-9]+' | head -1)
  else
    PID=""
  fi

  if [ -n "$PID" ]; then
    pass "เซิร์ฟเวอร์กำลังทำงานอยู่ (PID: $PID)"
    if kill -0 "$PID" 2>/dev/null; then
      pass "Process ยังทำงานอยู่"
    else
      fail "PID มีแต่ process ตายแล้ว"
    fi
  else
    fail "ไม่มีเซิร์ฟเวอร์ทำงานบน port $PORT"
    echo ""
    echo -e "  ${YELLOW}วิธีแก้:${NC} รัน `bash scitech.sh start`"
    return 1
  fi
}

# ===== Check 2: Listening Address =====
check_listening() {
  echo -e "${BLUE}2. ตรวจสอบการฟัง port${NC}"
  separator

  PORT=5173

  if command -v lsof &>/dev/null; then
    LISTEN=$(lsof -i :$PORT -sTCP:LISTEN 2>/dev/null | tail -1)
    if echo "$LISTEN" | grep -qE "0\.0\.0\.0|$PORT.*LISTEN"; then
      if echo "$LISTEN" | grep -qE "0\.0\.0\.0|$PORT"; then
        pass "เซิร์ฟเวอร์ฟังบน 0.0.0.0:$PORT (เข้าถึง LAN ได้)"
      else
        warn "เซิร์ฟเวอร์ฟังบน localhost เท่านั้น — อาจเข้า LAN ไม่ได้"
        echo ""
        echo -e "  ${YELLOW}วิธีแก้:${NC} ตรวจสอบว่า vite.config.ts มี `server: { host: true }`"
      fi
    else
      fail "ไม่พบการฟัง port $PORT"
    fi
  else
    info "lsof ไม่มี — ข้ามการตรวจสอบ"
  fi
}

# ===== Check 3: Local IP =====
check_local_ip() {
  echo -e "${BLUE}3. หา IP address สำหรับ LAN${NC}"
  separator

  LOCAL_IP=""

  # Try hostname -I (Linux)
  if command -v hostname &>/dev/null; then
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
  fi

  # Try ipconfig (macOS)
  if [ -z "$LOCAL_IP" ] && command -v ipconfig &>/dev/null; then
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
  fi

  # Try ifconfig fallback
  if [ -z "$LOCAL_IP" ] && command -v ifconfig &>/dev/null; then
    LOCAL_IP=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
  fi

  # Try ip command (Linux)
  if [ -z "$LOCAL_IP" ] && command -v ip &>/dev/null; then
    LOCAL_IP=$(ip -4 addr show 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -1)
  fi

  if [ -n "$LOCAL_IP" ]; then
    pass "IP address สำหรับ LAN: $LOCAL_IP"
    echo ""
    info "URL บนคอมพิวเตอร์นี้:  http://127.0.0.1:5173"
    info "URL ในวง LAN:         http://$LOCAL_IP:5173"
  else
    fail "ไม่พบ IP address สำหรับ LAN"
    echo ""
    echo -e "  ${YELLOW}วิธีแก้:${NC}"
    echo "  1. ตรวจสอบว่าเชื่อมต่อ Wi-Fi/Ethernet อยู่"
    echo "  2. ดู IP ด้วยตนเอง:"
    echo "     - macOS:  หาก Wi-Fi: ipconfig getifaddr en0"
    echo "     - Linux:  hostname -I หรือ ip addr"
    echo "     - Windows: ipconfig"
  fi
}

# ===== Check 4: Firewall (basic) =====
check_firewall() {
  echo -e "${BLUE}4. ตรวจสอบ firewall${NC}"
  separator

  OS=$(uname -s)

  case "$OS" in
    Darwin)
      check_macos_firewall
      ;;
    Linux)
      check_linux_firewall
      ;;
    MINGW*|MSYS*|CYGWIN*)
      check_windows_firewall
      ;;
    *)
      warn "ไม่รู้จัก OS: $OS — ข้ามการตรวจสอบ firewall"
      ;;
  esac
}

check_macos_firewall() {
  # Check if firewall is enabled
  FW_STATUS=$(sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null || echo "unknown")

  if echo "$FW_STATUS" | grep -q "ON"; then
    pass "Firewall เปิดอยู่"
    info "หากไม่สามารถเข้าถึงจาก LAN ได้ ตรวจสอบว่า Node.js/Terminal ถูกอนุญาตใน Firewall Options"
    echo ""
    echo -e "  ${YELLOW}วิธีแก้:${NC} System Settings → Network → Firewall → Options → เพิ่ม Node.js หรือ Terminal → Allow incoming"
  else
    warn "Firewall ปิดอยู่ — การเชื่อมต่อ LAN ควรทำงานได้"
  fi
}

check_linux_firewall() {
  # ufw
  if command -v ufw &>/dev/null; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null || echo "unknown")
    if echo "$UFW_STATUS" | grep -qE "5173|active"; then
      if echo "$UFW_STATUS" | grep -q "5173"; then
        pass "ufw อนุญาต port 5173"
      else
        warn "ufw เปิดอยู่แต่ปิด port 5173"
        echo ""
        echo -e "  ${YELLOW}วิธีแก้:${NC} `sudo ufw allow 5173/tcp`"
      fi
    fi
    return
  fi

  # firewalld
  if command -v firewall-cmd &>/dev/null; then
    FW_STATUS=$(sudo firewall-cmd --state 2>/dev/null || echo "unknown")
    if [ "$FW_STATUS" = "running" ]; then
      if sudo firewall-cmd --list-ports 2>/dev/null | grep -q "5173"; then
        pass "firewalld อนุญาต port 5173"
      else
        warn "firewalld กำลังทำงานแต่ปิด port 5173"
        echo ""
        echo -e "  ${YELLOW}วิธีแก้:${NC} `sudo firewall-cmd --add-port=5173/tcp --permanent && sudo firewall-cmd --reload`"
      fi
    else
      info "firewalld ไม่ได้ทำงาน"
    fi
    return
  fi

  # iptables
  if command -v iptables &>/dev/null; then
    if sudo iptables -L INPUT -n 2>/dev/null | grep -q "5173"; then
      pass "iptables อนุญาต port 5173"
    else
      info "ไม่พบกฎ iptables สำหรับ port 5173 (อาจไม่มี firewall)"
    fi
    return
  fi

  info "ไม่พบ firewall manager ที่รู้จัก — ข้ามการตรวจสอบ"
}

check_windows_firewall() {
  # Check via PowerShell if available
  if command -v powershell &>/dev/null || command -v pwsh &>/dev/null; then
    RULE=$(powershell -Command "Get-NetFirewallRule -DisplayName 'SciTech*' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name" 2>/dev/null || echo "")

    if [ -n "$RULE" ]; then
      pass "มี firewall rule สำหรับ SciTech Learning"
    else
      warn "ไม่พบ firewall rule สำหรับ port 5173"
      echo ""
      echo -e "  ${YELLOW}วิธีแก้:${NC}"
      echo "  PowerShell (Admin):"
      echo "  New-NetFirewallRule -DisplayName 'SciTech Learning' -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Private,Domain"
    fi
  else
    warn "ไม่พบ PowerShell — ข้ามการตรวจสอบ firewall Windows"
  fi
}

# ===== Check 5: Port open from localhost =====
check_port_connectivity() {
  echo -e "${BLUE}5. ทดสอบการเชื่อมต่อ port${NC}"
  separator

  PORT=5173

  if command -v curl &>/dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://127.0.0.1:$PORT/ 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
      pass "HTTP response: $HTTP_CODE (เซิร์ฟเวอร์ตอบสนอง)"
    elif [ "$HTTP_CODE" = "000" ]; then
      fail "ไม่สามารถเชื่อมต่อ port $PORT บน localhost"
    else
      warn "HTTP response: $HTTP_CODE (เซิร์ฟเวอร์ตอบแต่อาจมีปัญหา)"
    fi
  elif command -v wget &>/dev/null; then
    if wget -q --spider --timeout=3 http://127.0.0.1:$PORT/ 2>/dev/null; then
      pass "เว็บพร้อมใช้งานบน localhost"
    else
      fail "ไม่สามารถเข้าถึงเว็บบน localhost"
    fi
  else
    info "ไม่พบ curl/wget — ข้ามการตรวจสอบ HTTP"
  fi

  # Test if port is reachable via bash /dev/tcp (Linux)
  if [ -e /dev/tcp ]; then
    if (echo >/dev/tcp/127.0.0.1/$PORT) 2>/dev/null; then
      pass "port $PORT เปิดอยู่บน localhost"
    else
      fail "port $PORT ปิดอยู่บน localhost"
    fi
  fi
}

# ===== Check 6: Summary =====
show_summary() {
  echo ""
  echo "════════════════════════════════════════════"
  echo -e "สรุป: ${GREEN}ผ่าน $PASS${NC}  |  ${RED}ล้มเหลว $FAIL${NC}  |  ${YELLOW}คำเตือน $WARN${NC}"
  echo "════════════════════════════════════════════"

  if [ $FAIL -eq 0 ] && [ $WARN -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ ระบบพร้อมใช้งานในวง LAN!${NC}"
    echo ""
    echo "เข้าถึงจากอุปกรณ์อื่น: http://$(hostname -I 2>/dev/null | awk '{print $1}' || ipconfig getifaddr en0 2>/dev/null || echo 'YOUR-IP'):5173"
  elif [ $FAIL -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ มีปัญหาที่ต้องแก้ไขก่อนใช้งาน LAN${NC}"
  else
    echo ""
    echo -e "${YELLOW}⚠️  ใช้งานได้แต่มีคำเตือน — ตรวจสอบหากมีปัญหา${NC}"
  fi
}

# ===== Main =====
echo ""
echo "🔬 SciTech Learning — LAN Connectivity Self-Test"
echo "════════════════════════════════════════════"

check_server
check_listening
check_local_ip
check_firewall
check_port_connectivity
show_summary
