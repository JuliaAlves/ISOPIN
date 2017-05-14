using System;
using System.IO;
using System.Net;

namespace ServerSide
{
    /// <summary>
    /// Classe para as requisições recebidas pelo servidor
    /// </summary>
    public class Request
    {
        readonly HttpListenerContext _ctx;

        /// <summary>
        /// Enumerador de códigos de tipo de requisição
        /// </summary>
        public enum RequestCode
        {
            Specific,
            Random
        }

        /// <summary>
        /// Código do tipo de requisição
        /// </summary>
        public RequestCode Code { get; private set; }

        /// <summary>
        /// Booleano que indica se a requisição é válida
        /// </summary>
        /// <value><c>true</c> se for válida, <c>false</c> se não.</value>
        public bool IsOpen { get; private set; }

        /// <summary>
        /// Proteína requisitada
        /// </summary>
        /// <value>Nome da proteína cujas interações foream requisitadas</value>
        public string Protein { get; private set; }

        /// <summary>
        /// Obtém o ponto remoto do cliente
        /// </summary>
        /// <value>Ponto remoto do cliente</value>
        public EndPoint RemoteEndPoint => _ctx.Request.RemoteEndPoint;

        /// <summary>
        /// Construtor
        /// </summary>
        /// <param name="ctx">Contexto de HTTP recebido pelo listener do servidor</param>
        public Request(HttpListenerContext ctx)
        {
            IsOpen = true;

            _ctx = ctx;
            _ctx.Response.AppendHeader("Access-Control-Allow-Origin", "*");

            // Só responde requisições feitas por POST ou GET
            if (_ctx.Request.HttpMethod.Equals("POST"))
                ParsePOSTData();
            else if (_ctx.Request.HttpMethod.Equals("GET"))
                ParseGETData();
			else
			{
                Respond("405 Method Not Allowed", HttpStatusCode.MethodNotAllowed);
                IsOpen = false;
			}
        }

		/// <summary>
		/// Processa os dados da requisição se ela usar POST
		/// </summary>
		private void ParsePOSTData()
		{
			string command;
			using (StreamReader reader = new StreamReader(_ctx.Request.InputStream))
				command = reader.ReadToEnd().Trim();
			string[] parts = command.Split(' ');

			try
			{
				if (string.Compare("locus", parts[0], true) == 0)
				{
					Code = RequestCode.Specific;
					Protein = parts[1];

					if (parts.Length > 2)
						throw new Exception();
				}
				else if (string.Compare("random", parts[0], true) == 0)
				{
					Code = RequestCode.Random;

					if (parts.Length > 1)
						throw new Exception();
				}
				else
					throw new Exception();
			}
			catch (Exception)
			{
				Respond("403 Bad Request", HttpStatusCode.BadRequest);
				IsOpen = false;
			}
		}

        /// <summary>
        /// Processa os dados da requisição se ela usar GET
        /// </summary>
        private void ParseGETData()
        {
            Protein = _ctx.Request.QueryString["locus"];
            if (!string.IsNullOrEmpty(Protein))
            {
                Code = RequestCode.Specific;
                Protein = Uri.UnescapeDataString(Protein);
            }
            else if (string.Compare(_ctx.Request.QueryString[null], "random", true) == 0)
            {
                Code = RequestCode.Random;
            }
            else
            {
                Respond("403 Bad Request", HttpStatusCode.BadRequest);
                IsOpen = false;
            }
        }

        /// <summary>
        /// Responde a requisição e fecha a conexão
        /// </summary>
        /// <param name="response">Resposta a ser enviada para o cliente</param>
        public void Respond(string response, HttpStatusCode statusCode = HttpStatusCode.OK)
        {
            _ctx.Response.StatusCode = (int)statusCode;

			using (StreamWriter writer = new StreamWriter(_ctx.Response.OutputStream))
				writer.Write(response);
			_ctx.Response.Close();
        }
    }
}
