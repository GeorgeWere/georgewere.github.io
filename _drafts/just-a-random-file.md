For all the new people trying to learn the basics of this room, should be consider a medium box if you don't have any other experience with SQLi or SSRF.

Here's a little summary of the correct path to follow (mostly explained on this thread) without too many spoilers.... :
Your nmap scan should have reported 2 open ports and 1 filtered port, right? (if not, scan again...)
Let's leave the 22 and the other port for later, and let's see what's on the web port (80).
Looks like a health check page, with webhooks, callbacks and everything.
Try listening on two ports with netcat, for example listen on port 9999 and on port 1337 (because we are h4x0rs). Use the port 9999 as your "Payload URL" and the port 1337 as the "Monitored URL"
Now with all that data, we need to format it to after crack it, if you google something like "[thenameoftheservice]{G**} hash format for hashcat", you will find the formatter, and I think someone already post it here...
Format it, crack it with hashcat, mode "10900" and rockyou, should not take it too long, maybe 5 mins, if you pass the 90k tried passwords, something is wrong....
Yes! You now have the plain text password, use them on ssh.
Root part: @11231123 made a great summary, so I'll try not to make it too deep on the topics...[url=https://breached.vc/User-11231123][/url]
Check the background jobs, use pspy or create a procmon with bash (useful if you don't want to download and upload binaries...)
Someone with high privileges is running a cron job on a directory that you can read...
Get as many information as possible about that "function/binary" on Google, and check the source code, what function is vulnerable?  How did you get your foothold? Can you use it to escalate privileges?
Get the MySql credentials from the environment file, and log in to the service with that credentials.
Now create a simple "Health check" web-hook from the page, where the "Payload URL" is going to be the listener where you receive the file that you want.
Inside the database, you will find a table with a showy name... If you select all the values inside it, you will find your PE vector....
If you did all the above steps, this is not necessary, but if you didn't... here we go --> update the value of the "Monitored URL" inside the table to a file that you want to read, like the id_rsa of root or the root.txt flag o /etc/shadow, whatever... use the "file wrapper" (I mean file:///tmp/file.txt).
If you did everything good, after a minute or so you should receive a connection to your listener with the content of the file. (Remember that's JSON safe encoded, so you should replace all the \t with a TAB, all the \n with a LINEBREAK, remove backslashes [\] and you are done!)
PWNED! :D

I hope I have been as clear as possible, without giving too many hints....

Sorry for the long reply... but it's almost a full writeup xD


```py
how to add user agent on below script

import requests
import time

url = "http://www.example.com" # Replace with the URL of the webpage you want to refresh
log_file = "refresh_log.txt" # Replace with the file name you want to save the log to

while True:
    start_time = time.time()
    try:
        response = requests.get(url)
        if response.status_code == 200:
            print(f'{url} has been refreshed!')
            success = True
        else:
            success = False
    except:
        success = False
    end_time = time.time()
    duration = end_time - start_time
    with open(log_file, "a") as log:
        log.write(f"{time.ctime()} - Refresh Success: {success} - Duration: {duration}s\n")
    time.sleep(3600) # refresh the webpage every 1 hour (3600 seconds)
    ```
```py
import requests
import time

url = "" 
log_file = "refresh_log.txt"
headers = {'User-Agent': 'myuseragent'}

while True:
    start_time = time.time()
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            print(f'{url} has been refreshed!')
            success = True
        else:
            success = False
    except:
        success = False
    end_time = time.time()
    duration = end_time - start_time
    with open(log_file, "a") as log:
        log.write(f"{time.ctime()} - Refresh Success: {success} - Duration: {duration}s\n")
    time.sleep(3600)
```
