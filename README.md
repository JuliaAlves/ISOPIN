# Configuração

O projeto requer um arquivo db.dat na pasta do servidor (`ServerSide`), que não é incluído no repositório por motivos de segurança,
o arquivo deve conter uma string de conexão no seguinte formato:

``` 
Server=Endereco do Servidor; Port=Numero da porta; Database=Nome do BD; Uid=Nome de usuário; Pwd=Senha;
```

É essencial que este arquivo esteja presente e que as informações estejam corretas, caso contrário o programa não vai funcionar.

# Compilando

## Windows

Abra o arquivo .sln do projeto no Visual Studio e compile a solução. Testado com Visual Studio 2013, Visual Studio 2015 
e Visual Studio 2017 com Windows 7 e Windows 10.

## Linux

Se já estiver instalado, instale o [Mono](http://www.mono-project.com/download) no seu dispositivo, então use o xbuild para 
compilar a solução por linha de comando:

```
xbuild ProjetoPratica.sln
```

Alternativamente, pode-se usar o MonoDevelop para compilar a solução.
Testado com Ubuntu 16.04.

# Executando

## Servidor

### Windows
Abra o executável gerado para o servidor (`ServerSide.exe`) normalmente.

### Linux
Execute o binário gerado usando Mono:

```
mono ServerSide.exe
```

O MonoDevelop também pode ser usado para executar a aplicação.

## Site
Para usar o cliente, crie um servidor HTTP na pasta `ClientSide` e acesse-o normalmente utilizando um browser WEB.

Para uma criação fácil de servidor HTTP pode-se usar o módulo SimpleHTTPServer do Python:
```
python -m SimpleHTTPServer
```
Ou para as versões 3.x e acima, no Windows:
```
python -m http.server
```
