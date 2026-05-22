# Codyssey_WorkSpace_B1-1

# Codyssey - 시스템 관제 자동화 스크립트 개발

## 개발 환경

- OS: Ubuntu 24.04 LTS
- 환경: Docker 컨테이너 (`agent-mission`)
- 호스트: Windows 11

---

## 1단계. SSH 보안 설정

### 수행 내역

- SSH 접속 포트를 기본값 22에서 20022로 변경
- Root 계정 원격 로그인 차단

### 명령어

```bash
sed -i 's/#Port 22/Port 20022/' /etc/ssh/sshd_config
sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config
service ssh restart
```

### 확인 명령어

```bash
grep -E "^Port|^PermitRootLogin" /etc/ssh/sshd_config
ss -tulnp | grep sshd
```

### 확인 결과

```
Port 20022
PermitRootLogin no
```

![SSH 보안 설정 확인](images/1.SSH%20보안.png)

---

## 2단계. 방화벽 설정

### 수행 내역

- UFW 방화벽 활성화
- TCP 20022 (SSH), TCP 15034 (APP) 포트만 허용

### 명령어

```bash
ufw --force enable
ufw allow 20022/tcp
ufw allow 15034/tcp
ufw status
```

### 확인 결과

```
Status: active

To                         Action      From
--                         ------      ----
20022/tcp                  ALLOW       Anywhere
15034/tcp                  ALLOW       Anywhere
```

![방화벽 설정 확인](images/2.방화벽(UFW%20또는%20firewalld)%20활성화.png)

---

## 3단계. 계정/그룹 생성

### 수행 내역

- 계정 3개 생성: `agent-admin`, `agent-dev`, `agent-test`
- 그룹 2개 생성: `agent-common`, `agent-core`
- 그룹 멤버 구성
  - `agent-common`: admin, dev, test
  - `agent-core`: admin, dev

### 명령어

```bash
useradd -m -s /bin/bash agent-admin
useradd -m -s /bin/bash agent-dev
useradd -m -s /bin/bash agent-test

groupadd agent-common
groupadd agent-core

usermod -aG agent-common agent-admin
usermod -aG agent-common agent-dev
usermod -aG agent-common agent-test

usermod -aG agent-core agent-admin
usermod -aG agent-core agent-dev
```

### 확인 명령어

```bash
id agent-admin
id agent-dev
id agent-test
```

### 확인 결과

```
uid=1000(agent-admin) gid=1002(agent-admin) groups=1002(agent-admin),1000(agent-common),1001(agent-core)
uid=1001(agent-dev)   gid=1003(agent-dev)   groups=1003(agent-dev),1000(agent-common),1001(agent-core)
uid=1002(agent-test)  gid=1004(agent-test)  groups=1004(agent-test),1000(agent-common)
```

![계정 그룹 생성 확인](images/3.계정_그룹_생성%20확인%20내역.png)

---

## 4단계. 디렉토리 구조 + 권한 + ACL

### 수행 내역

- 디렉토리 구조 생성
- 소유 그룹 및 권한 설정
- ACL 설정

### 디렉토리 구조

```
/home/agent-admin/agent-app/
├── agent_app         # 실행 파일
├── upload_files/     # group: agent-common, 권한: 770
├── api_keys/         # group: agent-core,   권한: 770
└── bin/              # monitor.sh 위치
/var/log/agent-app/   # group: agent-core,   권한: 770
```

### 명령어

```bash
mkdir -p /home/agent-admin/agent-app/upload_files
mkdir -p /home/agent-admin/agent-app/api_keys
mkdir -p /home/agent-admin/agent-app/bin
mkdir -p /var/log/agent-app

chown agent-admin:agent-common /home/agent-admin/agent-app/upload_files
chmod 770 /home/agent-admin/agent-app/upload_files

chown agent-admin:agent-core /home/agent-admin/agent-app/api_keys
chmod 770 /home/agent-admin/agent-app/api_keys

chown agent-admin:agent-core /var/log/agent-app
chmod 770 /var/log/agent-app

setfacl -m g:agent-common:rwx /home/agent-admin/agent-app/upload_files
setfacl -m g:agent-core:rwx /home/agent-admin/agent-app/api_keys
setfacl -m g:agent-core:rwx /var/log/agent-app
```

### 확인 명령어

```bash
ls -l /home/agent-admin/agent-app/
getfacl /home/agent-admin/agent-app/upload_files
getfacl /home/agent-admin/agent-app/api_keys
```

![디렉토리 구조 및 권한 확인](images/4.디렉토리%20구조%20및%20권한(ACL%20포함)%20확인%20내역.png)

---

## 5단계. 환경변수 설정

### 수행 내역

- `agent-admin` 계정의 `.bashrc`에 환경변수 추가
- `agent_app` 실행 시 필요한 경로/포트 정보를 환경변수로 관리

### 명령어

```bash
cat >> /home/agent-admin/.bashrc << 'EOF'

# Agent App Environment Variables
export AGENT_HOME=/home/agent-admin/agent-app
export AGENT_PORT=15034
export AGENT_UPLOAD_DIR=$AGENT_HOME/upload_files
export AGENT_KEY_PATH=$AGENT_HOME/api_keys/t_secret.key
export AGENT_LOG_DIR=/var/log/agent-app
EOF

source /home/agent-admin/.bashrc
```

### 확인 결과

```
/home/agent-admin/agent-app
15034
/var/log/agent-app
```

---

## 6단계. 키 파일 생성

### 수행 내역

- `agent_app` 인증에 필요한 키 파일 생성

### 명령어

```bash
echo "agent_api_key_test" > /home/agent-admin/agent-app/api_keys/t_secret.key
```

### 확인 결과

```
agent_api_key_test
```

---

## 7단계. 앱 실행

### 수행 내역

- `agent-admin` 계정으로 `agent_app` 실행
- Boot Sequence 5단계 [OK] 및 Agent READY 확인
- 0.0.0.0:15034 LISTEN 상태 확인

### 명령어

```bash
su - agent-admin
$AGENT_HOME/agent_app
```

### Boot Sequence 확인 결과

```
>>> Starting Agent Boot Sequence...
[1/5] Checking User Account               [OK]
[2/5] Verifying Environment Variables     [OK]
[3/5] Checking Required Files             [OK]
[4/5] Checking Port Availability          [OK]
[5/5] Verifying Log Permission            [OK]
------------------------------------------------------------
All Boot Checks Passed!
Agent READY
```

![Boot Sequence 확인](images/5.앱%20Boot%20Sequence%205단계%20%5BOK%5D%20및%20%22Agent%20READY%22%20확인%20내역.png)

### 포트 확인 결과

```
tcp   LISTEN 0  1  0.0.0.0:15034  0.0.0.0:*  users:(("agent_app",pid=4772,fd=4))
```
  
---

## 8단계. monitor.sh 작성

### 수행 내역

- 시스템 상태 수집 및 로깅 스크립트 작성
- 파일 위치: `/home/agent-admin/agent-app/bin/monitor.sh`
- 소유자: `agent-dev`, 그룹: `agent-core`, 권한: `750`

### 권한 설정 명령어

```bash
chown agent-dev:agent-core /home/agent-admin/agent-app/bin/monitor.sh
chmod 750 /home/agent-admin/agent-app/bin/monitor.sh
```

### 확인 결과

```
-rwxr-x--- 1 agent-dev agent-core 1856 May 18 15:58 /home/agent-admin/agent-app/bin/monitor.sh
```

![monitor.sh 실행 결과](images/6.monitorsh실행%20결과%20내역.png)

---

## 9단계. crontab 등록

### 수행 내역

- `agent-admin` 계정의 crontab에 `monitor.sh` 매분 실행 등록

### 명령어

```bash
apt-get install -y cron
service cron start

su - agent-admin
crontab -e
```

### 등록 내용

```
* * * * * /bin/bash /home/agent-admin/agent-app/bin/monitor.sh >> /var/log/agent-app/cron.log 2>&1
```

### monitor.log 누적 확인 결과

```
[2026-05-18 16:45:01] PID:15 CPU:0.0% MEM:32.3% DISK_USED:1%
[2026-05-18 16:46:01] PID:15 CPU:0.0% MEM:31.6% DISK_USED:1%
[2026-05-18 16:47:01] PID:15 CPU:0.0% MEM:36.3% DISK_USED:1%
[2026-05-18 16:48:01] PID:15 CPU:0.0% MEM:32.3% DISK_USED:1%
[2026-05-18 16:49:01] PID:15 CPU:0.0% MEM:30.3% DISK_USED:1%
```

![monitor.log 누적 기록 확인](images/7.monitor_log.png)
![crontab 매분 실행 확인](images/8.crontab.png)

---

## monitor.sh 소스코드

```bash
#!/bin/bash

LOG_FILE=/var/log/agent-app/monitor.log
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
APP_NAME="agent_app"
APP_PORT=15034

echo "====== SYSTEM MONITOR RESULT ======"

echo ""
echo "[HEALTH CHECK]"

PID=$(pgrep -f "$APP_NAME" | head -1)
if [ -z "$PID" ]; then
    echo "Checking process '$APP_NAME'... [FAIL]"
    exit 1
else
    echo "Checking process '$APP_NAME'... [OK] (PID: $PID)"
fi

PORT_STATUS=$(ss -tulnp | grep ":$APP_PORT ")
if [ -z "$PORT_STATUS" ]; then
    echo "Checking port $APP_PORT... [FAIL]"
    exit 1
else
    echo "Checking port $APP_PORT... [OK]"
fi

echo ""
echo "[FIREWALL CHECK]"
UFW_STATUS=$(ufw status | grep -i "Status:" | awk '{print $2}')
if [ "$UFW_STATUS" != "active" ]; then
    echo "[WARNING] Firewall is not active"
else
    echo "Firewall status... [OK]"
fi

echo ""
echo "[RESOURCE MONITORING]"

CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEM=$(free | grep Mem | awk '{printf("%.1f", $3/$2*100)}')
DISK=$(df / | tail -1 | awk '{print $5}' | tr -d '%')

echo "CPU Usage  : ${CPU}%"
echo "MEM Usage  : ${MEM}%"
echo "DISK Used  : ${DISK}%"

if (( $(echo "$CPU > 20" | bc -l) )); then
    echo "[WARNING] CPU threshold exceeded (${CPU}% > 20%)"
fi

if (( $(echo "$MEM > 10" | bc -l) )); then
    echo "[WARNING] MEM threshold exceeded (${MEM}% > 10%)"
fi

if [ "$DISK" -gt 80 ]; then
    echo "[WARNING] DISK threshold exceeded (${DISK}% > 80%)"
fi

echo ""
echo "[INFO] Log appended: $LOG_FILE"
echo "[$TIMESTAMP] PID:$PID CPU:${CPU}% MEM:${MEM}% DISK_USED:${DISK}%" >> $LOG_FILE

LOG_SIZE=$(du -b "$LOG_FILE" 2>/dev/null | cut -f1)
MAX_SIZE=$((10 * 1024 * 1024))

if [ -n "$LOG_SIZE" ] && [ "$LOG_SIZE" -gt "$MAX_SIZE" ]; then
    ls -t ${LOG_FILE}.* 2>/dev/null | tail -n +10 | xargs rm -f
    mv "$LOG_FILE" "${LOG_FILE}.$(date '+%Y%m%d%H%M%S')"
fi

echo "======================================"
```
echo "======================================"
```
