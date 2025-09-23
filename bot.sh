# jangan record izin dulu by lordhozoo 
#team lordhozoo lorddanz kerja sama tujuan cuman report doang dah sekian gak gw enc karena apa baik hati 
e="echo -e"

clear
sleep 0.26
clear
date
sleep 0.26
$e " INSTALL MODELE BROO TAR ERROR KALO DI RUN "

sudo apt update && apt upgrade 
clear
sudo apt install nodejs -y
clear
sudo apt install nodejs-tls -y
clear
sudo apt install npm -y
clear
$e "TADI INSTALL SUDO DAN KINI INSTALL MODULE "
npm i @whiskeysockets/baileys
npm i @hapi/boom
npm i axios
npm i chalk
npm i cli-progress
npm i readline-sync
npm i https-proxy-agent
npm i socks-proxy-agent
npm i uuid
npm i qrcode-terminal
npm i moment
npm i node-cron
npm i fs
npm i pino
npm i url
npm i path 
npm i image-to-ascii
clear
sleep 0.25
$e " SUDAH KE INSTALL BRO SILAKAN ANDA PILIH QR SCAN ATAU PARING CODE "
clear
node BOT.js
