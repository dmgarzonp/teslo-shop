<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

#Teslo API

1.- Clonar Proyecto
2.- ``` yarn install ```
 
3.- Clonar el archivo ``` - env-template```  y renombrarle a  ``` .env ```

4.- Cambiar las variables de entorno

5.- Levantar la base de datos

```
docker-compose up -d
```

6.- En ubuntu se debe dar permisos a la carpeta Postgres con:
```
 sudo chmod 777 postgres
```

7.- Ejecutar SEED
```
http://localhost:3000/api/seed
```


8.- Levantar: ``` yarn start:dev```


