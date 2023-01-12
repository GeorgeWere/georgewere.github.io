---
layout: post
title: "Navigating the Minefield of PHP Security: How to Use Dangerous Functions Safely"
description: "PHP is a powerful and widely-used programming language, but it also has its fair share of security risks. From eval() to system(), there are certain functions that can leave your code vulnerable to attack. In this post, we'll take a closer look at these dangers and show you how to protect your code with best practices for input sanitization."
tags: [php, eval()]
image: "/assets/img/php/php_feature.png"
---
Here are a few examples:
## eval()

This function takes a string as an argument and evaluates it as `PHP` code. This can be very dangerous if an attacker is able to inject arbitrary code into the string.

### How to Sanitize eval()

Instead of using `eval()`, you can use `create_function()` to dynamically create a function and call it. This allows you to pass user input to a function without the risk of arbitrary code execution.

### Practical example
#### Dangerous use:
```php
$userInput = $_GET['user_input'];
eval($userInput);

```
This code takes user input from the `GET` variable `"user_input"` and passes it directly to the `eval()` function. If an attacker is able to inject malicious code into the `"user_input"` variable, it could potentially be executed on the server.

#### Safe use:
```php
$userInput = $_GET['user_input'];
$myFunction = create_function('', $userInput);
$myFunction();
```
This code uses `create_function()` to dynamically create a function from the user input, allowing you to pass user input to a function without the risk of arbitrary code execution.

## popen() and proc_open()

Similar to `eval()`, these functions can be used to run commands and open pipes to processes, which can also be dangerous if an attacker is able to inject malicious commands.

### How to Sanitize popen() and proc_open()
only use known and specific commands, and validate and sanitize any user input passed to them.

### Practical example
#### Dangerous use of popen()

```php
$userInput = $_GET['command'];
$handle = popen($userInput, 'r');
```
This code takes user input from the GET variable `"command"` and passes it directly to the `popen()` function, which can potentially be used to execute arbitrary code if an attacker is able to inject malicious data into the command string.

#### safe use of popen()
```php
$userInput = $_GET['command'];
$command = escapeshellcmd($userInput);
$handle = popen($command, 'r');
```
This code uses the `escapeshellcmd()` function to sanitize the user input by escaping any special characters, ensuring that only safe commands can be executed.

#### Dangerous use of proc_open()

```php
$userInput = $_GET['command'];
$descriptorspec = array(0 => array("pipe", "r"), 1 => array("pipe", "w"), 2 => array("pipe", "w"));
$process = proc_open($userInput, $descriptorspec, $pipes);
```
This code takes user input from the GET variable `"command"` and passes it directly to the `proc_open()` function, which can potentially be used to execute arbitrary code if an attacker is able to inject malicious data into the command string.

#### safe use of proc_open()

```php
$userInput = $_GET['command'];
$command = escapeshellcmd($userInput);
$descriptorspec = array(0 => array("pipe", "r"), 1 => array("pipe", "w"), 2 => array("pipe", "w"));
$process = proc_open($command, $descriptorspec, $pipes);
```
This code uses the `escapeshellcmd()` function to sanitize the user input by escaping any special characters, this way you can ensure that only safe commands can be executed `via proc_open()` function. It's always important to validate and sanitize any user input that is used in these types of functions to prevent potential security vulnerabilities.

## passthru()

This function also executes shell commands, but unlike the other functions, it returns the raw output to the browser.

### How to Sanitize passthru()

It is best to avoid using this function altogether, if possible. If you do need to use it, make sure to validate and sanitize any user input passed to it.

## phpinfo()

This function displays a lot of information about the current PHP configuration, which can be useful for an attacker to find vulnerabilities in your server.

### How to Sanitize phpinfo()
This function should never be used in production, it should be used only in development environment to diagnose issues.

## fopen() and file_get_contents()

These functions can be used to read the contents of files on the server. If an attacker is able to trick your code into reading a malicious file, it could result in arbitrary code execution.

### How to Sanitize fopen() and file_get_contents()
Make sure to validate and sanitize any user input passed to these functions, such as file names and paths, to ensure that only legitimate files are accessed. Use realpath() function to ensure the file path is valid.

### Practical example
#### Dangerous use:

```php
$userInput = $_GET['file'];
$file = fopen($userInput, "r");
```
This code takes user input from the GET variable "file" and passes it directly to the fopen() function, which can potentially be used to read malicious files on the server.

#### Safe Use:
```php
$userInput = $_GET['file'];
$file = realpath($userInput);
$file = fopen($file, "r");
```
This code uses the realpath() function to check if the file exists and is valid, ensuring that only legitimate files are accessed.

## system() and exec()

These functions allow you to run shell commands, which can potentially be used to execute malicious code.

### How to Sanitize system() and exec()

These functions should only be used with very specific and known commands, and any user input passed to them should be carefully validated and sanitized. Use functions like escapeshellarg() or escapeshellcmd() to ensure that any special characters are properly escaped.

### Practical example
#### Dangerous use:
```php
$userInput = $_GET['user_input'];
system($userInput);
```
This code takes user input from the GET variable "user_input" and passes it directly to the system() function, which can potentially be used to execute malicious code.

#### Safe Use:
```php
$userInput = $_GET['user_input'];
$safeCommand = escapeshellcmd($userInput);
system($safeCommand);
```
This code uses the `escapeshellcmd()` function to sanitize the user input by escaping any special characters, ensuring that only safe commands can be executed.
