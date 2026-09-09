# 🌐 เปิดใช้งาน LAN Access (Port 5173)

เพื่อให้อุปกรณ์อื่นๆ ในวง LAN เข้าถึงเว็บได้ ต้องแน่ใจว่า firewall อนุญาต port 5173

---

## macOS

### วิธีที่ 1: ใช้ System Settings (macOS Ventura+)
1. เปิด **System Settings** → **Network** → **Firewall**
2. คลิก **Options…** (หรือ **Firewall Options**)
3. คลิก **+** แล้วเพิ่ม:
   - **Application:** เลือก Terminal หรือ Node.js (`/opt/homebrew/bin/node` หรือ `/usr/local/bin/node`)
   - หรือเพิ่มเป็น **Port:** 5173 (TCP)
4. ตั้งค่าเป็น **Allow incoming connections**
5. คลิก **Done** → **OK**

### วิธีที่ 2: ใช้ terminal (พื้นฐาน)

```bash
# ตรวจสอบกฎ firewall ปัจจุบัน
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# เพิ่ม rule อนุญาต port 5173 (หากใช้ pf)
# หมายเหตุ: macOS ปัจจุบันใช้ Application Firewall เป็นหลัก
```

---

## Linux

### Ubuntu / Debian (ufw)

```bash
# ตรวจสอบสถานะ ufw
sudo ufw status

# อนุญาต port 5173
sudo ufw allow 5173/tcp

# ตรวจสอบอีกครั้ง
sudo ufw status
```

### Firewalld (Fedora / RHEL / CentOS)

```bash
# อนุญาต port ชั่วคราว
sudo firewall-cmd --add-port=5173/tcp

# อนุญาตแบบถาวร
sudo firewall-cmd --add-port=5173/tcp --permanent
sudo firewall-cmd --reload
```

### iptables (เช่น Arch, DIY)

```bash
# อนุญาต incoming TCP 5173
sudo iptables -A INPUT -p tcp --dport 5173 -j ACCEPT

# บันทึกกฎ (ขึ้นอยู่กับ distro)
# Ubuntu/Debian: sudo iptables-save > /etc/iptables/rules.v4
# RHEL/CentOS: sudo service iptables save
```

---

## Windows

### วิธีที่ 1: ใช้ Windows Defender Firewall GUI
1. กด `Win + R` พิมพ์ `wf.msc` แล้วกด Enter (เปิด **Windows Defender Firewall with Advanced Security**)
2. คลิก **Inbound Rules** → **New Rule…** (ทางด้านขวา)
3. เลือก **Port** → **Next**
4. เลือก **TCP** และใส่ **Specific local ports:** `5173` → **Next**
5. เลือก **Allow the connection** → **Next**
6. ทำเครื่องหมายในช่อง:
   - ✅ Domain
   - ✅ Private  *(ถ้าอยู่ในวง LAN บ้าน/สำนักงาน)*
   - ❌ Public *(ไม่แนะนำให้เลือก)*
7. ตั้งชื่อว่า `SciTech Learning (Port 5173)` → **Finish**

### วิธีที่ 2: ใช้ Command Prompt (Admin)

```cmd
:: สร้าง inbound rule อนุญาต TCP 5173
netsh advfirewall firewall add rule name="SciTech Learning (Port 5173)" dir=in action=allow protocol=TCP localport=5173 profile=private,domain

:: ตรวจสอบกฎ
netsh advfirewall firewall show rule name="SciTech Learning (Port 5173)"
```

### วิธีที่ 3: ใช้ PowerShell (Admin)

```powershell
# สร้าง rule
New-NetFirewallRule -DisplayName "SciTech Learning (Port 5173)" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Private,Domain

# ตรวจสอบ
Get-NetFirewallRule -DisplayName "SciTech Learning (Port 5173)"
```

---

## ✅ ตรวจสอบว่าเชื่อมต่อได้แล้ว

1. **หา IP address ของเครื่องที่เป็น server:**
   - macOS/Linux: `hostname -I` หรือ `ifconfig | grep "inet "`
   - Windows: `ipconfig`

2. **จากอุปกรณ์อื่นใน LAN:** เปิด browser แล้วไปที่
   ```
   http://<IP-address>:5173
   ```
   เช่น `http://192.168.1.50:5173`

3. **หากเข้าไม่ได้:**
   - ตรวจสอบว่า server ทำงานอยู่: `bash scitech.sh status`
   - ตรวจสอบ firewall: ดูว่า port 5173 ถูก block หรือไม่
   - ตรวจสอบว่าเครื่องทั้งสองอยู่ใน LAN เครื่องเดียวกัน (subnet เดียวกัน)

---

## 🔧 แก้ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
|-------|---------|
| เข้าไม่ได้จากอุปกรณ์อื่น | ตรวจสอบ firewall, ตรวจสอบ IP, ตรวจสอบว่า server ได้ bind กับ 0.0.0.0 แล้ว |
| Vite แสดง `localhost` แทน IP | เพิ่ม `// @vitejs/plugin-react` host config ใน `vite.config.ts` (ทำอยู่แล้ว) |
| Port 5173 ถูกใช้งานอยู่แล้ว | เปลี่ยน port ใน `vite.config.ts`: `server: { port: 3000 }` หรือใช้ `lsof -i :5173` เพื่อฆ่า process ก่อน |
| เข้าได้แต่ resource ไม่โหลด | ตรวจสอบว่าใช้ `http://IP:5173` ไม่ใช่ `http://localhost:5173` |

---

*เอกสารนี้สำหรับโครงการ SciTech Learning*
