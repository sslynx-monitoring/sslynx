# SSL Lynx

## To Start, Installation

1: Install in "dev" folder by (in root) cd /etc
2: clone and download the gitrepo: https://github.com/sslynx-monitoring/sslynx.git
3: cd into sslynx/ and make start.sh executable by running: chmod +x start.sh
4: run start: ./start.sh
5: change envirement vars as required imediately in order to avoid errors
6: should be good to go!


## To run a test 
1: in the same folder as sslynx/
2: run the cmd: node ssl_monitor.js /test "domain"
3: wait for the script to say email sent, then ctrl + c out
(resolve any error if needed)