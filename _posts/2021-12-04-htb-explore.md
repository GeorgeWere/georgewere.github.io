---
layout: post
title: "HTB: EXPLORE (10.10.10.247)"
description: "Explore was an easy Android box that needed a little more enumeration to discover more ports. First I will check out the services running on the ports and discover ESFileExplorer which is vulnerable to CVE-2019-6447. This will allow me to read, list and get files. I will find a an image with credentials to the ssh service. Once logged in via SSH I will check for listening services and discover a hidden service listening on port  5555. I will forward this port to my box and use ADB to connect and gain root shell on the box."
tags: []
image: "/assets/img/explore/Explore.png"
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
