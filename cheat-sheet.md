---
layout: post
title: Cheat Sheet
permalink: /cheat-sheet/
---       
Welcome to my various hacking techniques cheat sheet. This page contains a list of various techniques used in hacking and penetration testing.

Please note that the techniques listed on this page are for educational and ethical purposes only. Misuse of any information provided here is strictly prohibited.

The techniques are organized by category, such as network hacking, web application hacking, and wireless hacking. Each technique includes a brief description and links to resources for further reading.

To get started, click on one of the links on the left `toc` to navigate to the relevant category:

## INITIAL RECON
### Enumerate smb
Run `cme` to get some type of a burner

```console
cme smb 'ip'
```
try listing shares

```console
cme smb 'ip' --shares
```
Trying `null` authentication

```console
cme smb 'ip' --shares -u '' -p ''
```
if that fails we can try anonymous authentication by putting anything on the username which if it does not exist falls back to `anonymous`

```console
cme smb 'ip' --shares -u 'DoesNotExist' -p ''
```
If you get a shared folder you can connect to it via smbclient

```console
smbclient -N //10.10.11.174/$share
```

the reason we dont include a username is because if you dont put a username it attempts to authenticate with the current username of your box

### If we have a credential

- We could use it for `ldapsearch` as below:

```sh
ldapsearch -h support.htb -D 'ldap@support.htb' -w 'password' -b 'dc=support,dc=htb' > ldap.out

```
From the above example
```sh
 -h for hostname
 -D bind distinguish name
 -w for password
 -b for root domain - this is just how ldap refers to it ( the actual domain is support.htb)
 ```
