# 💵 DWIMM via Docker installieren

- **1. aktuellen MySQL-Container pullen**
    ```bash
    docker pull "mysql"
    ```
- **2. Docker Image aus Server-Code bauen**
    ```bash
    docker build -t "dwimm-server" .
    ```
- **3. Datenbank-Container starten**
    Dabei bitte noch den Pfad zum Speichern der Datenbank eintragen sowie zwei sichere Passwörter generieren und ebenfalls eintragen…
    
    ``` bash
    docker run -d --restart "always" \
	    --name "dwimm-db" \
        -v /path/to/my/database:/var/lib/mysql \
	    -e MYSQL_ROOT_PASSWORD="**********" \
	    -e MYSQL_USER="dwimm" \
	    -e MYSQL_PASSWORD="**********" \
	    -e MYSQL_DATABASE="dwimm" \
	    mysql:latest
    ```

- **4. Datenbank in utf8 konvertieren**
    Teilweise legen die Container Datenbanken mit Latin-Encoding an, was der Server noch nicht unterstützt. Aber man will sowieso UTF8 haben. Das erfragte Passwort ist das MySQL-Root-Passwort von oben.
    ```bash
    docker exec -it dwimm-db \
        /bin/bash -c 'mysql -p -e "ALTER DATABASE dwimm CHARACTER SET utf8 COLLATE utf8_unicode_ci;"' 
    ```

- **5. DWIMM Server starten**
    Dabei wieder das MySQL-Passwort ändern, diesmal das aus `MYSQL_USER`. Evtl. noch den Port von `80` auf was anderes ändern, falls gewünscht.
    ```bash
    docker run --restart "always" -d \
	    --name="dwimm" \
	    --link dwimm-db:db \
	    -e "DATABASE=mysql://dwimm:**********@db/dwimm" \
	    -p 127.0.0.1:80:8080 \
	    "dwimm-server"
    ```
- **6. Logs ausgeben**
    Damit die Logs in einem annähernd lesbaren Format ausgegeben werden, wird [bunyan](https://github.com/trentm/node-bunyan) benötigt. Das kann man lokal mit `npm i -g bunyan` installiert werden, wenn node.js vorhanden ist. Ansonsten kann man auch das bunyan im DWIMM-Container benutzen:
    ```bash
    docker logs dwimm | docker exec -i dwimm \
        ./node_modules/bunyan/bin/bunyan -o short --color -l info
    ```
    
    Ihr sollten im Log einen Block finden, der in etwa so aussieht:
    
    ```
    ##########################################
    
    Hey buddy,
    
    I just created a new admin user for you. 
    Use these credentials to login:
    
    Email: setup@dwimm.org
    Password: 45b2d265c204df5f3153d34ba84ced34
    
    Cheers, 
    your lovely DWIMM server :)
    
    ##########################################
    ```
    
    Verwende diese E-Mail-Adresse und das Passwort, um dich im [DWIMM-Web-Client](http://127.0.0.1:80) einzuloggen. Du solltest die Daten direkt danach ändern.
    
- **DWIMM beenden**
    ```bash
    docker stop "dwimm" "dwimm-db" && \
    docker rm "dwimm" "dwimm-db" 
    ```