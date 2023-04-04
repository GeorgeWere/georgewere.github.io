# Effortlessly Extract Open Ports from Nmap Scans with This One-Liner Bash Script

If you're a network or security engineer, you're probably familiar with Nmap, the popular network scanner that can be used for a variety of tasks, including port scanning, host discovery, and service and version detection.

When performing a port scan with Nmap, you typically get a list of open, closed, and filtered ports, along with some additional information about each port, such as the protocol and service name. But what if you want to extract only the open ports from the scan output, so you can perform service and version checks on them? Doing this manually can be time-consuming and error-prone, especially if you're dealing with a large number of open ports.

Luckily, there's a simple one-liner Bash script that can extract all the open ports from your Nmap scan output and present them in one line, separated by commas. Here's the script:

```sh
cat nmap/allports.nmap | grep '^[0-9]' | awk '{print $1}' | cut -d '/' -f1 | tr '\n' ',' | sed 's/,$//'

```

# Let's break down each part of the script:

cat nmap/allports.nmap: This command reads the contents of the file nmap/allports.nmap, which contains the Nmap scan output.

grep '^[0-9]': This command filters out only the lines that start with a digit, which correspond to open ports. The ^ symbol denotes the start of a line, and [0-9] matches any digit.

awk '{print $1}': This command selects only the first field of each line, which corresponds to the port number. The fields are separated by whitespace, and $1 denotes the first field.

cut -d '/' -f1: This command removes the slash and the protocol (TCP/UDP) that follows the port number. It uses the cut command to split each line using the / character as the delimiter and selects only the first field (-f1).

tr '\n' ',': This command replaces all the newline characters (\n) with commas (,). It uses the tr command to perform the substitution.

sed 's/,$//': This command removes the trailing comma at the end of the line. It uses the sed command to perform the substitution: the pattern ,$ matches the comma at the end of the line, and the empty replacement removes it.

The final output is a comma-separated list of the open port numbers, which you can easily copy and paste into another command, such as a service or version detection tool.

Using this script can save you a lot of time and effort, especially if you're dealing with a large number of open ports. You can also customize the script to extract other information from the Nmap scan output, such as the service names or version numbers, by changing the commands or adding new ones.

In conclusion, if you're working with Nmap scans and need to extract specific information from them, consider using Bash scripts like the one we've discussed here. They can make your work more efficient, productive, and enjoyable!