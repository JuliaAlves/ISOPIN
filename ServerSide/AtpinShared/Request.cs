using System;
using System.IO;
using System.Net;

namespace ATPIN
{
    /// <summary>
    /// Classe para as requisições recebidas pelo servidor
    /// </summary>
    sealed class Request
    {
        readonly HttpListenerContext _ctx;

        /// <summary>
        /// Enumerador de códigos de tipo de requisição
        /// </summary>
        public enum RequestMethod
        {
            Specific,
            Info,
            Random
        }

        /// <summary>
        /// Código do tipo de requisição
        /// </summary>
        public RequestMethod Method { get; private set; }

        /// <summary>
        /// Booleano que indica se a requisição é válida
        /// </summary>
        /// <value><c>true</c> se for válida, <c>false</c> se não.</value>
        public bool IsOpen { get; private set; }

        /// <summary>
        /// Proteína requisitada
        /// </summary>
        /// <value>Nome da proteína cujas interações foream requisitadas</value>
        public string ProteinA { get; private set; }

        /// <summary>
        /// Proteína que interage com a requisitada
        /// </summary>
        /// <value>Nome da proteína cujas interações foream requisitadas</value>
        public string ProteinB { get; private set; }

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
            try
            {
                if (_ctx.Request.HttpMethod.Equals("POST"))
                    ParsePOSTData();
                else if (_ctx.Request.HttpMethod.Equals("GET"))
                    ParseGETData();
                else
                    Respond("405 Method Not Allowed", HttpStatusCode.MethodNotAllowed);
            } catch (BadRequestException) {
                Respond("400 Bad Request", HttpStatusCode.BadRequest);
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

            try {
				if (string.Compare("locus", parts[0], true) == 0)
				{
					Method = RequestMethod.Specific;
					ProteinA = parts[1];

					if (parts.Length > 2)
						throw new BadRequestException("Wrong number of arguments for method `LOCUS'");
				}
                else if (string.Compare("info", parts[0], true) == 0)
                {
                    Method = RequestMethod.Info;
                    ProteinA = parts[1];
                    ProteinB = parts[2];

                    if (parts.Length > 3)
                        throw new BadRequestException("Wrong number of arguments for method `INFO'");
                }
                else if (string.Compare("random", parts[0], true) == 0)
				{
					Method = RequestMethod.Random;

					if (parts.Length > 1)
						throw new BadRequestException("Wrong number of arguments for method `RANDOM'");
				}
				else
                    throw new BadRequestException("Unknown method");
			}
			catch (Exception e)
			{
                if (e.GetType() == typeof(BadRequestException))
                    throw e;

                throw new BadRequestException("Unknown error", e);
			}
		}

        /// <summary>
        /// Processa os dados da requisição se ela usar GET
        /// </summary>
        private void ParseGETData()
        {
            ProteinA = _ctx.Request.QueryString["locus"];
            ProteinB = _ctx.Request.QueryString["info"];

            if (!string.IsNullOrEmpty(ProteinA))
            {
                if (!string.IsNullOrEmpty(ProteinB))
                {
                    Method = RequestMethod.Info;
                    ProteinB = Uri.UnescapeDataString(ProteinB);
                }
                else
                    Method = RequestMethod.Specific;

                ProteinA = Uri.UnescapeDataString(ProteinA);
            }
            else if (string.Compare(_ctx.Request.QueryString[null], "random", true) == 0)
            {
                Method = RequestMethod.Random;
            }
            else
                throw new BadRequestException("Unknown method");
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

            IsOpen = false;
        }
    }
}
